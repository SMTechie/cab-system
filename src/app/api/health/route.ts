import { jsonSuccess } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  return jsonSuccess({
    ok: true,
    timestamp: new Date().toISOString()
  });
}
