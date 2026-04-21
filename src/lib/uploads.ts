import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export interface StoredUpload {
  fileName: string;
  filePath: string;
  publicUrl: string;
  mimeType: string;
}

export async function storeUpload(file: File, folder: string): Promise<StoredUpload> {
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const safeName = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const relativeDir = path.join('public', 'uploads', folder);
  const absoluteDir = path.join(process.cwd(), relativeDir);
  const absolutePath = path.join(absoluteDir, safeName);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, fileBuffer);

  return {
    fileName: file.name,
    filePath: path.posix.join('/uploads', folder, safeName).replaceAll('\\', '/'),
    publicUrl: path.posix.join('/uploads', folder, safeName).replaceAll('\\', '/'),
    mimeType: file.type || 'application/octet-stream'
  };
}
