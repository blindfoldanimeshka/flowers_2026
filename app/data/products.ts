// Типы для продуктовых данных
export interface Product {
  id: number;
  title: string;
  price: number;
  oldPrice?: number;
  description: string;
  imageSrc: string;
  inStock: boolean;
  categoryId: number;
  subcategoryId: number;
}

export interface Subcategory {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  subcategories: Subcategory[];
}

// Категории и подкатегории
export const categories: Category[] = [
  {
    id: 1,
    name: "Роза",
    slug: "roza",
    subcategories: [
      { id: 101, name: "Кустовые", slug: "kustovye", categoryId: 1 },
      { id: 102, name: "Пионовидные", slug: "pionovidnye", categoryId: 1 }
    ]
  },
  {
    id: 2,
    name: "Хризантема",
    slug: "hrizantema",
    subcategories: [
      { id: 201, name: "Подарочные", slug: "podarochnye", categoryId: 2 },
      { id: 202, name: "Юбилей", slug: "yubilej", categoryId: 2 },
      { id: 203, name: "Свадьба", slug: "svadba", categoryId: 2 }
    ]
  },
  {
    id: 3,
    name: "Букеты",
    slug: "bukety",
    subcategories: [
      { id: 301, name: "Классические", slug: "klassicheskie", categoryId: 3 },
      { id: 302, name: "Декоративные", slug: "dekorativnye", categoryId: 3 },
      { id: 303, name: "Букеты", slug: "bukety", categoryId: 3 }
    ]
  }
];

// Товары
export const products: Product[] = [
  // Кустовые - Маленькие
  {
    id: 1,
    title: "Роза красная",
    price: 1200,
    oldPrice: 1500,
    description: "Маленький букет красных роз",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 1,
    subcategoryId: 101
  },
  {
    id: 2,
    title: "Роза белая",
    price: 1100,
    description: "Маленький букет белых роз",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 1,
    subcategoryId: 101
  },
  
  // Кустовые - Средние
  {
    id: 3,
    title: "Роза розовая",
    price: 1800,
    oldPrice: 2000,
    description: "Средний букет розовых роз",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 1,
    subcategoryId: 102
  },
  {
    id: 4,
    title: "Роза жёлтая",
    price: 1750,
    description: "Средний букет жёлтых роз",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 1,
    subcategoryId: 102
  },
  
  // Кустовые - Большие
  {
    id: 5,
    title: "Роза большая",
    price: 2500,
    oldPrice: 2800,
    description: "Большой букет красных роз",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 1,
    subcategoryId: 103
  },
  {
    id: 6,
    title: "Роза микс",
    price: 2700,
    description: "Большой букет разноцветных роз",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: false,
    categoryId: 1,
    subcategoryId: 103
  },
  
  // Подарочные - Дни рождения
  {
    id: 7,
    title: "Хризантема праздничная",
    price: 2200,
    oldPrice: 2500,
    description: "Красивый букет хризантем для праздника",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 2,
    subcategoryId: 201
  },
  {
    id: 8,
    title: "Хризантема счастья",
    price: 2000,
    description: "Яркий букет хризантем для радости",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 2,
    subcategoryId: 201
  },
  
  // Подарочные - Юбилей
  {
    id: 9,
    title: "Хризантема юбилейная",
    price: 3500,
    oldPrice: 4000,
    description: "Роскошный букет хризантем для юбилея",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 2,
    subcategoryId: 202
  },
  {
    id: 10,
    title: "Хризантема торжественная",
    price: 3200,
    description: "Элегантный букет хризантем для важной даты",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 2,
    subcategoryId: 202
  },
  
  // Подарочные - Свадьба
  {
    id: 11,
    title: "Хризантема невесты",
    price: 4500,
    description: "Нежный букет хризантем для особенного дня",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 2,
    subcategoryId: 203
  },
  {
    id: 12,
    title: "Хризантема свадебная",
    price: 5000,
    oldPrice: 5500,
    description: "Роскошная цветочная композиция из хризантем для свадьбы",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 2,
    subcategoryId: 203
  },
  
  // Пионовидные - Классические
  {
    id: 13,
    title: "Букет классический",
    price: 1800,
    description: "Классический букет из свежих цветов",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 3,
    subcategoryId: 301
  },
  {
    id: 14,
    title: "Букет с пионами",
    price: 2800,
    description: "Букет из нежно-розовых пионов",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: false,
    categoryId: 3,
    subcategoryId: 301
  },
  
  // Пионовидные - Декоративные
  {
    id: 15,
    title: "Букет декоративный",
    price: 2100,
    description: "Декоративный букет для интерьера",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 3,
    subcategoryId: 302
  },
  {
    id: 16,
    title: "Букет экзотический",
    price: 3500,
    oldPrice: 3800,
    description: "Букет из редких видов пионов",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 3,
    subcategoryId: 302
  },
  
  // Пионовидные - Букеты
  {
    id: 17,
    title: "Букет праздничный",
    price: 2300,
    description: "Праздничный букет для особого случая",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 3,
    subcategoryId: 303
  },
  {
    id: 18,
    title: "Букет с розами",
    price: 4000,
    description: "Комбинированный букет из пионов и роз",
    imageSrc: "/image/items/no_photo.jpg",
    inStock: true,
    categoryId: 3,
    subcategoryId: 303
  }
];

// Вспомогательные функции
export const getProductsByCategory = (categoryId: number): Product[] => {
  return products.filter(product => product.categoryId === categoryId);
};

export const getProductsBySubcategory = (subcategoryId: number): Product[] => {
  return products.filter(product => product.subcategoryId === subcategoryId);
};

export const getCategoryBySlug = (slug: string): Category | undefined => {
  return categories.find(category => category.slug === slug);
};

export const getSubcategoryBySlug = (categorySlug: string, subcategorySlug: string): Subcategory | undefined => {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return undefined;
  return category.subcategories.find(subcategory => subcategory.slug === subcategorySlug);
}; 