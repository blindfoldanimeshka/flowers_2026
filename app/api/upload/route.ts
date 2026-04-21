import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

// Функция для определения директории загрузки
function resolveUploadDir(): string {
  // Для self-hosted используем постоянную директорию.
  // При необходимости можно переопределить через UPLOAD_DIR.
  return process.env.UPLOAD_DIR || join(process.cwd(), 'public/uploads');
}

// POST запрос для загрузки изображений
export const POST = withErrorHandler(async (request: NextRequest) => {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    // Проверка типа файла
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, HEIC, HEIF' 
      }, { status: 400 });
    }

    // Проверка размера файла (максимум 10MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size exceeds 100MB' 
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = resolveUploadDir();
    
    // Генерируем безопасное имя файла
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${sanitizedName}`;
    const path = join(uploadDir, filename);
    
    // Убедимся, что директория для загрузки существует
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    await writeFile(path, buffer);
    
    const publicUrl = `/uploads/${filename}`;
    
    productionLogger.info(`Файл успешно загружен: ${publicUrl}`);
    
    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      filename: filename,
      size: file.size,
      type: file.type
    });

  
});

// GET запрос для получения списка загруженных файлов (опционально)
export const GET = withErrorHandler(async (request: NextRequest) => {
    // Получаем информацию о пользователе из middleware
    const userRole = request.headers.get('x-user-role');
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен - требуется роль администратора' },
        { status: 403 }
      );
    }

    const { readdir, stat } = await import('fs/promises');
    const uploadsDir = resolveUploadDir();
    
    if (!existsSync(uploadsDir)) {
      return NextResponse.json({ files: [] }, { status: 200 });
    }

    const files = await readdir(uploadsDir);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|webp|gif)$/i.test(file)
    );

    const fileList = await Promise.all(
      imageFiles.map(async (file) => {
        const filePath = join(uploadsDir, file);
        const stats = await stat(filePath);
        return {
          name: file,
          url: `/uploads/${file}`,
          size: stats.size,
          uploadedAt: stats.mtime.toISOString(),
        };
      })
    );

    return NextResponse.json({ files: fileList }, { status: 200 });

  
}); 
