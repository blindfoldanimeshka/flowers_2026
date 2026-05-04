export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createToken, setAuthCookie } from '@/lib/auth';
import { generateCsrfToken, setCsrfCookie } from '@/lib/csrf';

export const POST = async (request: NextRequest) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Direct Supabase query since doc is text not jsonb
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    
    // Get user by collection and search in text
    const { data: users, error: queryError } = await supabase
      .from('documents')
      .select('id, doc')
      .eq('collection', 1)
      .ilike('doc', `%username%${username}%`);
    
    let user: any = null;
    if (users && users.length > 0) {
      const doc = JSON.parse(users[0].doc);
      if (doc.username === username) {
        user = { 
          _id: users[0].id, 
          ...doc,
          comparePassword: async (pwd: string) => {
            const bcrypt = require('bcryptjs');
            return bcrypt.compare(pwd, doc.password);
          }
        };
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const token = await createToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role
    });

    const response = NextResponse.json({
      message: 'Login successful',
      user: { id: user._id.toString(), username: user.username, role: user.role }
    });

    setAuthCookie(response, token);
    setCsrfCookie(response, generateCsrfToken());
    return response;
  } catch (error: any) {
    console.error('[LOGIN] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
