import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { notifyOps } from '@/lib/monitoring';

export interface AuditInput {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        payload: input.payload ?? undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null
      }
    });
  } catch (error) {
    await notifyOps({
      title: 'Audit log failure',
      message: error instanceof Error ? error.message : 'Unknown audit log error',
      severity: 'warning',
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null
      }
    });
  }
}
