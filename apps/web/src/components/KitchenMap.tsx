import * as React from 'react';
import { MapPin } from 'lucide-react';
import { hasMapbox, loadMapbox } from '@/lib/mapbox';
import { formatCents, type Kitchen } from '@culina/shared';
import { cn } from '@/lib/utils';

type GeoKitchen = Kitchen & { latitude?: number | null; longitude?: number | null };

const hasCoords = (k: GeoKitchen): k is GeoKitchen & { latitude: number; longitude: number } =>
  typeof k.latitude === 'number' && typeof k.longitude === 'number';

interface Props {
  kitchens: GeoKitchen[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

/**
 * Interactive kitchen-discovery map. Uses Mapbox GL when a public token is
 * configured (VITE_MAPBOX_TOKEN); otherwise renders a styled static fallback
 * that still plots every kitchen by relative location — so the page looks and
 * works great with zero map setup.
 */
export function KitchenMap({ kitchens, selectedId, onSelect, className }: Props) {
  const geo = kitchens.filter(hasCoords);
  if (hasMapbox() && geo.length > 0) {
    return <LiveMap kitchens={geo} selectedId={selectedId} onSelect={onSelect} className={className} />;
  }
  return <StaticMap kitchens={geo} selectedId={selectedId} onSelect={onSelect} className={className} />;
}

/* ─────────────────────────── Live Mapbox ─────────────────────────── */
function LiveMap({
  kitchens,
  selectedId,
  onSelect,
  className,
}: {
  kitchens: (GeoKitchen & { latitude: number; longitude: number })[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<Record<string, any>>({});
  const [failed, setFailed] = React.useState(false);
  // Keep the latest onSelect without re-running the init effect.
  const selectRef = React.useRef(onSelect);
  selectRef.current = onSelect;

  React.useEffect(() => {
    let cancelled = false;
    loadMapbox()
      .then((mapboxgl) => {
        if (cancelled || !containerRef.current) return;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [kitchens[0].longitude, kitchens[0].latitude],
          zoom: 4.2,
          attributionControl: true,
        });
        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

        const bounds = new mapboxgl.LngLatBounds();
        for (const k of kitchens) {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'culina-pin';
          el.innerHTML =
            '<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:50% 50% 50% 0;background:#2D4A3E;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #C8963E;cursor:pointer"><span style="transform:rotate(45deg);width:8px;height:8px;border-radius:50%;background:#C8963E"></span></span>';
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            selectRef.current?.(k.id);
          });
          const popup = new mapboxgl.Popup({ offset: 24, closeButton: false }).setHTML(
            `<div style="font-family:Inter,sans-serif;font-size:12px;line-height:1.3"><strong>${escapeHtml(
              k.name,
            )}</strong><br/>${escapeHtml([k.city, k.state].filter(Boolean).join(', '))}<br/><span style="color:#2D4A3E;font-weight:600">from ${formatCents(
              k.monthly_price_cents,
            )}/mo</span></div>`,
          );
          const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([k.longitude, k.latitude])
            .setPopup(popup)
            .addTo(map);
          markersRef.current[k.id] = marker;
          bounds.extend([k.longitude, k.latitude]);
        }
        if (kitchens.length > 1) map.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 0 });
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
      mapRef.current?.remove?.();
      mapRef.current = null;
      markersRef.current = {};
    };
    // Re-init only when the set of kitchen ids changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitchens.map((k) => k.id).join(',')]);

  // Fly to + open popup for the selected kitchen.
  React.useEffect(() => {
    const map = mapRef.current;
    const marker = selectedId ? markersRef.current[selectedId] : null;
    if (!map || !marker) return;
    map.flyTo({ center: marker.getLngLat(), zoom: Math.max(map.getZoom(), 9), duration: 700 });
    marker.togglePopup?.();
    return () => marker.getPopup()?.remove?.();
  }, [selectedId]);

  if (failed) return <StaticMap kitchens={kitchens} selectedId={selectedId} onSelect={onSelect} className={className} />;

  return <div ref={containerRef} className={cn('h-full w-full overflow-hidden rounded-2xl', className)} />;
}

/* ─────────────────────────── Static fallback ─────────────────────────── */
function StaticMap({
  kitchens,
  selectedId,
  onSelect,
  className,
}: {
  kitchens: (GeoKitchen & { latitude?: number | null; longitude?: number | null })[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const pts = kitchens.filter(hasCoords);
  const lats = pts.map((k) => k.latitude);
  const lngs = pts.map((k) => k.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const norm = (v: number, lo: number, hi: number) => (hi === lo ? 0.5 : (v - lo) / (hi - lo));

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-50 via-secondary/30 to-sky-50',
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: 'linear-gradient(#0000000d 1px,transparent 1px),linear-gradient(90deg,#0000000d 1px,transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <span className="absolute left-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
        Map preview
      </span>
      {pts.map((k) => {
        const left = 8 + norm(k.longitude, minLng, maxLng) * 84; // % with padding
        const top = 88 - norm(k.latitude, minLat, maxLat) * 76; // invert: north = up
        const active = k.id === selectedId;
        return (
          <button
            key={k.id}
            type="button"
            onClick={() => onSelect?.(k.id)}
            style={{ left: `${left}%`, top: `${top}%` }}
            className="group absolute -translate-x-1/2 -translate-y-full focus:outline-none"
            aria-label={k.name}
          >
            <MapPin
              className={cn(
                'h-7 w-7 drop-shadow transition-transform',
                active ? 'scale-125 fill-accent text-primary' : 'fill-primary text-accent group-hover:scale-110',
              )}
            />
            <span
              className={cn(
                'absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-secondary shadow-lg transition-opacity',
                active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
            >
              {k.name} · {formatCents(k.monthly_price_cents)}/mo
            </span>
          </button>
        );
      })}
      {pts.length === 0 && (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          No mapped kitchens in this view yet.
        </div>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
