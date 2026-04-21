'use client';

import { useEffect, useRef, useState } from 'react';
import { Radio, RadioTower, WifiOff } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function DriverLocationSync({ rideId }: { rideId?: string | null }) {
  const { socket, connected } = useSocket({
    eventName: 'ride:state',
    enabled: true
  });
  const [tracking, setTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const startTracking = () => {
      if (watchId.current !== null) return;

      watchId.current = navigator.geolocation.watchPosition(
        async (position) => {
          const payload = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading ?? null,
            speed: position.coords.speed ?? null,
            accuracy: position.coords.accuracy ?? null,
            rideId: rideId ?? null
          };

          if (socket && connected) {
            socket.emit('driver:location:update', payload);
          } else {
            await fetch('/api/driver/location', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'content-type': 'application/json'
              },
              body: JSON.stringify(payload)
            });
          }

          setLastUpdate(new Date().toISOString());
        },
        (error) => {
          console.error('Unable to read geolocation', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000
        }
      );
    };

    startTracking();
    setTracking(true);

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      setTracking(false);
    };
  }, [connected, rideId, socket]);

  return (
    <Card className="animate-rise-up overflow-hidden rounded-[1.75rem]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>GPS sync</CardTitle>
            <CardDescription>Live first. HTTP fallback if needed.</CardDescription>
          </div>
          <Badge tone={connected ? 'success' : 'warning'}>{connected ? 'socket live' : 'poll fallback'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          {tracking ? <RadioTower className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-primary" />}
          {tracking ? 'GPS watch active.' : 'Waiting for GPS permission.'}
        </p>
        <p className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          {lastUpdate ? `Last update ${lastUpdate}` : 'No update yet.'}
        </p>
      </CardContent>
    </Card>
  );
}
