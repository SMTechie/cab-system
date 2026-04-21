import Link from 'next/link';
import { ArrowRight, Clock3, CreditCard, MapPinned, ShieldCheck, Sparkles, Waves } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: MapPinned,
    title: 'Live dispatch map',
    description: 'Track drivers in real time with Socket.IO and fall back to polling when the socket is unavailable.'
  },
  {
    icon: CreditCard,
    title: 'Stripe Connect payouts',
    description: 'Onboard drivers as connected accounts and create destination charges with platform commission.'
  },
  {
    icon: ShieldCheck,
    title: 'Role-aware security',
    description: 'Every API route validates the current user role before exposing ride, driver, or admin actions.'
  },
  {
    icon: Clock3,
    title: 'Fare estimates',
    description: 'Base fare plus distance and duration pricing, with optional surge multiplier support.'
  }
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(circle_at_top,_rgba(18,194,185,0.18),_transparent_34%),radial-gradient(circle_at_80%_0%,_rgba(245,158,11,0.18),_transparent_24%)]" />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-inset ring-primary/20">
            <span className="font-display text-lg font-bold">C</span>
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">CabFlow</p>
            <p className="text-xs text-muted-foreground">Fleet dispatch MVP</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/register">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-7">
            <Badge>Next.js 14 + Socket.IO + Stripe Connect</Badge>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Dispatch rides, stream locations, and settle fares in one clean operator console.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                CabFlow is a TypeScript-first taxi platform scaffold with role-validated APIs, Mapbox routing,
                realtime driver tracking, PWA support, and Stripe Connect payment flows for marketplace-style payouts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href="/register">
                  Start the MVP
                  <Sparkles className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/login">Open demo account</Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Live updates', value: 'Socket.IO' },
                { label: 'Offline ready', value: 'PWA' },
                { label: 'Payments', value: 'Stripe Connect' }
              ].map((item) => (
                <Card key={item.label} className="p-4">
                  <CardDescription className="mt-0 text-xs uppercase tracking-[0.18em]">{item.label}</CardDescription>
                  <CardTitle className="mt-2 text-2xl">{item.value}</CardTitle>
                </Card>
              ))}
            </div>
          </div>

          <Card className="relative overflow-hidden p-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(18,194,185,0.18),_transparent_35%)]" />
            <div className="relative space-y-5 p-6 sm:p-8">
              <CardHeader className="mb-0 p-0">
                <CardTitle>Operational snapshot</CardTitle>
                <CardDescription>
                  A dashboard that keeps riders, drivers, and admins aligned without switching tools.
                </CardDescription>
              </CardHeader>

              <div className="space-y-4">
                {[
                  'Request a ride and quote the fare before dispatch.',
                  'Share driver GPS updates in real time.',
                  'Create payment intents and mark rides paid on webhook confirmation.',
                  'Serve an offline fallback when the network drops.'
                ].map((line) => (
                  <div key={line} className="flex items-start gap-3 rounded-2xl border border-border/80 bg-black/10 p-4">
                    <Waves className="mt-0.5 h-4 w-4 text-primary" />
                    <p className="text-sm leading-6 text-muted-foreground">{line}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <section className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <p className="eyebrow">Core features</p>
            <h2 className="section-heading">Everything the MVP needs to behave like a real fleet product.</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="h-full">
                  <CardHeader>
                    <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="surface flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="eyebrow">Demo credentials</p>
            <h2 className="section-heading">Seeded accounts are included in the Prisma seed.</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Use the admin, driver, or rider account after running the seed script to explore the full flow.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Badge tone="success">admin@cab.local</Badge>
            <Badge tone="warning">driver@cab.local</Badge>
            <Badge tone="muted">rider@cab.local</Badge>
          </div>
        </section>
      </main>
    </div>
  );
}
