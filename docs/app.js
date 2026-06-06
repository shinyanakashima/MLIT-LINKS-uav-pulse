"use strict";

/* Drone industry trend dashboard — renders compact aggregates produced by
 * etl/aggregate.py. Pure client-side, no external runtime dependencies. */

const PALETTE = [
  "#15568c", "#2b7fc4", "#3fa7d6", "#5cc9b0", "#7bbf6a",
  "#c2c54a", "#e0962f", "#e5673b", "#cf4b6c", "#9b59b6",
  "#6c7a89", "#34495e", "#16a085",
];

const fmtInt = (n) => (n == null ? "—" : n.toLocaleString("ja-JP"));
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

/* Sort a {label: count} object into [labels[], values[]], optionally capped. */
function topEntries(obj, limit) {
  const entries = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
  const capped = limit ? entries.slice(0, limit) : entries;
  return {
    labels: capped.map((e) => e[0]),
    values: capped.map((e) => e[1]),
  };
}

function horizontalBar(id, labels, values, color, valueFmt) {
  new Chart(document.getElementById(id), {
    type: "bar",
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: color, borderRadius: 4 }],
    },
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
  new Chart(document.getElementById(id), {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: PALETTE, borderColor: "#fff", borderWidth: 2 }],
    },
    options: {
      cutout: "55%",
      plugins: {
        legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const total = c.dataset.data.reduce((a, b) => a + b, 0);
              return `${c.label}: ${fmtInt(c.parsed)}（${fmtPct(pct(c.parsed, total))}）`;
            },
          },
        },
      },
    },
  });
}

function renderKPIs(meta, overall) {
  document.getElementById("kpi-total").textContent = fmtInt(overall.n);
  document.getElementById("kpi-aircraft").textContent = fmtInt(overall.n_aircraft);
  document.getElementById("kpi-qual").textContent = fmtPct(pct(overall.qual_any, overall.n));
  document.getElementById("kpi-comp").textContent = fmtPct(pct(overall.comprehensive, overall.n));

  const first = meta.months_covered[0];
  const last = meta.months_covered[meta.months_covered.length - 1];
  document.getElementById("period-badge").textContent = `対象期間: ${first} 〜 ${last}（月次）`;
  document.getElementById("generated").textContent = `集計生成日: ${meta.generated}`;
  if (meta.attribution) document.getElementById("attribution").textContent = meta.attribution;
}

function renderVolume(months, timeline) {
  const values = months.map((m) => timeline[m].n);
  new Chart(document.getElementById("chart-volume"), {
    type: "bar",
    data: {
      labels: months,
      datasets: [{ label: "飛行計画 件数", data: values, backgroundColor: "#2b7fc4", borderRadius: 4 }],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${fmtInt(c.parsed.y)} 件` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: "#eef2f6" }, ticks: { callback: (v) => fmtInt(v) } },
      },
    },
  });
}

function renderPurpose(overall) {
  const { labels, values } = topEntries(overall.purpose);
  horizontalBar("chart-purpose", labels, values, "#15568c");
}

function renderAircraft(overall) {
  const { labels, values } = topEntries(overall.aircraft_type, 7);
  doughnut("chart-aircraft", labels, values);
}

function renderQual(overall) {
  const order = ["機体認証（一種）", "機体認証（二種）", "技能証明（一等）", "技能証明（二等）"];
  const labels = order.filter((l) => l in (overall.qual || {}));
  const values = labels.map((l) => pct(overall.qual[l], overall.n));
  new Chart(document.getElementById("chart-qual"), {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: "#2b7fc4", borderRadius: 4 }] },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => fmtPct(c.parsed.y) } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: "#eef2f6" }, ticks: { callback: (v) => `${v}%` } },
      },
    },
  });
}

function renderManufactureModified(overall) {
  const m = topEntries(overall.manufacture, 6);
  doughnut("chart-manufacture", m.labels, m.values);
  const d = topEntries(overall.modified, 6);
  doughnut("chart-modified", d.labels, d.values);
}

function renderAirspaceMethod(overall) {
  const a = topEntries(overall.airspace);
  horizontalBar("chart-airspace", a.labels, a.values, "#3fa7d6");
  const me = topEntries(overall.method);
  horizontalBar("chart-method", me.labels, me.values, "#5cc9b0");
}

function renderPrefecture(overall) {
  const { labels, values } = topEntries(overall.prefecture, 15);
  horizontalBar("chart-pref", labels, values, "#e0962f");
}

function multiLine(id, months, series, yIsPercent) {
  const datasets = series.map((s, i) => ({
    label: s.label,
    data: s.data,
    borderColor: PALETTE[i % PALETTE.length],
    backgroundColor: PALETTE[i % PALETTE.length],
    borderWidth: 2,
    tension: 0.25,
    pointRadius: 2,
    fill: false,
  }));
  new Chart(document.getElementById(id), {
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
        y: {
          beginAtZero: true,
          grid: { color: "#eef2f6" },
          ticks: { callback: (v) => (yIsPercent ? `${v}%` : fmtInt(v)) },
        },
      },
    },
  });
}

function renderPurposeTrend(overall, months, timeline) {
  // Pick the top business purposes overall, then show their per-month share of
  // the purpose-flag total (comprehensive rows already excluded upstream).
  const top = topEntries(overall.purpose, 6).labels;
  const series = top.map((label) => ({
    label,
    data: months.map((m) => {
      const p = timeline[m].purpose || {};
      const total = Object.values(p).reduce((a, b) => a + b, 0);
      return pct(p[label] || 0, total);
    }),
  }));
  multiLine("chart-purpose-trend", months, series, true);
}

function renderQualTrend(months, timeline) {
  const order = ["機体認証（一種）", "機体認証（二種）", "技能証明（一等）", "技能証明（二等）"];
  const series = order.map((label) => ({
    label,
    data: months.map((m) => pct((timeline[m].qual || {})[label] || 0, timeline[m].n)),
  }));
  multiLine("chart-qual-trend", months, series, true);
}

async function main() {
  try {
    const [summary, meta] = await Promise.all([
      loadJSON("data/summary.json"),
      loadJSON("data/meta.json"),
    ]);
    const { overall, months, timeline } = summary;
    renderKPIs(meta, overall);
    renderVolume(months, timeline);
    renderPurpose(overall);
    renderAircraft(overall);
    renderQual(overall);
    renderManufactureModified(overall);
    renderPurposeTrend(overall, months, timeline);
    renderQualTrend(months, timeline);
    renderAirspaceMethod(overall);
    renderPrefecture(overall);
  } catch (err) {
    console.error(err);
    const notice = document.getElementById("notice");
    if (notice) {
      const p = document.createElement("p");
      p.style.color = "#b00020";
      p.textContent = "データの読み込みに失敗しました。集計ファイル（docs/data/）が生成されているか確認してください。";
      notice.appendChild(p);
    }
  }
}

main();
