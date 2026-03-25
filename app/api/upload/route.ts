import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Функция для определения директории загрузки
function resolveUploadDir(): string {
  // Для self-hosted используем постоянную директорию.
  // При необходимости можно переопределить через UPLOAD_DIR.
  return process.env.UPLOAD_DIR || join(process.cwd(), 'public/uploads');
}

// POST запрос для загрузки изображений
export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    // Проверка типа файла
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Неподдерживаемый тип файла. Разрешены: JPEG, PNG, WebP, GIF' 
      }, { status: 400 });
    }

    // Проверка размера файла (максимум 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'Размер файла превышает 10MB' 
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
    
    console.log(`Файл успешно загружен: ${publicUrl}`);
    
    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      filename: filename,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
    return NextResponse.json({ 
      error: 'Ошибка при сохранении файла',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 });
  }
}

// GET запрос для получения списка загруженных файлов (опционально)
export async function GET(request: NextRequest) {
  try {
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

  } catch (error: any) {
    console.error('Ошибка при получении списка файлов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении списка файлов', details: error.message },
      { status: 500 }
    );
  }
} 
