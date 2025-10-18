"use client";
import React, { useState } from "react";
import ImageUpload from "../components/ImageUpload";
import Image from 'next/image';
import type { Product, Subcategory } from '../types';

interface ProductForm {
  _id: string | null;
  name: string;
  price: string;
  subcategoryId?: string;
  image: string;
  description?: string;
}

const emptyProduct: ProductForm = {
  _id: null,
  name: "",
  price: "",
  subcategoryId: "",
  image: "",
  description: ""
};

interface ProductsListProps {
  initialProducts: Product[];
  subcategories: Subcategory[];
}

export default function ProductsList({ initialProducts, subcategories }: ProductsListProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Открыть форму для добавления
  const handleAdd = () => {
    setForm(emptyProduct);
    setEditProduct(null);
    setShowForm(true);
  };

  // Открыть форму для редактирования
  const handleEdit = (product: Product) => {
    setForm({ ...product, price: String(product.price) });
    setEditProduct(product._id);
    setShowForm(true);
  };

  // Удалить товар
  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот товар?')) return;

    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Не удалось удалить товар');
      }

      setProducts(products.filter((p: Product) => p._id !== id));
      setMessage("Товар успешно удалён");

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Сохранить товар (добавить или обновить)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('DEBUG FORM:', form);
    if (!form.name || !form.price || !form.subcategoryId || !form.image) {
      setError("Заполните все обязательные поля, включая изображение");
      return;
    }
    
    // Находим родительскую категорию
    const selectedSubcategory = subcategories.find(sc => sc._id === form.subcategoryId);
    if (!selectedSubcategory) {
      setError("Выбранная подкатегория не найдена");
      return;
    }

    const productData = {
      ...form,
      price: Number(form.price),
      categoryId: selectedSubcategory.categoryId, // Добавляем categoryId
    };
    console.log('PRODUCT DATA IMAGE:', productData.image);
    
    setError("");
    setMessage("");

    const method = editProduct ? 'PUT' : 'POST';
    const url = editProduct ? `/api/products?id=${editProduct}` : '/api/products';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Не удалось сохранить товар');
      }

      const savedProduct = await res.json();

      if (editProduct) {
        setProducts(products.map((p: Product) => p._id === editProduct ? savedProduct : p));
        setMessage("Товар успешно обновлён");
      } else {
        setProducts([...products, savedProduct]);
        setMessage("Товар успешно добавлен");
      }
      setShowForm(false);
      setEditProduct(null);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Обработка изменений в форме
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f: ProductForm) => ({ ...f, [name]: value }));
  };

  return (
    <div className="p-8 bg-white rounded-2xl shadow-xl max-w-6xl mx-auto border border-gray-100">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-800">Управление товарами</h2>
        <button
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow transition-colors duration-200 font-medium"
          onClick={handleAdd}
        >Добавить товар</button>
      </div>
      {message && (
        <div className="mb-6 p-3 bg-green-50 text-green-700 rounded-lg shadow-sm border border-green-200 transition-all duration-300">{message}</div>
      )}
      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg shadow-sm border border-red-200 transition-all duration-300">{error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase text-sm">
              <th className="p-3 rounded-l-xl">Фото</th>
              <th className="p-3">Название</th>
              <th className="p-3">Цена</th>
              <th className="p-3">Подкатегория</th>
              <th className="p-3">Описание</th>
              <th className="p-3 rounded-r-xl">Действия</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product._id} className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 rounded-xl">
                <td className="p-3 text-center">
                  <Image src={product.image} alt={product.name} width={64} height={64} className="w-16 h-16 object-cover rounded-lg mx-auto border" />
                </td>
                <td className="p-3 font-semibold text-gray-800">{product.name}</td>
                <td className="p-3 font-bold text-blue-700">{product.price} ₽</td>
                <td className="p-3 text-gray-600">
                  {subcategories.find(sc => sc._id === product.subcategoryId)?.name || 'N/A'}
                </td>
                <td className="p-3 text-gray-500 max-w-xs truncate">{product.description}</td>
                <td className="p-3 flex gap-2 justify-center">
                  <button
                    className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-white rounded-lg shadow transition-colors duration-200 text-sm font-medium"
                    onClick={() => handleEdit(product)}
                  >Редактировать</button>
                  <button
                    className="px-3 py-1 bg-red-400 hover:bg-red-500 text-white rounded-lg shadow transition-colors duration-200 text-sm font-medium"
                    onClick={() => handleDelete(product._id)}
                  >Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 transition-all">
          <form
            className="bg-white p-8 rounded-2xl shadow-2xl min-w-[340px] max-w-md w-full border border-gray-200 relative animate-fadeIn"
            onSubmit={handleSave}
          >
            <button
              type="button"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-bold focus:outline-none"
              onClick={() => setShowForm(false)}
              aria-label="Закрыть"
            >×</button>
            <h3 className="text-2xl font-bold mb-4 text-gray-800">{editProduct ? "Редактировать товар" : "Добавить товар"}</h3>
            <div className="mb-4">
              <label className="block mb-1 font-medium text-gray-700">Название</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium text-gray-700">Цена (₽)</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none"
                required
                min="1"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium text-gray-700">Подкатегория</label>
              <select
                name="subcategoryId"
                value={form.subcategoryId}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none"
                required
              >
                <option value="" disabled>Выберите подкатегорию</option>
                {subcategories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium text-gray-700">Фото</label>
              <ImageUpload
                value={form.image}
                onChange={(url) => {
                  console.log('IMAGE UPLOADED:', url);
                  setForm(f => ({ ...f, image: url }));
                }}
              />
            </div>
            <div className="mb-6">
              <label className="block mb-1 font-medium text-gray-700">Описание</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none"
                rows={3}
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow transition-colors duration-200 font-medium"
            >Сохранить</button>
          </form>
        </div>
      )}
    </div>
  );
} 