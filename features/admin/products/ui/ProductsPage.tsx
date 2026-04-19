'use client';

import { ChangeEvent, useEffect, useState } from 'react';
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
    const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
    return normalized;
  };

  const handlePriceChange = (value: string) => {
    const normalized = normalizePrice(value);
    setPriceInput(normalized);
    const parsed = Number(normalized);
    if (!Number.isNaN(parsed)) {
      onChange('price', parsed);
    }
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
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="space-y-4 rounded-lg bg-white p-4 shadow-md sm:p-6">
      <input name="name" value={draft.name} onChange={handleChange} placeholder="Название товара" className="w-full p-2 border rounded" required />
      <textarea name="description" value={draft.description} onChange={handleChange} placeholder="Описание" className="w-full p-2 border rounded" />
      <input
        type="text"
        inputMode="decimal"
        name="price"
        value={priceInput}
        onChange={handleChange}
        onBlur={handlePriceBlur}
        placeholder="Цена"
        className="w-full p-2 border rounded"
        required
      />
      <select name="categoryId" value={draft.categoryId} onChange={handleChange} className="w-full p-2 border rounded" required>
        <option value="">Выберите категорию</option>
        {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
      </select>
      <select name="subcategoryId" value={draft.subcategoryId} onChange={handleChange} className="w-full p-2 border rounded">
        <option value="">Выберите подкатегорию (необязательно)</option>
        {subcategories.map((subcategory) => <option key={subcategory._id} value={subcategory._id}>{subcategory.name}</option>)}
      </select>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Фото товара (до 3 шт.)</p>
        {[0, 1, 2].map((slot) => (
          <div key={`image-slot-${slot}`} className="rounded-md border border-gray-100 p-2">
            <p className="mb-2 text-xs text-gray-500">Фото {slot + 1}{slot === 0 ? ' (основное)' : ''}</p>
            <ImageUpload value={draft.images?.[slot] || ''} onChange={(url: string) => updateImageAt(slot, url)} />
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input type="checkbox" name="inStock" checked={draft.inStock} onChange={handleChange} />
        В наличии
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input type="checkbox" name="preorderOnly" checked={draft.preorderOnly} onChange={handleChange} />
        Только под заказ
      </label>

      <input
        name="assemblyTime"
        value={draft.assemblyTime}
        onChange={handleChange}
        placeholder="Время сборки (например: 1-2 часа)"
        className="w-full p-2 border rounded"
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="number"
          min={0}
          step={1}
          name="stockQuantity"
          value={draft.stockQuantity}
          onChange={handleChange}
          placeholder="Остаток"
          className="w-full p-2 border rounded"
        />
        <input
          name="stockUnit"
          value={draft.stockUnit}
          onChange={handleChange}
          placeholder="Ед. измерения (например: шт.)"
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={saving} className="w-full rounded bg-blue-500 p-2 text-white hover:bg-blue-600 disabled:opacity-50 sm:w-auto">{saving ? 'Сохранение...' : 'Сохранить'}</button>
        <button type="button" onClick={onCancel} className="w-full rounded bg-gray-300 p-2 sm:w-auto">Отмена</button>
      </div>
    </form>
  );
};

export default function ProductsPage() {
  const { products, categories, currentSubcategories, loading, saving, error, toasts, isFormVisible, draft, openCreateForm, openEditForm, closeForm, updateDraft, saveDraft, removeProduct } = useAdminProductsViewModel();

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="min-h-0 bg-gray-50 p-2 sm:p-4 lg:p-6">
      <div className="fixed right-3 top-16 z-50 space-y-2 sm:right-4 sm:top-20">
        {toasts.map((toast) => (
          <div key={toast.id} className={`px-4 py-3 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Управление товарами</h1>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-600">{error}</div>}

      {!isFormVisible ? (
        <button onClick={openCreateForm} className="w-full sm:w-auto bg-green-500 text-white p-3 rounded-lg mb-6 sm:mb-8 shadow-md hover:bg-green-600">+ Добавить новый товар</button>
      ) : (
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">{draft._id ? 'Редактировать товар' : 'Новый товар'}</h2>
          <ProductForm draft={draft} categories={categories} subcategories={currentSubcategories} saving={saving} onChange={updateDraft} onSubmit={saveDraft} onCancel={closeForm} />
        </div>
      )}

      <div className="rounded-lg bg-white p-3 shadow-md sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">Список товаров</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product: IProduct) => (
            <div key={product._id} className="rounded-lg border p-2.5 shadow-sm sm:p-4">
              <Image src={product.image || '/placeholder.jpg'} alt={product.name} width={300} height={192} className="mb-2 h-28 w-full rounded-md object-cover sm:mb-4 sm:h-48" />
              <h3 className="truncate text-sm font-bold sm:text-lg">{product.name}</h3>
              <p className="text-xs text-gray-600 sm:text-base">{product.price} руб.</p>
              {product.preorderOnly && <p className="text-xs font-semibold text-amber-700">Только под заказ</p>}
              {product.assemblyTime && <p className="text-xs text-gray-600">Сборка: {product.assemblyTime}</p>}
              <p className="text-xs text-gray-700">В наличии: {Math.max(0, Math.floor(product.stockQuantity ?? 0))} {product.stockUnit || 'шт.'}</p>
              <div className="mt-2 flex flex-col gap-1.5 sm:mt-4 sm:gap-2">
                <button onClick={() => openEditForm(product)} className="rounded bg-blue-500 px-2 py-1.5 text-xs text-white hover:bg-blue-600 sm:px-3 sm:py-2 sm:text-sm">Редактировать</button>
                <button onClick={() => removeProduct(product)} className="rounded bg-red-500 px-2 py-1.5 text-xs text-white hover:bg-red-600 sm:px-3 sm:py-2 sm:text-sm">Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
