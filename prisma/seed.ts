import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cab.local' },
    update: {},
    create: {
      name: 'Platform Admin',
      email: 'admin@cab.local',
      passwordHash,
      role: UserRole.ADMIN,
      phoneNumber: '+27810000001',
      preferredLanguage: 'en'
    }
  });

  const driver = await prisma.user.upsert({
    where: { email: 'driver@cab.local' },
    update: {},
    create: {
      name: 'Driver Demo',
      email: 'driver@cab.local',
      passwordHash,
      role: UserRole.DRIVER,
      phoneNumber: '+27810000002',
      preferredLanguage: 'en',
      driverProfile: {
        create: {
          vehicleMake: 'Toyota',
          vehicleModel: 'Corolla',
          vehicleColor: 'White',
          plateNumber: 'CAB-101',
          serviceRadiusKm: 35,
          commissionBps: 1200,
          isAvailable: true
        }
      }
    }
  });

  const rider = await prisma.user.upsert({
    where: { email: 'rider@cab.local' },
    update: {},
    create: {
      name: 'Rider Demo',
      email: 'rider@cab.local',
      passwordHash,
      role: UserRole.RIDER,
      phoneNumber: '+27810000003',
      preferredLanguage: 'en'
    }
  });

  console.log({
    admin: admin.email,
    driver: driver.email,
    rider: rider.email,
    password: 'Password123!'
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
