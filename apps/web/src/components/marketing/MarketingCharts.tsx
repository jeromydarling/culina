import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { ChefHat, TrendingUp } from 'lucide-react';

/**
 * Recharts-backed marketing screens, kept in a separate module so the heavy
 * charting library only ships with pages that actually use it (e.g. the lazy
 * Features page) — never the eager landing bundle.
 */

const money = (n: number) => `$${n.toLocaleString()}`;

const revData = [
  { m: 'Jan', v: 18 }, { m: 'Feb', v: 22 }, { m: 'Mar', v: 28 },
  { m: 'Apr', v: 26 }, { m: 'May', v: 35 }, { m: 'Jun', v: 41 },
];

export function ScreenAnalytics() {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-heading text-sm font-semibold text-foreground">Revenue</div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          <TrendingUp className="h-3 w-3" /> +127%
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        {[
          ['MRR', '$8.4k'],
          ['Utilization', '85%'],
          ['Retention', '94%'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border bg-muted/30 p-2">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{k}</div>
            <div className="font-heading text-base font-bold text-foreground">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="mkRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C8963E" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#C8963E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="m" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={false} contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => money(v * 1000)} />
            <Area type="monotone" dataKey="v" stroke="#C8963E" strokeWidth={2} fill="url(#mkRev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const costData = [
  { n: 'Flour', v: 0.62 },
  { n: 'Levain', v: 0.18 },
  { n: 'Salt', v: 0.04 },
  { n: 'Labor', v: 0.95 },
  { n: 'Pkg', v: 0.31 },
];

export function ScreenRecipeCost() {
  return (
    <div className="p-4 text-[11px]">
      <div className="mb-1 flex items-center gap-1.5">
        <ChefHat className="h-4 w-4 text-accent" />
        <span className="font-heading text-sm font-semibold text-foreground">Country Sourdough</span>
      </div>
      <div className="text-[10px] text-muted-foreground">Food Cost Lab · per loaf</div>
      <div className="mt-3 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={costData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="n" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => `$${v.toFixed(2)}`} />
            <Bar dataKey="v" fill="#2D4A3E" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border bg-muted/30 p-2">
          <div className="text-[9px] uppercase text-muted-foreground">Cost</div>
          <div className="font-mono text-sm font-bold text-foreground">$2.10</div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-2">
          <div className="text-[9px] uppercase text-muted-foreground">Price</div>
          <div className="font-mono text-sm font-bold text-foreground">$9.00</div>
        </div>
        <div className="rounded-lg border bg-emerald-50 p-2">
          <div className="text-[9px] uppercase text-emerald-700">Margin</div>
          <div className="font-mono text-sm font-bold text-emerald-700">77%</div>
        </div>
      </div>
    </div>
  );
}
