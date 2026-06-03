import * as React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A clean, chromeless-style browser window used to frame live React mini-UIs
 * ("screenshots") across the marketing site. The chrome is intentionally
 * minimal — three dots and a slim address pill — so the product UI inside is
 * the hero. Everything inside is real, rendered React, not a static image.
 */
export function BrowserFrame({
  url = 'culina.app',
  children,
  className,
  tone = 'light',
  tilt = false,
  glow = false,
}: {
  url?: string;
  children: React.ReactNode;
  className?: string;
  /** address-bar/chrome tone */
  tone?: 'light' | 'dark';
  /** subtle 3D tilt for collage placements */
  tilt?: boolean;
  /** soft accent glow behind the window */
  glow?: boolean;
}) {
  const dark = tone === 'dark';
  return (
    <div className={cn('relative', className)}>
      {glow && (
        <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-accent/30 via-emerald-400/20 to-primary/30 blur-2xl" />
      )}
      <div
        className={cn(
          'overflow-hidden rounded-xl border shadow-2xl ring-1 ring-black/5 transition-transform duration-500',
          dark ? 'border-white/10 bg-[#0f1c17]' : 'border-black/10 bg-white',
          tilt && 'rotate-[-1.2deg] hover:rotate-0',
        )}
      >
        {/* top chrome */}
        <div
          className={cn(
            'flex items-center gap-3 border-b px-3.5 py-2.5',
            dark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-muted/60',
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div
            className={cn(
              'flex flex-1 items-center gap-1.5 truncate rounded-md px-2.5 py-1 text-[11px] font-medium',
              dark ? 'bg-white/10 text-white/70' : 'bg-white text-muted-foreground ring-1 ring-black/5',
            )}
          >
            <Lock className="h-3 w-3 shrink-0 opacity-60" />
            <span className="truncate">{url}</span>
          </div>
        </div>
        {/* viewport */}
        <div className={cn('relative', dark ? 'bg-[#0f1c17]' : 'bg-white')}>{children}</div>
      </div>
    </div>
  );
}
