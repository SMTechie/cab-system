'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import useSWR from 'swr';
import { apiFetcher } from '@/components/providers';

interface UseSocketOptions<TFallback = unknown> {
  eventName: string;
  enabled?: boolean;
  fallbackUrl?: string | null;
  pollIntervalMs?: number;
  onEvent?: (payload: unknown) => void;
}

export function useSocket<TEvent = unknown, TFallback = unknown>(options: UseSocketOptions<TFallback>) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<TEvent | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const onEventRef = useRef(options.onEvent);

  useEffect(() => {
    onEventRef.current = options.onEvent;
  }, [options.onEvent]);

  useEffect(() => {
    if (options.enabled === false) return;
    if (typeof window === 'undefined') return;

    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on(options.eventName, (payload: TEvent) => {
      setLastEvent(payload);
      onEventRef.current?.(payload);
    });
    socket.on('realtime:error', (message) => console.warn(message));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [options.enabled, options.eventName]);

  const shouldPoll = options.enabled !== false && !connected && Boolean(options.fallbackUrl);
  const { data, error, mutate } = useSWR<TFallback>(
    shouldPoll ? options.fallbackUrl : null,
    apiFetcher,
    {
      refreshInterval: options.pollIntervalMs ?? 5000
    }
  );

  return {
    socket: socketRef.current,
    connected,
    lastEvent,
    fallbackData: data ?? null,
    fallbackError: error,
    refreshFallback: mutate
  };
}
