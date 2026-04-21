import { createSupabaseModel } from '@/lib/supabaseModel';

export interface ISettings {
  _id: string;
  settingKey: string;
  siteName: string;
  siteDescription: string;
  contactPhone: string;
  contactPhone2?: string;
  contactPhone3?: string;
  address: string;
  workingHours: string;
  pickupHours?: string;
  deliveryHours?: string;
  deliveryInfo?: string;
  deliveryRadius: number;
  minOrderAmount: number;
  freeDeliveryThreshold: number;
  deliveryFee: number;
  currency: string;
  timezone: string;
  maintenanceMode: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  socialLinks: {
    instagram?: string;
    vk?: string;
    telegram?: string;
    whatsapp?: string;
  };
  homeCategoryCardBackgrounds?: Record<string, string>;
  homeBannerBackground?: string;
  homeBannerSlides?: string[];
  /** Единая медиатека: загрузки и выбор в товарах и оформлении главной */
  mediaLibrary?: Array<{ id: string; url: string; createdAt?: string }>;
}

const Settings = createSupabaseModel({
  collection: 'settings',
  defaults: {
    settingKey: 'global-settings',
    siteName: 'My Awesome Site',
    siteDescription: 'The best products at the best prices.',
    workingHours: 'Самовывоз: 9-20, Доставка: 9-2 ночи (от 2.5к₽ - Центральный, ЖД Район бесплатно)',
    pickupHours: 'С 9:00 до 20:00',
    deliveryHours: 'С 9:00 до 2:00 ночи',
    deliveryInfo: 'От 2500₽ - Центральный, ЖД Район бесплатно',
    deliveryRadius: 10,
    minOrderAmount: 0,
    freeDeliveryThreshold: 0,
    deliveryFee: 0,
    currency: 'RUB',
    timezone: 'Europe/Moscow',
    maintenanceMode: false,
    socialLinks: {},
    homeCategoryCardBackgrounds: {},
    homeBannerBackground: '',
    homeBannerSlides: [],
    mediaLibrary: [],
  },
});

export default Settings;
