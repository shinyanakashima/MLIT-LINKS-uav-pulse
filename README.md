# ドローン産業トレンド分析（無人航空機飛行計画データ 2025年度）

国土交通省 Project LINKS『無人航空機飛行計画データ（2025年度）』を加工し、**飛行目的・機体構成・資格保有の分布と月次推移**を可視化する静的ダッシュボードです。研究機関・業界団体・社内ナレッジ蓄積での利用を想定しています。

- 公開サイト本体: `docs/`（GitHub Pages でそのまま配信可能）
- 集計パイプライン: `etl/`（GeoJSON のダウンロードと集約 JSON 生成）

> **重要:** 本データは飛行**計画（申請）**であり、実際の飛行・運航実態ではありません。元データは紙資料のスキャンから抽出されており、完全性・正確性は公式に保証されていません。傾向把握の参考としてご利用ください。

---

## 構成

```
etl/
  manifest.csv     対象16ファイル（RESOURCE_ID と対象月）
  download.py      CKAN 経由で GeoJSON を data/raw/ に取得
  aggregate.py     ストリーム解析で docs/data/*.json を生成
docs/                GitHub Pages で配信する静的サイト
  index.html
  style.css
  app.js
  vendor/chart.umd.min.js   Chart.js（同梱・CDN 不要）
  data/
    summary.json   全体＋月次の集計値（サイトが読込む）
    meta.json      件数・生成日・出典表記
data/raw/            ダウンロードした GeoJSON（.gitignore 済み・多GB）
```

## データの再生成手順

```bash
# 1. 生データ（全16ファイル・合計約9GB）を取得
python3 etl/download.py

# 2. 集約 JSON を生成（ストリーム解析。geometry は読み飛ばす）
pip install ijson
python3 etl/aggregate.py
```

`docs/data/summary.json` と `docs/data/meta.json` が更新されます。生データはサイト配信に不要なため、リポジトリには集約済み JSON のみを含めます。

## デプロイ（GitHub Pages）

公開URL: **https://shinyanakashima.github.io/MLIT-LINKS-uav-pulse/**

`main` への push をトリガーに `.github/workflows/pages.yml` が `docs/` を GitHub Pages へ自動デプロイします（`actions/configure-pages` が Pages を自動有効化）。集計済み JSON とチャートのみの完全な静的配信のため、サーバーサイド処理や API キーは不要です。

private リポジトリで GitHub Pages が使えない場合は、`docs/` 配下一式をそのまま ConoHa WING 等へ配置すれば動作します。

## 集計の前処理方針

データの既知の癖を反映しています。

| 課題 | 対応 |
|---|---|
| フィールド名の表記ゆれ（末尾スペース、`機体認証(⼀種)` の部首字、全角半角混在） | キー名を NFKC 正規化 + trim してから参照 |
| 日時データの品質が低い（年跨ぎ等） | 月次は「ファイル＝対象月」を信頼単位とし、`飛行日時_*` は時系列に使わない |
| 包括申請ノイズ（飛行目的フラグが多数同時に1） | 業務目的フラグが `COMPREHENSIVE_THRESHOLD`(=6) 以上の行を「包括申請」として目的別構成から除外し、件数・割合を別掲 |
| 規模が重い（geometry 含む全16ファイルで約9GB） | `ijson` で `features.item.properties` のみをストリーム解析。Polygon は読み込まない |
| 数値諸元が文字列・欠損あり | null 安全に解析 |
| 出発地は市区町村重心レベルに秘匿化 | 都道府県粒度までの集計にとどめ、粒度を上げる二次加工はしない |

## 出典・ライセンス

出典：国土交通省 Project LINKS『無人航空機飛行計画データ（2025年度）』を加工して作成

- プロジェクト: https://www.mlit.go.jp/links/
- データセット: https://www.geospatial.jp/ckan/dataset/links-mujinkoukuukihikoukeikaku-2025_
- ライセンス: 公共データ利用規約（第1.0版, CC BY 4.0 互換）。商用利用可・**出典表記必須**。
