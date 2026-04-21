'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'RIDER' | 'DRIVER'>('RIDER');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json'
      },
      body:
        mode === 'login'
          ? JSON.stringify({ email, password })
          : JSON.stringify({ name, email, password, role })
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: { user?: { role?: string } }; error?: { message?: string } }
      | null;

    if (!response.ok) {
      setError(payload?.error?.message ?? 'Authentication failed');
      setIsSubmitting(false);
      return;
    }

    const userRole = payload?.data?.user?.role ?? (mode === 'register' ? role : 'RIDER');
    router.push(routeForRole(userRole));
    router.refresh();
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            {mode === 'login' ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
          </div>
          <div>
            <CardTitle>{mode === 'login' ? 'Login' : 'Create account'}</CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Use one of the seeded demo accounts or your own credentials.'
                : 'Create a rider or driver account and start the app flow.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          {mode === 'register' ? (
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
          ) : null}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {mode === 'register' ? (
            <div>
              <Label htmlFor="role">Account type</Label>
              <Select id="role" value={role} onChange={(event) => setRole(event.target.value as 'RIDER' | 'DRIVER')}>
                <option value="RIDER">Rider</option>
                <option value="DRIVER">Driver</option>
              </Select>
            </div>
          ) : null}

          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}

          <Button type="submit" disabled={isSubmitting}>
            {mode === 'login' ? 'Login' : 'Create account'}
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Need an account?' : 'Already registered?'}{' '}
            <Link className="font-semibold text-primary hover:underline" href={mode === 'login' ? '/register' : '/login'}>
              {mode === 'login' ? 'Register here' : 'Login here'}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function routeForRole(role: string) {
  if (role === 'DRIVER') return '/driver';
  if (role === 'ADMIN') return '/admin';
  return '/rider';
}
