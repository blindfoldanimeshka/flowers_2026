'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import ImageUpload from '@/app/admin/components/ImageUpload';
import { ICategory, ISubcategory } from '@/app/client/models/Category';
import { AdminProductDraft, IProduct, useAdminProductsViewModel } from '@/features/admin/products';

interface ProductFormProps {
  draft: AdminProductDraft;
  categories: ICategory[];
  subcategories: ISubcategory[];
  saving: boolean;
  onChange: <K extends keyof AdminProductDraft>(field: K, value: AdminProductDraft[K]) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const ProductForm = ({ draft, categories, subcategories, saving, onChange, onSubmit, onCancel }: ProductFormProps) => {
  const [priceInput, setPriceInput] = useState(String(draft.price || ''));

  const updateImageAt = (index: number, value: string) => {
    const nextImages = [...(draft.images || [])];
    nextImages[index] = value;
    const normalized = nextImages
      .map((src) => src?.trim())
      .filter((src): src is string => Boolean(src))
      .slice(0, 3);
    onChange('images', normalized);
    onChange('image', normalized[0] || '');
  };

  useEffect(() => {
    setPriceInput(String(draft.price || ''));
  }, [draft.price, draft._id]);

  const normalizePrice = (raw: string) => {
    const sanitized = raw.replace(',', '.').replace(/[^\d.]/g, '');
    const parts = sanitized.split('.');
    return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
  };

  const handlePriceChange = (value: string) => {
    const normalized = normalizePrice(value);
    setPriceInput(normalized);
    const parsed = Number(normalized);
    if (!Number.isNaN(parsed)) onChange('price', parsed);
  };

  const handlePriceBlur = () => {
    const parsed = Number(normalizePrice(priceInput));
    const safe = Number.isFinite(parsed) ? Math.max(0, Number(parsed.toFixed(2))) : 0;
    setPriceInput(safe === 0 ? '' : safe.toString());
    onChange('price', safe);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    if (name === 'price') return handlePriceChange(value);
    if ((name === 'inStock' || name === 'preorderOnly') && type === 'checkbox' && 'checked' in event.target) {
      return onChange(name as 'inStock' | 'preorderOnly', event.target.checked);
    }
    if (name === 'stockQuantity') {
      const nextValue = Number(value);
      return onChange('stockQuantity', Number.isFinite(nextValue) ? Math.max(0, Math.floor(nextValue)) : 0);
    }
    onChange(name as keyof AdminProductDraft, value as never);
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-gray-800">{draft._id ? 'Редактирование товара' : 'Новый товар'}</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input name="name" value={draft.name} onChange={handleChange} placeholder="Название товара" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" required />
        <input
          type="text"
          inputMode="decimal"
          name="price"
          value={priceInput}
          onChange={handleChange}
          onBlur={handlePriceBlur}
          placeholder="Цена"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          required
        />
      </div>

      <textarea name="description" value={draft.description} onChange={handleChange} placeholder="Описание" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" rows={3} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <select name="categoryId" value={draft.categoryId} onChange={handleChange} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" required>
          <option value="">Выберите категорию</option>
          {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
        </select>
        <select name="subcategoryId" value={draft.subcategoryId} onChange={handleChange} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
          <option value="">Подкатегория (необязательно)</option>
          {subcategories.map((subcategory) => <option key={subcategory._id} value={subcategory._id}>{subcategory.name}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Фото товара (до 3)</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((slot) => (
            <div key={`image-slot-${slot}`} className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="mb-2 text-xs font-medium text-gray-600">Фото {slot + 1}{slot === 0 ? ' (главное)' : ''}</p>
              <ImageUpload value={draft.images?.[slot] || ''} onChange={(url: string) => updateImageAt(slot, url)} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" name="inStock" checked={draft.inStock} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200" />
          В наличии
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" name="preorderOnly" checked={draft.preorderOnly} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200" />
          Только под заказ
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input name="assemblyTime" value={draft.assemblyTime} onChange={handleChange} placeholder="Время сборки" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
        <input type="number" min={0} step={1} name="stockQuantity" value={draft.stockQuantity} onChange={handleChange} placeholder="Остаток" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
        <input name="stockUnit" value={draft.stockUnit} onChange={handleChange} placeholder="Ед. измерения" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={saving} className="w-full rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{saving ? 'Сохранение...' : 'Сохранить'}</button>
        <button type="button" onClick={onCancel} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto">Отмена</button>
      </div>
    </form>
  );
};

export default function ProductsPage() {
  const {
    products,
    categories,
    currentSubcategories,
    loading,
    saving,
    error,
    toasts,
    isFormVisible,
    draft,
    openCreateForm,
    openEditForm,
    closeForm,
    updateDraft,
    saveDraft,
    removeProduct,
  } = useAdminProductsViewModel();

  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isFormVisible) setTab('form');
  }, [isFormVisible]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => product.name.toLowerCase().includes(q) || String(product.price).includes(q));
  }, [products, search]);

  if (loading) return <div className="flex min-h-0 w-full max-w-full flex-1 flex-col bg-gray-100 px-1 py-2 sm:px-3 sm:py-4"><div className="w-full max-w-none rounded-2xl border border-gray-100 bg-white p-3 shadow-xl sm:p-5 lg:p-6"><div className="text-center text-gray-500">Загрузка...</div></div></div>;

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

      <h1 className="mb-4 sm:mb-8 text-xl sm:text-3xl font-extrabold tracking-tight text-gray-800">Управление товарами</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-600">{error}</div>}

      <div className="mb-4 shrink-0 sm:mb-6">
        <div className="overflow-x-auto border-b border-gray-200">
          <nav className="-mb-px flex space-x-2 sm:space-x-8 min-w-max" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setTab('list')}
              className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${tab === 'list' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
            >
              Список товаров
            </button>
            <button
              type="button"
              onClick={() => { setTab('form'); if (!isFormVisible) openCreateForm(); }}
              className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${tab === 'form' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
            >
              {draft._id ? 'Редактирование' : 'Добавить товар'}
            </button>
          </nav>
        </div>
      </div>

      {tab === 'form' && isFormVisible && (
        <div className="mb-6">
          <ProductForm draft={draft} categories={categories} subcategories={currentSubcategories} saving={saving} onChange={updateDraft} onSubmit={saveDraft} onCancel={closeForm} />
        </div>
      )}

      {tab === 'list' && (
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-700">Все товары</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию или цене" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:w-72" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product: IProduct) => (
              <div key={product._id} className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md sm:p-4">
                <Image src={product.image || '/placeholder.jpg'} alt={product.name} width={300} height={192} className="mb-2 h-28 w-full rounded-md object-cover sm:mb-4 sm:h-48" />
                <h3 className="truncate text-sm font-bold text-gray-900 sm:text-lg">{product.name}</h3>
                <p className="text-xs font-semibold text-gray-900 sm:text-base">{product.price} ₽</p>
                {product.preorderOnly && <p className="text-xs font-semibold text-amber-700">Только под заказ</p>}
                {product.assemblyTime && <p className="text-xs text-gray-600">Сборка: {product.assemblyTime}</p>}
                <p className="text-xs text-gray-700">В наличии: {Math.max(0, Math.floor(product.stockQuantity ?? 0))} {product.stockUnit || 'шт.'}</p>
                <div className="mt-2 flex flex-col gap-1.5 sm:mt-4 sm:gap-2">
                  <button onClick={() => { openEditForm(product); setTab('form'); }} className="rounded bg-blue-500 px-2 py-1.5 text-xs text-white transition-colors hover:bg-blue-600 sm:px-3 sm:py-2 sm:text-sm">Редактировать</button>
                  <button onClick={() => removeProduct(product)} className="rounded bg-red-500 px-2 py-1.5 text-xs text-white transition-colors hover:bg-red-600 sm:px-3 sm:py-2 sm:text-sm">Удалить</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
