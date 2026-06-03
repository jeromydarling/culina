import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Standard caveat shown beneath AI-generated output, especially regulated topics. */
export function AiDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn('mt-2 flex items-start gap-1.5 text-xs text-muted-foreground', className)}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      AI-generated — review and verify before you rely on it. Not legal, financial, or food-safety advice; confirm
      labeling, permitting, and funding details with the relevant authority.
    </p>
  );
}
