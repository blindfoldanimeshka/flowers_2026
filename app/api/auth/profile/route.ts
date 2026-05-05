export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { withErrorHandler } from '@/lib/errorHandler';

function mapUserRow(row: any) {
  return {
    username: row.username,
    email: row.email,
    role: row.role,
    telegram_id: '',
    telegram_id2: '',
    telegram_id3: '',
  };
}

export const GET = withErrorHandler(async (request: NextRequest) => {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload?.username) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('admin_users')
      .select('id, username, email, role')
      .eq('username', payload.username)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Ползовател не найден' }, { status: 404 });
    }

    const userData = mapUserRow(data);

    return NextResponse.json(userData, { status: 200 });
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

    const { data: currentUser, error: fetchError } = await supabase
      .from('admin_users')
      .select('id, username, email, role')
      .eq('username', payload.username)
      .single();

    if (fetchError || !currentUser) {
      return NextResponse.json({ error: 'Ползовател не найден' }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: 'Профиль загружен',
        ...mapUserRow(currentUser),
      },
      { status: 200 }
    );
});


