import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type OverviewTone = 'default' | 'accent' | 'success' | 'warning' | 'muted';

const toneClasses: Record<OverviewTone, string> = {
  default: 'border-border bg-white/90',
  muted: 'border-border bg-white/90',
  accent: 'border-primary/20 bg-primary/5',
  success: 'border-success/20 bg-success/10',
  warning: 'border-accent/20 bg-accent/15'
};

export interface OverviewStripItem {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
  tone?: OverviewTone;
}

export function OverviewStrip({
  items,
  className
}: {
  items: OverviewStripItem[];
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-2.5 sm:grid-cols-3', className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'rounded-[1.45rem] border px-4 py-4 shadow-sm backdrop-blur',
            toneClasses[item.tone ?? 'default']
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 truncate font-display text-[1.05rem] font-semibold tracking-tight text-foreground">
                {item.value}
              </p>
            </div>
            {item.icon ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/95 text-primary shadow-sm ring-1 ring-border/70">
                {item.icon}
              </div>
            ) : null}
          </div>
          {item.detail ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p> : null}
        </div>
      ))}
    </div>
  );
}
