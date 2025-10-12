import { DataUtils } from '../lib/api';

describe('DataUtils', () => {
  describe('formatPrice', () => {
    it('should format price correctly', () => {
      expect(DataUtils.formatPrice(1000)).toBe('1 000 ₽');
      expect(DataUtils.formatPrice(1500.50)).toBe('1 501 ₽');
      expect(DataUtils.formatPrice(0)).toBe('0 ₽');
    });

    it('should format price with custom currency', () => {
      expect(DataUtils.formatPrice(1000, '$')).toBe('1 000 $');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = DataUtils.formatDate(date);
      expect(formatted).toContain('15');
      expect(formatted).toContain('января');
      expect(formatted).toContain('2024');
    });
  });

  describe('formatPhone', () => {
    it('should format phone correctly', () => {
      expect(DataUtils.formatPhone('79123456789')).toBe('+7 (912) 345-67-89');
      expect(DataUtils.formatPhone('7912345678')).toBe('+7 (912) 345-67-8');
    });
  });

  describe('generateSlug', () => {
    it('should generate slug correctly', () => {
      expect(DataUtils.generateSlug('Розы красные')).toBe('rozy-krasnye');
      expect(DataUtils.generateSlug('Beautiful Flowers!')).toBe('beautiful-flowers');
      expect(DataUtils.generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces');
    });
  });

  describe('isValidEmail', () => {
    it('should validate email correctly', () => {
      expect(DataUtils.isValidEmail('test@example.com')).toBe(true);
      expect(DataUtils.isValidEmail('user@domain.ru')).toBe(true);
      expect(DataUtils.isValidEmail('invalid-email')).toBe(false);
      expect(DataUtils.isValidEmail('')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate phone correctly', () => {
      expect(DataUtils.isValidPhone('+79123456789')).toBe(true);
      expect(DataUtils.isValidPhone('79123456789')).toBe(true);
      expect(DataUtils.isValidPhone('89123456789')).toBe(true);
      expect(DataUtils.isValidPhone('123456789')).toBe(false);
      expect(DataUtils.isValidPhone('')).toBe(false);
    });
  });
});

