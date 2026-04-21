import type { NextRequest } from 'next/server';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

export class Logger {
  private static getRequestInfo(request?: NextRequest) {
    if (!request) return '';
    
    return {
      method: request.method,
      url: request.url,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    };
  }

  private static formatMessage(level: LogLevel, message: string, context: LogContext = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...context,
    };

    // Format for console
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    // Additional context for error logging
    const contextString = Object.keys(context).length 
      ? `\nContext: ${JSON.stringify(context, null, 2)}` 
      : '';

    return { logMessage: `${logMessage}${contextString}`, logData };
  }

  static info(message: string, context: LogContext = {}, request?: NextRequest) {
    const requestInfo = request ? this.getRequestInfo(request) : {};
    const { logMessage, logData } = this.formatMessage('info', message, { ...context, ...requestInfo });
    console.log(logMessage);
    // Here you can add additional logging to a file or external service
    return logData;
  }

  static error(message: string, error: Error, context: LogContext = {}, request?: NextRequest) {
    const requestInfo = request ? this.getRequestInfo(request) : {};
    const errorInfo = error ? { 
      error: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    } : {};
    
    const { logMessage, logData } = this.formatMessage('error', message, { 
      ...context, 
      ...requestInfo, 
      ...errorInfo 
    });
    
    console.error(logMessage);
    // Here you can add additional error logging to a file or external service
    return logData;
  }

  static warn(message: string, context: LogContext = {}, request?: NextRequest) {
    const requestInfo = request ? this.getRequestInfo(request) : {};
    const { logMessage, logData } = this.formatMessage('warn', message, { ...context, ...requestInfo });
    console.warn(logMessage);
    return logData;
  }

  static debug(message: string, data: any = {}, context: LogContext = {}, request?: NextRequest) {
    if (process.env.NODE_ENV !== 'development') return;
    
    const requestInfo = request ? this.getRequestInfo(request) : {};
    const { logMessage, logData } = this.formatMessage('debug', message, { 
      ...context, 
      ...requestInfo, 
      debugData: data 
    });
    
    console.debug(logMessage);
    return logData;
  }
}

export const apiLogger = {
  requestStarted: (request: NextRequest, context: LogContext = {}) => {
    return Logger.info(`[${request.method}] ${request.nextUrl.pathname} started`, context, request);
  },
  
  requestCompleted: (request: NextRequest, context: LogContext = {}) => {
    return Logger.info(`[${request.method}] ${request.nextUrl.pathname} completed`, context, request);
  },
  
  error: (error: Error, request: NextRequest, context: LogContext = {}) => {
    return Logger.error(`[${request.method}] ${request.nextUrl.pathname} failed`, error, context, request);
  }
};

export default Logger;
