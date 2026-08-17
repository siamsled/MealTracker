import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, UserRecord } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabase();
    // Accept authenticated session cookie or x-user-id header for persistent PWA
    const sessionUserId = req.cookies.get('mt_user_id')?.value || req.headers.get('x-user-id');
    
    if (!sessionUserId) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        currentUser: null
      });
    }

    const user = db.prepare(
      'SELECT id, household_id, name, username, email, role, is_active FROM users WHERE id = ? AND is_active = 1'
    ).get(sessionUserId) as Omit<UserRecord, 'pin' | 'password'> | undefined;

    if (!user) {
      const response = NextResponse.json({
        success: true,
        authenticated: false,
        currentUser: null
      });
      response.cookies.delete('mt_user_id');
      return response;
    }

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      currentUser: user,
      user
    });

    // Refresh and extend persistent 1-year cookie
    response.cookies.set('mt_user_id', user.id, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, userId, pin, action } = body;
    const db = getDatabase();

    if (action === 'logout') {
      const response = NextResponse.json({ success: true, message: 'Logged out' });
      response.cookies.delete('mt_user_id');
      return response;
    }

    let user: UserRecord | undefined;

    if (username && password) {
      const cleanUsername = username.trim().toLowerCase();
      user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(name) = ? OR LOWER(email) = ?')
        .get(cleanUsername, cleanUsername, cleanUsername) as UserRecord | undefined;

      if (!user) {
        return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
      }

      const cleanPassword = password.trim();
      const isValidPassword = (user.password && user.password === cleanPassword) || (user.pin && user.pin === cleanPassword);
      if (!isValidPassword) {
        return NextResponse.json({ success: false, error: 'Invalid username or password' }, { status: 401 });
      }
    } else if (userId) {
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRecord | undefined;
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      if (pin && user.pin && pin !== user.pin && user.password !== pin) {
        return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ success: false, error: 'Username and password are required' }, { status: 400 });
    }

    const redirectPath = user.role === 'cook' 
      ? '/cook' 
      : user.role === 'admin' 
      ? '/admin' 
      : '/';

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        household_id: user.household_id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      },
      redirectPath
    });

    response.cookies.set('mt_user_id', user.id, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365 // 1 Year Persistent Native App Session
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
