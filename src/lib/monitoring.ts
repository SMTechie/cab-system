import { env } from '@/lib/env';

export interface AlertContext {
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

export async function notifyOps(context: AlertContext) {
  const payload = {
    title: context.title,
    message: context.message,
    severity: context.severity ?? 'error',
    data: context.data ?? {},
    source: 'cabflow'
  };

  if (!env.ALERT_WEBHOOK_URL) {
    console.error('[monitoring]', payload);
    return;
  }

  try {
    await fetch(env.ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('[monitoring] webhook failed', error);
  }
}
