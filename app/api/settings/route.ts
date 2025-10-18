export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { getCachedSettings, invalidateSettingsCache } from '@/lib/cache';

// GET запрос для получения настроек (с кэшированием)
export async function GET(request: NextRequest) {
  try {
    console.log('Получение настроек из кэша...');
    
    // Получаем настройки из кэша
    const settings = await getCachedSettings();
    
    console.log('Настройки получены из кэша');
    
    return NextResponse.json({ settings }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при получении настроек:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении настроек', details: error.message },
      { status: 500 }
    );
  }
}

// PUT запрос для обновления настроек (только для админов)
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    // Ищем существующие настройки
    let settings = await Settings.findOne();

    if (settings) {
      // Если настройки существуют, обновляем их
      settings = await Settings.findByIdAndUpdate(settings._id, body, { new: true, runValidators: true });
    } else {
      // Если настроек нет, создаем их с нуля
      // Важно передать все обязательные поля, чтобы пройти валидацию
      const defaultSettings = {
        siteName: 'Цветочный Магазин',
        contactPhone: '+7-000-000-00-00',
        address: 'Город, Улица, Дом',
        workingHours: '10:00-20:00',
        ...body // Применяем обновления из запроса поверх значений по умолчанию
      };
      settings = await Settings.create(defaultSettings);
    }
    
    // Инвалидируем кэш настроек
    invalidateSettingsCache();
    
    return NextResponse.json({ settings: settings }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при обновлении настроек:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validationErrors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Ошибка при обновлении настроек', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    // Ищем существующие настройки
    let settings = await Settings.findOne();

    if (settings) {
      // Если настройки существуют, обновляем их
      settings = await Settings.findByIdAndUpdate(settings._id, body, { new: true, runValidators: true });
    } else {
      // Если настроек нет, создаем их с нуля
      const defaultSettings = {
        siteName: 'Цветочный Магазин',
        contactPhone: '+7-000-000-00-00',
        address: 'Город, Улица, Дом',
        workingHours: '10:00-20:00',
        ...body
      };
      settings = await Settings.create(defaultSettings);
    }

    invalidateSettingsCache();
    return NextResponse.json({ settings: settings }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Ошибка при обновлении настроек', details: error.message },
      { status: 500 }
    );
  }
} 