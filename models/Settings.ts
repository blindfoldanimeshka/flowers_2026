import { createSupabaseModel } from '@/lib/supabaseModel';

export interface ISettings {
  _id: string;
  settingKey: string;
  siteName: string;
  siteDescription: string;
  contactPhone: string;
  address: string;
  workingHours: string;
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
}

const Settings = createSupabaseModel({
  collection: 'settings',
  defaults: {
    settingKey: 'global-settings',
    siteName: 'My Awesome Site',
    siteDescription: 'The best products at the best prices.',
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
  },
});

export default Settings;
