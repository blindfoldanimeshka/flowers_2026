import { ProductSchema, CategorySchema, OrderSchema, validateData } from '../lib/validations';

describe('Validations', () => {
  describe('ProductSchema', () => {
    it('should validate correct product data', () => {
      const validProduct = {
        name: 'Роза красная',
        price: 500,
        category: 'roses',
        subcategory: 'red-roses',
      };

      expect(() => validateData(ProductSchema, validProduct)).not.toThrow();
    });

    it('should reject invalid product data', () => {
      const invalidProduct = {
        name: '', // Empty name
        price: -100, // Negative price
        category: '', // Empty category
        subcategory: '', // Empty subcategory
      };

      expect(() => validateData(ProductSchema, invalidProduct)).toThrow();
    });

    it('should validate optional fields', () => {
      const productWithOptionalFields = {
        name: 'Роза красная',
        price: 500,
        category: 'roses',
        subcategory: 'red-roses',
        description: 'Красивая красная роза',
        oldPrice: 600,
        image: 'https://example.com/rose.jpg',
        inStock: true,
        featured: false,
        tags: ['красные', 'розы'],
      };

      expect(() => validateData(ProductSchema, productWithOptionalFields)).not.toThrow();
    });
  });

  describe('CategorySchema', () => {
    it('should validate correct category data', () => {
      const validCategory = {
        name: 'Розы',
        slug: 'roses',
      };

      expect(() => validateData(CategorySchema, validCategory)).not.toThrow();
    });

    it('should reject category with empty name', () => {
      const invalidCategory = {
        name: '',
        slug: 'roses',
      };

      expect(() => validateData(CategorySchema, invalidCategory)).toThrow();
    });
  });

  describe('OrderSchema', () => {
    it('should validate correct order data', () => {
      const validOrder = {
        customer: {
          name: 'Иван Иванов',
          email: 'ivan@example.com',
          phone: '79123456789',
          address: 'Москва, ул. Ленина, 1',
        },
        items: [
          {
            productId: 'product1',
            name: 'Роза красная',
            price: 500,
            quantity: 2,
          },
        ],
        totalAmount: 1000,
        deliveryType: 'delivery',
        paymentMethod: 'cash',
      };

      expect(() => validateData(OrderSchema, validOrder)).not.toThrow();
    });

    it('should reject order with invalid customer data', () => {
      const invalidOrder = {
        customer: {
          name: '', // Empty name
          email: 'invalid-email', // Invalid email
          phone: '123', // Too short phone
          address: '', // Empty address
        },
        items: [],
        totalAmount: 0,
        deliveryType: 'delivery',
        paymentMethod: 'cash',
      };

      expect(() => validateData(OrderSchema, invalidOrder)).toThrow();
    });

    it('should reject order with empty items', () => {
      const invalidOrder = {
        customer: {
          name: 'Иван Иванов',
          email: 'ivan@example.com',
          phone: '79123456789',
          address: 'Москва, ул. Ленина, 1',
        },
        items: [], // Empty items
        totalAmount: 0,
        deliveryType: 'delivery',
        paymentMethod: 'cash',
      };

      expect(() => validateData(OrderSchema, invalidOrder)).toThrow();
    });
  });
});

