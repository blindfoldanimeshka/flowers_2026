import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

export const GET = withErrorHandler(async (_request: NextRequest) => {
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
  
});
