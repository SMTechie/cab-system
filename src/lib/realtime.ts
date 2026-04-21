import type { Prisma } from '@prisma/client';
import type { Server as SocketIOServer } from 'socket.io';
import { prisma } from '@/lib/prisma';
import { serializeDriverLocation, serializeRide, type SafeRide } from '@/lib/serializers';
import type { SessionUser } from '@/lib/session';
import { AppError } from '@/lib/errors';
import type { RideStatus } from '@prisma/client';

export interface DriverLocationEvent {
  driverId: string;
  rideId?: string | null;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  updatedAt: string;
}

export interface RideStateEvent {
  rideId: string;
  status?: RideStatus;
  paymentStatus?: string;
  ride?: SafeRide;
}

export interface RideOfferEvent {
  offerId: string;
  rideId: string;
  driverId: string;
  driverName: string;
  vehicleLabel: string;
  plateNumber: string | null;
  distanceKm: number | null;
  etaMinutes: number;
  recommendedFareCents: number;
  expiresAt: string;
  riderName: string;
  originLabel: string;
  destinationLabel: string;
}

export interface RideSafetyAlertEvent {
  alertId: string;
  rideId: string;
  reporterUserId: string;
  type: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface ClientToServerEvents {
  'driver:location:update': (
    payload: {
      latitude: number;
      longitude: number;
      heading?: number | null;
      speed?: number | null;
      accuracy?: number | null;
      rideId?: string | null;
    },
    ack?: (response: { ok: boolean; error?: string }) => void
  ) => void;
  'ride:join': (payload: { rideId: string }) => void;
  'driver:join': () => void;
}

export interface ServerToClientEvents {
  'driver:location': (event: DriverLocationEvent) => void;
  'ride:state': (event: RideStateEvent) => void;
  'ride:offer': (event: RideOfferEvent) => void;
  'ride:safety': (event: RideSafetyAlertEvent) => void;
  'realtime:error': (message: string) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  user?: SessionUser;
}

declare global {
  // eslint-disable-next-line no-var
  var __cabRealtimeServer:
    | SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
    | undefined;
}

export function setRealtimeServer(server: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
  globalThis.__cabRealtimeServer = server;
}

export function getRealtimeServer() {
  return globalThis.__cabRealtimeServer;
}

export function emitDriverLocation(event: DriverLocationEvent) {
  const server = getRealtimeServer();
  if (!server) return;

  if (event.rideId) {
    server.to(`ride:${event.rideId}`).emit('driver:location', event);
  }

  server.to(`driver:${event.driverId}`).emit('driver:location', event);
  server.to('drivers').emit('driver:location', event);
  server.to('admins').emit('driver:location', event);
}

export function emitRideState(event: RideStateEvent) {
  const server = getRealtimeServer();
  if (!server) return;

  server.to(`ride:${event.rideId}`).emit('ride:state', event);

  if (event.ride?.riderId) {
    server.to(`user:${event.ride.riderId}`).emit('ride:state', event);
  }

  if (event.ride?.driverId) {
    server.to(`driver:${event.ride.driverId}`).emit('ride:state', event);
  }

  server.to('admins').emit('ride:state', event);
}

export function emitRideOffer(event: RideOfferEvent) {
  const server = getRealtimeServer();
  if (!server) return;

  server.to(`driver:${event.driverId}`).emit('ride:offer', event);
  server.to('drivers').emit('ride:offer', event);
  server.to('admins').emit('ride:offer', event);
}

export function emitRideSafety(event: RideSafetyAlertEvent) {
  const server = getRealtimeServer();
  if (!server) return;

  server.to(`ride:${event.rideId}`).emit('ride:safety', event);
  server.to('admins').emit('ride:safety', event);
}

export async function persistDriverLocation(input: {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  rideId?: string | null;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.driverId },
    include: { driverProfile: true, driverLocation: true }
  });

  if (!user) {
    throw new AppError('Driver not found', 404, 'driver_not_found');
  }

  const location = await prisma.driverLocation.upsert({
    where: { userId: input.driverId },
    update: {
      latitude: input.latitude,
      longitude: input.longitude,
      heading: input.heading ?? null,
      speed: input.speed ?? null,
      accuracy: input.accuracy ?? null
    },
    create: {
      userId: input.driverId,
      latitude: input.latitude,
      longitude: input.longitude,
      heading: input.heading ?? null,
      speed: input.speed ?? null,
      accuracy: input.accuracy ?? null
    }
  });

  const event: DriverLocationEvent = {
    driverId: input.driverId,
    rideId: input.rideId ?? null,
    latitude: location.latitude,
    longitude: location.longitude,
    heading: location.heading,
    speed: location.speed,
    accuracy: location.accuracy,
    updatedAt: location.updatedAt.toISOString()
  };

  emitDriverLocation(event);
  return serializeDriverLocation(location);
}

export async function appendRideEvent(rideId: string, type: string, payload: Prisma.InputJsonValue) {
  await prisma.rideEvent.create({
    data: {
      rideId,
      type,
      payload
    }
  });
}

export async function getRideSnapshot(rideId: string) {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: { rider: true, driver: true, events: true }
  });

  return ride ? serializeRide(ride) : null;
}
