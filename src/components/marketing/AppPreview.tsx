import Link from 'next/link';
import { ArrowRight, MapPinned, RadioTower, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AppPreviewProps {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: '/login' | '/register';
}

const previewRows: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: MapPinned,
    title: 'Live map',
    description: 'Riders and drivers stay visible on the same screen.'
  },
  {
    icon: RadioTower,
    title: 'Realtime fallback',
    description: 'Socket updates first, polling when the socket is unavailable.'
  },
  {
    icon: ShieldCheck,
    title: 'Secure flow',
    description: 'Role-aware actions keep rider, driver, and admin screens separated.'
  }
];

export function AppPreview({ title, subtitle, ctaLabel, ctaHref }: AppPreviewProps) {
  return (
    <div className="relative mx-auto w-full max-w-sm animate-rise-up">
      <div className="relative animate-float overflow-hidden rounded-[2.5rem] border-[10px] border-slate-950 bg-slate-950 p-2 shadow-[0_30px_90px_rgba(15,23,42,0.36)]">
        <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,_hsl(var(--primary))_0%,_hsl(var(--primary))_56%,_#f8fafc_56%,_#f8fafc_100%)]">
          <div className="absolute inset-x-8 top-10 h-28 rounded-full bg-white/35 blur-3xl animate-soft-pulse" />
          <div className="relative px-6 pb-6 pt-7 text-center">
            <div className="mx-auto h-1.5 w-16 rounded-full bg-white/70" />
            <Badge tone="muted" className="mt-6 border-white/25 bg-white/15 text-white">
              CabFlow mobile
            </Badge>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/80">
              Dispatch. Track. Settle.
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-white/90">{subtitle}</p>
          </div>

          <div className="relative px-5 pb-5 pt-20">
            <div className="rounded-[1.75rem] bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
              <div className="space-y-3">
                {previewRows.map((row) => {
                  const Icon = row.icon;

                  return (
                    <div key={row.title} className="flex items-start gap-3 rounded-2xl border border-border/80 bg-muted/35 p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{row.title}</p>
                        <p className="text-xs leading-5 text-muted-foreground">{row.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-[1.5rem] bg-muted/40 p-3">
                <Button
                  asChild
                  className="w-full rounded-full py-4 text-base shadow-[0_18px_36px_rgba(250,204,21,0.32)] animate-soft-pulse"
                >
                  <Link href={ctaHref}>
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
