import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

export const GET = withErrorHandler(async (_request: NextRequest) => {
    const startTime = Date.now();
    
    // Проверяем подключение к базе данных
    await connect();
    
    const responseTime = Date.now() - startTime;
    
    const dataSourceFlags = {
      catalog: process.env.USE_SUPABASE_CATALOG === 'true',
      settings: process.env.USE_SUPABASE_SETTINGS === 'true',
      orders: process.env.USE_SUPABASE_ORDERS === 'true',
      admin: process.env.USE_SUPABASE_ADMIN === 'true',
    };

    const values = Object.values(dataSourceFlags);
    const hasTrue = values.some(Boolean);
    const hasFalse = values.some((v) => !v);
    const mixedDataSources = hasTrue && hasFalse;

    const mirrorMutationAllowlist = (process.env.MIRROR_MUTATION_ALLOWLIST || '/api/auth')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      parity: {
        mixedDataSources,
        allowMixedSources: process.env.ALLOW_MIXED_SOURCES === 'true',
        mirrorMode: process.env.MIRROR_MODE === 'true',
        mirrorMutationAllowlist,
        clientCacheDisabled:
          process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DISABLE_CLIENT_CACHE === 'true',
        dataSources: dataSourceFlags,
      },
      services: {
        database: 'connected',
        api: 'running'
      }
    };

    return NextResponse.json(healthStatus, { status: 200 });
  
});
