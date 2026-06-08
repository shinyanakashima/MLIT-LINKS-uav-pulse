"use strict";

/* Drone industry trend dashboard — renders compact aggregates produced by
 * etl/aggregate.py. Pure client-side, no external runtime dependencies.
 * Bilingual (JA / EN): static text via data-i18n attributes, data category
 * labels via the LABELS_EN map; charts are rebuilt on language change. */

const PALETTE = [
  "#15568c", "#2b7fc4", "#3fa7d6", "#5cc9b0", "#7bbf6a",
  "#c2c54a", "#e0962f", "#e5673b", "#cf4b6c", "#9b59b6",
  "#6c7a89", "#34495e", "#16a085",
];

/* ---- Static UI strings -------------------------------------------------- */
const STR = {
  ja: {
    "doc.title": "ドローン産業トレンド分析 ― 無人航空機飛行計画データ（2025年度）",
    "eyebrow": "Project LINKS データ活用 ／ 研究・業界レポート向け",
    "title": "ドローン産業トレンド分析",
    "lede": "無人航空機の<strong>飛行計画（申請）</strong>から、飛行目的・機体構成・資格保有の分布と月次推移を定量把握するダッシュボードです。",
    "badge.applied": "申請ベース（実飛行・実態ではありません）",
    "badge.quality": "データ品質は公式に非保証",
    "notice.title": "このダッシュボードの読み方",
    "notice.li1": "<strong>「飛行計画（申請）」の集計</strong>です。実際の飛行や運航実態を表すものではありません。",
    "notice.li2": "元データは紙資料のスキャンから抽出されており、<strong>完全性・正確性は公式に保証されていません</strong>。傾向把握の参考としてご利用ください。",
    "notice.li3": "日時データに品質上の問題があるため、月次の集計単位は<strong>「ファイル＝対象月」</strong>を信頼単位としています。",
    "notice.li4": "飛行目的を多数同時に申請した計画（<strong>包括申請</strong>）は、目的別構成の分布から除外し、別途その件数・割合を示しています。",
    "notice.li5": "1つの飛行計画が複数の機体・飛行エリアにわたって複数行に展開されるため、<strong>飛行目的・資格・空域・方法は飛行計画単位</strong>、<strong>機体構成は機体（airframe）単位</strong>で重複排除して集計しています。",
    "notice.li6": "出発地は市区町村重心レベルに秘匿化済みです。本サイトでは粒度を上げる二次加工を行っていません。",
    "kpi.total": "飛行計画 総件数（重複排除）",
    "kpi.aircraft": "登録機体数（累計）",
    "kpi.qual": "資格保有あり（認証/技能証明）",
    "kpi.comp": "包括申請の割合",
    "volume.title": "月次の飛行計画件数推移",
    "volume.hint": "各月の飛行計画数（重複排除後）。年度をまたぐ12ヶ月の申請ボリュームの推移を示します。",
    "volume.series": "飛行計画 件数",
    "purpose.title": "飛行目的の構成（業務）",
    "purpose.hint": "包括申請を除く。1件で複数目的を持つため合計は件数と一致しません。",
    "aircraft.title": "機体の種類",
    "aircraft.hint": "申請に用いられた機体種別の構成（機体単位・重複排除後）。",
    "qual.title": "資格・認証の保有率",
    "qual.hint": "各資格を保有する飛行計画の割合（全件に対する比率）。",
    "mm.title": "製造区分・改造の有無",
    "mm.hint": "機体の製造区分（左）と改造の有無（右）。",
    "purposeTrend.title": "主要な飛行目的の月次推移",
    "purposeTrend.hint": "上位の飛行目的について、各月の構成比（包括申請を除く目的フラグ合計に対する割合）の推移を示します。",
    "qualTrend.title": "資格保有率の月次推移",
    "qualTrend.hint": "各月の全件に対する資格保有割合の推移。資格制度の浸透傾向の把握に。",
    "airspace.title": "飛行空域の構成",
    "airspace.hint": "DID・150m以上・空港周辺など該当空域（複数該当あり）。",
    "method.title": "飛行方法の構成",
    "method.hint": "夜間・目視外・催し物上空など飛行方法（複数該当あり）。",
    "pref.title": "出発地（都道府県）上位",
    "pref.hint": "出発地テキストから抽出した都道府県別の件数上位15。市区町村重心レベルに秘匿化済みのデータに基づきます。",
    "footer.license": "ライセンス: 公共データ利用規約（第1.0版, CC BY 4.0 互換）。商用利用可・出典表記必須。データセット: <a href=\"https://www.geospatial.jp/ckan/dataset/links-mujinkoukuukihikoukeikaku-2025_\" target=\"_blank\" rel=\"noopener\">geospatial.jp</a> ／ プロジェクト: <a href=\"https://www.mlit.go.jp/links/\" target=\"_blank\" rel=\"noopener\">国土交通省 Project LINKS</a>",
    "period": (a, b) => `対象期間: ${a} 〜 ${b}（月次）`,
    "generated": (d) => `集計生成日: ${d}`,
    "unit.plans": "件",
  },
  en: {
    "doc.title": "Drone Industry Trends — UAV Flight Plan Data (FY2025)",
    "eyebrow": "Project LINKS data / for research & industry reports",
    "title": "Drone Industry Trend Analysis",
    "lede": "A dashboard quantifying the distribution and monthly trends of flight purposes, aircraft mix and pilot/airworthiness credentials from UAV <strong>flight plans (applications)</strong>.",
    "badge.applied": "Application-based (not actual flights)",
    "badge.quality": "Data quality not officially guaranteed",
    "notice.title": "How to read this dashboard",
    "notice.li1": "These are aggregates of <strong>flight plans (applications)</strong>. They do not represent actual flights or operations.",
    "notice.li2": "The source data is extracted from scanned paper documents; <strong>completeness and accuracy are not officially guaranteed</strong>. Use it as a reference for trends.",
    "notice.li3": "Because the date/time fields have quality issues, the monthly unit of aggregation trusts <strong>“file = target month.”</strong>",
    "notice.li4": "Plans that declare many purposes at once (<strong>blanket applications</strong>) are excluded from the purpose composition and reported separately as a count and share.",
    "notice.li5": "Since one flight plan expands into many rows (per airframe × flight area), <strong>purpose, credentials, airspace and method are counted per flight plan</strong> and <strong>aircraft composition per airframe</strong>, de-duplicated.",
    "notice.li6": "Departure points are anonymized to municipality-centroid level; this site does not perform any secondary processing that increases granularity.",
    "kpi.total": "Total flight plans (de-duplicated)",
    "kpi.aircraft": "Registered airframes (cumulative)",
    "kpi.qual": "With credentials (cert. / pilot license)",
    "kpi.comp": "Share of blanket applications",
    "volume.title": "Monthly flight-plan volume",
    "volume.hint": "Flight plans per month (de-duplicated). Shows application volume across 12 months spanning the fiscal year.",
    "volume.series": "Flight plans",
    "purpose.title": "Flight purpose composition (business)",
    "purpose.hint": "Blanket applications excluded. A plan can hold multiple purposes, so totals exceed the plan count.",
    "aircraft.title": "Aircraft type",
    "aircraft.hint": "Composition of aircraft types used in applications (per airframe, de-duplicated).",
    "qual.title": "Credential holding rate",
    "qual.hint": "Share of flight plans holding each credential (ratio of all plans).",
    "mm.title": "Manufacture category & modification",
    "mm.hint": "Manufacture category (left) and whether modified (right).",
    "purposeTrend.title": "Monthly trend of major flight purposes",
    "purposeTrend.hint": "For the top purposes, the monthly share (of the total purpose flags, excluding blanket applications).",
    "qualTrend.title": "Monthly trend of credential holding rate",
    "qualTrend.hint": "Monthly share of plans holding each credential — useful for tracking adoption of the credential system.",
    "airspace.title": "Airspace composition",
    "airspace.hint": "Applicable airspace such as DID, ≥150m, near airports (multiple may apply).",
    "method.title": "Flight method composition",
    "method.hint": "Flight methods such as night, BVLOS, over events (multiple may apply).",
    "pref.title": "Top departure prefectures",
    "pref.hint": "Top 15 prefectures by count, extracted from the departure-point text. Based on data anonymized to municipality-centroid level.",
    "footer.license": "License: Public Data License (v1.0, CC BY 4.0 compatible). Commercial use allowed; attribution required. Dataset: <a href=\"https://www.geospatial.jp/ckan/dataset/links-mujinkoukuukihikoukeikaku-2025_\" target=\"_blank\" rel=\"noopener\">geospatial.jp</a> / Project: <a href=\"https://www.mlit.go.jp/links/\" target=\"_blank\" rel=\"noopener\">MLIT Project LINKS</a>",
    "attribution": "Source: Created based on MLIT Project LINKS “UAV Flight Plan Data (FY2025)”.",
    "period": (a, b) => `Period: ${a} – ${b} (monthly)`,
    "generated": (d) => `Generated: ${d}`,
    "unit.plans": "plans",
  },
};

/* ---- Data category labels (Japanese key -> English) -------------------- */
const LABELS_EN = {
  // flight purposes
  "空撮": "Aerial photography", "報道取材": "News coverage", "警備": "Security",
  "農林水産業": "Agriculture/forestry/fishery", "測量": "Surveying",
  "環境調査": "Environmental survey", "設備メンテナンス": "Equipment maintenance",
  "インフラ点検・保守": "Infrastructure inspection", "資材管理": "Material handling",
  "輸送・宅配": "Transport/delivery", "自然観測": "Nature observation",
  "事故・災害対応等": "Accident/disaster response", "業務その他": "Business: other",
  // aircraft types
  "回転翼航空機(マルチローター)": "Rotorcraft (multirotor)",
  "回転翼航空機(ヘリコプター)": "Rotorcraft (helicopter)",
  "回転翼航空機(その他)": "Rotorcraft (other)",
  "飛行機": "Airplane", "滑空機": "Glider",
  // manufacture category
  "メーカーの機体・改造した機体": "Manufacturer-built / modified",
  "自作した機体": "Self-built",
  // modification
  "改造なし": "No modification", "改造あり": "Modified",
  // qualifications
  "機体認証（一種）": "Type 1 airworthiness cert.",
  "機体認証（二種）": "Type 2 airworthiness cert.",
  "技能証明（一等）": "Class 1 pilot license",
  "技能証明（二等）": "Class 2 pilot license",
  // airspace
  "DID（人口集中地区）": "DID (densely inhabited)", "150m以上": "Above 150m",
  "空港周辺": "Near airport", "対象無し": "None",
  // flight methods
  "30m未満": "Within 30m", "催し物上空": "Over events", "夜間": "Night",
  "目視外": "BVLOS", "危険物輸送": "Dangerous goods", "物件投下": "Object dropping",
  // prefectures
  "北海道": "Hokkaido", "青森県": "Aomori", "岩手県": "Iwate", "宮城県": "Miyagi",
  "秋田県": "Akita", "山形県": "Yamagata", "福島県": "Fukushima", "茨城県": "Ibaraki",
  "栃木県": "Tochigi", "群馬県": "Gunma", "埼玉県": "Saitama", "千葉県": "Chiba",
  "東京都": "Tokyo", "神奈川県": "Kanagawa", "新潟県": "Niigata", "富山県": "Toyama",
  "石川県": "Ishikawa", "福井県": "Fukui", "山梨県": "Yamanashi", "長野県": "Nagano",
  "岐阜県": "Gifu", "静岡県": "Shizuoka", "愛知県": "Aichi", "三重県": "Mie",
  "滋賀県": "Shiga", "京都府": "Kyoto", "大阪府": "Osaka", "兵庫県": "Hyogo",
  "奈良県": "Nara", "和歌山県": "Wakayama", "鳥取県": "Tottori", "島根県": "Shimane",
  "岡山県": "Okayama", "広島県": "Hiroshima", "山口県": "Yamaguchi", "徳島県": "Tokushima",
  "香川県": "Kagawa", "愛媛県": "Ehime", "高知県": "Kochi", "福岡県": "Fukuoka",
  "佐賀県": "Saga", "長崎県": "Nagasaki", "熊本県": "Kumamoto", "大分県": "Oita",
  "宮崎県": "Miyazaki", "鹿児島県": "Kagoshima", "沖縄県": "Okinawa",
};

/* ---- State ------------------------------------------------------------- */
let LANG = "ja";
let DB = null;                 // { summary, meta }
const charts = {};            // id -> Chart instance

/* ---- Helpers ----------------------------------------------------------- */
const s = (key) => STR[LANG][key];
const tr = (label) => (LANG === "en" ? (LABELS_EN[label] || label) : label);
const fmtInt = (n) => (n == null ? "—" : n.toLocaleString(LANG === "en" ? "en-US" : "ja-JP"));
const pct = (num, den) => (den ? (100 * num / den) : 0);
const fmtPct = (p) => `${p.toFixed(1)}%`;

Chart.defaults.font.family = '"Noto Sans JP", system-ui, sans-serif';
Chart.defaults.color = "#5a6b7b";
Chart.defaults.plugins.legend.labels.boxWidth = 12;
Chart.defaults.plugins.legend.labels.padding = 12;
Chart.defaults.maintainAspectRatio = false;

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`failed to load ${path}: ${res.status}`);
  return res.json();
}

/* Sort a {label: count} object into translated [labels[], values[]]. */
function topEntries(obj, limit) {
  const entries = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
  const capped = limit ? entries.slice(0, limit) : entries;
  return { labels: capped.map((e) => tr(e[0])), values: capped.map((e) => e[1]) };
}

function makeChart(id, config) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), config);
}

function horizontalBar(id, labels, values, color, valueFmt) {
  makeChart(id, {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 4 }] },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => (valueFmt ? valueFmt(c.parsed.x) : fmtInt(c.parsed.x)) } },
      },
      scales: {
        x: { beginAtZero: true, grid: { color: "#eef2f6" } },
        y: { grid: { display: false } },
      },
    },
  });
}

function doughnut(id, labels, values) {
  makeChart(id, {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: PALETTE, borderColor: "#fff", borderWidth: 2 }] },
    options: {
      cutout: "55%",
      plugins: {
        legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const total = c.dataset.data.reduce((a, b) => a + b, 0);
              return `${c.label}: ${fmtInt(c.parsed)} (${fmtPct(pct(c.parsed, total))})`;
            },
          },
        },
      },
    },
  });
}

function multiLine(id, months, series, yIsPercent) {
  const datasets = series.map((d, i) => ({
    label: d.label,
    data: d.data,
    borderColor: PALETTE[i % PALETTE.length],
    backgroundColor: PALETTE[i % PALETTE.length],
    borderWidth: 2, tension: 0.25, pointRadius: 2, fill: false,
  }));
  makeChart(id, {
    type: "line",
    data: { labels: months, datasets },
    options: {
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${yIsPercent ? fmtPct(c.parsed.y) : fmtInt(c.parsed.y)}` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: "#eef2f6" }, ticks: { callback: (v) => (yIsPercent ? `${v}%` : fmtInt(v)) } },
      },
    },
  });
}

/* Qualification labels are keyed on the Japanese display labels in summary.json. */
const QUAL_ORDER = ["機体認証（一種）", "機体認証（二種）", "技能証明（一等）", "技能証明（二等）"];

/* ---- Renderers --------------------------------------------------------- */
function renderKPIs() {
  const { overall } = DB.summary;
  document.getElementById("kpi-total").textContent = fmtInt(overall.n);
  document.getElementById("kpi-aircraft").textContent = fmtInt(overall.n_aircraft);
  document.getElementById("kpi-qual").textContent = fmtPct(pct(overall.qual_any, overall.n));
  document.getElementById("kpi-comp").textContent = fmtPct(pct(overall.comprehensive, overall.n));

  const ms = DB.meta.months_covered;
  document.getElementById("period-badge").textContent = s("period")(ms[0], ms[ms.length - 1]);
  document.getElementById("generated").textContent = s("generated")(DB.meta.generated);
  document.getElementById("attribution").textContent =
    LANG === "en" ? s("attribution") : (DB.meta.attribution || "");
}

function renderCharts() {
  const { overall, months, timeline } = DB.summary;

  // monthly volume
  const volValues = months.map((m) => timeline[m].n);
  makeChart("chart-volume", {
    type: "bar",
    data: { labels: months, datasets: [{ label: s("volume.series"), data: volValues, backgroundColor: "#2b7fc4", borderRadius: 4 }] },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${fmtInt(c.parsed.y)} ${s("unit.plans")}` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: "#eef2f6" }, ticks: { callback: (v) => fmtInt(v) } },
      },
    },
  });

  // purpose composition
  let p = topEntries(overall.purpose);
  horizontalBar("chart-purpose", p.labels, p.values, "#15568c");

  // aircraft type
  let a = topEntries(overall.aircraft_type, 7);
  doughnut("chart-aircraft", a.labels, a.values);

  // qualification holding rate
  const qualLabels = QUAL_ORDER.filter((l) => l in (overall.qual || {}));
  makeChart("chart-qual", {
    type: "bar",
    data: { labels: qualLabels.map(tr), datasets: [{ data: qualLabels.map((l) => pct(overall.qual[l], overall.n)), backgroundColor: "#2b7fc4", borderRadius: 4 }] },
    options: {
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmtPct(c.parsed.y) } } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: "#eef2f6" }, ticks: { callback: (v) => `${v}%` } },
      },
    },
  });

  // manufacture / modified
  const m = topEntries(overall.manufacture, 6);
  doughnut("chart-manufacture", m.labels, m.values);
  const d = topEntries(overall.modified, 6);
  doughnut("chart-modified", d.labels, d.values);

  // purpose monthly trend (top 6 purposes by overall)
  const topPurpose = Object.entries(overall.purpose).sort((x, y) => y[1] - x[1]).slice(0, 6).map((e) => e[0]);
  const purposeSeries = topPurpose.map((label) => ({
    label: tr(label),
    data: months.map((mo) => {
      const pp = timeline[mo].purpose || {};
      const total = Object.values(pp).reduce((x, y) => x + y, 0);
      return pct(pp[label] || 0, total);
    }),
  }));
  multiLine("chart-purpose-trend", months, purposeSeries, true);

  // qualification monthly trend
  const qualSeries = QUAL_ORDER.map((label) => ({
    label: tr(label),
    data: months.map((mo) => pct((timeline[mo].qual || {})[label] || 0, timeline[mo].n)),
  }));
  multiLine("chart-qual-trend", months, qualSeries, true);

  // airspace / method
  const as = topEntries(overall.airspace);
  horizontalBar("chart-airspace", as.labels, as.values, "#3fa7d6");
  const me = topEntries(overall.method);
  horizontalBar("chart-method", me.labels, me.values, "#5cc9b0");

  // prefectures
  const pref = topEntries(overall.prefecture, 15);
  horizontalBar("chart-pref", pref.labels, pref.values, "#e0962f");
}

/* ---- i18n application & language switching ----------------------------- */
function applyStaticI18n() {
  document.documentElement.lang = LANG;
  document.title = s("doc.title");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = STR[LANG][el.getAttribute("data-i18n")];
    if (v != null) el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const v = STR[LANG][el.getAttribute("data-i18n-html")];
    if (v != null) el.innerHTML = v;
  });
  document.querySelectorAll(".lang-switch button").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-lang") === LANG);
  });
}

function setLanguage(lang) {
  if (!STR[lang]) return;
  LANG = lang;
  try { localStorage.setItem("lang", LANG); } catch (e) { /* ignore */ }
  applyStaticI18n();
  if (DB) { renderKPIs(); renderCharts(); }
}

function initLanguageControls() {
  document.querySelectorAll(".lang-switch button").forEach((b) => {
    b.addEventListener("click", () => setLanguage(b.getAttribute("data-lang")));
  });
  // Japanese is the default; an explicit choice is remembered across visits.
  let saved = null;
  try { saved = localStorage.getItem("lang"); } catch (e) { /* ignore */ }
  LANG = STR[saved] ? saved : "ja";
}

/* ---- Boot -------------------------------------------------------------- */
async function main() {
  initLanguageControls();
  applyStaticI18n();
  try {
    const [summary, meta] = await Promise.all([
      loadJSON("data/summary.json"),
      loadJSON("data/meta.json"),
    ]);
    DB = { summary, meta };
    renderKPIs();
    renderCharts();
  } catch (err) {
    console.error(err);
    const notice = document.getElementById("notice");
    if (notice) {
      const p = document.createElement("p");
      p.style.color = "#b00020";
      p.textContent = LANG === "en"
        ? "Failed to load data. Check that the aggregate files (docs/data/) have been generated."
        : "データの読み込みに失敗しました。集計ファイル（docs/data/）が生成されているか確認してください。";
      notice.appendChild(p);
    }
  }
}

main();
