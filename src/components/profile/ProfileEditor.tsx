'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetcher } from '@/components/providers';
import type { SafeUser } from '@/lib/serializers';

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'af', label: 'Afrikaans' },
  { value: 'zu', label: 'isiZulu' },
  { value: 'xh', label: 'isiXhosa' },
  { value: 'st', label: 'Sesotho' }
];

interface ProfileResponse {
  user: SafeUser;
}

interface ProfileDraft {
  name: string;
  email: string;
  phoneNumber: string;
  preferredLanguage: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  plateNumber: string;
  serviceRadiusKm: string;
  isAvailable: boolean;
}

const defaultDraft: ProfileDraft = {
  name: '',
  email: '',
  phoneNumber: '',
  preferredLanguage: 'en',
  vehicleMake: '',
  vehicleModel: '',
  vehicleColor: '',
  plateNumber: '',
  serviceRadiusKm: '25',
  isAvailable: false
};

export function ProfileEditor({ backHref }: { backHref: string }) {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<ProfileResponse>('/api/account/profile', apiFetcher);
  const [draft, setDraft] = useState<ProfileDraft>(defaultDraft);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const isDriver = data?.user.role === 'DRIVER';

  useEffect(() => {
    if (!data?.user) return;

    setDraft({
      name: data.user.name ?? '',
      email: data.user.email ?? '',
      phoneNumber: data.user.phoneNumber ?? '',
      preferredLanguage: data.user.preferredLanguage ?? 'en',
      vehicleMake: data.user.driverProfile?.vehicleMake ?? '',
      vehicleModel: data.user.driverProfile?.vehicleModel ?? '',
      vehicleColor: data.user.driverProfile?.vehicleColor ?? '',
      plateNumber: data.user.driverProfile?.plateNumber ?? '',
      serviceRadiusKm: String(data.user.driverProfile?.serviceRadiusKm ?? 25),
      isAvailable: data.user.driverProfile?.isAvailable ?? false
    });
  }, [data?.user]);

  const summary = useMemo(() => {
    if (!data?.user) return null;
    return [
      { label: 'Role', value: data.user.role },
      { label: 'Language', value: data.user.preferredLanguage.toUpperCase() },
      { label: 'Profile', value: data.user.driverProfile ? 'Driver ready' : 'Rider ready' }
    ];
  }, [data?.user]);

  const updateField = (key: keyof ProfileDraft, value: string | boolean) => {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data?.user) return;

    setBusy(true);
    setStatus(null);

    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: draft.name,
          email: draft.email,
          phoneNumber: draft.phoneNumber || null,
          preferredLanguage: draft.preferredLanguage,
          ...(isDriver
            ? {
                vehicleMake: draft.vehicleMake || null,
                vehicleModel: draft.vehicleModel || null,
                vehicleColor: draft.vehicleColor || null,
                plateNumber: draft.plateNumber || null,
                serviceRadiusKm: Number(draft.serviceRadiusKm),
                isAvailable: draft.isAvailable
              }
            : {})
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | { data?: { user?: SafeUser }; error?: { message?: string } }
        | null;

      if (!response.ok) {
        setStatus(payload?.error?.message ?? 'Unable to update profile');
        return;
      }

      setStatus('Profile saved');
      await mutate();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="animate-rise-up overflow-hidden rounded-[1.75rem]">
      <CardHeader className="border-b border-border/70 bg-white/70">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Edit profile</CardTitle>
            <CardDescription>Keep your details current.</CardDescription>
          </div>
          <Badge tone={isDriver ? 'warning' : 'muted'}>{isDriver ? 'driver' : 'rider'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-5">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading profile...</p> : null}
        {error ? <p className="text-sm font-medium text-danger">Could not load profile.</p> : null}

        {summary ? (
          <div className="grid grid-cols-3 gap-2">
            {summary.map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-muted/50 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Name">
            <Input value={draft.name} onChange={(event) => updateField('name', event.target.value)} />
          </Field>

          <Field label="Email">
            <Input type="email" value={draft.email} onChange={(event) => updateField('email', event.target.value)} />
          </Field>

          <Field label="Phone">
            <Input value={draft.phoneNumber} onChange={(event) => updateField('phoneNumber', event.target.value)} placeholder="+27..." />
          </Field>

          <Field label="Language">
            <select
              value={draft.preferredLanguage}
              onChange={(event) => updateField('preferredLanguage', event.target.value)}
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          {isDriver ? (
            <div className="space-y-4 rounded-[1.5rem] border border-border bg-muted/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Vehicle</p>

              <Field label="Make">
                <Input value={draft.vehicleMake} onChange={(event) => updateField('vehicleMake', event.target.value)} />
              </Field>

              <Field label="Model">
                <Input value={draft.vehicleModel} onChange={(event) => updateField('vehicleModel', event.target.value)} />
              </Field>

              <Field label="Color">
                <Input value={draft.vehicleColor} onChange={(event) => updateField('vehicleColor', event.target.value)} />
              </Field>

              <Field label="Plate">
                <Input value={draft.plateNumber} onChange={(event) => updateField('plateNumber', event.target.value)} />
              </Field>

              <Field label="Service radius (km)">
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={draft.serviceRadiusKm}
                  onChange={(event) => updateField('serviceRadiusKm', event.target.value)}
                />
              </Field>

              <button
                type="button"
                onClick={() => updateField('isAvailable', !draft.isAvailable)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  draft.isAvailable ? 'border-success/30 bg-success/10 text-success' : 'border-border bg-white text-muted-foreground'
                }`}
              >
                <span>{draft.isAvailable ? 'Online' : 'Offline'}</span>
                <span>{draft.isAvailable ? 'Driving now' : 'Tap to go online'}</span>
              </button>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => router.push(backHref as never)}>
              Back
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? 'Saving...' : 'Save profile'}
            </Button>
          </div>

          {status ? <p className="text-sm font-medium text-muted-foreground">{status}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
