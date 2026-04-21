import { jsonSuccess } from '@/lib/api';

export async function GET() {
  return jsonSuccess({
    ok: true,
    timestamp: new Date().toISOString()
  });
}
