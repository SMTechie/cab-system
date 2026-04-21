'use client';

import { useRef, useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { PhoneCall, Send, Share2, ShieldAlert } from 'lucide-react';
import { apiFetcher } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  role: string;
  message: string;
  createdAt: string;
}

export function RideSupportPanel({
  rideId,
  shareToken,
  className
}: {
  rideId: string;
  shareToken?: string | null;
  className?: string;
}) {
  const { user } = useAuth();
  const { data, mutate } = useSWR<{ messages: ChatMessage[] }>(`/api/rides/${rideId}/chat`, apiFetcher);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const safetyKey = useRef(crypto.randomUUID());

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;

    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/rides/${rideId}/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ message: draft })
      });

      if (!response.ok) {
        setStatus('Unable to send message');
        return;
      }

      setDraft('');
      await mutate();
      setStatus('Sent');
    } finally {
      setBusy(false);
    }
  };

  const triggerSafety = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/rides/${rideId}/safety`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': safetyKey.current
        },
        body: JSON.stringify({
          type: 'sos',
          message: 'SOS alert from ride screen'
        })
      });

      setStatus(response.ok ? 'Alert sent' : 'Unable to send alert');
    } finally {
      setBusy(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareToken || typeof window === 'undefined') return;
    await navigator.clipboard.writeText(`${window.location.origin}/share/${shareToken}`);
    setStatus('Link copied');
  };

  return (
    <Card className={className ? `${className} overflow-hidden rounded-[1.75rem]` : 'overflow-hidden rounded-[1.75rem]'}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Support</CardTitle>
            <CardDescription>Share, chat, or send an alert.</CardDescription>
          </div>
          <Badge tone="muted">{user?.role?.toLowerCase() ?? 'guest'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {shareToken ? (
            <Button type="button" variant="secondary" onClick={() => void copyShareLink()} disabled={busy}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          ) : null}
          <Button type="button" variant="danger" onClick={() => void triggerSafety()} disabled={busy}>
            <ShieldAlert className="h-4 w-4" />
            SOS
          </Button>
          <Button type="button" variant="ghost" asChild>
            <a href="tel:+27800000000">
              <PhoneCall className="h-4 w-4" />
              Call
            </a>
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-2 rounded-3xl border border-border bg-muted/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Chat</p>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {data?.messages?.length ? (
                data.messages.slice(-3).map((message) => (
                  <div key={message.id} className="rounded-2xl bg-white px-3 py-2 text-sm shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {message.senderName}
                    </p>
                    <p className="mt-1 leading-6">{message.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              )}
            </div>
          </div>

          <form className="flex items-end gap-2" onSubmit={sendMessage}>
            <textarea
              className="min-h-[84px] flex-1 rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message"
            />
            <Button type="submit" disabled={busy || !draft.trim()}>
              <Send className="h-4 w-4" />
              Send
            </Button>
          </form>
        </div>

        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
