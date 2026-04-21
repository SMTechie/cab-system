import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { Badge } from '@/components/ui/badge';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { getCurrentSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Rider profile'
};

export default async function RiderProfilePage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  if (session.role !== UserRole.RIDER && session.role !== UserRole.ADMIN) redirect(session.role === UserRole.DRIVER ? '/driver' : '/');

  return (
    <div className="cab-mobile-theme mobile-phone-shell min-h-screen text-[hsl(var(--foreground))]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-3 pb-6 pt-3 sm:px-4">
        <header className="mb-4 flex items-center justify-between rounded-[1.75rem] border border-border bg-card/90 px-4 py-3 shadow-sm backdrop-blur">
          <Link href="/rider" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display text-lg font-bold">
              C
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">CabFlow Rider</p>
              <p className="font-display text-lg font-semibold tracking-tight">Profile</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Badge tone="muted">settings</Badge>
            <LogoutButton />
          </div>
        </header>

        <ProfileEditor backHref="/rider" />
      </div>
    </div>
  );
}
