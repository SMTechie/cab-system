import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Login'
};

export default function LoginPage() {
  return (
    <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <span className="font-display text-lg font-bold">C</span>
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">CabFlow</p>
            <p className="text-xs text-muted-foreground">Realtime dispatch platform</p>
          </div>
        </Link>

        <div className="space-y-4">
          <p className="eyebrow">Welcome back</p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Use the seeded demo accounts or sign in to your own fleet.</h1>
          <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            Driver, rider, and admin access are separated at the API layer. Use the same credentials across the
            dashboards once authenticated.
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <AuthForm mode="login" />
      </div>
    </div>
  );
}
