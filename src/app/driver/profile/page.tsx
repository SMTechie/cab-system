import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DriverDocumentManager } from '@/components/drivers/DriverDocumentManager';
import { DriverLocationSync } from '@/components/drivers/DriverLocationSync';
import { DriverAccountMenu } from '@/components/drivers/DriverAccountMenu';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { loadDriverDashboard } from '@/lib/dashboard';
import { getCurrentSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Driver profile'
};

export default async function DriverProfilePage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  if (session.role !== UserRole.DRIVER && session.role !== UserRole.ADMIN) redirect(session.role === UserRole.RIDER ? '/rider' : '/');
  const showDriverTools = session.role === UserRole.DRIVER;
  const driverDashboard = session.role === UserRole.DRIVER ? await loadDriverDashboard(session.userId) : null;
  const driverAvailability = driverDashboard?.profile?.isAvailable ?? null;

  return (
    <div className="cab-mobile-theme mobile-phone-shell min-h-[100svh] overflow-y-auto overscroll-y-contain text-[hsl(var(--foreground))]">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3 sm:px-4">
        <header className="mb-4 flex items-center justify-between overflow-visible rounded-[1.75rem] border border-border bg-card/90 px-4 py-3 shadow-sm backdrop-blur">
          <DriverAccountMenu mode="profile" isAvailable={driverAvailability} />
          <div className="flex items-center gap-2">
            <Badge tone="muted">settings</Badge>
          </div>
        </header>

        <section id="settings" className="scroll-mt-6">
          <ProfileEditor backHref="/driver" />
        </section>

        {showDriverTools ? (
          <>
            <Card className="mt-4 animate-rise-up overflow-hidden rounded-[1.75rem]">
              <CardHeader className="border-b border-border/70 bg-white/70">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Driver tools</CardTitle>
                    <CardDescription>GPS sync and documents live here.</CardDescription>
                  </div>
                  <Badge tone="muted">quick links</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2 p-4 sm:grid-cols-3">
                <Button asChild variant="secondary" className="w-full rounded-2xl">
                  <a href="#settings">Profile</a>
                </Button>
                <Button asChild variant="secondary" className="w-full rounded-2xl">
                  <a href="#gps">GPS sync</a>
                </Button>
                <Button asChild variant="secondary" className="w-full rounded-2xl">
                  <a href="#documents">Documents</a>
                </Button>
              </CardContent>
            </Card>

            <section id="gps" className="mt-4 scroll-mt-6">
              <DriverLocationSync rideId={null} />
            </section>

            <section id="documents" className="mt-4 scroll-mt-6">
              <DriverDocumentManager />
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
