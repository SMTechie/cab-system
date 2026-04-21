import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Badge } from '@/components/ui/badge';
import { LogoutButton } from '@/components/auth/LogoutButton';
import type { SessionUser } from '@/lib/session';

const roleLinks: Record<SessionUser['role'], Array<{ href: Route; label: string }>> = {
  RIDER: [
    { href: '/rider', label: 'Rider' }
  ],
  DRIVER: [
    { href: '/driver', label: 'Driver' }
  ],
  ADMIN: [
    { href: '/admin', label: 'Admin' },
    { href: '/rider', label: 'Rider' },
    { href: '/driver', label: 'Driver' }
  ]
};

export function AppShell({
  user,
  title,
  subtitle,
  children
}: {
  user: SessionUser;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-aurora text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/72 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-inset ring-primary/20 animate-soft-pulse">
              <span className="font-display text-lg font-bold">C</span>
            </div>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">CabFlow</p>
              <p className="text-xs text-muted-foreground">Rides, live, pay</p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {roleLinks[user.role].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-card/70 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
            <Badge tone="muted">{user.role.toLowerCase()}</Badge>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-2 animate-rise-up">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary/80">Live fleet</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
