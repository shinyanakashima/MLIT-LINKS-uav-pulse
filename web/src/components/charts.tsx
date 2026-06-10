import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, PieChart, Pie, Legend, LineChart, Line,
} from "recharts";
import { PALETTE, fmtInt, fmtPct } from "../lib/data";
import type { Lang } from "../lib/i18n";

const AXIS = { fontSize: 11, fill: "#5a6b7b" };
const GRID = "#eef2f6";

type Datum = { name: string; value: number };

/* Horizontal bar — category on Y, value on X. */
export function HBar({
  data, color, lang, percent = false, yWidth = 150,
}: { data: Datum[]; color: string; lang: Lang; percent?: boolean; yWidth?: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis
          type="number"
          tick={AXIS}
          tickFormatter={(v: number) => (percent ? `${v}%` : fmtInt(v, lang))}
        />
        <YAxis type="category" dataKey="name" width={yWidth} tick={AXIS} />
        <Tooltip
          formatter={(v) => (percent ? fmtPct(v as number) : fmtInt(v as number, lang))}
          labelStyle={{ display: "none" }}
        />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* Vertical bar — used for the monthly volume timeline. */
export function VBar({
  data, color, lang, unit,
}: { data: { month: string; value: number }[]; color: string; lang: Lang; unit: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 8, right: 12, top: 8, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tick={AXIS} />
        <YAxis tick={AXIS} tickFormatter={(v: number) => fmtInt(v, lang)} width={56} />
        <Tooltip formatter={(v) => `${fmtInt(v as number, lang)} ${unit}`} />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* Donut with a legend (right by default, bottom for narrow split panels). */
export function Donut({
  data, lang, legend = "right",
}: { data: Datum[]; lang: Lang; legend?: "right" | "bottom" }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  const bottom = legend === "bottom";
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data} dataKey="value" nameKey="name"
          innerRadius="52%" outerRadius="78%" stroke="#fff" strokeWidth={2}
          cx={bottom ? "50%" : "42%"} cy={bottom ? "45%" : "50%"}
        >
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip
          formatter={(v, n) => [`${fmtInt(v as number, lang)} (${fmtPct((100 * (v as number)) / total)})`, n as string]}
        />
        <Legend
          layout={bottom ? "horizontal" : "vertical"}
          align={bottom ? "center" : "right"}
          verticalAlign={bottom ? "bottom" : "middle"}
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* Multi-series line — monthly trends. */
export function MultiLine({
  data, keys, lang, percent = false,
}: {
  data: Record<string, number | string>[];
  keys: string[];
  lang: Lang;
  percent?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ left: 8, right: 12, top: 8, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tick={AXIS} />
        <YAxis
          tick={AXIS} width={48}
          tickFormatter={(v: number) => (percent ? `${v}%` : fmtInt(v, lang))}
        />
        <Tooltip formatter={(v) => (percent ? fmtPct(v as number) : fmtInt(v as number, lang))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {keys.map((k, i) => (
          <Line
            key={k} type="monotone" dataKey={k}
            stroke={PALETTE[i % PALETTE.length]} strokeWidth={2}
            dot={{ r: 2 }} activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
