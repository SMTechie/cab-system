import { UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { jsonError, jsonSuccess } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { recordAuditLog } from '@/lib/audit';
import { getDriverDocumentFilePath } from '@/lib/driver-documents';

const MAX_DOCUMENT_BYTES = 4_000_000;

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== UserRole.DRIVER) {
      return jsonError(new AppError('Driver access required', 403, 'forbidden'));
    }

    const documents = await prisma.driverDocument.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' }
    });

    return jsonSuccess({
      documents: documents.map((document) => ({
        id: document.id,
        type: document.type,
        title: document.title,
        fileName: document.fileName,
        filePath: getDriverDocumentFilePath(document.id),
        mimeType: document.mimeType,
        status: document.status,
        uploadedAt: document.uploadedAt.toISOString(),
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString()
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== UserRole.DRIVER) {
      return jsonError(new AppError('Driver access required', 403, 'forbidden'));
    }

    const formData = await request.formData();
    const type = String(formData.get('type') ?? '').trim();
    const title = String(formData.get('title') ?? '').trim() || null;
    const file = formData.get('file');

    if (!type) {
      throw new AppError('Document type is required', 422, 'validation_error');
    }

    if (!(file instanceof File)) {
      throw new AppError('Document file is required', 422, 'validation_error');
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new AppError('Document file must be 4 MB or smaller', 413, 'file_too_large');
    }

    const fileData = Buffer.from(await file.arrayBuffer());
    const documentId = randomUUID();
    const filePath = getDriverDocumentFilePath(documentId);
    const document = await prisma.driverDocument.create({
      data: {
        id: documentId,
        userId: session.userId,
        type,
        title,
        fileName: file.name,
        filePath,
        fileData,
        mimeType: file.type || 'application/octet-stream'
      }
    });

    await recordAuditLog({
      actorUserId: session.userId,
      action: 'driver.document.uploaded',
      entityType: 'DriverDocument',
      entityId: document.id,
      payload: {
        type: document.type,
        title: document.title,
        filePath: document.filePath
      }
    });

    return jsonSuccess(
      {
        document: {
          id: document.id,
          type: document.type,
          title: document.title,
          fileName: document.fileName,
          filePath: document.filePath,
          mimeType: document.mimeType,
          status: document.status,
          uploadedAt: document.uploadedAt.toISOString(),
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString()
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(error);
  }
}
