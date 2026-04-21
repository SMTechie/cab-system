import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Offline'
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-16 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>You are offline</CardTitle>
          <CardDescription>
            CabFlow can still show cached shell content. Reconnect to continue syncing ride updates and driver
            locations.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Return home</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/login">Open login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
