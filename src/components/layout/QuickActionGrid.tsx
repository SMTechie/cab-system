'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuickActionItem {
  title: string;
  subtitle: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  tone?: 'default' | 'accent';
}

export function QuickActionGrid({ items }: { items: QuickActionItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-3">
      {items.map((item) => {
        const classes = cn(
          'group flex min-h-[7rem] flex-col justify-between rounded-[1.45rem] border border-border/80 bg-white/90 px-4 py-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md',
          item.tone === 'accent' ? 'border-primary/25 bg-primary/5' : ''
        );
        const content = (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
                {item.icon}
              </div>
              <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <p className="mt-3 text-sm font-semibold tracking-tight text-foreground">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.subtitle}</p>
          </>
        );

        if (item.href?.startsWith('#')) {
          const targetId = item.href.slice(1);
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={classes}
            >
              {content}
            </button>
          );
        }

        if (item.href) {
          return (
            <Link key={item.title} href={item.href as never} className={classes}>
              {content}
            </Link>
          );
        }

        return (
          <button key={item.title} type="button" onClick={item.onClick} className={classes}>
            {content}
          </button>
        );
      })}
    </div>
  );
}
