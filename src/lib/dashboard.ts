import { prisma } from '@/lib/prisma';
import { serializeDriverLocation, serializeRide, serializeUser, type SafeDriverLocation, type SafeRide, type SafeUser } from '@/lib/serializers';

export interface DriverLocationWithUser {
  user: SafeUser;
  location: SafeDriverLocation | null;
}

export interface RiderDashboardData {
  rides: SafeRide[];
  availableDrivers: DriverLocationWithUser[];
  completedTrips: number;
  upcomingTrips: number;
  spentCents: number;
}

export interface DriverDashboardData {
  rides: SafeRide[];
  profile: {
    stripeAccountId: string | null;
    commissionBps: number;
    isAvailable: boolean;
  } | null;
  location: SafeDriverLocation | null;
  completedTrips: number;
  earningPotentialCents: number;
  pendingOffers: {
    id: string;
    rideId: string;
    originLabel: string;
    destinationLabel: string;
    offeredFareCents: number;
    etaMinutes: number;
    expiresAt: string;
    riderName: string;
  }[];
  documents: {
    id: string;
    type: string;
    title: string | null;
    status: string;
    filePath: string;
    uploadedAt: string;
  }[];
}

export interface AdminDashboardData {
  totalRides: number;
  activeRides: number;
  driversOnline: number;
  riders: number;
  queuedDispatches: number;
  pendingOffers: number;
  totalRevenueCents: number;
  platformFeesCents: number;
  openSafetyAlerts: number;
  recentRides: SafeRide[];
  recentAlerts: {
    id: string;
    rideId: string;
    type: string;
    message: string;
    status: string;
    createdAt: string;
  }[];
  pendingDriverDocuments: {
    id: string;
    userId: string;
    type: string;
    title: string | null;
    status: string;
    filePath: string;
    uploadedAt: string;
  }[];
}

export async function loadRiderDashboard(userId: string): Promise<RiderDashboardData> {
  const [rides, drivers, completedTrips, upcomingTrips, spentAggregation] = await Promise.all([
    prisma.ride.findMany({
      where: { riderId: userId },
      include: {
        rider: { include: { driverProfile: true } },
        driver: { include: { driverProfile: true } },
        events: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' },
      take: 12
    }),
    prisma.driverProfile.findMany({
      where: { isAvailable: true },
      include: {
        user: {
          include: {
            driverLocation: true,
            driverProfile: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 12
    }),
    prisma.ride.count({
      where: { riderId: userId, status: 'COMPLETED' }
    }),
    prisma.ride.count({
      where: { riderId: userId, status: { in: ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'] } }
    }),
    prisma.ride.aggregate({
      where: { riderId: userId, paymentStatus: 'PAID' },
      _sum: { estimatedFareCents: true }
    })
  ]);

  return {
    rides: rides.map(serializeRide),
    availableDrivers: drivers.map((profile) => ({
      user: serializeUser(profile.user),
      location: profile.user.driverLocation ? serializeDriverLocation(profile.user.driverLocation) : null
    })),
    completedTrips,
    upcomingTrips,
    spentCents: spentAggregation._sum.estimatedFareCents ?? 0
  };
}

export async function loadDriverDashboard(userId: string): Promise<DriverDashboardData> {
  const [rides, profile, location, completedTrips, earningAggregation, pendingOffers, documents] = await Promise.all([
    prisma.ride.findMany({
      where: { driverId: userId },
      include: {
        rider: { include: { driverProfile: true } },
        driver: { include: { driverProfile: true } },
        events: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' },
      take: 12
    }),
    prisma.driverProfile.findUnique({
      where: { userId }
    }),
    prisma.driverLocation.findUnique({
      where: { userId }
    }),
    prisma.ride.count({
      where: { driverId: userId, status: 'COMPLETED' }
    }),
    prisma.ride.aggregate({
      where: { driverId: userId, paymentStatus: 'PAID' },
      _sum: { estimatedFareCents: true }
    }),
    prisma.rideOffer.findMany({
      where: {
        driverId: userId,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        ride: {
          include: {
            rider: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 8
    }),
    prisma.driverDocument.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      take: 10
    })
  ]);

  return {
    rides: rides.map(serializeRide),
    profile: profile
      ? {
          stripeAccountId: profile.stripeAccountId,
          commissionBps: profile.commissionBps,
          isAvailable: profile.isAvailable
        }
      : null,
    location: location ? serializeDriverLocation(location) : null,
    completedTrips,
    earningPotentialCents: earningAggregation._sum.estimatedFareCents ?? 0,
    pendingOffers: pendingOffers.map((offer) => ({
      id: offer.id,
      rideId: offer.rideId,
      originLabel: offer.ride.originLabel,
      destinationLabel: offer.ride.destinationLabel,
      offeredFareCents: offer.offeredFareCents,
      etaMinutes: Math.max(3, Math.round(offer.ride.distanceKm * 4)),
      expiresAt: offer.expiresAt.toISOString(),
      riderName: offer.ride.rider.name
    })),
    documents: documents.map((document) => ({
      id: document.id,
      type: document.type,
      title: document.title,
      status: document.status,
      filePath: document.filePath,
      uploadedAt: document.uploadedAt.toISOString()
    }))
  };
}

export async function loadAdminDashboard(): Promise<AdminDashboardData> {
  const [
    totalRides,
    activeRides,
    driversOnline,
    riders,
    queuedDispatches,
    pendingOffers,
    revenueAggregation,
    alerts,
    documents,
    recentRides
  ] = await Promise.all([
    prisma.ride.count(),
    prisma.ride.count({
      where: { status: { in: ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'] } }
    }),
    prisma.driverProfile.count({
      where: { isAvailable: true }
    }),
    prisma.user.count({
      where: { role: 'RIDER' }
    }),
    prisma.ride.count({
      where: { status: 'REQUESTED', driverId: null }
    }),
    prisma.rideOffer.count({
      where: { status: 'PENDING' }
    }),
    prisma.ride.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: {
        estimatedFareCents: true,
        platformFeeCents: true
      }
    }),
    prisma.rideSafetyAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8
    }),
    prisma.driverDocument.findMany({
      where: { status: 'PENDING' },
      orderBy: { uploadedAt: 'desc' },
      take: 8
    }),
    prisma.ride.findMany({
      include: {
        rider: { include: { driverProfile: true } },
        driver: { include: { driverProfile: true } },
        events: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' },
      take: 15
    })
  ]);

  return {
    totalRides,
    activeRides,
    driversOnline,
    riders,
    queuedDispatches,
    pendingOffers,
    totalRevenueCents: revenueAggregation._sum.estimatedFareCents ?? 0,
    platformFeesCents: revenueAggregation._sum.platformFeeCents ?? 0,
    openSafetyAlerts: alerts.length,
    recentRides: recentRides.map(serializeRide),
    recentAlerts: alerts.map((alert) => ({
      id: alert.id,
      rideId: alert.rideId,
      type: alert.type,
      message: alert.message,
      status: alert.status,
      createdAt: alert.createdAt.toISOString()
    })),
    pendingDriverDocuments: documents.map((document) => ({
      id: document.id,
      userId: document.userId,
      type: document.type,
      title: document.title,
      status: document.status,
      filePath: document.filePath,
      uploadedAt: document.uploadedAt.toISOString()
    }))
  };
}
