import type { Server as SocketIOServer } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@/lib/realtime';

declare global {
  // Shared realtime server instance used by route handlers and the custom server.
  // eslint-disable-next-line no-var
  var __cabRealtimeServer:
    | SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
    | undefined;
}

export {};
