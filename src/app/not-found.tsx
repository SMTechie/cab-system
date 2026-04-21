import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-16 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>The route you requested does not exist in this MVP scaffold.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/login">Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
