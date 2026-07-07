import * as React from 'react';
import { project } from '@/lib/crm';

/**
 * A dependency-free "where are they" map: customers plotted by real lat/lng with
 * an equirectangular projection over the continental US, on a subtle graticule.
 * No tiles, no token, no external calls — fully self-contained and offline-safe.
 */
export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  color: string; // pin fill
}

const W = 1000;
const H = 620;

export function UsMap({
  points,
  selectedId,
  onSelect,
  className,
}: {
  points: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const [hover, setHover] = React.useState<string | null>(null);

  // Spread out perfectly-overlapping pins (same coords) into a small cluster.
  const placed = React.useMemo(() => {
    const byKey = new Map<string, number>();
    return points.map((p) => {
      const { x, y } = project(p.lat, p.lng);
      const key = `${x.toFixed(3)},${y.toFixed(3)}`;
      const n = byKey.get(key) ?? 0;
      byKey.set(key, n + 1);
      const angle = n * 2.399; // golden-angle spiral
      const r = n === 0 ? 0 : 8 + n * 3;
      return { ...p, px: x * W + Math.cos(angle) * r, py: y * H + Math.sin(angle) * r };
    });
  }, [points]);

  const active = hover ?? selectedId ?? null;

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-lg border bg-[#F4F7F5]" role="img" aria-label="Customer locations across the United States">
        <defs>
          <radialGradient id="mapglow" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#EAF0EC" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#mapglow)" />

        {/* graticule (lng every 10°, lat every 5°) */}
        <g stroke="#CBD9D0" strokeWidth="1" opacity="0.7">
          {Array.from({ length: 7 }).map((_, i) => {
            const x = (i / 6) * W;
            return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} />;
          })}
          {Array.from({ length: 6 }).map((_, i) => {
            const y = (i / 5) * H;
            return <line key={`h${i}`} x1={0} y1={y} x2={W} y2={y} />;
          })}
        </g>
        <text x={16} y={H - 16} fontSize="20" fill="#9CB0A4" fontWeight="600" letterSpacing="1">UNITED STATES</text>

        {/* pins */}
        {placed.map((p) => {
          const isActive = active === p.id;
          const rad = isActive ? 10 : 7;
          return (
            <g
              key={p.id}
              transform={`translate(${p.px}, ${p.py})`}
              className="cursor-pointer"
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover((h) => (h === p.id ? null : h))}
              onClick={() => onSelect?.(p.id)}
            >
              {isActive && <circle r={rad + 8} fill={p.color} opacity="0.18" />}
              <circle r={rad} fill={p.color} stroke="#fff" strokeWidth="2.5" />
              <title>{p.label}{p.sub ? ` — ${p.sub}` : ''}</title>
            </g>
          );
        })}

        {/* tooltip for the hovered pin */}
        {placed
          .filter((p) => p.id === active)
          .map((p) => {
            const left = p.px > W - 220;
            return (
              <g key={`t-${p.id}`} transform={`translate(${p.px + (left ? -12 : 12)}, ${p.py})`} pointerEvents="none">
                <g transform={`translate(${left ? -210 : 0}, -34)`}>
                  <rect width="210" height="46" rx="8" fill="#1A1A1A" opacity="0.92" />
                  <text x="12" y="20" fill="#fff" fontSize="16" fontWeight="700">{clip(p.label, 24)}</text>
                  {p.sub && <text x="12" y="38" fill="#D1D5DB" fontSize="13">{clip(p.sub, 30)}</text>}
                </g>
              </g>
            );
          })}
      </svg>
    </div>
  );
}

const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1) + '…');
