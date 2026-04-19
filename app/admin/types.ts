// Типы для админ панели

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    name: string;
    email?: string;
    phone: string;
    address: string;
  };
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: 'cash' | 'card' | 'online';
  fulfillmentMethod: 'delivery' | 'pickup';
  deliveryDate?: string;
  deliveryTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  name: string;
  price: number;
  image: string;
  categoryId: string;
  subcategoryId?: string;
  description?: string;
  inStock: boolean;
  preorderOnly?: boolean;
  assemblyTime?: string;
  stockQuantity?: number;
  stockUnit?: string;
}

export interface Subcategory {
  _id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryNumId: number;
  description?: string;
  image?: string;
  isActive: boolean;
}

export interface Category {
  _id: string;
  id: number;
  name: string;
  slug: string;
  subcategories: Subcategory[];
}

