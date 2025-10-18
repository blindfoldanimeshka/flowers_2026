'use client'

import { useParams, notFound } from 'next/navigation';
import Catalog from '../../../client/components/catalog/Catalog';import { useState, useEffect } from 'react';
import { IProduct } from '@/models/Product';

async function getProductsBySubcategory(subcategoryId: string): Promise<IProduct[]> {
  try {
    const url = `/api/products?subcategoryId=${subcategoryId}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(`Failed to fetch products. Status: ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

async function getSubcategory(slug: string): Promise<any> {
  try {
    const res = await fetch(`/api/subcategories?slug=${slug}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    return null;
  }
}

export default function SubcategoryPage() {
  const params = useParams();
  const subcategorySlug = params.subcategory as string;

  const [subcategory, setSubcategory] = useState<any>(null);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subcategorySlug) return;

    const fetchData = async () => {
      setLoading(true);
      const subcatData = await getSubcategory(subcategorySlug);
      
      if (subcatData) {
        setSubcategory(subcatData);
        const productData = await getProductsBySubcategory(subcatData._id);
        setProducts(productData);
      } else {
        setSubcategory(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [subcategorySlug]);

  if (loading) {
    return <div className="flex justify-center p-10">Загрузка...</div>;
  }

  if (!subcategory) {
    return notFound();
  }

  return (
    <div className="mt-40">
      <div className="max-w-screen-xl mx-auto px-4 pb-12">
        <Catalog
          title={`Товары в подкатегории: ${subcategory.name}`}
          subcategoryId={subcategory._id}
        />
      </div>
    </div>
  );
} 