export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase, SUPABASE_COLLECTION_TABLE } from '@/lib/supabase';
import { sanitizeMongoObject } from '@/lib/security';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

const USERS_COLLECTION = 1;

function mapUserRow(row: any) {
  const doc = typeof row.doc === 'string' ? JSON.parse(row.doc) : row.doc;
  return {
    username: doc.username,
    email: doc.email,
    role: doc.role,
    telegram_id: doc.telegram_id || '',
    telegram_id2: doc.telegram_id2 || '',
    telegram_id3: doc.telegram_id3 || '',
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
      .from(SUPABASE_COLLECTION_TABLE)
      .select('id, doc')
      .eq('collection', USERS_COLLECTION)
      .eq('doc->>username', payload.username)
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

    // Get current user
    const { data: currentUser, error: fetchError } = await supabase
      .from(SUPABASE_COLLECTION_TABLE)
      .select('id, doc')
      .eq('collection', USERS_COLLECTION)
      .eq('doc->>username', payload.username)
      .single();

    if (fetchError || !currentUser) {
      return NextResponse.json({ error: 'Ползовател не найден' }, { status: 404 });
    }

    const currentDoc = typeof currentUser.doc === 'string' ? JSON.parse(currentUser.doc) : currentUser.doc;
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

    // Merge updates into doc
    const updatedDoc = { ...currentDoc, ...updateData };

    const { error: updateError } = await supabase
      .from(SUPABASE_COLLECTION_TABLE)
      .update({ doc: updatedDoc })
      .eq('collection', USERS_COLLECTION)
      .eq('id', currentUser.id);

    if (updateError) {
      console.error('[AUTH_PROFILE] Supabase update error:', { message: updateError.message, code: updateError.code });
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    const updatedUserData = mapUserRow({ doc: updatedDoc });

    return NextResponse.json(
      {
        message: 'Профиль обновлен',
        ...updatedUserData,
      },
      { status: 200 }
    );
});


