import http from 'node:http';
import { AsyncLocalStorage } from 'node:async_hooks';
import nextEnv from '@next/env';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData
} from '@/lib/realtime';

if (!globalThis.AsyncLocalStorage) {
  Object.defineProperty(globalThis, 'AsyncLocalStorage', {
    configurable: true,
    writable: true,
    value: AsyncLocalStorage
  });
}

nextEnv.loadEnvConfig(process.cwd());

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = Number(process.env.PORT ?? 3000);

async function main() {
  const [{ default: next }, { Server: SocketIOServer }, { env }, { getSessionFromHeaders }, realtime, { locationSchema }] =
    await Promise.all([
      import('next'),
      import('socket.io'),
      import('@/lib/env'),
      import('@/lib/session'),
      import('@/lib/realtime'),
      import('@/lib/validators')
    ]);
  const { persistDriverLocation, setRealtimeServer } = realtime;

  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = http.createServer((request, response) => {
    void handle(request, response);
  });

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
    cors: env.SOCKET_CORS_ORIGIN
      ? {
          origin: env.SOCKET_CORS_ORIGIN,
          credentials: true
        }
      : {
          origin: true,
          credentials: true
        }
  });

  setRealtimeServer(io);

  io.use(async (socket, nextFn) => {
    const session = await getSessionFromHeaders(socket.request.headers.cookie);
    if (!session) {
      nextFn(new Error('unauthorized'));
      return;
    }

    socket.data.user = session;
    nextFn();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (!user) return;

    socket.join(`user:${user.userId}`);

    if (user.role === 'DRIVER') {
      socket.join(`driver:${user.userId}`);
      socket.join('drivers');
    }

    if (user.role === 'ADMIN') {
      socket.join('admins');
    }

    socket.on('ride:join', ({ rideId }) => {
      socket.join(`ride:${rideId}`);
    });

    socket.on('driver:join', () => {
      socket.join(`driver:${user.userId}`);
      socket.join('drivers');
    });

    socket.on('driver:location:update', async (payload, ack) => {
      if (user.role !== 'DRIVER') {
        ack?.({ ok: false, error: 'Driver access required' });
        return;
      }

      const parsed = locationSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.({ ok: false, error: 'Invalid location payload' });
        return;
      }

      try {
        await persistDriverLocation({
          driverId: user.userId,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          heading: parsed.data.heading ?? null,
          speed: parsed.data.speed ?? null,
          accuracy: parsed.data.accuracy ?? null,
          rideId: parsed.data.rideId ?? null
        });

        ack?.({ ok: true });
      } catch (error) {
        console.error('Failed to persist driver location', error);
        ack?.({ ok: false, error: 'Unable to persist location' });
      }
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}

void main().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
