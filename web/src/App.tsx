import { useEffect, useMemo, useState } from "react";
import { Card, CardTitle, CardHint } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { LangSwitch } from "./components/LangSwitch";
import { HBar, VBar, Donut, MultiLine } from "./components/charts";
import {
  STR, periodStr, generatedStr, attributionStr, makeTr, type Lang,
} from "./lib/i18n";
import {
  loadJSON, topEntries, pct, fmtInt, fmtPct,
  type Summary, type Meta,
} from "./lib/data";

const QUAL_ORDER = ["機体認証（一種）", "機体認証（二種）", "技能証明（一等）", "技能証明（二等）"];

function getInitialLang(): Lang {
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "ja" || saved === "en") return saved;
  } catch { /* ignore */ }
  return "ja";
}

function ChartBox({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={className ?? "h-80"}>{children}</div>;
}

export default function App() {
  const [lang, setLang] = useState<Lang>(getInitialLang);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState(false);

  const t = (key: string) => STR[lang][key] ?? key;
  const tr = useMemo(() => makeTr(lang), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = STR[lang]["doc.title"];
    try { localStorage.setItem("lang", lang); } catch { /* ignore */ }
  }, [lang]);

  useEffect(() => {
    Promise.all([
      loadJSON<Summary>("data/summary.json"),
      loadJSON<Meta>("data/meta.json"),
    ])
      .then(([s, m]) => { setSummary(s); setMeta(m); })
      .catch((e) => { console.error(e); setError(true); });
  }, []);

  const charts = useMemo(() => {
    if (!summary) return null;
    const { overall, months, timeline } = summary;

    const volume = months.map((m) => ({ month: m, value: timeline[m].n }));

    const topPurpose = Object.entries(overall.purpose)
      .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
    const purposeTrend = months.map((m) => {
      const p = timeline[m].purpose ?? {};
      const total = Object.values(p).reduce((a, b) => a + b, 0);
      const row: Record<string, number | string> = { month: m };
      topPurpose.forEach((k) => { row[tr(k)] = Number(fmtPct(pct(p[k] ?? 0, total)).replace("%", "")); });
      return row;
    });

    const qualPresent = QUAL_ORDER.filter((k) => k in (overall.qual ?? {}));
    const qualTrend = months.map((m) => {
      const row: Record<string, number | string> = { month: m };
      QUAL_ORDER.forEach((k) => {
        row[tr(k)] = Number(fmtPct(pct((timeline[m].qual ?? {})[k] ?? 0, timeline[m].n)).replace("%", ""));
      });
      return row;
    });

    return {
      volume,
      purpose: topEntries(overall.purpose, tr),
      aircraft: topEntries(overall.aircraft_type, tr, 7),
      qual: qualPresent.map((k) => ({ name: tr(k), value: pct(overall.qual[k], overall.n) })),
      manufacture: topEntries(overall.manufacture, tr, 6),
      modified: topEntries(overall.modified, tr, 6),
      purposeTrend, purposeKeys: topPurpose.map(tr),
      qualTrend, qualKeys: QUAL_ORDER.map(tr),
      airspace: topEntries(overall.airspace, tr),
      method: topEntries(overall.method, tr),
      pref: topEntries(overall.prefecture, tr, 15),
    };
  }, [summary, tr]);

  const overall = summary?.overall;
  const months = meta?.months_covered ?? [];

  return (
    <>
      <header className="relative bg-[linear-gradient(135deg,#0f3f6b_0%,#15568c_55%,#1f6aab_100%)] py-10 text-white">
        <div className="mx-auto w-full max-w-[1120px] px-5">
          <div className="absolute right-5 top-4">
            <LangSwitch lang={lang} onChange={setLang} />
          </div>
          <p className="mb-1.5 text-xs font-medium tracking-wide text-sky-200">{t("eyebrow")}</p>
          <h1 className="m-0 text-3xl font-bold sm:text-4xl">{t("title")}</h1>
          <p className="mt-2.5 max-w-3xl text-sky-50">{t("lede")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="warn">{t("badge.applied")}</Badge>
            <Badge variant="muted">{t("badge.quality")}</Badge>
            {months.length > 0 && (
              <Badge variant="muted">{periodStr(lang, months[0], months[months.length - 1])}</Badge>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] space-y-6 px-5 py-7">
        {/* Notice */}
        <section className="rounded-xl border border-warn-line border-l-4 border-l-amber-500 bg-warn-bg p-5">
          <h2 className="m-0 mb-2.5 text-base font-bold text-warn-ink">{t("notice.title")}</h2>
          <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-amber-950">
            {["notice.li1", "notice.li2", "notice.li3", "notice.li4", "notice.li5", "notice.li6"].map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
            {error && <li className="font-medium text-red-700">{t("footer.error")}</li>}
          </ul>
        </section>

        {/* KPIs */}
        {overall && (
          <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { v: fmtInt(overall.n, lang), l: t("kpi.total") },
              { v: fmtInt(overall.n_aircraft, lang), l: t("kpi.aircraft") },
              { v: fmtPct(pct(overall.qual_any, overall.n)), l: t("kpi.qual") },
              { v: fmtPct(pct(overall.comprehensive, overall.n)), l: t("kpi.comp") },
            ].map((kpi, i) => (
              <Card key={i} className="text-center">
                <div className="text-3xl font-bold leading-tight text-brand">{kpi.v}</div>
                <div className="mt-1.5 text-xs text-ink-soft">{kpi.l}</div>
              </Card>
            ))}
          </section>
        )}

        {charts && (
          <>
            <Card>
              <CardTitle>{t("volume.title")}</CardTitle>
              <CardHint>{t("volume.hint")}</CardHint>
              <ChartBox><VBar data={charts.volume} color="#2b7fc4" lang={lang} unit={t("unit.plans")} /></ChartBox>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardTitle>{t("purpose.title")}</CardTitle>
                <CardHint>{t("purpose.hint")}</CardHint>
                <ChartBox className="h-[420px]"><HBar data={charts.purpose} color="#15568c" lang={lang} /></ChartBox>
              </Card>
              <Card>
                <CardTitle>{t("aircraft.title")}</CardTitle>
                <CardHint>{t("aircraft.hint")}</CardHint>
                <ChartBox className="h-[420px]"><Donut data={charts.aircraft} lang={lang} /></ChartBox>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardTitle>{t("qual.title")}</CardTitle>
                <CardHint>{t("qual.hint")}</CardHint>
                <ChartBox><HBar data={charts.qual} color="#2b7fc4" lang={lang} percent yWidth={170} /></ChartBox>
              </Card>
              <Card>
                <CardTitle>{t("mm.title")}</CardTitle>
                <CardHint>{t("mm.hint")}</CardHint>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="h-64"><Donut data={charts.manufacture} lang={lang} legend="bottom" /></div>
                  <div className="h-64"><Donut data={charts.modified} lang={lang} legend="bottom" /></div>
                </div>
              </Card>
            </div>

            <Card>
              <CardTitle>{t("purposeTrend.title")}</CardTitle>
              <CardHint>{t("purposeTrend.hint")}</CardHint>
              <ChartBox className="h-[420px]">
                <MultiLine data={charts.purposeTrend} keys={charts.purposeKeys} lang={lang} percent />
              </ChartBox>
            </Card>

            <Card>
              <CardTitle>{t("qualTrend.title")}</CardTitle>
              <CardHint>{t("qualTrend.hint")}</CardHint>
              <ChartBox>
                <MultiLine data={charts.qualTrend} keys={charts.qualKeys} lang={lang} percent />
              </ChartBox>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardTitle>{t("airspace.title")}</CardTitle>
                <CardHint>{t("airspace.hint")}</CardHint>
                <ChartBox><HBar data={charts.airspace} color="#3fa7d6" lang={lang} /></ChartBox>
              </Card>
              <Card>
                <CardTitle>{t("method.title")}</CardTitle>
                <CardHint>{t("method.hint")}</CardHint>
                <ChartBox><HBar data={charts.method} color="#5cc9b0" lang={lang} /></ChartBox>
              </Card>
            </div>

            <Card>
              <CardTitle>{t("pref.title")}</CardTitle>
              <CardHint>{t("pref.hint")}</CardHint>
              <ChartBox className="h-[420px]"><HBar data={charts.pref} color="#e0962f" lang={lang} yWidth={90} /></ChartBox>
            </Card>
          </>
        )}
      </main>

      <footer className="mt-10 bg-[#11212f] py-7 text-slate-300">
        <div className="mx-auto w-full max-w-[1120px] px-5">
          <p className="m-0 mb-2 font-medium text-sky-50">
            {meta ? attributionStr(lang, meta.attribution) : ""}
          </p>
          <p className="my-1 text-xs text-slate-400">
            {t("footer.license.pre")}
            <a href="https://www.geospatial.jp/ckan/dataset/links-mujinkoukuukihikoukeikaku-2025_" target="_blank" rel="noopener">geospatial.jp</a>
            {t("footer.license.mid")}
            <a href="https://www.mlit.go.jp/links/" target="_blank" rel="noopener">MLIT Project LINKS</a>
          </p>
          {meta && <p className="my-1 text-xs text-slate-400">{generatedStr(lang, meta.generated)}</p>}
        </div>
      </footer>
    </>
  );
}
