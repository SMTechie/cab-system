import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prismaClient?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  });
}

function getPrismaClient() {
  if (!globalForPrisma.prismaClient) {
    globalForPrisma.prismaClient = createPrismaClient();
  }

  return globalForPrisma.prismaClient;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient() as PrismaClient & Record<string | symbol, unknown>;
    const value = client[property];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
  set(_target, property, value) {
    const client = getPrismaClient() as PrismaClient & Record<string | symbol, unknown>;
    client[property] = value;
    return true;
  }
}) as PrismaClient;
