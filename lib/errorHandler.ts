import { NextRequest, NextResponse } from 'next/server';

// Типы ошибок
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export interface AppError {
  type: ErrorType;
  message: string;
  statusCode: number;
  details?: any;
  timestamp: Date;
  path?: string;
  method?: string;
}

// Класс для создания ошибок
export class AppErrorClass extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly path?: string;
  public readonly method?: string;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number,
    details?: any,
    path?: string,
    method?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
    this.path = path;
    this.method = method;
  }

  toJSON(): AppError {
    return {
      type: this.type,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      path: this.path,
      method: this.method,
    };
  }
}

// Фабрика ошибок
export const createError = {
  validation: (message: string, details?: any) =>
    new AppErrorClass(ErrorType.VALIDATION_ERROR, message, 400, details),
  
  authentication: (message: string = 'Требуется аутентификация') =>
    new AppErrorClass(ErrorType.AUTHENTICATION_ERROR, message, 401),
  
  authorization: (message: string = 'Недостаточно прав') =>
    new AppErrorClass(ErrorType.AUTHORIZATION_ERROR, message, 403),
  
  notFound: (message: string = 'Ресурс не найден') =>
    new AppErrorClass(ErrorType.NOT_FOUND_ERROR, message, 404),
  
  conflict: (message: string, details?: any) =>
    new AppErrorClass(ErrorType.CONFLICT_ERROR, message, 409, details),
  
  internal: (message: string = 'Внутренняя ошибка сервера', details?: any) =>
    new AppErrorClass(ErrorType.INTERNAL_ERROR, message, 500, details),
  
  network: (message: string = 'Ошибка сети') =>
    new AppErrorClass(ErrorType.NETWORK_ERROR, message, 503),
  
  database: (message: string = 'Ошибка базы данных', details?: any) =>
    new AppErrorClass(ErrorType.DATABASE_ERROR, message, 500, details),
};

// Обработчик ошибок для API routes
export function handleApiError(
  error: unknown,
  request?: NextRequest
): NextResponse {
  console.error('API Error:', error);

  // Если это наша кастомная ошибка
  if (error instanceof AppErrorClass) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
        details: error.details,
        timestamp: error.timestamp,
      },
      { status: error.statusCode }
    );
  }

  // Если это ошибка валидации Zod
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as any;
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка валидации данных',
        type: ErrorType.VALIDATION_ERROR,
        details: zodError.issues,
        timestamp: new Date(),
      },
      { status: 400 }
    );
  }

  // Если это ошибка MongoDB
  if (error && typeof error === 'object' && 'code' in error) {
    const mongoError = error as any;
    let message = 'Ошибка базы данных';
    let statusCode = 500;

    switch (mongoError.code) {
      case 11000:
        message = 'Дублирование данных';
        statusCode = 409;
        break;
      case 11001:
        message = 'Дублирование уникального ключа';
        statusCode = 409;
        break;
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
        type: ErrorType.DATABASE_ERROR,
        details: process.env.NODE_ENV === 'development' ? mongoError : undefined,
        timestamp: new Date(),
      },
      { status: statusCode }
    );
  }

  // Общая ошибка
  const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
  return NextResponse.json(
    {
      success: false,
      error: message,
      type: ErrorType.INTERNAL_ERROR,
      timestamp: new Date(),
    },
    { status: 500 }
  );
}

// Декоратор для обработки ошибок в API routes
export function withErrorHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error, request);
    }
  };
}

// Утилиты для работы с ошибками
export const ErrorUtils = {
  // Проверка типа ошибки
  isErrorType: (error: unknown, type: ErrorType): boolean => {
    return error instanceof AppErrorClass && error.type === type;
  },

  // Получение сообщения об ошибке
  getErrorMessage: (error: unknown): string => {
    if (error instanceof AppErrorClass) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Неизвестная ошибка';
  },

  // Логирование ошибки
  logError: (error: unknown, context?: string) => {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    
    if (error instanceof AppErrorClass) {
      console.error(`${timestamp}${contextStr} AppError:`, {
        type: error.type,
        message: error.message,
        statusCode: error.statusCode,
        path: error.path,
        method: error.method,
        details: error.details,
      });
    } else {
      console.error(`${timestamp}${contextStr} Error:`, error);
    }
  },

  // Создание пользовательского сообщения об ошибке
  getUserMessage: (error: unknown): string => {
    if (error instanceof AppErrorClass) {
      switch (error.type) {
        case ErrorType.VALIDATION_ERROR:
          return 'Проверьте правильность введенных данных';
        case ErrorType.AUTHENTICATION_ERROR:
          return 'Необходимо войти в систему';
        case ErrorType.AUTHORIZATION_ERROR:
          return 'У вас нет прав для выполнения этого действия';
        case ErrorType.NOT_FOUND_ERROR:
          return 'Запрашиваемый ресурс не найден';
        case ErrorType.CONFLICT_ERROR:
          return 'Конфликт данных';
        case ErrorType.NETWORK_ERROR:
          return 'Ошибка сети. Попробуйте позже';
        case ErrorType.DATABASE_ERROR:
          return 'Ошибка базы данных. Попробуйте позже';
        default:
          return error.message;
      }
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'Произошла неизвестная ошибка';
  },
};

// Middleware для обработки ошибок
export function errorMiddleware(
  error: unknown,
  request: NextRequest
): NextResponse {
  ErrorUtils.logError(error, `API ${request.method} ${request.url}`);
  return handleApiError(error, request);
}

