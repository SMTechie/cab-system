import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BadgeTone = 'default' | 'muted' | 'success' | 'warning' | 'danger';

const toneClasses: Record<BadgeTone, string> = {
  default: 'bg-primary/15 text-primary border border-primary/20',
  muted: 'bg-white/5 text-muted-foreground border border-border',
  success: 'bg-success/15 text-success border border-success/20',
  warning: 'bg-accent/15 text-accent-foreground border border-accent/20',
  danger: 'bg-danger/15 text-danger border border-danger/20'
};

export function Badge({
  className,
  tone = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
