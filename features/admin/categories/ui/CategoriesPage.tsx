"use client";

import { useState } from 'react';
import { ICategoryWithStats as Category, ISubcategory as Subcategory } from '@/app/client/models/Category';
import { useAdminCategoriesViewModel } from '@/features/admin/categories';

const MAX_CATEGORIES = 10;

interface EditableNameProps {
  name: string;
  onSave: (name: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const EditableName = ({ name, onSave, onCancel, isLoading = false }: EditableNameProps) => {
  const [editingName, setEditingName] = useState(name);

  return (
    <div className="flex items-center gap-2">
      <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} className="p-1 border rounded" autoFocus disabled={isLoading} />
      <button onClick={() => onSave(editingName)} className={`${isLoading ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:text-green-800'} flex items-center gap-1`} disabled={isLoading}>
        {isLoading ? 'Сохранение...' : 'Сохранить'}
      </button>
      <button onClick={onCancel} className={`${isLoading ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700'}`} disabled={isLoading}>Отмена</button>
    </div>
  );
};

export default function CategoriesPage() {
  const vm = useAdminCategoriesViewModel();
  const { categories, loading, error, showDebug, setShowDebug, toasts, newCategoryName, setNewCategoryName, newSubcategoryName, setNewSubcategoryName, selectedCategoryId, setSelectedCategoryId, editingId, setEditingId, savingId, handleAddCategory, handleAddSubcategory, handleUpdate, handleDelete } = vm;

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div className="text-red-500">Ошибка: {error}</div>;

  return (
    <div className="p-3 sm:p-8 bg-gray-50 min-h-screen">
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className={`px-4 py-3 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Управление категориями</h1>
        <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
          <span>Отладочная информация</span>
          <input type="checkbox" checked={showDebug} onChange={(e) => setShowDebug(e.target.checked)} />
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Добавить новую категорию</h2>
          {categories.length >= MAX_CATEGORIES && <div className="mb-2 text-red-500 font-semibold">Максимальное количество категорий - {MAX_CATEGORIES}.</div>}
          <form onSubmit={handleAddCategory} className="flex flex-wrap gap-2">
            <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Название категории" className="flex-grow p-2 border rounded" disabled={categories.length >= MAX_CATEGORIES} />
            <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600" disabled={categories.length >= MAX_CATEGORIES}>Добавить</button>
          </form>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Добавить новую подкатегорию</h2>
          <form onSubmit={handleAddSubcategory} className="space-y-4">
            <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} className="w-full p-2 border rounded" required>
              <option value="">Выберите категорию</option>
              {categories.map((cat: Category) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>
            <input type="text" value={newSubcategoryName} onChange={(e) => setNewSubcategoryName(e.target.value)} placeholder="Название подкатегории" className="w-full p-2 border rounded" />
            <button type="submit" className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600">Добавить подкатегорию</button>
          </form>
        </div>
      </div>
      {showDebug && (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4">Отладочная информация</h2>
          <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96 border">{JSON.stringify(categories, null, 2)}</pre>
        </div>
      )}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Список категорий</h2>
        <div className="space-y-4">
          {categories.map((cat: Category) => (
            <div key={cat._id} className="p-4 border rounded-md bg-gray-50">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <div className="min-w-0 flex items-center gap-3">
                  {editingId === cat._id ? (
                    <EditableName name={cat.name} onSave={(name) => handleUpdate('category', cat._id, name)} onCancel={() => setEditingId(null)} isLoading={savingId === cat._id} />
                  ) : (
                    <div className="min-w-0 flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-bold">{cat.name}</h3>
                      {cat.totalProductCount !== undefined && (
                        <div className="flex flex-wrap gap-1">
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">Всего: {cat.totalProductCount}</span>
                          {cat.productCount ? <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">В категории: {cat.productCount}</span> : null}
                          {cat.subcategoriesProductCount ? <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">В подкатегориях: {cat.subcategoriesProductCount}</span> : null}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                  <button onClick={() => setEditingId(cat._id)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm whitespace-nowrap" disabled={editingId !== null}>Редактировать</button>
                  <button onClick={() => handleDelete('category', cat._id, cat.name, cat.totalProductCount)} className="text-red-500 hover:underline whitespace-nowrap">Удалить</button>
                </div>
              </div>
              <h4 className="mt-2 font-semibold">Подкатегории ({cat.subcategories?.length || 0}):</h4>
              <ul className="list-disc pl-8 mt-2 space-y-2">
                {cat.subcategories?.length ? cat.subcategories.map((sub: Subcategory) => (
                  <li key={sub._id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex items-center gap-2">
                      {editingId === sub._id ? (
                        <EditableName name={sub.name} onSave={(name) => handleUpdate('subcategory', sub._id, name)} onCancel={() => setEditingId(null)} isLoading={savingId === sub._id} />
                      ) : (
                        <div className="min-w-0 flex flex-wrap items-center gap-2">
                          <span className="truncate">{sub.name}</span>
                          {sub.productCount ? <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">{sub.productCount} товаров</span> : null}
                        </div>
                      )}
                    </div>
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                      <button onClick={() => setEditingId(sub._id)} className="text-blue-500 hover:underline text-sm whitespace-nowrap" disabled={editingId !== null}>Редактировать</button>
                      <button onClick={() => handleDelete('subcategory', sub._id, sub.name, sub.productCount)} className="text-red-500 hover:underline text-sm whitespace-nowrap">Удалить</button>
                    </div>
                  </li>
                )) : <li className="text-gray-500">Нет подкатегорий</li>}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

