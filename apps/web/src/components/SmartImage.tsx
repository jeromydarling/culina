import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Image that degrades gracefully to a branded gradient if the source fails to
 * load. Lets us drop in generated (Flux) or stock food/kitchen imagery without
 * risking broken tiles on the marketing site.
 */
export function SmartImage({
  src,
  alt,
  className,
  gradient = 'from-primary via-emerald-800 to-accent',
  emoji,
}: {
  src?: string;
  alt: string;
  className?: string;
  gradient?: string;
  emoji?: string;
}) {
  const [failed, setFailed] = React.useState(!src);
  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn('relative grid place-items-center overflow-hidden bg-gradient-to-br', gradient, className)}
      >
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_20%,white,transparent_40%),radial-gradient(circle_at_80%_70%,white,transparent_35%)]" />
        {emoji && <span className="relative text-5xl drop-shadow-sm">{emoji}</span>}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  );
}
