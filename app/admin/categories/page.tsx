"use client";

import { useState, useEffect, useCallback } from 'react';

// Интерфейсы для типизации
interface Category {
  _id: string;
  id: number;
  name: string;
  slug: string;
  image?: string;
  subcategories: Subcategory[];
  productCount?: number;
  subcategoriesProductCount?: number;
  totalProductCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Subcategory {
  _id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryNumId: number;
  description?: string;
  image?: string;
  isActive: boolean;
  productCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EditableNameProps {
  name: string;
  onSave: (name: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// A single reusable component for inline editing
const EditableName = ({ name, onSave, onCancel, isLoading = false }: EditableNameProps) => {
  const [editingName, setEditingName] = useState(name);

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={editingName}
        onChange={(e) => setEditingName(e.target.value)}
        className="p-1 border rounded"
        autoFocus
        disabled={isLoading}
      />
      <button 
        onClick={() => onSave(editingName)} 
        className={`${isLoading ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:text-green-800'} flex items-center gap-1`}
        disabled={isLoading}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {isLoading ? 'Сохранение...' : 'Сохранить'}
      </button>
      <button 
        onClick={onCancel} 
        className={`${isLoading ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700'}`}
        disabled={isLoading}
      >
        Отмена
      </button>
    </div>
  );
};

const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDebug, setShowDebug] = useState(false); // Состояние для отладочной информации
  const [toasts, setToasts] = useState<Array<{id: number, message: string, type: 'success' | 'error'}>>([]);
  
  // State for forms and editing
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null); // Новое состояние для отслеживания сохранения
  
  // Объединенная функция для загрузки всех данных одним запросом
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      // Загружаем категории со статистикой товаров
      const response = await fetch('/api/categories/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Неизвестная ошибка при загрузке данных');
      }
      
      console.log('Загруженные данные со статистикой:', data);
      setCategories(data.categories || []);
      
    } catch (error: any) {
      console.error('Ошибка при загрузке данных:', error);
      setError(`Ошибка при загрузке данных: ${error.message}`);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Универсальная функция для API вызовов
  const handleApiCall = async (url: string, method: string, body: any = null, successMessage: string = '') => {
    try {
      setError('');
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : null,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Обработка специального случая с товарами при удалении
        if (response.status === 409 && data.canForceDelete) {
          const confirmMessage = method === 'DELETE' 
            ? `${data.error}\n\nВ ${url.includes('categories') ? 'категории' : 'подкатегории'} найдено товаров: ${data.productCount}\n\nВы уверены, что хотите удалить ${url.includes('categories') ? 'категорию' : 'подкатегорию'} вместе со всеми товарами?`
            : data.error;
            
          if (method === 'DELETE' && window.confirm(confirmMessage)) {
            // Повторный вызов с принудительным удалением
            return handleApiCall(`${url}?force=true`, method, body, successMessage);
          } else {
            throw new Error(data.error);
          }
        } else {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
      }
      
      if (successMessage) {
        showToast(successMessage, 'success');
      }
      
      // Перезагружаем данные после успешного API вызова
      await fetchAllData();
      return data;
      
    } catch (error: any) {
      console.error(`Ошибка при ${method} запросе к ${url}:`, error);
      setError(error.message);
      showToast(error.message, 'error');
      throw error;
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Функция для показа toast-уведомлений
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Автоматически убираем toast через 3 секунды
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      showToast('Название категории не может быть пустым', 'error');
      return;
    }
    
    handleApiCall(
      '/api/categories', 
      'POST', 
      { name: newCategoryName.trim() },
      `Категория "${newCategoryName.trim()}" успешно создана!`
    ).then(() => {
      setNewCategoryName('');
    });
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubcategoryName.trim()) {
      showToast('Название подкатегории не может быть пустым', 'error');
      return;
    }
    if (!selectedCategoryId) {
      showToast('Выберите категорию для подкатегории', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      await handleApiCall(
        '/api/subcategories', 
        'POST', 
        { 
          name: newSubcategoryName.trim(),
          categoryId: selectedCategoryId
        },
        `Подкатегория "${newSubcategoryName.trim()}" успешно создана!`
      );
      
      setNewSubcategoryName('');
      setSelectedCategoryId('');
      
    } catch (error) {
      console.error('Ошибка при добавлении подкатегории:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (type: 'category' | 'subcategory', id: string, name: string) => {
    if (!name.trim()) {
      showToast('Название не может быть пустым', 'error');
      return;
    }
    
    try {
      setSavingId(id); // Устанавливаем состояние сохранения
      
      const result = await handleApiCall(
        `/api/${type === 'category' ? 'categories' : 'subcategories'}/${id}`, 
        'PUT', 
        { name: name.trim() },
        `${type === 'category' ? 'Категория' : 'Подкатегория'} "${name.trim()}" успешно обновлена!`
      );
      
      if (result) {
        // Сбрасываем режим редактирования только при успешном обновлении
        setEditingId(null);
      }
    } catch (error) {
      console.error('Ошибка при обновлении:', error);
    } finally {
      setSavingId(null); // Сбрасываем состояние сохранения
    }
  };

  const handleDelete = (type: 'category' | 'subcategory', id: string, name: string, productCount?: number) => {
    const itemType = type === 'category' ? 'категорию' : 'подкатегорию';
    let confirmMessage = `Вы уверены, что хотите удалить ${itemType} "${name}"?`;
    
    if (productCount && productCount > 0) {
      confirmMessage += `\n\nВнимание: В ${itemType} найдено товаров: ${productCount}`;
    }
    
    if (window.confirm(confirmMessage)) {
      handleApiCall(
        `/api/${type === 'category' ? 'categories' : 'subcategories'}/${id}`, 
        'DELETE',
        null,
        `${type === 'category' ? 'Категория' : 'Подкатегория'} "${name}" успешно удалена!`
      );
    }
  };

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div className="text-red-500">Ошибка: {error}</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Toast уведомления */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              px-4 py-3 rounded-lg shadow-lg transition-all duration-500 transform
              ${toast.type === 'success' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
              }
              animate-slide-in-right
            `}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              )}
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .debug-toggle {
          transition: all 0.3s ease-in-out;
        }
        
        .debug-content {
          transition: all 0.4s ease-in-out;
          transform-origin: top;
        }
        
        .debug-content.hidden {
          max-height: 0;
          opacity: 0;
          transform: scaleY(0);
          overflow: hidden;
          margin: 0;
          padding: 0;
        }
        
        .debug-content.visible {
          max-height: 1000px;
          opacity: 1;
          transform: scaleY(1);
          overflow: visible;
          margin-bottom: 2rem;
        }
        
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 30px;
        }
        
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 30px;
        }
        
        .slider:before {
          position: absolute;
          content: "";
          height: 22px;
          width: 22px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .toggle-switch input:checked + .slider {
          background-color: #10b981;
        }
        
        .toggle-switch input:checked + .slider:before {
          transform: translateX(30px);
        }
        
        .arrow-icon {
          transition: transform 0.3s ease;
        }
        
        .arrow-icon.rotated {
          transform: rotate(180deg);
        }

        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.5s ease-out;
        }
      `}</style>
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Управление категориями</h1>
        
        {/* Анимированный свитчер для отладки */}
        <div className="flex items-center gap-3 debug-toggle">
          <span className="text-sm font-medium text-gray-700">
            Отладочная информация
          </span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showDebug}
              onChange={(e) => setShowDebug(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
          <div className={`debug-icon ${showDebug ? 'rotated' : ''}`}>
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="text-gray-600"
            >
              <path 
                d="M19 9L12 16L5 9" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Добавить новую категорию</h2>
          {categories.length >= 5 && (
            <div className="mb-2 text-red-500 font-semibold">Максимальное количество категорий — 5. Удалите одну, чтобы добавить новую.</div>
          )}
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Название категории" className="flex-grow p-2 border rounded" disabled={categories.length >= 5}/>
            <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600" disabled={categories.length >= 5}>Добавить</button>
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
      
      {/* Анимированная отладочная информация */}
      <div className={`debug-content bg-white p-6 rounded-lg shadow-sm ${showDebug ? 'visible' : 'hidden'}`}>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="text-blue-600"
          >
            <path 
              d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          Отладочная информация
        </h2>
        <div>
          <h3 className="font-bold text-gray-700 mb-2">Категории с подкатегориями:</h3>
          <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96 border">
            {JSON.stringify(categories, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Список категорий</h2>
        <div className="space-y-4">
          {categories.map((cat: Category) => (
            <div key={cat._id} className="p-4 border rounded-md bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {editingId === cat._id ? (
                    <EditableName 
                      name={cat.name} 
                      onSave={(name: string) => handleUpdate('category', cat._id, name)} 
                      onCancel={() => setEditingId(null)}
                      isLoading={savingId === cat._id}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{cat.name}</h3>
                      {cat.totalProductCount !== undefined && (
                        <div className="flex gap-1">
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                            Всего: {cat.totalProductCount}
                          </span>
                          {cat.productCount !== undefined && cat.productCount > 0 && (
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                              В категории: {cat.productCount}
                            </span>
                          )}
                          {cat.subcategoriesProductCount !== undefined && cat.subcategoriesProductCount > 0 && (
                            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                              В подкатегориях: {cat.subcategoriesProductCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingId(cat._id)} 
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                    disabled={editingId !== null}
                  >
                    Редактировать
                  </button>
                  <button onClick={() => handleDelete('category', cat._id, cat.name, cat.totalProductCount)} className="text-red-500 hover:underline">Удалить</button>
                </div>
              </div>
              
              <h4 className="mt-2 font-semibold">
                Подкатегории ({cat.subcategories?.length || 0}):
              </h4>
              <ul className="list-disc pl-8 mt-2 space-y-2">
                {cat.subcategories && cat.subcategories.length > 0 ? 
                  cat.subcategories.map((sub: Subcategory) => (
                    <li key={sub._id} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {editingId === sub._id ? (
                          <EditableName 
                            name={sub.name} 
                            onSave={(name: string) => handleUpdate('subcategory', sub._id, name)} 
                            onCancel={() => setEditingId(null)}
                            isLoading={savingId === sub._id}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{sub.name}</span>
                            {sub.productCount !== undefined && sub.productCount > 0 && (
                              <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                                {sub.productCount} товаров
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingId(sub._id)} 
                          className="text-blue-500 hover:underline text-sm"
                          disabled={editingId !== null}
                        >
                          Редактировать
                        </button>
                        <button onClick={() => handleDelete('subcategory', sub._id, sub.name, sub.productCount)} className="text-red-500 hover:underline text-sm">Удалить</button>
                      </div>
                    </li>
                  )) : (
                    <li className="text-gray-500">Нет подкатегорий</li>
                  )
                }
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoriesPage; 