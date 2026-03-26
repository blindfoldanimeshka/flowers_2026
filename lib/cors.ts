import { NextRequest, NextResponse } from 'next/server';

interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  credentials: boolean;
}

const defaultConfig: CorsConfig = {
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
};

export function corsMiddleware(request: NextRequest, config: Partial<CorsConfig> = {}) {
  const corsConfig = { ...defaultConfig, ...config };
  const origin = request.headers.get('origin');
  
  // Проверяем, разрешен ли origin
  const isOriginAllowed = origin && corsConfig.allowedOrigins.includes(origin);
  
  // Для preflight запросов
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    
    if (isOriginAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Methods', corsConfig.allowedMethods.join(','));
    response.headers.set('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(','));
    
    if (corsConfig.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return response;
  }
  
  return null;
}

export function addCorsHeaders(response: NextResponse, request: NextRequest, config: Partial<CorsConfig> = {}) {
  const corsConfig = { ...defaultConfig, ...config };
  const origin = request.headers.get('origin');
  
  if (origin && corsConfig.allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  if (corsConfig.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  return response;
}
