"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ICategoryWithStats as Category, ISubcategory as Subcategory } from '@/app/client/models/Category';
import { useAdminCategoriesViewModel } from '@/features/admin/categories';
import ImageUpload from '@/app/admin/components/ImageUpload';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { withCsrfHeaders } from '@/lib/csrf-client';
import { productionLogger } from '@/lib/productionLogger';

const MAX_CATEGORIES = 10;

interface SortableCategoryProps {
  category: Category;
  isExpanded: boolean;
  editingId: string | null;
  savingId: string | null;
  onToggleExpand: () => void;
  onEdit: () => void;
  onUpdate: (name: string, image?: string) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onSubcategoryEdit: (subId: string) => void;
  onSubcategoryUpdate: (subId: string, name: string) => void;
  onSubcategoryDelete: (subId: string, name: string, count?: number) => void;
}

const SortableCategory = ({
  category,
  isExpanded,
  editingId,
  savingId,
  onToggleExpand,
  onEdit,
  onUpdate,
  onCancelEdit,
  onDelete,
  onSubcategoryEdit,
  onSubcategoryUpdate,
  onSubcategoryDelete,
}: SortableCategoryProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-gray-50">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            {editingId === category._id ? (
              <EditableCategoryForm
                category={category}
                onSave={onUpdate}
                onCancel={onCancelEdit}
                isLoading={savingId === category._id}
              />
            ) : (
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  {category.image && (
                    <Image
                      src={category.image}
                      alt={category.name}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  )}
                  <h3 className="truncate text-lg font-bold">{category.name}</h3>
                </div>
                {category.totalProductCount !== undefined && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                      Всего: {category.totalProductCount}
                    </span>
                    {category.productCount ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                        В категории: {category.productCount}
                      </span>
                    ) : null}
                    {category.subcategoriesProductCount ? (
                      <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                        В подкатегориях: {category.subcategoriesProductCount}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {category.subcategories && category.subcategories.length > 0 && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-100"
            >
              {isExpanded ? 'Свернуть' : `Подкатегории (${category.subcategories.length})`}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
            disabled={editingId !== null}
          >
            Редактировать
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100"
          >
            Удалить
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t bg-white p-4">
          <ul className="space-y-2">
            {category.subcategories?.length ? (
              category.subcategories.map((sub: Subcategory) => (
                <li
                  key={sub._id}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    {editingId === sub._id ? (
                      <EditableName
                        name={sub.name}
                        onSave={(name) => onSubcategoryUpdate(sub._id, name)}
                        onCancel={onCancelEdit}
                        isLoading={savingId === sub._id}
                      />
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate">{sub.name}</span>
                        {sub.productCount ? (
                          <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                            {sub.productCount} товаров
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onSubcategoryEdit(sub._id)}
                      className="text-sm text-blue-600 hover:underline"
                      disabled={editingId !== null}
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => onSubcategoryDelete(sub._id, sub.name, sub.productCount)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-gray-500">Нет подкатегорий</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

interface EditableCategoryFormProps {
  category: Category;
  onSave: (name: string, image?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const EditableCategoryForm = ({ category, onSave, onCancel, isLoading = false }: EditableCategoryFormProps) => {
  const [editingName, setEditingName] = useState(category.name);
  const [editingImage, setEditingImage] = useState(category.image || '');

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          className="w-full min-w-0 rounded border p-2 sm:w-auto"
          placeholder="Название категории"
          autoFocus
          disabled={isLoading}
        />
        <button
          onClick={() => onSave(editingName, editingImage)}
          className={`${isLoading ? 'cursor-not-allowed text-gray-400' : 'text-green-600 hover:text-green-800'} flex items-center gap-1 rounded bg-green-50 px-3 py-2`}
          disabled={isLoading}
        >
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button
          onClick={onCancel}
          className={`${isLoading ? 'cursor-not-allowed text-gray-400' : 'text-gray-500 hover:text-gray-700'} rounded bg-gray-50 px-3 py-2`}
          disabled={isLoading}
        >
          Отмена
        </button>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <p className="mb-2 text-sm font-medium text-gray-700">Изображение категории</p>
        <ImageUpload
          value={editingImage}
          onChange={setEditingImage}
          showMediaLibrary={true}
          registerInLibrary={true}
        />
      </div>
    </div>
  );
};

interface EditableNameProps {
  name: string;
  onSave: (name: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const EditableName = ({ name, onSave, onCancel, isLoading = false }: EditableNameProps) => {
  const [editingName, setEditingName] = useState(name);

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} className="w-full min-w-0 rounded border p-1 sm:w-auto" autoFocus disabled={isLoading} />
      <button onClick={() => onSave(editingName)} className={`${isLoading ? 'cursor-not-allowed text-gray-400' : 'text-green-600 hover:text-green-800'} flex items-center gap-1`} disabled={isLoading}>
        {isLoading ? 'Сохранение...' : 'Сохранить'}
      </button>
      <button onClick={onCancel} className={`${isLoading ? 'cursor-not-allowed text-gray-400' : 'text-gray-500 hover:text-gray-700'}`} disabled={isLoading}>Отмена</button>
    </div>
  );
};

export default function CategoriesPage() {
  const vm = useAdminCategoriesViewModel();
  const {
    categories,
    loading,
    error,
    showDebug,
    setShowDebug,
    toasts,
    newCategoryName,
    setNewCategoryName,
    newSubcategoryName,
    setNewSubcategoryName,
    selectedCategoryId,
    setSelectedCategoryId,
    editingId,
    setEditingId,
    savingId,
    handleAddCategory,
    handleAddSubcategory,
    handleUpdate,
    handleDelete,
  } = vm;

  const [tab, setTab] = useState<'list' | 'create' | 'debug'>('list');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Синхронизируем локальный порядок с данными из VM
  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = localCategories.findIndex((cat) => cat._id === active.id);
    const newIndex = localCategories.findIndex((cat) => cat._id === over.id);

    const newOrder = arrayMove(localCategories, oldIndex, newIndex);
    setLocalCategories(newOrder);

    // Сохраняем новый порядок на сервере
    setIsSavingOrder(true);
    try {
      const response = await fetch('/api/categories/reorder', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ categoryIds: newOrder.map((cat) => cat._id) }),
      });

      if (!response.ok) {
        throw new Error('Не удалось сохранить порядок');
      }
    } catch (err) {
      productionLogger.error('Ошибка при сохранении порядка:', err);
      // Откатываем изменения при ошибке
      setLocalCategories(categories);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const totalSubcategories = useMemo(
    () => categories.reduce((acc, cat) => acc + (cat.subcategories?.length || 0), 0),
    [categories]
  );

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div className="text-red-500">Ошибка: {error}</div>;

  return (
    <div className="min-h-0 bg-gray-50 p-2 sm:p-4 lg:p-6">
      <div className="fixed right-3 top-16 z-50 space-y-2 sm:right-4 sm:top-20">
        {toasts.map((toast) => (
          <div key={toast.id} className={`rounded-lg px-4 py-3 shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      <h1 className="mb-5 text-2xl font-bold text-gray-800 sm:text-3xl">Управление категориями</h1>

      <div className="mb-5 grid grid-cols-3 gap-2 sm:w-fit">
        <button type="button" onClick={() => setTab('list')} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${tab === 'list' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'}`}>
          Список
        </button>
        <button type="button" onClick={() => setTab('create')} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${tab === 'create' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'}`}>
          Добавление
        </button>
        <button type="button" onClick={() => setTab('debug')} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${tab === 'debug' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'}`}>
          Debug
        </button>
      </div>

      {tab === 'create' && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 text-xl font-semibold">Новая категория</h2>
            {categories.length >= MAX_CATEGORIES && <div className="mb-2 font-semibold text-red-500">Достигнут лимит {MAX_CATEGORIES} категорий.</div>}
            <form onSubmit={handleAddCategory} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Название категории" className="w-full flex-grow rounded border p-2" disabled={categories.length >= MAX_CATEGORIES} />
              <button type="submit" className="w-full rounded bg-blue-500 p-2 text-white hover:bg-blue-600 sm:w-auto" disabled={categories.length >= MAX_CATEGORIES}>Добавить</button>
            </form>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 text-xl font-semibold">Новая подкатегория</h2>
            <form onSubmit={handleAddSubcategory} className="space-y-4">
              <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} className="w-full rounded border p-2" required>
                <option value="">Выберите категорию</option>
                {categories.map((cat: Category) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
              </select>
              <input type="text" value={newSubcategoryName} onChange={(e) => setNewSubcategoryName(e.target.value)} placeholder="Название подкатегории" className="w-full rounded border p-2" />
              <button type="submit" className="w-full rounded bg-green-500 p-2 text-white hover:bg-green-600">Добавить подкатегорию</button>
            </form>
          </div>
        </div>
      )}

      {tab === 'debug' && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <label className="mb-3 flex items-center gap-3 text-sm font-medium text-gray-700">
            <span>Показывать отладочную информацию</span>
            <input type="checkbox" checked={showDebug} onChange={(e) => setShowDebug(e.target.checked)} />
          </label>
          {showDebug ? (
            <pre className="max-h-96 overflow-auto rounded-lg border bg-gray-100 p-4 text-xs">{JSON.stringify(categories, null, 2)}</pre>
          ) : (
            <p className="text-sm text-gray-500">Включи переключатель, чтобы увидеть JSON.</p>
          )}
        </div>
      )}

      {tab === 'list' && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">Категории</h2>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">{localCategories.length} категорий</span>
            <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">{totalSubcategories} подкатегорий</span>
            {isSavingOrder && (
              <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                Сохранение порядка...
              </span>
            )}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localCategories.map((cat) => cat._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {localCategories.map((cat: Category) => (
                  <SortableCategory
                    key={cat._id}
                    category={cat}
                    isExpanded={expandedCategoryId === cat._id}
                    editingId={editingId}
                    savingId={savingId}
                    onToggleExpand={() => setExpandedCategoryId(expandedCategoryId === cat._id ? null : cat._id)}
                    onEdit={() => setEditingId(cat._id)}
                    onUpdate={(name, image) => handleUpdate('category', cat._id, name, image)}
                    onCancelEdit={() => setEditingId(null)}
                    onDelete={() => handleDelete('category', cat._id, cat.name, cat.totalProductCount)}
                    onSubcategoryEdit={(subId) => setEditingId(subId)}
                    onSubcategoryUpdate={(subId, name) => handleUpdate('subcategory', subId, name)}
                    onSubcategoryDelete={(subId, name, count) => handleDelete('subcategory', subId, name, count)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

