import type { Lang } from "./i18n";

export const PALETTE = [
  "#15568c", "#2b7fc4", "#3fa7d6", "#5cc9b0", "#7bbf6a",
  "#c2c54a", "#e0962f", "#e5673b", "#cf4b6c", "#9b59b6",
  "#6c7a89", "#34495e", "#16a085",
];

export type Counts = Record<string, number>;

export interface Agg {
  n: number;
  n_aircraft: number;
  n_records: number;
  comprehensive: number;
  qual_any: number;
  purpose: Counts;
  non_business: Counts;
  airspace: Counts;
  method: Counts;
  qual: Counts;
  prefecture: Counts;
  aircraft_type: Counts;
  manufacture: Counts;
  modified: Counts;
}

export interface Summary {
  overall: Agg;
  months: string[];
  timeline: Record<string, Agg>;
  labels: { purpose: string[]; qualification: string[] };
}

export interface Meta {
  generated: string;
  total_plans: number;
  total_aircraft: number;
  total_records: number;
  months_covered: string[];
  comprehensive_threshold: number;
  source: string;
  attribution: string;
}

export const fmtInt = (n: number | null | undefined, lang: Lang) =>
  n == null ? "—" : n.toLocaleString(lang === "en" ? "en-US" : "ja-JP");

export const pct = (num: number, den: number) => (den ? (100 * num) / den : 0);
export const fmtPct = (p: number) => `${p.toFixed(1)}%`;

/* Sort a {label: count} map into a descending [{name, value}] array, optionally capped. */
export function topEntries(
  obj: Counts | undefined,
  tr: (s: string) => string,
  limit?: number,
): { name: string; value: number }[] {
  const entries = Object.entries(obj ?? {}).sort((a, b) => b[1] - a[1]);
  const capped = limit ? entries.slice(0, limit) : entries;
  return capped.map(([name, value]) => ({ name: tr(name), value }));
}

export async function loadJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}
