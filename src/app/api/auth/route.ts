import { NextRequest, NextResponse } from 'next/server';
import { loadUsers } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, pin, username, password } = body;
    const users = await loadUsers();

    // Fast PIN Login (ideal for touchscreen)
    if (mode === 'pin') {
      const matched = users.find(u => u.active && u.pin === pin);
      if (!matched) {
        return NextResponse.json({ error: 'Invalid PIN. Please try again.' }, { status: 401 });
      }
      return NextResponse.json({
        success: true,
        user: {
          id: matched.id,
          username: matched.username,
          displayName: matched.displayName,
          role: matched.role
        }
      });
    }

    // Username / Password Login
    if (mode === 'password') {
      const matched = users.find(
        u => u.active && u.username.toLowerCase() === (username || '').toLowerCase()
      );
      if (!matched || matched.password !== password) {
        return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
      }
      return NextResponse.json({
        success: true,
        user: {
          id: matched.id,
          username: matched.username,
          displayName: matched.displayName,
          role: matched.role
        }
      });
    }

    return NextResponse.json({ error: 'Invalid authentication mode.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Authentication error' }, { status: 500 });
  }
}
