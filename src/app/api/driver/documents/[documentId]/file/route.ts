import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { UserRole } from '@prisma/client';
import { jsonError } from '@/lib/api';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: { documentId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return jsonError(new AppError('Authentication required', 401, 'unauthorized'));
    }

    const document = await prisma.driverDocument.findUnique({
      where: { id: context.params.documentId }
    });

    if (!document) {
      return jsonError(new AppError('Document not found', 404, 'document_not_found'));
    }

    const isOwner = session.role === UserRole.DRIVER && document.userId === session.userId;
    const isAdmin = session.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
      return jsonError(new AppError('You do not have access to this document', 403, 'forbidden'));
    }

    let fileBytes: Buffer | null = document.fileData ? Buffer.from(document.fileData) : null;

    if (!fileBytes && document.filePath.startsWith('/uploads/')) {
      const publicRoot = path.resolve(process.cwd(), 'public');
      const fallbackPath = path.resolve(publicRoot, document.filePath.replace(/^\//, ''));

      if (fallbackPath === publicRoot || fallbackPath.startsWith(`${publicRoot}${path.sep}`)) {
        try {
          fileBytes = await readFile(fallbackPath);
        } catch {
          fileBytes = null;
        }
      }
    }

    if (!fileBytes) {
      return jsonError(new AppError('Document file is unavailable', 404, 'document_file_unavailable'));
    }

    return new Response(new Uint8Array(fileBytes), {
      status: 200,
      headers: {
        'content-type': document.mimeType || 'application/octet-stream',
        'content-disposition': `inline; filename="${document.fileName.replace(/["\r\n]/g, '_')}"`,
        'content-length': String(fileBytes.length),
        'cache-control': 'private, no-store'
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
