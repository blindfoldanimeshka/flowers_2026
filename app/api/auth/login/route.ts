export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createToken, setAuthCookie } from '@/lib/auth';
import { generateCsrfToken, setCsrfCookie } from '@/lib/csrf';
import { supabase } from '@/lib/supabase';

export const POST = async (request: NextRequest) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const { data: user, error: queryError } = await supabase
      .from('admin_users')
      .select('id, username, password_hash, role, is_active')
      .eq('username', username)
      .maybeSingle();

    if (queryError) {
      console.error('[LOGIN] Query error:', queryError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!user || !user.is_active) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const token = await createToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    const response = NextResponse.json({
      message: 'Login successful',
      user: { id: user.id, username: user.username, role: user.role }
    });

    setAuthCookie(response, token);
    setCsrfCookie(response, generateCsrfToken());
    return response;
  } catch (error: any) {
    console.error('[LOGIN] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
