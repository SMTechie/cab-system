import Link from 'next/link';
import { ArrowRight, MapPinned, RadioTower, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

const features = [
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

export default function HomePage() {
  return (
    <main className="cab-mobile-theme relative min-h-[100svh] overflow-hidden text-[hsl(var(--foreground))]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,#facc15_0%,#facc15_58%,#eef2f7_58%,#eef2f7_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(255,255,255,0.22),transparent_26%),radial-gradient(circle_at_86%_11%,rgba(255,255,255,0.14),transparent_24%)]"
      />

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-[430px] flex-col px-4 py-4">
        <section className="flex min-h-[44svh] flex-col items-center justify-start px-2 pt-6 text-center text-white">
          <span className="inline-flex rounded-full border border-white/35 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/90">
            CabFlow mobile
          </span>

          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.42em] text-white/80">
            Dispatch. Track. Settle.
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl">
            Welcome to CabFlow
          </h1>

          <p className="mt-4 max-w-[22rem] text-lg leading-8 text-white/90">
            Intelligent dispatch software to guide every ride.
          </p>
        </section>

        <section className="animate-rise-up -mt-4 rounded-[2.5rem] border border-white/70 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
          <div className="space-y-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div key={feature.title} className="flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-base font-semibold tracking-tight text-slate-900">{feature.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-[1.5rem] bg-slate-50 p-2">
            <Button
              asChild
              className="w-full rounded-full py-4 text-lg font-bold shadow-[0_18px_36px_rgba(250,204,21,0.35)] animate-soft-pulse"
            >
              <Link href="/register">
                Get started
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          <InstallPrompt className="mt-3" />
        </section>
      </div>
    </main>
  );
}
