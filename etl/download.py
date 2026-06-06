#!/usr/bin/env python3
"""Download the Project LINKS UAV flight-plan GeoJSON files listed in manifest.csv.

The geospatial.jp CKAN endpoint issues a 302 redirect to a time-limited S3 URL,
so we always go through the permanent CKAN /download/ link. Files are written to
data/raw/ and skipped if a non-trivial copy already exists.
"""
import csv
import os
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "data", "raw")
DATASET = "9db8f0a7-5f94-424b-a978-740cfd58a5fa"
BASE = "https://www.geospatial.jp/ckan/dataset/{ds}/resource/{rid}/download/{fn}"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"


def download(url, dest, retries=4):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=300) as r, open(dest, "wb") as out:
                while True:
                    chunk = r.read(1 << 20)
                    if not chunk:
                        break
                    out.write(chunk)
            return os.path.getsize(dest)
        except Exception as e:  # noqa: BLE001
            wait = 2 ** (attempt + 1)
            print(f"  retry {attempt + 1}/{retries} after error: {e} (sleep {wait}s)")
            time.sleep(wait)
    raise RuntimeError(f"failed to download {url}")


def main():
    os.makedirs(RAW, exist_ok=True)
    with open(os.path.join(HERE, "manifest.csv"), encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        fn, rid = row["filename"], row["resource_id"]
        dest = os.path.join(RAW, fn)
        if os.path.exists(dest) and os.path.getsize(dest) > 1_000_000:
            print(f"skip {fn} ({os.path.getsize(dest):,} bytes)")
            continue
        url = BASE.format(ds=DATASET, rid=rid, fn=fn)
        print(f"download {fn} ...", flush=True)
        size = download(url, dest)
        print(f"  ok {size:,} bytes", flush=True)
    print("done")


if __name__ == "__main__":
    sys.exit(main())
