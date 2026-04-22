'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutDashboard, LogOut, RadioTower, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type DriverAccountMenuMode = 'dashboard' | 'profile';

export function DriverAccountMenu({
  mode,
  isAvailable = null,
  className
}: {
  mode: DriverAccountMenuMode;
  isAvailable?: boolean | null;
  className?: string;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(Boolean(isAvailable));
  const [pending, setPending] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const primaryHref = mode === 'dashboard' ? '/driver/profile' : '/driver';
  const primaryLabel = mode === 'dashboard' ? 'Profile' : 'Dashboard';
  const primaryDescription = mode === 'dashboard' ? 'View driver settings' : 'Return to dashboard';
  const showStatus = isAvailable !== null;

  const updateMenuPosition = () => {
    const root = rootRef.current;
    if (!root) return;

    const rect = root.getBoundingClientRect();
    const menuWidth = Math.min(260, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - menuWidth - 12));

    setMenuStyle({
      top: rect.bottom + 8,
      left,
      width: menuWidth
    });
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const handleResizeOrScroll = () => {
      if (open) {
        updateMenuPosition();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      updateMenuPosition();
    } else {
      setMenuStyle(null);
    }
  }, [open]);

  useEffect(() => {
    if (isAvailable !== null) {
      setAvailable(isAvailable);
    }
  }, [isAvailable]);

  const toggleAvailability = async () => {
    if (isAvailable === null) return;

    setPending(true);

    try {
      const response = await fetch('/api/driver/availability', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          isAvailable: !available
        })
      });

      if (!response.ok) {
        return;
      }

      setAvailable((current) => !current);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const handleLogout = async () => {
    setOpen(false);

    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });

    router.push('/');
    router.refresh();
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="group relative z-[80] inline-flex items-center gap-3 rounded-[1.5rem] border border-border bg-card/90 px-3 py-2 text-left shadow-sm backdrop-blur transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-display text-lg font-bold">
          C
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">CabFlow Driver</p>
          <p className="font-display text-lg font-semibold tracking-tight">{mode === 'dashboard' ? 'Ready to earn' : 'Profile'}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition duration-200 group-aria-expanded:rotate-180" />
      </button>

      {open && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[200] rounded-[1.5rem] border border-border bg-card p-2 shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
              style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
            >
              <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Account
              </p>

              {showStatus ? (
                <div className="mx-1 mb-2 rounded-2xl border border-border bg-muted/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Status
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {available ? 'Online' : 'Offline'}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {available ? 'Visible to riders right now.' : 'Go online to receive nearby requests.'}
                      </p>
                    </div>
                    <Badge tone={available ? 'success' : 'muted'}>{available ? 'online' : 'offline'}</Badge>
                  </div>
                  <Button
                    type="button"
                    variant={available ? 'secondary' : 'primary'}
                    onClick={toggleAvailability}
                    disabled={pending}
                    className="mt-3 w-full rounded-2xl"
                  >
                    <RadioTower className="h-4 w-4" />
                    {available ? 'Go offline' : 'Go online'}
                  </Button>
                </div>
              ) : null}

              <Link
                href={primaryHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-muted/60"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {mode === 'dashboard' ? <UserRound className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{primaryLabel}</p>
                  <p className="text-xs leading-5 text-muted-foreground">{primaryDescription}</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-danger/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-danger/10 text-danger">
                  <LogOut className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Logout</p>
                  <p className="text-xs leading-5 text-muted-foreground">End this session</p>
                </div>
              </button>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
