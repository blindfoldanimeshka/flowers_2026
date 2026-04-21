import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, normalize } from 'path';
import { existsSync } from 'fs';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

// Функция для определения директории загрузки
function resolveUploadDir(): string {
  return process.env.UPLOAD_DIR || join(process.cwd(), 'public/uploads');
}

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) => {
    const resolvedParams = await params;
    const parts = resolvedParams.path || [];
    const filePath = parts.join('/');
    const uploadDir = resolveUploadDir();
    const normalizedPath = normalize(filePath).replace(/^([/\\])+/, '');

    // Проверяем безопасность пути
    if (!filePath || normalizedPath.includes('..')) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Поддерживаем основной и legacy-пути, чтобы старые ссылки не ломались
    const candidatePaths = Array.from(new Set([
      join(uploadDir, normalizedPath),
      join(process.cwd(), 'public/uploads', normalizedPath),
      join('/tmp/uploads', normalizedPath),
    ]));

    const existingPath = candidatePaths.find((candidate) => existsSync(candidate));
    let fileBuffer: Buffer;
    let extension = normalizedPath.split('.').pop()?.toLowerCase();

    if (existingPath) {
      fileBuffer = await readFile(existingPath);
    } else {
      // Фолбэк, чтобы Next/Image не падал на битых старых ссылках
      const fallbackPath = join(process.cwd(), 'public/image/items/11.png');
      fileBuffer = await readFile(fallbackPath);
      extension = 'png';
    }

    // Определяем MIME-тип
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'svg':
        contentType = 'image/svg+xml';
        break;
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  
}); 
