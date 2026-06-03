import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        success: 'border-transparent bg-emerald-100 text-emerald-700',
        warning: 'border-transparent bg-amber-100 text-amber-700',
        destructive: 'border-transparent bg-red-100 text-red-700',
        muted: 'border-transparent bg-muted text-muted-foreground',
        accent: 'border-transparent bg-accent/15 text-accent',
        outline: 'border-border text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Map common status strings to a badge variant. */
export function statusVariant(status: string): BadgeProps['variant'] {
  const map: Record<string, BadgeProps['variant']> = {
    active: 'success',
    confirmed: 'success',
    paid: 'success',
    approved: 'success',
    completed: 'success',
    awarded: 'success',
    pending: 'warning',
    pending_review: 'warning',
    sent: 'warning',
    drafting: 'warning',
    contacted: 'warning',
    toured: 'accent',
    overdue: 'destructive',
    expired: 'destructive',
    rejected: 'destructive',
    suspended: 'destructive',
    cancelled: 'destructive',
    lost: 'destructive',
    no_show: 'destructive',
    graduated: 'accent',
    converted: 'success',
    draft: 'muted',
    new: 'default',
  };
  return map[status] ?? 'muted';
}
