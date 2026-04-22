'use client';

import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
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
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();

  useEffect(() => {
    onEventRef.current = options.onEvent;
  }, [options.onEvent]);

  useEffect(() => {
    if (options.enabled === false) return;
    if (typeof window === 'undefined') return;
    if (!socketUrl) {
      setConnected(false);
      socketRef.current = null;
      return;
    }

    let active = true;
    let socket: Socket | null = null;

    void import('socket.io-client').then(({ io }) => {
      if (!active) return;

      socket = io(socketUrl, {
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
    });

    return () => {
      active = false;
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      socketRef.current = null;
      setConnected(false);
    };
  }, [options.enabled, options.eventName, socketUrl]);

  const shouldPoll = options.enabled !== false && (!socketUrl || !connected) && Boolean(options.fallbackUrl);
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
