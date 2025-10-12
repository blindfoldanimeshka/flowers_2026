import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Проверяем подключение к базе данных
    await connect();
    
    const responseTime = Date.now() - startTime;
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'connected',
        api: 'running'
      }
    };

    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Service unavailable',
      services: {
        database: 'disconnected',
        api: 'running'
      }
    };

    return NextResponse.json(errorStatus, { status: 503 });
  }
}
