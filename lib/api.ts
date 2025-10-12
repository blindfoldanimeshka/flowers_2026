import { validateData } from './validations';

// Типы для API ответов
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Класс для работы с API
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || '') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // Установка токена авторизации
  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Базовый метод для запросов
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };
    }
  }

  // GET запрос
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.request<T>(url.pathname + url.search);
  }

  // POST запрос
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT запрос
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH запрос
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE запрос
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Загрузка файла
  async uploadFile<T>(endpoint: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            success: xhr.status >= 200 && xhr.status < 300,
            data: response.data || response,
            error: xhr.status >= 400 ? response.error || `HTTP ${xhr.status}` : undefined,
          });
        } catch (error) {
          resolve({
            success: false,
            error: 'Ошибка парсинга ответа',
          });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: 'Ошибка сети',
        });
      });

      xhr.open('POST', `${this.baseUrl}${endpoint}`);
      
      // Удаляем Content-Type для FormData
      const headers = { ...this.defaultHeaders };
      delete headers['Content-Type'];
      
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send(formData);
    });
  }
}

// Создаем экземпляр API клиента
export const apiClient = new ApiClient();

// Утилиты для работы с данными
export class DataUtils {
  // Форматирование цены
  static formatPrice(price: number, currency: string = '₽'): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price).replace('RUB', currency);
  }

  // Форматирование даты
  static formatDate(date: string | Date, locale: string = 'ru-RU'): string {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  // Форматирование телефона
  static formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('7')) {
      return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  }

  // Генерация slug
  static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[а-яё]/g, (char) => {
        const map: Record<string, string> = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };
        return map[char] || char;
      })
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Валидация email
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Валидация телефона
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^(\+7|7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  // Дебаунс функция
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // Троттлинг функция
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
}

// Хуки для работы с API
export function useApi() {
  return {
    client: apiClient,
    utils: DataUtils,
  };
}

// Экспорт типов
export type { ApiResponse, PaginatedResponse };

