import { CheckCircle2, AlertTriangle, XCircle, Star, MapPin } from 'lucide-react';

/**
 * Live, miniature renderings of real Culina screens, used inside <BrowserFrame>
 * across the marketing site. These are deliberately static (no data fetching)
 * and self-contained so they stay fast and never break — think "interactive
 * screenshots" built in React. Chart-based screens live in MarketingCharts.tsx
 * so recharts stays out of the eager landing bundle.
 */

/* ───────────────────────── Booking calendar ───────────────────────── */
export function ScreenCalendar() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  // [day index, top%, height%, color, label]
  const blocks: [number, number, number, string, string][] = [
    [0, 8, 22, 'bg-emerald-500', "Sara's Sourdough"],
    [0, 60, 18, 'bg-accent', 'Marco Salsa'],
    [1, 22, 28, 'bg-sky-500', 'Amara Catering'],
    [2, 12, 20, 'bg-emerald-500', "Sara's Sourdough"],
    [2, 52, 24, 'bg-violet-500', 'Cookie Co.'],
    [3, 34, 30, 'bg-accent', 'Marco Salsa'],
    [4, 10, 16, 'bg-sky-500', 'Amara Catering'],
    [4, 44, 26, 'bg-emerald-500', "Sara's Sourdough"],
  ];
  return (
    <div className="p-4 text-[11px]">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-heading text-sm font-semibold text-foreground">Booking calendar</div>
        <div className="flex gap-1">
          <span className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-secondary">Week</span>
          <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">Month</span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {days.map((d, i) => (
          <div key={d} className="relative">
            <div className="mb-1 text-center text-[10px] font-semibold text-muted-foreground">{d}</div>
            <div className="relative h-40 rounded-md border bg-muted/30">
              {blocks
                .filter((b) => b[0] === i)
                .map((b, j) => (
                  <div
                    key={j}
                    className={`absolute inset-x-1 rounded ${b[3]} px-1.5 py-0.5 text-[9px] font-medium text-white shadow-sm`}
                    style={{ top: `${b[1]}%`, height: `${b[2]}%` }}
                  >
                    <span className="line-clamp-2 leading-tight">{b[4]}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2 text-emerald-700">
        <span className="font-medium">85% booked this week</span>
        <span className="font-mono font-semibold">+$4,210</span>
      </div>
    </div>
  );
}

/* ───────────────────────── Storefront ───────────────────────── */
export function ScreenStorefront() {
  const products = [
    { name: 'Country Sourdough', price: 9, emoji: '🥖', g: 'from-amber-500 to-yellow-400' },
    { name: 'Seeded Batard', price: 11, emoji: '🌾', g: 'from-orange-500 to-amber-400' },
    { name: 'Cinnamon Rolls', price: 14, emoji: '🧁', g: 'from-rose-500 to-amber-400' },
    { name: 'Focaccia', price: 8, emoji: '🫓', g: 'from-lime-500 to-emerald-400' },
  ];
  return (
    <div className="text-[11px]">
      <div className="relative h-20 bg-gradient-to-r from-primary to-emerald-700 px-4 py-3 text-secondary">
        <div className="font-heading text-base font-bold text-white">Sara&apos;s Sourdough</div>
        <div className="text-[10px] text-secondary/80">Naturally leavened · Minneapolis</div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        {products.map((p) => (
          <div key={p.name} className="overflow-hidden rounded-lg border bg-card">
            <div className={`grid h-12 place-items-center bg-gradient-to-br ${p.g} text-xl`}>{p.emoji}</div>
            <div className="p-2">
              <div className="truncate font-medium text-foreground">{p.name}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono font-semibold text-primary">${p.price}.00</span>
                <span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-semibold text-accent-foreground">Add</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Compliance ───────────────────────── */
export function ScreenCompliance() {
  const docs: [string, string, 'ok' | 'warn' | 'bad'][] = [
    ['ServSafe Certificate', 'Expires in 7 mo', 'ok'],
    ['Liability Insurance (COI)', 'Expires in 20 days', 'warn'],
    ['Food Handler Card', 'Expired', 'bad'],
    ['Cottage Food Permit', 'Approved', 'ok'],
  ];
  const cfg = {
    ok: { Icon: CheckCircle2, c: 'text-emerald-600', bg: 'bg-emerald-50' },
    warn: { Icon: AlertTriangle, c: 'text-amber-600', bg: 'bg-amber-50' },
    bad: { Icon: XCircle, c: 'text-red-500', bg: 'bg-red-50' },
  };
  return (
    <div className="p-4 text-[11px]">
      <div className="mb-3 font-heading text-sm font-semibold text-foreground">Compliance center</div>
      <div className="space-y-2">
        {docs.map(([name, status, s]) => {
          const { Icon, c, bg } = cfg[s];
          return (
            <div key={name} className={`flex items-center gap-2 rounded-lg ${bg} px-3 py-2`}>
              <Icon className={`h-4 w-4 shrink-0 ${c}`} />
              <span className="flex-1 truncate font-medium text-foreground">{name}</span>
              <span className={`shrink-0 font-medium ${c}`}>{status}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-[10px] text-muted-foreground">
        Auto-reminders sent 30, 14 &amp; 3 days before expiry.
      </div>
    </div>
  );
}

/* ───────────────────────── Discovery / directory ───────────────────────── */
export function ScreenDiscovery() {
  const items = [
    { n: 'Midwest Food Hub', c: 'Minneapolis, MN', p: '$49/mo', e: '🏭' },
    { n: 'Lakeside Commissary', c: 'Madison, WI', p: '$59/mo', e: '🥘' },
    { n: 'River North Kitchens', c: 'Chicago, IL', p: '$79/mo', e: '🍽️' },
  ];
  return (
    <div className="grid grid-cols-5 text-[11px]">
      {/* faux map */}
      <div className="relative col-span-2 min-h-[16rem] overflow-hidden bg-gradient-to-br from-emerald-50 to-sky-50">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(#0001 1px,transparent 1px),linear-gradient(90deg,#0001 1px,transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        {[
          [30, 40], [55, 25], [70, 65],
        ].map(([t, l], i) => (
          <div key={i} className="absolute -translate-x-1/2 -translate-y-full" style={{ top: `${t}%`, left: `${l}%` }}>
            <MapPin className="h-5 w-5 fill-accent text-primary drop-shadow" />
          </div>
        ))}
      </div>
      {/* list */}
      <div className="col-span-3 space-y-2 p-3">
        <div className="font-heading text-sm font-semibold text-foreground">Kitchens near you</div>
        {items.map((k) => (
          <div key={k.n} className="flex items-center gap-2 rounded-lg border bg-card p-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-muted text-base">{k.e}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 truncate font-medium text-foreground">
                {k.n}
                <Star className="h-3 w-3 fill-accent text-accent" />
              </div>
              <div className="truncate text-[10px] text-muted-foreground">{k.c}</div>
            </div>
            <span className="shrink-0 font-semibold text-primary">{k.p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
