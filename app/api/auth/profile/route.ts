export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { sanitizeMongoObject } from '@/lib/security';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

export const GET = withErrorHandler(async (request: NextRequest) => {
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
        telegram_id2: user.telegram_id2 || '',
        telegram_id3: user.telegram_id3 || '',
      },
      { status: 200 }
    );
  
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
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
    if (typeof body.telegram_id2 === 'string') {
      updateData.telegram_id2 = body.telegram_id2.trim();
    }
    if (typeof body.telegram_id3 === 'string') {
      updateData.telegram_id3 = body.telegram_id3.trim();
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
        telegram_id2: updatedUser.telegram_id2 || '',
        telegram_id3: updatedUser.telegram_id3 || '',
      },
      { status: 200 }
    );
  
});
