'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { withCsrfHeaders } from '@/lib/csrf-client';

type MediaItem = {
  url: string;
  inLibrary: boolean;
  createdAt?: string;
};

type Toast = { id: number; message: string; type: 'success' | 'error' };

export default function MediaGalleryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewModal, setViewModal] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [actionSheet, setActionSheet] = useState<{ url: string; inLibrary: boolean } | null>(null);

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
      setFilteredItems(data.items || []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ошибка загрузки', 'error');
      setItems([]);
      setFilteredItems([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadMedia(); }, [loadMedia]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }
    const query = searchQuery.toLowerCase();
    setFilteredItems(items.filter(item => item.url.toLowerCase().includes(query)));
  }, [searchQuery, items]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const previewPromises: Promise<string>[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        showToast(`${file.name}: не является изображением`, 'error');
        continue;
      }

      if (file.size > 100 * 1024 * 1024) {
        showToast(`${file.name}: размер превышает 100MB`, 'error');
        continue;
      }

      validFiles.push(file);
      previewPromises.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.readAsDataURL(file);
        })
      );
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      void Promise.all(previewPromises).then((results) => {
        setPreviewUrls(results.filter(Boolean));
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles: File[] = [];
    const previewPromises: Promise<string>[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        showToast(`${file.name}: не является изображением`, 'error');
        continue;
      }

      if (file.size > 100 * 1024 * 1024) {
        showToast(`${file.name}: размер превышает 100MB`, 'error');
        continue;
      }

      validFiles.push(file);
      previewPromises.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.readAsDataURL(file);
        })
      );
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      void Promise.all(previewPromises).then((results) => {
        setPreviewUrls(results.filter(Boolean));
      });
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = selectedFiles.length;
      let completed = 0;

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Ошибка загрузки ${file.name}`);
        }

        const data = await response.json();

        const registerResponse = await fetch('/api/media-library', {
          method: 'POST',
          headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ url: data.url }),
        });

        if (!registerResponse.ok) {
          const registerError = await registerResponse.json().catch(() => null);
          throw new Error(registerError?.error || `Ошибка регистрации в медиатеке: ${file.name}`);
        }

        completed++;
        setUploadProgress(Math.round((completed / totalFiles) * 100));
      }

      showToast(`Успешно загружено ${totalFiles} ${totalFiles === 1 ? 'изображение' : 'изображений'}`);
      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadProgress(0);
      await loadMedia();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ошибка загрузки', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (url: string) => {
    try {
      const response = await fetch('/api/media-library', {
        method: 'DELETE',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка удаления');
      }

      showToast('Изображение удалено');
      setDeleteModal(null);
      await loadMedia();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ошибка удаления', 'error');
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
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
            <span className="ml-3 text-gray-600">Загрузка медиатеки...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full max-w-full flex-1 flex-col bg-gray-100 px-1 py-2 sm:px-3 sm:py-4">
      <div className="w-full max-w-none rounded-2xl border border-gray-100 bg-white p-3 shadow-xl sm:p-5 lg:p-6">
        {/* Toasts */}
        <div className="fixed left-1/2 top-20 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 space-y-2">
          {toasts.map((toast) => (
            <div key={toast.id} className={`rounded-lg px-4 py-3 text-center shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              <span className="text-sm font-medium sm:text-base">{toast.message}</span>
            </div>
          ))}
        </div>

        {/* View Modal */}
        {viewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4" onClick={() => setViewModal(null)}>
            <div className="relative max-h-[95vh] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setViewModal(null)}
                className="absolute -right-2 -top-2 rounded-full bg-white p-2 shadow-lg hover:bg-gray-100 sm:-right-4 sm:-top-4 sm:p-3"
              >
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <Image src={viewModal} alt="Preview" width={1200} height={800} className="max-h-[95vh] w-auto rounded-lg object-contain" />
            </div>
          </div>
        )}

        {/* Action Sheet (Mobile) */}
        {actionSheet && (
          <div className="fixed inset-0 z-50 sm:hidden" onClick={() => setActionSheet(null)}>
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Действия</h3>
                <button onClick={() => setActionSheet(null)} className="rounded-full p-1 hover:bg-gray-100">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setViewModal(actionSheet.url);
                    setActionSheet(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 text-left font-medium text-gray-900 transition-colors hover:bg-gray-100"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Просмотреть
                </button>
                <button
                  onClick={() => {
                    copyToClipboard(actionSheet.url);
                    setActionSheet(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 text-left font-medium text-gray-900 transition-colors hover:bg-gray-100"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Копировать URL
                </button>
                <button
                  onClick={() => {
                    setDeleteModal(actionSheet.url);
                    setActionSheet(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-left font-medium text-red-600 transition-colors hover:bg-red-100"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteModal(null)}>
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-3 text-lg font-bold text-gray-900 sm:mb-4 sm:text-xl">Подтвердите удаление</h3>
              <p className="mb-5 text-sm text-gray-600 sm:mb-6 sm:text-base">Вы уверены, что хотите удалить это изображение? Это действие нельзя отменить.</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <button
                  onClick={() => handleDelete(deleteModal)}
                  className="order-2 rounded-lg bg-red-500 px-4 py-3 font-medium text-white transition-colors hover:bg-red-600 sm:order-1 sm:flex-1 sm:py-2"
                >
                  Удалить
                </button>
                <button
                  onClick={() => setDeleteModal(null)}
                  className="order-1 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:order-2 sm:flex-1 sm:py-2"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        <h1 className="mb-4 text-xl font-extrabold tracking-tight text-gray-800 sm:mb-8 sm:text-3xl">Галерея медиа</h1>

        {/* Upload Section */}
        <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:p-6">
          <h3 className="mb-3 text-base font-semibold text-gray-800 sm:mb-4 sm:text-lg">Загрузить изображения</h3>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block cursor-pointer">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors sm:px-6 sm:py-8 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-100'
                      : 'border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <div className="text-center">
                    <svg className="mx-auto h-10 w-10 text-gray-400 sm:h-12 sm:w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-2 text-xs text-gray-600 sm:text-sm">
                      {isDragging ? 'Отпустите файлы здесь' : 'Перетащите файлы или нажмите для выбора'}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-500 sm:text-xs">PNG, JPG, WebP, GIF до 100MB • Можно выбрать несколько</p>
                  </div>
                </div>
                <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
              </label>
            </div>

            {previewUrls.length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200">
                      <Image src={url} alt={`Preview ${index + 1}`} fill className="object-cover" />
                      <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white sm:px-2 sm:text-xs">
                        {(selectedFiles[index].size / 1024 / 1024).toFixed(1)} MB
                      </div>
                    </div>
                  ))}
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-center text-xs text-gray-600 sm:text-sm">Загрузка: {uploadProgress}%</p>
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full rounded-lg bg-blue-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
                  >
                    {uploading ? 'Загрузка...' : `Загрузить (${selectedFiles.length})`}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFiles([]);
                      setPreviewUrls([]);
                    }}
                    disabled={uploading}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search and Gallery */}
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-gray-700 sm:text-lg">
              Все изображения ({filteredItems.length}{searchQuery && ` из ${items.length}`})
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск по URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-64"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500 sm:text-base">
              {searchQuery ? 'Изображения не найдены' : 'Изображения отсутствуют. Загрузите первое изображение.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredItems.map((item, index) => (
                <div key={`${item.url}-${index}`} className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div
                    className="relative aspect-square cursor-pointer"
                    onClick={() => {
                      if (window.innerWidth < 640) {
                        setActionSheet({ url: item.url, inLibrary: item.inLibrary });
                      } else {
                        setViewModal(item.url);
                      }
                    }}
                  >
                    <Image src={item.url} alt="Media" fill className="object-cover" />
                  </div>

                  {/* Desktop hover actions */}
                  <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(item.url);
                      }}
                      className="rounded-lg bg-white p-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100"
                      title="Копировать URL"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteModal(item.url);
                      }}
                      className="rounded-lg bg-red-500 p-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                      title="Удалить"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {item.inLibrary && (
                    <div className="absolute right-1 top-1 rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow sm:right-2 sm:top-2 sm:px-2 sm:text-xs">
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
