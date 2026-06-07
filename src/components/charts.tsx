"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

// Greyscale-friendly palette so charts stay legible in print/screenshots.
const INK = "#1f2937";
const SHADES = ["#94a3b8", "#64748b", "#475569", "#334155"];

// Semantic colours for the on-screen (non-print) analytics charts: benign
// engagement cool, risky actions warm, reporting green.
const RATE_COLOR: Record<string, string> = {
  Open: "#4f63c4",
  Click: "#f59e0b",
  Submit: "#ef4444",
  Report: "#10b981",
  "Phish-prone": "#be123c",
};
const severityColor = (v: number) => (v >= 67 ? "#dc2626" : v >= 34 ? "#f59e0b" : "#10b981");

export function RatesBarChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: INK }} />
        <YAxis tick={{ fontSize: 12, fill: INK }} unit="%" domain={[0, 100]} />
        <Tooltip formatter={(v: number) => `${v}%`} />
        {/* Animation off → charts render fully on first paint, so PDF export and
            screenshots (Chapter 5 figures) are deterministic. */}
        <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((_, i) => <Cell key={i} fill={SHADES[i % SHADES.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TimeSeriesChart({
  data,
}: {
  data: { minute: number; opened: number; clicked: number; submitted: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="minute" tick={{ fontSize: 12, fill: INK }} unit="m" />
        <YAxis tick={{ fontSize: 12, fill: INK }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="opened" stroke={SHADES[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="clicked" stroke={SHADES[2]} strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="submitted" stroke={INK} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Semantic per-stage colours for the dashboard funnel: benign steps cool,
// risky steps warm, "reported" green. (Dashboard only — not a print figure.)
const STAGE_COLOR: Record<string, string> = {
  Delivered: "#9aa1b1",
  Opened: "#5b6fd0",
  Clicked: "#f59e0b",
  Submitted: "#dc2626",
  Reported: "#10b981",
};

// Colour variant of the rates chart for the analytics screen (each bar carries
// a semantic colour + a % label). The greyscale RatesBarChart stays for print.
export function EngagementRatesChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={248}>
      <BarChart data={data} margin={{ top: 18, right: 8, bottom: 8, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: INK }} axisLine={{ stroke: "#e5e8ee" }} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: INK }} unit="%" domain={[0, 100]} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: number) => `${v}%`} cursor={{ fill: "#f6f7f9" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={RATE_COLOR[d.name] ?? INK} />)}
          <LabelList dataKey="value" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fontWeight: 600, fill: INK }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Colour variant of the department chart: bars shaded green/amber/red by risk.
export function DepartmentRiskChart({
  data,
}: {
  data: { department: string; phishProne: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: INK }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="department" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: INK }} />
        <Tooltip formatter={(v: number) => `${v}%`} cursor={{ fill: "#f6f7f9" }} />
        <Bar dataKey="phishProne" radius={[0, 6, 6, 0]} barSize={20} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={severityColor(d.phishProne)} />)}
          <LabelList dataKey="phishProne" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fontWeight: 600, fill: INK }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EngagementFunnelChart({
  data,
}: {
  data: { stage: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={252}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: INK }} />
        <YAxis type="category" dataKey="stage" width={82} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: INK }} />
        <Tooltip cursor={{ fill: "#f6f7f9" }} />
        <Bar dataKey="value" barSize={22} radius={[0, 6, 6, 0]} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={STAGE_COLOR[d.stage] ?? INK} />)}
          <LabelList dataKey="value" position="right" style={{ fontSize: 12, fontWeight: 600, fill: INK }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DepartmentBarChart({
  data,
}: {
  data: { department: string; phishProne: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: INK }} />
        <YAxis type="category" dataKey="department" width={120} tick={{ fontSize: 12, fill: INK }} />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Bar dataKey="phishProne" radius={[0, 4, 4, 0]} fill={SHADES[1]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
