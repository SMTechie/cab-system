'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { cn } from '@/lib/utils';
import { loginSchema, registerSchema } from '@/lib/validators';

type Mode = 'login' | 'register';
type AuthField = 'name' | 'email' | 'password' | 'role';
type FieldErrors = Partial<Record<AuthField, string>>;

type ValidationDetails = {
  fieldErrors?: Partial<Record<AuthField, string[]>>;
  formErrors?: string[];
};

type ApiErrorPayload = {
  error?: {
    message?: string;
    code?: string;
    details?: ValidationDetails;
  };
};

type AuthResponsePayload = {
  data?: {
    user?: {
      role?: string;
    };
  };
  error?: ApiErrorPayload['error'];
};

const fieldOrderByMode: Record<Mode, readonly AuthField[]> = {
  login: ['email', 'password'],
  register: ['name', 'email', 'password', 'role']
};

const demoAccounts = [
  {
    label: 'Rider demo',
    email: 'rider@cab.local',
    password: 'Password123!',
    badgeClassName: 'bg-primary/10 text-primary',
    helper: 'Passenger booking flow'
  },
  {
    label: 'Driver demo',
    email: 'driver@cab.local',
    password: 'Password123!',
    badgeClassName: 'bg-success/10 text-success',
    helper: 'Driver dispatch flow'
  }
] as const;

export function AuthForm({
  mode,
  className,
  showDemoAccounts = false
}: {
  mode: Mode;
  className?: string;
  showDemoAccounts?: boolean;
}) {
  const router = useRouter();
  const notifications = useNotifications();
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLSelectElement>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'RIDER' | 'DRIVER'>('RIDER');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const focusField = (field: AuthField) => {
    if (field === 'name') {
      nameRef.current?.focus();
      return;
    }

    if (field === 'email') {
      emailRef.current?.focus();
      return;
    }

    if (field === 'password') {
      passwordRef.current?.focus();
      return;
    }

    roleRef.current?.focus();
  };

  const clearFieldError = (field: AuthField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const clearFormError = () => setFormError(null);

  const applyDemoAccount = (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setFieldErrors((current) => {
      if (!current.email && !current.password) return current;
      const next = { ...current };
      delete next.email;
      delete next.password;
      return next;
    });
    clearFormError();
    notifications.info({
      title: `${account.label} loaded`,
      description: 'The email and password were filled in for you.'
    });
    passwordRef.current?.focus();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const schema = mode === 'login' ? loginSchema : registerSchema;
    const candidate =
      mode === 'login'
        ? {
            email,
            password
          }
        : {
            name,
            email,
            password,
            role
          };
    const parsed = schema.safeParse(candidate);

    if (!parsed.success) {
      const validationErrors = buildFieldErrors(parsed.error.flatten().fieldErrors);
      const firstField = fieldOrderByMode[mode].find((field) => validationErrors[field]);
      const message =
        firstField && validationErrors[firstField]
          ? validationErrors[firstField]
          : parsed.error.issues[0]?.message ?? 'Check the highlighted fields.';

      setFieldErrors(validationErrors);
      setFormError(message);
      notifications.error({
        title: 'Fix the form',
        description: message
      });
      if (firstField) {
        focusField(firstField);
      }
      setIsSubmitting(false);
      return;
    }

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(parsed.data)
      });

      const payload = (await response.json().catch(() => null)) as AuthResponsePayload | null;

      if (!response.ok) {
        const serverMessage = payload?.error?.message ?? 'Authentication failed';
        const serverCode = payload?.error?.code ?? 'authentication_failed';

        if (serverCode === 'validation_error' && payload?.error?.details) {
          const validationErrors = buildFieldErrors(payload.error.details.fieldErrors);
          const firstField = fieldOrderByMode[mode].find((field) => validationErrors[field]);
          const message =
            firstField && validationErrors[firstField]
              ? validationErrors[firstField]
              : payload.error.details.formErrors?.[0] ?? serverMessage;

          setFieldErrors(validationErrors);
          setFormError(message);
          notifications.error({
            title: mode === 'login' ? 'Login failed' : 'Registration failed',
            description: message
          });
          if (firstField) {
            focusField(firstField);
          }
          setIsSubmitting(false);
          return;
        }

        if (serverCode === 'email_exists') {
          setFieldErrors({ email: serverMessage });
          setFormError(serverMessage);
          notifications.error({
            title: 'Registration failed',
            description: serverMessage
          });
          focusField('email');
          setIsSubmitting(false);
          return;
        }

        if (serverCode === 'invalid_role') {
          setFieldErrors({ role: serverMessage });
          setFormError(serverMessage);
          notifications.error({
            title: 'Registration failed',
            description: serverMessage
          });
          focusField('role');
          setIsSubmitting(false);
          return;
        }

        setFormError(serverMessage);
        notifications.error({
          title: mode === 'login' ? 'Login failed' : 'Registration failed',
          description: serverMessage
        });
        setIsSubmitting(false);
        return;
      }

      const userRole = payload?.data?.user?.role ?? (mode === 'register' ? role : 'RIDER');
      setIsSubmitting(false);
      notifications.success({
        title: mode === 'login' ? 'Logged in' : 'Account created',
        description: mode === 'login' ? 'Sending you to your dashboard.' : 'Taking you to the app now.'
      });
      router.push(routeForRole(userRole));
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      setFormError(message);
      notifications.error({
        title: 'Network error',
        description: message
      });
      setIsSubmitting(false);
    }
  };

  const fieldClassName = (hasError: boolean) =>
    cn(hasError && 'border-danger/60 focus:border-danger focus:ring-danger/20');

  const errorId = (field: AuthField) => `${mode}-${field}-error`;

  return (
    <Card className={cn('relative flex h-full w-full flex-col overflow-hidden rounded-[2rem]', className)}>
      <CardHeader className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            {mode === 'login' ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
          </div>
          <div>
            <CardTitle>{mode === 'login' ? 'Login' : 'Create account'}</CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Sign in to continue the app flow.'
                : 'Create a rider or driver account and start the app flow.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative flex flex-1 flex-col">
        <form className="flex h-full flex-col" onSubmit={submit} noValidate>
          <div className="space-y-4">
            {mode === 'register' ? (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  ref={nameRef}
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    clearFieldError('name');
                    clearFormError();
                  }}
                  onBlur={() => {
                    clearFormError();
                  }}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? errorId('name') : undefined}
                  required
                  className={fieldClassName(Boolean(fieldErrors.name))}
                />
                {fieldErrors.name ? (
                  <p id={errorId('name')} className="mt-1 text-sm font-medium text-danger">
                    {fieldErrors.name}
                  </p>
                ) : null}
              </div>
            ) : null}

            {mode === 'login' && showDemoAccounts ? (
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Demo accounts</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Tap a rider or driver account to fill the login form instantly.
                    </p>
                  </div>

                  <div className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Ready
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => applyDemoAccount(account)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
                              account.badgeClassName
                            )}
                          >
                            {account.label}
                          </span>
                          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
                            {account.helper}
                          </span>
                        </div>

                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          <span className="font-semibold text-slate-700">Email:</span>{' '}
                          <span className="font-mono">{account.email}</span>
                        </p>
                        <p className="text-xs leading-5 text-slate-600">
                          <span className="font-semibold text-slate-700">Password:</span>{' '}
                          <span className="font-mono">{account.password}</span>
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                        Use
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                ref={emailRef}
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearFieldError('email');
                  clearFormError();
                }}
                onBlur={() => {
                  clearFormError();
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? errorId('email') : undefined}
                required
                className={fieldClassName(Boolean(fieldErrors.email))}
              />
              {fieldErrors.email ? (
                <p id={errorId('email')} className="mt-1 text-sm font-medium text-danger">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                ref={passwordRef}
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearFieldError('password');
                  clearFormError();
                }}
                onBlur={() => {
                  clearFormError();
                }}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? errorId('password') : undefined}
                required
                className={fieldClassName(Boolean(fieldErrors.password))}
              />
              {fieldErrors.password ? (
                <p id={errorId('password')} className="mt-1 text-sm font-medium text-danger">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            {mode === 'register' ? (
              <div>
                <Label htmlFor="role">Account type</Label>
                <Select
                  ref={roleRef}
                  id="role"
                  value={role}
                  onChange={(event) => {
                    setRole(event.target.value as 'RIDER' | 'DRIVER');
                    clearFieldError('role');
                    clearFormError();
                  }}
                  aria-invalid={Boolean(fieldErrors.role)}
                  aria-describedby={fieldErrors.role ? errorId('role') : undefined}
                  className={fieldClassName(Boolean(fieldErrors.role))}
                >
                  <option value="RIDER">Rider</option>
                  <option value="DRIVER">Driver</option>
                </Select>
                {fieldErrors.role ? (
                  <p id={errorId('role')} className="mt-1 text-sm font-medium text-danger">
                    {fieldErrors.role}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-auto space-y-4 pt-6">
            {formError ? (
              <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                {formError}
              </div>
            ) : null}

            <Button type="submit" disabled={isSubmitting} className="w-full rounded-full py-3.5 text-base">
              {isSubmitting ? (mode === 'login' ? 'Logging in...' : 'Creating account...') : mode === 'login' ? 'Login' : 'Create account'}
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? 'Need an account?' : 'Already registered?'}{' '}
              <Link className="font-semibold text-primary hover:underline" href={mode === 'login' ? '/register' : '/login'}>
                {mode === 'login' ? 'Register here' : 'Login here'}
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function buildFieldErrors(fieldErrors?: Partial<Record<AuthField, string[]>>) {
  const next: FieldErrors = {};

  for (const field of ['name', 'email', 'password', 'role'] as const) {
    const message = fieldErrors?.[field]?.find((entry) => entry.trim().length > 0);
    if (message) {
      next[field] = message;
    }
  }

  return next;
}

function routeForRole(role: string) {
  if (role === 'DRIVER') return '/driver';
  if (role === 'ADMIN') return '/admin';
  return '/rider';
}
