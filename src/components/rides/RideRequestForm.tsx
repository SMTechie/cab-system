'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CarFront,
  ChevronRight,
  Clock3,
  CreditCard,
  LocateFixed,
  MapPin,
  Package,
  Route,
  Search,
  Share2,
  Sparkles,
  Users,
  Wallet
} from 'lucide-react';
import { QuickActionGrid } from '@/components/layout/QuickActionGrid';
import { apiFetcher } from '@/components/providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapView, type MapPoint } from '@/components/maps/MapView';
import { usePlaceSearch } from '@/hooks/usePlaceSearch';
import { haversineKm } from '@/lib/geo';
import { formatMoney } from '@/lib/fare';
import { cn } from '@/lib/utils';
import type { SafeUser } from '@/lib/serializers';

interface DirectionsResponse {
  route: {
    distanceKm: number;
    durationMinutes: number;
    geometry: GeoJSON.LineString;
  };
}

interface FareQuote {
  baseFareCents: number;
  perKmFareCents: number;
  perMinuteFareCents: number;
  surgeMultiplier: number;
  subtotalCents: number;
  estimatedFareCents: number;
  platformFeeCents: number;
  currency: string;
}

interface SavedPlace {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  kind: string;
}

interface AvailableDriver {
  user: SafeUser;
  location: { latitude: number; longitude: number; updatedAt: string } | null;
}

type Screen = 'home' | 'book';
type TripMode = 'ride' | 'package' | 'rental';
type PaymentMethod = 'cash' | 'wallet' | 'card';
type BookingType = 'now' | 'schedule';

const defaultOrigin = { latitude: -26.2041, longitude: 28.0473 };
const defaultDestination = { latitude: -26.1076, longitude: 28.0567 };

export function RideRequestForm({ availableDrivers }: { availableDrivers: AvailableDriver[] }) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('home');
  const [tripMode, setTripMode] = useState<TripMode>('ride');
  const [bookingType, setBookingType] = useState<BookingType>('now');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [showPassengerDetails, setShowPassengerDetails] = useState(false);
  const [originLabel, setOriginLabel] = useState('Pickup');
  const [destinationLabel, setDestinationLabel] = useState('Drop-off');
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [scheduledAt, setScheduledAt] = useState('');
  const [bookingForName, setBookingForName] = useState('');
  const [bookingForPhone, setBookingForPhone] = useState('');
  const [parcelCount, setParcelCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [fareQuote, setFareQuote] = useState<FareQuote | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bookingIdempotencyKey = useRef(crypto.randomUUID());

  const directionsKey = useMemo(() => {
    if (screen !== 'book') return null;
    return `/api/maps/directions?originLatitude=${origin.latitude}&originLongitude=${origin.longitude}&destinationLatitude=${destination.latitude}&destinationLongitude=${destination.longitude}`;
  }, [destination.latitude, destination.longitude, origin.latitude, origin.longitude, screen]);

  const { data: directions } = useSWR<DirectionsResponse>(directionsKey, apiFetcher);
  const { data: savedPlaces } = useSWR<{ places: SavedPlace[] }>('/api/places', apiFetcher);
  const { places: originSuggestions } = usePlaceSearch(originLabel);
  const { places: destinationSuggestions } = usePlaceSearch(destinationLabel);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      () => {
        // Keep the default South Africa coordinates when permissions are denied.
      },
      { enableHighAccuracy: true, timeout: 4000 }
    );
  }, []);

  useEffect(() => {
    if (!directions?.route || screen !== 'book') return;

    const estimate = async () => {
      const response = await fetch('/api/fares/estimate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          distanceKm: directions.route.distanceKm,
          durationMinutes: directions.route.durationMinutes,
          surgeMultiplier: 1
        })
      });

      if (!response.ok) return;
      const payload = (await response.json()) as { data?: { quote: FareQuote } };
      setFareQuote(payload.data?.quote ?? null);
    };

    void estimate();
  }, [directions, screen]);

  const points: MapPoint[] = useMemo(() => {
    if (screen === 'home') {
      return [
        {
          id: 'origin',
          label: 'You',
          tone: 'pickup',
          latitude: origin.latitude,
          longitude: origin.longitude
        }
      ];
    }

    return [
      {
        id: 'origin',
        label: 'Pickup',
        tone: 'pickup',
        latitude: origin.latitude,
        longitude: origin.longitude
      },
      {
        id: 'destination',
        label: 'Drop-off',
        tone: 'destination',
        latitude: destination.latitude,
        longitude: destination.longitude
      }
    ];
  }, [destination.latitude, destination.longitude, origin.latitude, origin.longitude, screen]);

  const route = screen === 'book' ? directions?.route.geometry ?? null : null;
  const tripType = tripMode === 'package' && parcelCount > 1 ? 'MULTI_PARCEL' : tripMode === 'package' ? 'PACKAGE' : tripMode === 'rental' ? 'RENTAL' : 'RIDE';
  const currency = fareQuote?.currency ?? 'ZAR';

  const driverOptions = useMemo(() => {
    if (!fareQuote) return [];

    return availableDrivers
      .map((driver) => {
        const distanceKm = driver.location ? haversineKm(origin, driver.location) : null;
        const etaMinutes = distanceKm === null ? 8 : Math.max(3, Math.round(distanceKm * 4));
        const recommendedFareCents = Math.max(
          fareQuote.estimatedFareCents,
          fareQuote.estimatedFareCents + Math.round((distanceKm ?? 1) * 35)
        );

        return {
          ...driver,
          distanceKm,
          etaMinutes,
          recommendedFareCents
        };
      })
      .sort((left, right) => {
        if (left.distanceKm === null && right.distanceKm === null) return 0;
        if (left.distanceKm === null) return 1;
        if (right.distanceKm === null) return -1;
        return left.distanceKm - right.distanceKm;
      });
  }, [availableDrivers, fareQuote, origin]);

  const startRide = (mode: TripMode) => {
    setTripMode(mode);
    setScreen('book');
    setSubmitError(null);
    setSelectedDriverId(null);
  };

  const applySavedPlace = (place: SavedPlace) => {
    if (screen !== 'book') {
      setScreen('book');
    }
    setOriginLabel(place.label);
    setOrigin({
      latitude: place.latitude,
      longitude: place.longitude
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!directions?.route) {
      setSubmitError('Set both points first.');
      return;
    }

    if (bookingType === 'schedule' && !scheduledAt) {
      setSubmitError('Choose a date and time.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const notesParts = [
        tripType,
        bookingType === 'schedule' && scheduledAt ? `Scheduled for ${scheduledAt}` : null,
        showPassengerDetails && bookingForName.trim() ? `Booked for ${bookingForName.trim()}` : null,
        showPassengerDetails && bookingForPhone.trim() ? `Passenger: ${bookingForPhone.trim()}` : null,
        tripMode === 'package' ? `Parcels: ${parcelCount}` : null,
        `Payment: ${paymentMethod}`,
        notes.trim() ? notes.trim() : null
      ].filter(Boolean);

      const response = await fetch('/api/rides', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          originLabel,
          originLatitude: origin.latitude,
          originLongitude: origin.longitude,
          destinationLabel,
          destinationLatitude: destination.latitude,
          destinationLongitude: destination.longitude,
          distanceKm: directions.route.distanceKm,
          durationMinutes: directions.route.durationMinutes,
          tripType,
          scheduledAt: bookingType === 'schedule' ? scheduledAt : null,
          bookingForName: showPassengerDetails ? bookingForName.trim() || null : null,
          bookingForPhone: showPassengerDetails ? bookingForPhone.trim() || null : null,
          parcelCount: tripMode === 'package' ? parcelCount : 1,
          driverId: selectedDriverId,
          notes: notesParts.length > 0 ? notesParts.join('\n') : null
        }),
        headers: {
          'content-type': 'application/json',
          'idempotency-key': bookingIdempotencyKey.current
        }
      });

      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setSubmitError(payload?.error?.message ?? 'Unable to request ride');
        return;
      }

      setScreen('home');
      setTripMode('ride');
      setBookingType('now');
      setShowPassengerDetails(false);
      setBookingForName('');
      setBookingForPhone('');
      setParcelCount(1);
      setNotes('');
      setSelectedDriverId(null);
      setFareQuote(null);
      setSubmitError('Request sent. Drivers are on it.');
      bookingIdempotencyKey.current = crypto.randomUUID();
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const featureItems = [
    {
      title: 'Ride',
      subtitle: 'Request a car',
      icon: <CarFront className="h-5 w-5" />,
      onClick: () => startRide('ride')
    },
    {
      title: 'Schedule',
      subtitle: 'Book later',
      icon: <CalendarClock className="h-5 w-5" />,
      onClick: () => {
        setBookingType('schedule');
        startRide('ride');
      }
    },
    {
      title: 'Package',
      subtitle: 'Send a parcel',
      icon: <Package className="h-5 w-5" />,
      onClick: () => startRide('package')
    },
    {
      title: 'Rental',
      subtitle: 'Hourly use',
      icon: <Route className="h-5 w-5" />,
      onClick: () => startRide('rental')
    },
    {
      title: 'For others',
      subtitle: 'Book for a rider',
      icon: <Users className="h-5 w-5" />,
      onClick: () => {
        setShowPassengerDetails(true);
        startRide('ride');
      }
    },
    {
      title: 'Profile',
      subtitle: 'Update profile',
      icon: <Sparkles className="h-5 w-5" />,
      href: '/rider/profile'
    }
  ] satisfies Array<{
    title: string;
    subtitle: string;
    icon: ReactNode;
    href?: string;
    onClick?: () => void;
  }>;

  const recentTravelRows = (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setScreen('book')}
        className="flex w-full items-center justify-between rounded-3xl border border-border bg-muted/60 px-4 py-3 text-left transition hover:bg-muted/80"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
            <Clock3 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Recent trips</p>
            <p className="text-xs text-muted-foreground">View your last rides</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      <button
        type="button"
        onClick={() => setScreen('book')}
        className="flex w-full items-center justify-between rounded-3xl border border-border bg-muted/60 px-4 py-3 text-left transition hover:bg-muted/80"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
            <Share2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Share trip</p>
            <p className="text-xs text-muted-foreground">Send your link</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );

  return (
    <div className="space-y-4 animate-rise-up">
      <div className="relative overflow-visible rounded-[1.75rem] sm:overflow-hidden">
        <MapView
          initialCenter={origin}
          points={points}
          route={route}
          interactive={screen === 'book'}
          heightClassName="h-[16rem] sm:h-[30rem]"
          onMapClick={(coordinates) => {
            if (screen !== 'book') return;
            setDestination(coordinates);
          }}
        />

        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-slate-900 shadow-lg">
          <LocateFixed className="h-3.5 w-3.5 text-primary" />
          {screen === 'home' ? 'Your current location' : 'Book your ride'}
        </div>

        <div className="absolute right-4 top-4">
          <Badge tone={screen === 'home' ? 'muted' : tripMode === 'ride' ? 'warning' : 'success'}>
            {screen === 'home' ? 'Ready' : tripMode === 'ride' ? 'Ride' : tripMode === 'package' ? 'Package' : 'Rental'}
          </Badge>
        </div>

        <div className="mt-5 px-0 sm:absolute sm:inset-x-0 sm:bottom-4 sm:mt-0 sm:px-4 sm:z-10">
          <Card className="overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/95 shadow-[0_16px_60px_rgba(15,23,42,0.16)] backdrop-blur p-0">
            <CardContent className="max-h-[calc(100svh-14rem)] space-y-4 overflow-y-auto overscroll-contain p-5 sm:max-h-[calc(100%-1rem)] sm:p-5">
              {screen === 'home' ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Trip options
                      </p>
                      <p className="font-display text-lg font-semibold tracking-tight">Plan a trip</p>
                    </div>
                    <Badge tone="muted">Now</Badge>
                  </div>

                  <QuickActionGrid items={featureItems} />

                  {recentTravelRows}

                  {savedPlaces?.places?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {savedPlaces.places.slice(0, 4).map((place) => (
                        <Button
                          key={place.id}
                          type="button"
                          variant="secondary"
                          className="h-9 rounded-full px-3 text-xs"
                          onClick={() => applySavedPlace(place)}
                        >
                          {place.label}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setScreen('home')}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-slate-900 shadow-sm transition hover:-translate-y-0.5"
                      aria-label="Back"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    <div className="flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Book a ride</p>
                      <p className="font-display text-lg font-semibold tracking-tight">{tripTypeLabel(tripType)}</p>
                    </div>

                    <Badge tone={selectedDriverId ? 'success' : 'warning'}>{selectedDriverId ? 'driver' : 'broadcast'}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <ChoiceChip
                      active={tripMode === 'ride'}
                      label="Ride"
                      icon={<CarFront className="h-4 w-4" />}
                      onClick={() => {
                        setTripMode('ride');
                        setParcelCount(1);
                      }}
                    />
                    <ChoiceChip
                      active={tripMode === 'package'}
                      label="Package"
                      icon={<Package className="h-4 w-4" />}
                      onClick={() => setTripMode('package')}
                    />
                    <ChoiceChip
                      active={tripMode === 'rental'}
                      label="Rental"
                      icon={<Route className="h-4 w-4" />}
                      onClick={() => setTripMode('rental')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <ChoiceChip
                      active={bookingType === 'now'}
                      label="Now"
                      icon={<Clock3 className="h-4 w-4" />}
                      onClick={() => setBookingType('now')}
                    />
                    <ChoiceChip
                      active={bookingType === 'schedule'}
                      label="Schedule"
                      icon={<CalendarClock className="h-4 w-4" />}
                      onClick={() => setBookingType('schedule')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <ChoiceChip
                      active={!showPassengerDetails}
                      label="My ride"
                      icon={<CarFront className="h-4 w-4" />}
                      onClick={() => setShowPassengerDetails(false)}
                    />
                    <ChoiceChip
                      active={showPassengerDetails}
                      label="For others"
                      icon={<Users className="h-4 w-4" />}
                      onClick={() => setShowPassengerDetails(true)}
                    />
                  </div>

                  {bookingType === 'schedule' ? (
                    <Field label="Date & time">
                      <Input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(event) => setScheduledAt(event.target.value)}
                      />
                    </Field>
                  ) : null}

                  {showPassengerDetails ? (
                    <div className="space-y-3 rounded-[1.5rem] border border-border bg-muted/30 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Passenger</p>
                      <Field label="Name">
                        <Input value={bookingForName} onChange={(event) => setBookingForName(event.target.value)} placeholder="Passenger name" />
                      </Field>
                      <Field label="Phone">
                        <Input value={bookingForPhone} onChange={(event) => setBookingForPhone(event.target.value)} placeholder="+27..." />
                      </Field>
                    </div>
                  ) : null}

                  <SearchField
                    label="Pickup"
                    value={originLabel}
                    suggestions={originSuggestions}
                    onChange={setOriginLabel}
                    onPick={(place) => {
                      setOriginLabel(place.placeName);
                      setOrigin({
                        latitude: place.latitude,
                        longitude: place.longitude
                      });
                    }}
                    icon={<MapPin className="h-4 w-4" />}
                  />

                  <SearchField
                    label="Destination"
                    value={destinationLabel}
                    suggestions={destinationSuggestions}
                    onChange={setDestinationLabel}
                    onPick={(place) => {
                      setDestinationLabel(place.placeName);
                      setDestination({
                        latitude: place.latitude,
                        longitude: place.longitude
                      });
                    }}
                    icon={<Route className="h-4 w-4" />}
                  />

                  {tripMode === 'package' ? (
                    <Field label="Parcel count">
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={parcelCount}
                        onChange={(event) => setParcelCount(Math.max(1, Number(event.target.value) || 1))}
                      />
                    </Field>
                  ) : null}

                  <div className="grid grid-cols-3 gap-2">
                    <ChoiceChip
                      active={paymentMethod === 'cash'}
                      label="Cash"
                      icon={<Banknote className="h-4 w-4" />}
                      onClick={() => setPaymentMethod('cash')}
                    />
                    <ChoiceChip
                      active={paymentMethod === 'wallet'}
                      label="Wallet"
                      icon={<Wallet className="h-4 w-4" />}
                      onClick={() => setPaymentMethod('wallet')}
                    />
                    <ChoiceChip
                      active={paymentMethod === 'card'}
                      label="Card"
                      icon={<CreditCard className="h-4 w-4" />}
                      onClick={() => setPaymentMethod('card')}
                    />
                  </div>

                  {savedPlaces?.places?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {savedPlaces.places.slice(0, 4).map((place) => (
                        <Button
                          key={place.id}
                          type="button"
                          variant="secondary"
                          className="h-9 rounded-full px-3 text-xs"
                          onClick={() => applySavedPlace(place)}
                        >
                          {place.label}
                        </Button>
                      ))}
                    </div>
                  ) : null}

                  <div className="rounded-3xl border border-border bg-muted/50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Estimate</p>
                        <p className="mt-1 font-display text-2xl font-semibold tracking-tight">
                          {fareQuote ? formatMoney(fareQuote.estimatedFareCents, currency) : 'Waiting'}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{directions?.route.distanceKm ? `${directions.route.distanceKm.toFixed(1)} km` : 'Set points'}</p>
                        <p>{directions?.route.durationMinutes ? `${directions.route.durationMinutes.toFixed(0)} min` : 'Route pending'}</p>
                      </div>
                    </div>
                  </div>

                  {availableDrivers.length > 0 ? (
                    <div className="space-y-3 rounded-[1.5rem] border border-border bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Available drivers</p>
                          <p className="text-sm font-semibold">Choose one or broadcast</p>
                        </div>
                        <Badge tone="muted">{driverOptions.length}</Badge>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedDriverId(null)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-3xl border px-4 py-3 text-left transition',
                          selectedDriverId === null ? 'border-primary bg-primary/10' : 'border-border bg-muted/40 hover:bg-muted/60'
                        )}
                      >
                        <div>
                          <p className="text-sm font-semibold">Auto-broadcast</p>
                          <p className="text-xs text-muted-foreground">Send to nearby drivers</p>
                        </div>
                        <Badge tone={selectedDriverId === null ? 'success' : 'muted'}>best match</Badge>
                      </button>

                      <div className="space-y-2">
                        {driverOptions.map((driver) => (
                          <button
                            key={driver.user.id}
                            type="button"
                            onClick={() => setSelectedDriverId(driver.user.id)}
                            className={cn(
                              'flex w-full items-start justify-between gap-3 rounded-3xl border px-4 py-3 text-left transition',
                              selectedDriverId === driver.user.id
                                ? 'border-primary bg-primary/10 shadow-sm'
                                : 'border-border bg-muted/30 hover:bg-muted/60'
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{driver.user.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{driverLabel(driver.user)}</p>
                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                <span>{driver.distanceKm === null ? 'Nearby' : `${driver.distanceKm.toFixed(1)} km away`}</span>
                                <span>{driver.etaMinutes} min ETA</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-display text-xl font-semibold tracking-tight">
                                {formatMoney(driver.recommendedFareCents, currency)}
                              </p>
                              <Badge tone={selectedDriverId === driver.user.id ? 'success' : 'muted'}>
                                {selectedDriverId === driver.user.id ? 'selected' : 'choose'}
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Note</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Add a short note"
                      className="min-h-[84px]"
                    />
                  </div>

                  {submitError ? <p className="text-sm font-medium text-danger">{submitError}</p> : null}

                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="flex-1" onClick={() => setScreen('home')}>
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? 'Sending...' : 'Request ride'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ChoiceChip({
  active,
  label,
  icon,
  onClick
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition',
        active ? 'border-primary bg-primary/15 text-foreground' : 'border-border bg-white text-muted-foreground'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SearchField({
  label,
  value,
  onChange,
  suggestions,
  onPick,
  icon
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: Array<{ id: string; label: string; placeName: string; latitude: number; longitude: number }>;
  onPick: (place: { placeName: string; latitude: number; longitude: number }) => void;
  icon: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</Label>
      <div className="rounded-[1.35rem] border border-border bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-muted text-foreground">{icon}</div>
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            placeholder={label}
          />
        </div>
      </div>

      {suggestions.length > 0 ? (
        <div className="space-y-2 rounded-[1.35rem] border border-border bg-white p-2 shadow-sm">
          {suggestions.map((place) => (
            <button
              key={place.id}
              type="button"
              className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition hover:bg-muted/70"
              onClick={() => onPick(place)}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{place.placeName}</p>
                <p className="truncate text-xs text-muted-foreground">{place.label}</p>
              </div>
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
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

function tripTypeLabel(value: string) {
  switch (value) {
    case 'PACKAGE':
      return 'Package delivery';
    case 'RENTAL':
      return 'Rental package';
    case 'MULTI_PARCEL':
      return 'Multi-parcel';
    default:
      return 'Ride now';
  }
}

function driverLabel(user: SafeUser) {
  const profile = user.driverProfile;
  if (!profile) return 'Driver';

  return [profile.vehicleColor, profile.vehicleMake, profile.vehicleModel, profile.plateNumber].filter(Boolean).join(' - ');
}
