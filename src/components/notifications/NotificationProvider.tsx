'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface NotificationInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastRecord extends Required<Pick<NotificationInput, 'title'>> {
  id: string;
  description?: string;
  tone: ToastTone;
}

interface NotificationContextValue {
  notify: (input: NotificationInput) => string;
  success: (input: Omit<NotificationInput, 'tone'>) => string;
  error: (input: Omit<NotificationInput, 'tone'>) => string;
  info: (input: Omit<NotificationInput, 'tone'>) => string;
  warning: (input: Omit<NotificationInput, 'tone'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);
const MAX_TOASTS = 4;

const toneStyles: Record<
  ToastTone,
  {
    icon: ReactNode;
    border: string;
    iconWrap: string;
  }
> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    border: 'border-l-success',
    iconWrap: 'bg-success/10 text-success'
  },
  error: {
    icon: <AlertCircle className="h-4 w-4" />,
    border: 'border-l-danger',
    iconWrap: 'bg-danger/10 text-danger'
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    border: 'border-l-primary',
    iconWrap: 'bg-primary/10 text-primary'
  },
  warning: {
    icon: <TriangleAlert className="h-4 w-4" />,
    border: 'border-l-accent',
    iconWrap: 'bg-accent/10 text-accent-foreground'
  }
};

function createToastId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const clear = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const notify = useCallback(
    (input: NotificationInput) => {
      const id = createToastId();
      const toast: ToastRecord = {
        id,
        title: input.title,
        description: input.description,
        tone: input.tone ?? 'info'
      };

      setToasts((current) => {
        const next = [...current, toast];

        if (next.length <= MAX_TOASTS) {
          return next;
        }

        const overflow = next.splice(0, next.length - MAX_TOASTS);
        overflow.forEach((entry) => {
          const timer = timersRef.current.get(entry.id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(entry.id);
          }
        });

        return next;
      });

      if (input.duration !== 0) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, input.duration ?? 4500);

        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notify,
      success: (input) => notify({ ...input, tone: 'success' }),
      error: (input) => notify({ ...input, tone: 'error' }),
      info: (input) => notify({ ...input, tone: 'info' }),
      warning: (input) => notify({ ...input, tone: 'warning' }),
      dismiss,
      clear
    }),
    [clear, dismiss, notify]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <NotificationContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:justify-end sm:px-6">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => {
            const tone = toneStyles[toast.tone];

            return (
              <div
                key={toast.id}
                role={toast.tone === 'error' ? 'alert' : 'status'}
                aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
                className={cn(
                  'pointer-events-auto overflow-hidden rounded-3xl border border-border border-l-4 bg-card/95 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl animate-rise-up',
                  tone.border
                )}
              >
                <div className="flex items-start gap-3 p-4">
                  <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', tone.iconWrap)}>
                    {tone.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-5 text-card-foreground">{toast.title}</p>
                    {toast.description ? (
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">{toast.description}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    aria-label="Dismiss notification"
                    onClick={() => dismiss(toast.id)}
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }

  return context;
}
