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
    if (name === 'inStock' && type === 'checkbox' && 'checked' in event.target) return onChange('inStock', event.target.checked);
    onChange(name as keyof AdminProductDraft, value as never);
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
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
      <ImageUpload value={draft.image || ''} onChange={(url: string) => onChange('image', url)} />
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input type="checkbox" name="inStock" checked={draft.inStock} onChange={handleChange} />
        В наличии
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50">{saving ? 'Сохранение...' : 'Сохранить'}</button>
        <button type="button" onClick={onCancel} className="bg-gray-300 p-2 rounded">Отмена</button>
      </div>
    </form>
  );
};

export default function ProductsPage() {
  const { products, categories, currentSubcategories, loading, saving, error, toasts, isFormVisible, draft, openCreateForm, openEditForm, closeForm, updateDraft, saveDraft, removeProduct } = useAdminProductsViewModel();

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className={`px-4 py-3 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>
      <h1 className="text-3xl font-bold mb-8">Управление товарами</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-600">{error}</div>}
      {!isFormVisible ? (
        <button onClick={openCreateForm} className="bg-green-500 text-white p-3 rounded-lg mb-8 shadow-md hover:bg-green-600">+ Добавить новый товар</button>
      ) : (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{draft._id ? 'Редактировать товар' : 'Новый товар'}</h2>
          <ProductForm draft={draft} categories={categories} subcategories={currentSubcategories} saving={saving} onChange={updateDraft} onSubmit={saveDraft} onCancel={closeForm} />
        </div>
      )}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Список товаров</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product: IProduct) => (
            <div key={product._id} className="border rounded-lg p-4 shadow-sm">
              <Image src={product.image || '/placeholder.jpg'} alt={product.name} width={300} height={192} className="w-full h-48 object-cover rounded-md mb-4" />
              <h3 className="font-bold text-lg">{product.name}</h3>
              <p className="text-gray-600">{product.price} руб.</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openEditForm(product)} className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">Редактировать</button>
                <button onClick={() => removeProduct(product)} className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
