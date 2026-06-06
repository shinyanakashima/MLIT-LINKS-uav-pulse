#!/usr/bin/env python3
"""Aggregate the UAV flight-plan GeoJSON files into compact JSON for the static site.

Design decisions baked in from the dataset's known quirks:
- Field keys are normalized with NFKC + strip before lookup. This collapses
  full/half-width variants, trailing spaces (`インフラ点検・保守 `) and the
  KANGXI radical that appears in `機体認証(⼀種)` (U+2F00 -> U+4E00).
- The trust unit for time is "file = target month"; the unreliable
  `飛行日時_*` columns are never used for the timeline.
- "Comprehensive" applications (a single plan that flags an unrealistic number
  of business purposes) are detected by the count of business-purpose flags and
  reported separately so they do not distort the per-purpose composition.
- Numeric spec columns arrive as strings and may be blank; parsed null-safe.

Outputs (written to docs/data/):
  summary.json   overall + per-month aggregates consumed by the front-end
  meta.json      record counts, generation date, source attribution
"""
import csv
import json
import os
import unicodedata
from collections import Counter, defaultdict

import ijson

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "docs", "data")

# A plan flagging this many or more distinct business purposes is treated as a
# blanket / comprehensive application rather than a single-purpose flight.
COMPREHENSIVE_THRESHOLD = 6

# Canonical (NFKC + stripped) purpose keys -> display label.
BUSINESS_PURPOSES = {
    "飛行目的(業務)_空撮": "空撮",
    "飛行目的(業務)_報道取材": "報道取材",
    "飛行目的(業務)_警備": "警備",
    "飛行目的(業務)_農林水産業": "農林水産業",
    "飛行目的(業務)_測量": "測量",
    "飛行目的(業務)_環境調査": "環境調査",
    "飛行目的(業務)_設備メンテナンス": "設備メンテナンス",
    "飛行目的(業務)_インフラ点検・保守": "インフラ点検・保守",
    "飛行目的(業務)_資材管理": "資材管理",
    "飛行目的(業務)_輸送・宅配": "輸送・宅配",
    "飛行目的(業務)_自然観測": "自然観測",
    "飛行目的(業務)_事故・災害対応等": "事故・災害対応等",
    "飛行目的(業務)_その他": "業務その他",
}
NON_BUSINESS_PURPOSES = {
    "飛行目的(業務以外)_趣味": "趣味",
    "飛行目的(業務以外)_その他": "業務以外その他",
}
AIRSPACE = {
    "飛行空域_DID": "DID（人口集中地区）",
    "飛行空域_150m": "150m以上",
    "飛行空域_空港周辺": "空港周辺",
    "飛行空域_対象無し": "対象無し",
}
METHODS = {
    "飛行方法_30m": "30m未満",
    "飛行方法_催し物": "催し物上空",
    "飛行方法_夜間": "夜間",
    "飛行方法_目視外": "目視外",
    "飛行方法_危険物": "危険物輸送",
    "飛行方法_物件投下": "物件投下",
    "飛行方法_対象無し": "対象無し",
}
QUALIFICATIONS = {
    "機体認証(一種)": "機体認証（一種）",
    "機体認証(二種)": "機体認証（二種）",
    "技能証明(一等)": "技能証明（一等）",
    "技能証明(二等)": "技能証明（二等）",
}

# Normalized (NFKC) names of the identity columns used to choose the analysis unit.
PLAN_ID = "飛行計画ID_独自(新規)"          # one flight plan, may span many rows
SERIAL_ID = "製造番号ID(新規)"            # one airframe within a plan

# Plan-level attributes are constant across a plan's rows; aircraft-level
# attributes vary per airframe. We aggregate each at its proper unit so that a
# single plan registering many airframes/areas does not skew the distributions.
PLAN_LEVEL_COUNTERS = ("purpose", "non_business", "airspace", "method", "qual",
                       "prefecture")
AIRCRAFT_LEVEL_COUNTERS = ("aircraft_type", "manufacture", "modified")


def norm(key):
    return unicodedata.normalize("NFKC", key).strip()


def normalize_props(props):
    return {norm(k): v for k, v in props.items()}


def truthy(v):
    if v in (1, "1", True):
        return True
    if isinstance(v, str):
        return v.strip() in ("1", "1.0")
    return v == 1


def prefecture(chiten):
    """Extract the 都道府県 prefix from a free-text 出発地 string."""
    if not chiten or not isinstance(chiten, str):
        return None
    s = chiten.strip()
    if s.startswith("北海道"):
        return "北海道"
    for i, ch in enumerate(s):
        if ch in ("都", "府", "県") and i >= 1:
            return s[: i + 1]
    return None


def new_acc():
    return {
        "n_plans": 0,        # unique flight plans (primary unit)
        "n_aircraft": 0,     # unique airframe registrations
        "n_records": 0,      # raw rows (plan x airframe x area)
        "comprehensive": 0,  # plans flagging >= threshold business purposes
        "qual_any": 0,
        "purpose": Counter(),          # plan-level, comprehensive plans excluded
        "non_business": Counter(),
        "airspace": Counter(),
        "method": Counter(),
        "qual": Counter(),
        "prefecture": Counter(),
        "aircraft_type": Counter(),    # aircraft-level
        "manufacture": Counter(),
        "modified": Counter(),
    }


def accumulate_plan(acc, p):
    """Plan-level metrics, counted once per unique flight plan."""
    acc["n_plans"] += 1

    biz_flags = [k for k in BUSINESS_PURPOSES if truthy(p.get(k))]
    if len(biz_flags) >= COMPREHENSIVE_THRESHOLD:
        acc["comprehensive"] += 1
    else:
        for k in biz_flags:
            acc["purpose"][BUSINESS_PURPOSES[k]] += 1
        for k, label in NON_BUSINESS_PURPOSES.items():
            if truthy(p.get(k)):
                acc["non_business"][label] += 1

    for k, label in AIRSPACE.items():
        if truthy(p.get(k)):
            acc["airspace"][label] += 1
    for k, label in METHODS.items():
        if truthy(p.get(k)):
            acc["method"][label] += 1

    has_qual = False
    for k, label in QUALIFICATIONS.items():
        if truthy(p.get(k)):
            acc["qual"][label] += 1
            has_qual = True
    if has_qual:
        acc["qual_any"] += 1

    pref = prefecture(p.get("出発地"))
    if pref:
        acc["prefecture"][pref] += 1


def accumulate_aircraft(acc, p):
    """Aircraft-level metrics, counted once per unique airframe within a plan."""
    acc["n_aircraft"] += 1
    at = p.get("機体の種類")
    if isinstance(at, str) and at.strip():
        acc["aircraft_type"][norm(at)] += 1
    mf = p.get("製造区分")
    if isinstance(mf, str) and mf.strip():
        acc["manufacture"][norm(mf)] += 1
    md = p.get("改造の有無")
    if isinstance(md, str) and md.strip():
        acc["modified"][norm(md)] += 1


def finalize(acc):
    """Convert an accumulator into a JSON-serialisable dict (Counters -> dicts)."""
    out = {
        "n": acc["n_plans"],
        "n_aircraft": acc["n_aircraft"],
        "n_records": acc["n_records"],
        "comprehensive": acc["comprehensive"],
        "qual_any": acc["qual_any"],
    }
    for key in PLAN_LEVEL_COUNTERS + AIRCRAFT_LEVEL_COUNTERS:
        out[key] = dict(acc[key].most_common())
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(HERE, "manifest.csv"), encoding="utf-8") as f:
        manifest = list(csv.DictReader(f))

    months = defaultdict(new_acc)   # month string -> acc
    overall = new_acc()
    file_counts = []

    for row in manifest:
        fn, month = row["filename"], row["month"]
        path = os.path.join(RAW, fn)
        if not os.path.exists(path):
            print(f"WARNING: missing {fn}, skipping")
            continue
        # Stream only the `properties` of each feature; the Polygon geometries are
        # huge and unused, so we never build them in memory. A flight plan spans
        # many rows (one per airframe x flight area), so we de-duplicate within
        # the file: plan-level metrics once per plan id, aircraft-level metrics
        # once per (plan id, airframe serial). The two split files of a month do
        # not share plan ids, so per-file de-duplication is sufficient.
        seen_plans = set()
        seen_aircraft = set()
        count = 0
        macc, oacc = months[month], overall
        with open(path, "rb") as fh:
            for props in ijson.items(fh, "features.item.properties"):
                p = normalize_props(props or {})
                count += 1
                macc["n_records"] += 1
                oacc["n_records"] += 1

                plan_id = p.get(PLAN_ID)
                if plan_id and plan_id not in seen_plans:
                    seen_plans.add(plan_id)
                    accumulate_plan(macc, p)
                    accumulate_plan(oacc, p)

                serial = p.get(SERIAL_ID)
                akey = (plan_id, serial) if (plan_id and serial) else None
                if akey is None or akey not in seen_aircraft:
                    if akey is not None:
                        seen_aircraft.add(akey)
                    accumulate_aircraft(macc, p)
                    accumulate_aircraft(oacc, p)
        print(f"{fn}: {count:,} rows, {len(seen_plans):,} plans ({month})", flush=True)
        file_counts.append({"file": fn, "month": month, "records": count,
                            "plans": len(seen_plans)})

    month_keys = sorted(months.keys())
    timeline = {m: finalize(months[m]) for m in month_keys}

    summary = {
        "overall": finalize(overall),
        "months": month_keys,
        "timeline": timeline,
        "labels": {
            "purpose": list(BUSINESS_PURPOSES.values()),
            "qualification": list(QUALIFICATIONS.values()),
        },
    }
    with open(os.path.join(OUT, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, separators=(",", ":"))

    meta = {
        "generated": __import__("datetime").date.today().isoformat(),
        "total_plans": overall["n_plans"],
        "total_aircraft": overall["n_aircraft"],
        "total_records": overall["n_records"],
        "months_covered": month_keys,
        "comprehensive_threshold": COMPREHENSIVE_THRESHOLD,
        "files": file_counts,
        "source": "国土交通省 Project LINKS『無人航空機飛行計画データ（2025年度）』",
        "attribution": "出典：国土交通省 Project LINKS『無人航空機飛行計画データ（2025年度）』を加工して作成",
    }
    with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"\nRecords (rows):   {overall['n_records']:,}")
    print(f"Unique plans:     {overall['n_plans']:,}")
    print(f"Unique aircraft:  {overall['n_aircraft']:,}")
    print(f"Comprehensive (>= {COMPREHENSIVE_THRESHOLD} purposes): "
          f"{overall['comprehensive']:,} "
          f"({100 * overall['comprehensive'] / max(overall['n_plans'], 1):.1f}% of plans)")
    print(f"Wrote {os.path.join(OUT, 'summary.json')}")


if __name__ == "__main__":
    main()
