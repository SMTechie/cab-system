'use client';

import Link from 'next/link';
import { ArrowLeft, House } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function AuthPageShell({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();

  return (
    <main className="cab-mobile-theme mobile-phone-shell min-h-[100svh] bg-[linear-gradient(180deg,#eef2f7_0%,#edf3f9_100%)] text-[hsl(var(--foreground))]">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-[390px] flex-col px-4 py-4">
        <div className="flex w-full items-center justify-between gap-3 pt-4">
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur transition hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <Link
            href="/"
            aria-label="Home"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur transition hover:bg-white"
          >
            <House className="h-4 w-4" />
            Home
          </Link>
        </div>

        <div className={cn('flex flex-1 items-stretch pt-3', className)}>{children}</div>
      </div>
    </main>
  );
}
