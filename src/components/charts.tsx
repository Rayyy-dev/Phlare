"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

// Greyscale-friendly palette so charts stay legible in print/screenshots.
const INK = "#1f2937";
const SHADES = ["#94a3b8", "#64748b", "#475569", "#334155"];

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
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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
        <Line type="monotone" dataKey="opened" stroke={SHADES[0]} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="clicked" stroke={SHADES[2]} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="submitted" stroke={INK} strokeWidth={2} dot={false} />
      </LineChart>
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
        <Bar dataKey="phishProne" radius={[0, 4, 4, 0]} fill={SHADES[1]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
