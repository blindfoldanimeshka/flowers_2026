import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseUrl } from '@/lib/supabase';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';

// POST запрос для загрузки изображений в Supabase Storage
export const POST = withErrorHandler(async (request: NextRequest) => {
    const data = await request.formData();
    const fileEntry = data.get('file') ?? data.get('image');
    const file: File | null = (fileEntry as unknown as File) || null;

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

    // Проверка размера файла (максимум 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File size exceeds 100MB'
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Генерируем безопасное имя файла
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${sanitizedName}`;

    // Загружаем в Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      productionLogger.error(`Ошибка загрузки в Supabase Storage: ${uploadError.message}`);
      return NextResponse.json({
        error: `Ошибка загрузки: ${uploadError.message}`
      }, { status: 500 });
    }

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    productionLogger.info(`Файл успешно загружен в Supabase Storage: ${publicUrl}`);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: filename,
      size: file.size,
      type: file.type
    });


});

// GET запрос для получения списка загруженных файлов из Supabase Storage
export const GET = withErrorHandler(async (request: NextRequest) => {
    // Получаем информацию о пользователе из middleware
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен - требуется роль администратора' },
        { status: 403 }
      );
    }

    const { data: files, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      productionLogger.error(`Ошибка получения списка файлов: ${error.message}`);
      return NextResponse.json({ files: [] }, { status: 200 });
    }

    const fileList = files
      .filter(file => /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name))
      .map((file) => {
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(file.name);

        return {
          name: file.name,
          url: urlData.publicUrl,
          size: file.metadata?.size || 0,
          uploadedAt: file.created_at,
        };
      });

    return NextResponse.json({ files: fileList }, { status: 200 });


}); 
