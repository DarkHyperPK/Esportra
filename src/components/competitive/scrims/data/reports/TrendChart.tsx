import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART } from './chartTheme';

export interface TrendPoint { label: string; [series: string]: number | string | null }
export interface TrendLine { key: string; name: string; color: string }

/** Lines over maps in order. The recharts bundle lives behind the report tabs, which load on demand. A reference line (e.g. 50%) marks the break-even. */
export default function TrendChart({ data, lines, domain, reference, unit = '' }: { data: TrendPoint[]; lines: TrendLine[]; domain?: [number, number]; reference?: number; unit?: string }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.grid }} interval="preserveStartEnd" />
          <YAxis domain={domain} tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} unit={unit} width={48} />
          {reference != null && <ReferenceLine y={reference} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" />}
          <Tooltip contentStyle={{ background: '#16161a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: CHART.text }} />
          {lines.map((l) => (
            <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: '#0c0c0f', fill: l.color }} activeDot={{ r: 5 }} connectNulls isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
