import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { RiderAccountMenu } from '@/components/riders/RiderAccountMenu';
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
    <div className="cab-mobile-theme mobile-phone-shell min-h-[100svh] overflow-y-auto overscroll-y-contain text-[hsl(var(--foreground))]">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3 sm:px-4">
        <header className="mb-4 flex items-center justify-between overflow-visible rounded-[1.75rem] border border-border bg-card/90 px-4 py-3 shadow-sm backdrop-blur">
          <RiderAccountMenu mode="profile" />
          <div className="flex items-center gap-2">
            <Badge tone="muted">settings</Badge>
          </div>
        </header>

        <ProfileEditor backHref="/rider" />
      </div>
    </div>
  );
}
