import { NextRequest, NextResponse } from 'next/server';
import { productionLogger } from '@/lib/productionLogger';

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
  details?: unknown;
  timestamp: Date;
  path?: string;
  method?: string;
}

export class AppErrorClass extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly timestamp: Date;
  public readonly path?: string;
  public readonly method?: string;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number,
    details?: unknown,
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

export const createError = {
  validation: (message: string, details?: unknown) =>
    new AppErrorClass(ErrorType.VALIDATION_ERROR, message, 400, details),

  authentication: (message = 'Authentication required') =>
    new AppErrorClass(ErrorType.AUTHENTICATION_ERROR, message, 401),

  authorization: (message = 'Insufficient permissions') =>
    new AppErrorClass(ErrorType.AUTHORIZATION_ERROR, message, 403),

  notFound: (message = 'Resource not found') =>
    new AppErrorClass(ErrorType.NOT_FOUND_ERROR, message, 404),

  conflict: (message: string, details?: unknown) =>
    new AppErrorClass(ErrorType.CONFLICT_ERROR, message, 409, details),

  internal: (message = 'Internal server error', details?: unknown) =>
    new AppErrorClass(ErrorType.INTERNAL_ERROR, message, 500, details),

  network: (message = 'Network error') => new AppErrorClass(ErrorType.NETWORK_ERROR, message, 503),

  database: (message = 'Database error', details?: unknown) =>
    new AppErrorClass(ErrorType.DATABASE_ERROR, message, 500, details),
};

function normalizeUnknownError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === 'string' ? error : JSON.stringify(error));
}

export function handleApiError(error: unknown, request?: NextRequest): NextResponse {
  const isDev = process.env.NODE_ENV === 'development';

  if (error instanceof AppErrorClass) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
        details: isDev ? error.details : undefined,
        timestamp: error.timestamp,
      },
      { status: error.statusCode }
    );
  }

  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: unknown };
    return NextResponse.json(
      {
        success: false,
        error: 'Validation error',
        type: ErrorType.VALIDATION_ERROR,
        details: isDev ? zodError.issues : undefined,
        timestamp: new Date(),
      },
      { status: 400 }
    );
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as { code?: number | string };

    if (dbError.code === 'PGRST116') {
      return NextResponse.json(
        {
          success: false,
          error: 'Resource not found',
          type: ErrorType.NOT_FOUND_ERROR,
          timestamp: new Date(),
        },
        { status: 404 }
      );
    }

    if (dbError.code === '23505' || dbError.code === 11000 || dbError.code === 11001) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate entry',
          type: ErrorType.CONFLICT_ERROR,
          details: isDev ? error : undefined,
          timestamp: new Date(),
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Database error',
        type: ErrorType.DATABASE_ERROR,
        details: isDev ? error : undefined,
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }

  const normalizedError = normalizeUnknownError(error);
  return NextResponse.json(
    {
      success: false,
      error: isDev ? normalizedError.message : 'Internal server error',
      type: ErrorType.INTERNAL_ERROR,
      timestamp: new Date(),
    },
    { status: 500 }
  );
}

export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(handler: T): T {
  const wrapped = async (...args: Parameters<T>): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      const firstArg = args[0];

      if (firstArg instanceof NextRequest) {
        productionLogger.error(
          `API Error: ${firstArg.method} ${firstArg.nextUrl.pathname}`,
          error,
          {
            path: firstArg.nextUrl.pathname,
            method: firstArg.method,
            query: firstArg.nextUrl.search,
          },
          firstArg
        );
        return handleApiError(error, firstArg);
      }

      productionLogger.error('API Error', error);
      return handleApiError(error);
    }
  };

  return wrapped as T;
}

export const ErrorUtils = {
  isErrorType: (error: unknown, type: ErrorType): boolean => {
    return error instanceof AppErrorClass && error.type === type;
  },

  getErrorMessage: (error: unknown): string => {
    if (error instanceof AppErrorClass || error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  },

  logError: (error: unknown, context?: string): void => {
    const timestamp = new Date().toISOString();
    const contextLabel = context ? ` [${context}]` : '';

    if (error instanceof AppErrorClass) {
      productionLogger.error(`${timestamp}${contextLabel} AppError`, error, {
        type: error.type,
        statusCode: error.statusCode,
        path: error.path,
        method: error.method,
        details: error.details,
      });
      return;
    }

    productionLogger.error(`${timestamp}${contextLabel} Error`, error);
  },

  getUserMessage: (error: unknown): string => {
    if (error instanceof AppErrorClass) {
      switch (error.type) {
        case ErrorType.VALIDATION_ERROR:
          return 'Please check your input data';
        case ErrorType.AUTHENTICATION_ERROR:
          return 'Authentication is required';
        case ErrorType.AUTHORIZATION_ERROR:
          return 'Insufficient permissions';
        case ErrorType.NOT_FOUND_ERROR:
          return 'Resource not found';
        case ErrorType.CONFLICT_ERROR:
          return 'Data conflict detected';
        case ErrorType.NETWORK_ERROR:
          return 'Network error, please try again later';
        case ErrorType.DATABASE_ERROR:
          return 'Database is temporarily unavailable';
        default:
          return error.message;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'An unknown error occurred';
  },
};

export function errorMiddleware(error: unknown, request: NextRequest): NextResponse {
  ErrorUtils.logError(error, `API ${request.method} ${request.url}`);
  return handleApiError(error, request);
}
