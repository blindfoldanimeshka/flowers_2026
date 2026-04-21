export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { sanitizeMongoObject } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload?.username) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ username: payload.username });

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    return NextResponse.json(
      {
        username: user.username,
        email: user.email,
        role: user.role,
        telegram_id: user.telegram_id || '',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Profile GET error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload?.username) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    await dbConnect();
    const body = sanitizeMongoObject(await request.json());

    const updateData: Record<string, unknown> = {};
    if (typeof body.telegram_id === 'string') {
      updateData.telegram_id = body.telegram_id.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 });
    }

    const updatedUser = await User.findOneAndUpdate(
      { username: payload.username },
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: 'Профиль обновлен',
        telegram_id: updatedUser.telegram_id || '',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Profile PUT error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', details: error.message },
      { status: 500 }
    );
  }
}
