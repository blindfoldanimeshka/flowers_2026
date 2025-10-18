'use client';

import { useState, useEffect, useCallback } from 'react';
import ImageUpload from '@/app/admin/components/ImageUpload'; // Исправленный путь
import { toast } from 'react-toastify';
import Image from 'next/image';
import type { Product, Category, Subcategory } from '../types';

type ProductFormData = Omit<Product, '_id'> & { _id?: string };

interface ProductFormProps {
  product: Product | null;
  onSave: (product: Product) => void;
  onCancel: () => void;
}

const ProductForm = ({ product, onSave, onCancel }: ProductFormProps) => {
  const [formData, setFormData] = useState<ProductFormData>(product || {
    name: '',
    description: '',
    price: 0,
    image: '',
    categoryId: '',
    subcategoryId: '',
    inStock: true
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  useEffect(() => {
    // Fetch categories with error handling
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setCategories(data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategories([]);
        toast.error('Не удалось загрузить категории');
      }
    };
    
    fetchCategories();
  }, []);

  useEffect(() => {
    if (formData.categoryId) {
      // Fetch subcategories for the selected category
      // (This assumes an API endpoint exists to get subcategories by category ID)
      const category = categories.find(c => c._id === formData.categoryId);
      if(category) setSubcategories(category.subcategories || []);
    } else {
      setSubcategories([]);
    }
  }, [formData.categoryId, categories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Обработка числовых полей
    if (type === 'number' || name === 'price') {
      const numericValue = value === '' ? 0 : Number(value);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productData: Product = {
      _id: formData._id || '', // Временно устанавливаем пустую строку для новых продуктов
      name: formData.name,
      description: formData.description || '',
      price: formData.price,
      image: formData.image,
      categoryId: formData.categoryId,
      inStock: formData.inStock,
      // Включаем subcategoryId только если он существует и не пустой
      ...(formData.subcategoryId && { subcategoryId: formData.subcategoryId })
    };
    onSave(productData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
      <input name="name" value={formData.name} onChange={handleChange} placeholder="Название товара" className="w-full p-2 border rounded" required />
      <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Описание" className="w-full p-2 border rounded" />
      <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Цена" className="w-full p-2 border rounded" required />
      <select name="categoryId" value={formData.categoryId} onChange={handleChange} className="w-full p-2 border rounded" required>
        <option value="">Выберите категорию</option>
        {categories.map((cat: Category) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
      </select>
      <select name="subcategoryId" value={formData.subcategoryId} onChange={handleChange} className="w-full p-2 border rounded">
        <option value="">Выберите подкатегорию (необязательно)</option>
        {subcategories.map((sub: Subcategory) => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
      </select>
      <ImageUpload
        value={formData.image || ''}
        onChange={(url: string) => setFormData(prev => ({ ...prev, image: url }))}
      />
      <div className="flex gap-2">
        <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Сохранить</button>
        <button type="button" onClick={onCancel} className="bg-gray-300 p-2 rounded">Отмена</button>
      </div>
    </form>
  );
};


const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Не удалось загрузить товары');
      setProducts(await res.json());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла неизвестная ошибка';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSave = async (productData: Product) => {
    if (!productData.image) {
      toast.error('Добавь фотографию.');
      return;
    }
    // Проверяем, является ли это новым продуктом (пустой _id или отсутствует)
    const isNewProduct = !productData._id || productData._id === '';
    const url = isNewProduct ? '/api/products' : `/api/products/${productData._id}`;
    const method = isNewProduct ? 'POST' : 'PUT';

    try {
      // Для новых продуктов исключаем _id из данных
      const dataToSend = isNewProduct 
        ? { ...productData, _id: undefined } 
        : productData;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Ошибка при сохранении');
      }
      setIsFormVisible(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла неизвестная ошибка';
      toast.error(errorMessage);
    }
  };
  
  const handleDelete = async (productId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить товар?')) {
      try {
        const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Ошибка при удалении');
        fetchProducts();
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Управление товарами</h1>
      
      {!isFormVisible ? (
        <button onClick={() => { setIsFormVisible(true); setEditingProduct(null); }} className="bg-green-500 text-white p-3 rounded-lg mb-8 shadow-md hover:bg-green-600">
          + Добавить новый товар
        </button>
      ) : (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">{editingProduct ? 'Редактировать товар' : 'Новый товар'}</h2>
          <ProductForm
            product={editingProduct}
            onSave={handleSave}
            onCancel={() => { setIsFormVisible(false); setEditingProduct(null); }}
          />
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Список товаров</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product: Product) => (
            <div key={product._id} className="border rounded-lg p-4 shadow-sm">
              <Image src={product.image || '/placeholder.jpg'} alt={product.name} width={300} height={192} className="w-full h-48 object-cover rounded-md mb-4" />
              <h3 className="font-bold text-lg">{product.name}</h3>
              <p className="text-gray-600">{product.price} руб.</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => { setEditingProduct(product); setIsFormVisible(true); }} className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">Редактировать</button>
                <button onClick={() => handleDelete(product._id)} className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage; 