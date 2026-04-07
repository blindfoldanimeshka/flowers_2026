"use client";
import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { withCsrfHeaders } from '@/lib/csrf-client';

interface MediaLibraryItem {
  url: string;
  inLibrary: boolean;
}

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUploadStart?: () => void;
  onUploadEnd?: (success: boolean) => void;
  /** Показать выбор из общей медиатеки (товары, баннеры, фоны категорий) */
  showMediaLibrary?: boolean;
  /** После успешной загрузки добавить URL в медиатеку настроек */
  registerInLibrary?: boolean;
}

export default function ImageUpload({
  value,
  onChange,
  onUploadStart,
  onUploadEnd,
  showMediaLibrary = true,
  registerInLibrary = true,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<MediaLibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  useEffect(() => {
    setPreview(value ? value : null);
  }, [value]);

  const loadMediaLibrary = useCallback(async () => {
    if (!showMediaLibrary) return;
    setLibraryLoading(true);
    setLibraryError(null);
    try {
      const res = await fetch('/api/media-library', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) {
        throw new Error(res.status === 401 ? 'Требуется вход в админку' : 'Не удалось загрузить медиатеку');
      }
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setLibraryItems(
        items
          .filter((item: { url?: string }) => typeof item?.url === 'string' && item.url.length > 0)
          .map((item: { url: string; inLibrary?: boolean }) => ({
            url: item.url,
            inLibrary: Boolean(item.inLibrary),
          })),
      );
    } catch (e) {
      setLibraryError(e instanceof Error ? e.message : 'Ошибка медиатеки');
    } finally {
      setLibraryLoading(false);
    }
  }, [showMediaLibrary]);

  useEffect(() => {
    if (showMediaLibrary) {
      void loadMediaLibrary();
    }
  }, [showMediaLibrary, loadMediaLibrary]);

  const registerUrlInLibrary = useCallback(async (url: string) => {
    if (!registerInLibrary || !url) return;
    try {
      await fetch('/api/media-library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...withCsrfHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ url }),
      });
      void loadMediaLibrary();
    } catch {
      // не блокируем UI
    }
  }, [registerInLibrary, loadMediaLibrary]);

  const MAX_UPLOAD_BYTES = 900 * 1024; // Запас под nginx 1MB
  const MAX_DIMENSION = 2560;

  const optimizeImageForUpload = useCallback(async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;
    if (file.type === 'image/gif') return file;

    const objectUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Не удалось обработать изображение'));
        img.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Не удалось подготовить canvas для сжатия изображения');
      }

      const ratio = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
      let targetWidth = Math.max(1, Math.round(image.width * ratio));
      let targetHeight = Math.max(1, Math.round(image.height * ratio));

      const toBlob = (quality: number) => new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/webp', quality);
      });

      let bestBlob: Blob | null = null;
      for (let scaleAttempt = 0; scaleAttempt < 4; scaleAttempt++) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

        for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58]) {
          const blob = await toBlob(quality);
          if (!blob) continue;
          bestBlob = blob;
          if (blob.size <= MAX_UPLOAD_BYTES) {
            const safeName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
            return new File([blob], `${safeName}.webp`, { type: 'image/webp' });
          }
        }

        targetWidth = Math.max(1, Math.round(targetWidth * 0.85));
        targetHeight = Math.max(1, Math.round(targetHeight * 0.85));
      }

      if (!bestBlob) return file;

      const safeName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      return new File([bestBlob], `${safeName}.webp`, { type: 'image/webp' });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setError(null);
    setIsUploading(true);
    if (onUploadStart) onUploadStart();

    // Жмем изображение на клиенте, чтобы избежать 413 от nginx
    const optimizedFile = await optimizeImageForUpload(file);

    // Дополнительная защита по размеру после сжатия
    if (optimizedFile.size > MAX_UPLOAD_BYTES) {
      setError('Файл слишком большой даже после оптимизации. Попробуйте JPG/WebP меньшего веса.');
      setIsUploading(false);
      if (onUploadEnd) onUploadEnd(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', optimizedFile);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: withCsrfHeaders(),
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        let errorMessage = 'Ошибка загрузки файла';
        try {
          // Клонируем ответ для безопасного чтения
          const responseClone = res.clone();
          const contentType = res.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            const textError = await responseClone.text();
            errorMessage = textError || errorMessage;
          }
        } catch (parseError) {
          // Если и JSON и текст не получается, используем стандартное сообщение
          errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      if (typeof onChange === 'function') onChange(data.url);
      setPreview(data.url);
      if (typeof data.url === 'string') {
        void registerUrlInLibrary(data.url);
      }
      if (onUploadEnd) onUploadEnd(true);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Ошибка загрузки');
      if (onUploadEnd) onUploadEnd(false);
    } finally {
      setIsUploading(false);
    }
  }, [MAX_UPLOAD_BYTES, onChange, onUploadEnd, onUploadStart, optimizeImageForUpload, registerUrlInLibrary]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    await uploadFile(file);
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp', '.gif'] },
    multiple: false,
  });

  const handleRemoveImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
    onChange('');
  }, [onChange]);

  const pickFromLibrary = (url: string) => {
    setError(null);
    onChange(url);
    setPreview(url);
    setLibraryOpen(false);
  };

  return (
    <div className="space-y-3">
      {showMediaLibrary && (
        <div className="rounded-lg border border-gray-200 bg-gray-50/80">
          <button
            type="button"
            onClick={() => {
              setLibraryOpen((o) => !o);
              if (!libraryOpen) void loadMediaLibrary();
            }}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span>Медиатека (общие изображения)</span>
            <span className="text-gray-400">{libraryOpen ? '▲' : '▼'}</span>
          </button>
          {libraryOpen && (
            <div className="border-t border-gray-200 p-3">
              <p className="mb-2 text-xs text-gray-500">
                Загруженные здесь файлы попадают в общий список — их можно снова выбрать в товарах, баннере и фонах категорий.
              </p>
              {libraryLoading && <p className="text-sm text-gray-500">Загрузка…</p>}
              {libraryError && <p className="text-sm text-red-600">{libraryError}</p>}
              {!libraryLoading && !libraryError && libraryItems.length === 0 && (
                <p className="text-sm text-gray-500">Пока нет изображений. Загрузите файл ниже — он появится в списке.</p>
              )}
              {libraryItems.length > 0 && (
                <div className="max-h-48 overflow-y-auto overscroll-contain">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    {libraryItems.map((item) => (
                      <button
                        key={item.url}
                        type="button"
                        onClick={() => pickFromLibrary(item.url)}
                        className={`relative aspect-square overflow-hidden rounded-md border-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          value === item.url ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'
                        }`}
                        title={item.inLibrary ? 'В медиатеке' : 'Из товара или оформления'}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- превью из медиатеки, произвольные URL */}
                        <img src={item.url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div
        {...getRootProps()}
        className={`w-full rounded-lg border-2 border-dashed p-4 text-center transition-colors sm:p-6
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${error ? 'border-red-500 bg-red-50' : ''}
          ${isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
            <p className="text-gray-600">Загрузка...</p>
          </div>
        ) : isDragActive ? (
          <p className="text-blue-600 font-medium">Отпустите файл для загрузки</p>
        ) : (
          <div className="flex flex-col items-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-gray-600 font-medium">Перетащите фото сюда или кликните для выбора</p>
            <p className="text-gray-400 text-sm mt-1">PNG, JPG, WEBP, GIF. Автооптимизация перед загрузкой.</p>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {(preview || value) && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Превью:</p>
          <div className="relative inline-block">
            <Image 
              src={preview || value} 
              alt="preview" 
              width={128}
              height={128}
              className="h-24 w-24 rounded-lg border object-cover shadow-sm sm:h-32 sm:w-32"
              onError={() => {
                console.error('Image failed to load:', preview || value);
                setError('Не удалось загрузить изображение');
              }}
              onLoad={() => {
                setError(null); // Убираем ошибку если изображение загрузилось
              }}
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 
