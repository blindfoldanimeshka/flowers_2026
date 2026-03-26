"use client";
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUploadStart?: () => void;
  onUploadEnd?: (success: boolean) => void;
}

export default function ImageUpload({ value, onChange, onUploadStart, onUploadEnd }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
      if (onUploadEnd) onUploadEnd(true);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Ошибка загрузки');
      if (onUploadEnd) onUploadEnd(false);
    } finally {
      setIsUploading(false);
    }
  }, [MAX_UPLOAD_BYTES, onChange, onUploadEnd, onUploadStart, optimizeImageForUpload]);

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

  return (
    <div>
      <div
        {...getRootProps()}
        className={`w-full p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${error ? 'border-red-500 bg-red-50' : ''}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              className="w-32 h-32 object-cover rounded-lg border shadow-sm"
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
