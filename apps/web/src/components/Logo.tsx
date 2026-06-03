import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Logo({ className, to = '/', light = false }: { className?: string; to?: string; light?: boolean }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2 font-heading', className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-secondary font-bold shadow-sm">
        C
      </span>
      <span className={cn('text-xl font-bold tracking-tight', light ? 'text-white' : 'text-primary')}>
        Culina
      </span>
    </Link>
  );
}
