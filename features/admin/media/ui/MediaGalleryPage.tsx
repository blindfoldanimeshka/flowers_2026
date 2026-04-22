'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';

type MediaItem = {
  url: string;
  inLibrary: boolean;
  createdAt?: string;
};

type Toast = { id: number; message: string; type: 'success' | 'error' };

export default function MediaGalleryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(toast => toast.id !== id)), 3000);
  }, []);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/media-library');
      if (!response.ok) throw new Error('Ошибка загрузки медиатеки');
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ошибка загрузки', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadMedia(); }, [loadMedia]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Выберите изображение', 'error');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      showToast('Размер файла не должен превышать 100MB', 'error');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка загрузки');
      }

      const data = await response.json();

      // Добавляем в медиатеку
      await fetch('/api/media-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.url }),
      });

      showToast('Изображение успешно загружено');
      setSelectedFile(null);
      setPreviewUrl('');
      await loadMedia();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ошибка загрузки', 'error');
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('URL скопирован в буфер обмена');
  };

  if (loading) {
    return (
      <div className="flex min-h-0 w-full max-w-full flex-1 flex-col bg-gray-100 px-1 py-2 sm:px-3 sm:py-4">
        <div className="w-full max-w-none rounded-2xl border border-gray-100 bg-white p-3 shadow-xl sm:p-5 lg:p-6">
          <div className="text-center text-gray-500">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full max-w-full flex-1 flex-col bg-gray-100 px-1 py-2 sm:px-3 sm:py-4">
      <div className="w-full max-w-none rounded-2xl border border-gray-100 bg-white p-3 shadow-xl sm:p-5 lg:p-6">
        <div className="fixed right-3 top-16 z-50 space-y-2 sm:right-4 sm:top-20">
          {toasts.map((toast) => (
            <div key={toast.id} className={`rounded-lg px-4 py-3 shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              <span className="font-medium">{toast.message}</span>
            </div>
          ))}
        </div>

        <h1 className="mb-4 sm:mb-8 text-xl sm:text-3xl font-extrabold tracking-tight text-gray-800">Галерея медиа</h1>

        <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">Загрузить новое изображение</h3>

          <div className="space-y-4">
            <div>
              <label className="block cursor-pointer">
                <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white px-6 py-8 transition-colors hover:border-blue-500 hover:bg-blue-50">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">Нажмите для выбора файла</p>
                    <p className="mt-1 text-xs text-gray-500">PNG, JPG, WebP, GIF до 100MB</p>
                  </div>
                </div>
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>

            {previewUrl && (
              <div className="space-y-3">
                <div className="relative h-48 w-full overflow-hidden rounded-lg border border-gray-200">
                  <Image src={previewUrl} alt="Preview" fill className="object-contain" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? 'Загрузка...' : 'Загрузить'}
                  </button>
                  <button
                    onClick={() => { setSelectedFile(null); setPreviewUrl(''); }}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-700">Все изображения ({items.length})</h2>
          {items.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
              Изображения отсутствуют. Загрузите первое изображение.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((item, index) => (
                <div key={`${item.url}-${index}`} className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="relative aspect-square">
                    <Image src={item.url} alt="Media" fill className="object-cover" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => copyToClipboard(item.url)}
                      className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100"
                    >
                      Копировать URL
                    </button>
                  </div>
                  {item.inLibrary && (
                    <div className="absolute right-2 top-2 rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white">
                      В библиотеке
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
