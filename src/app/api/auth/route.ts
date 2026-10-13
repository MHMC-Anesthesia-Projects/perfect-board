import { NextRequest, NextResponse } from 'next/server';
import { loadUsers } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, pin, username, email, password } = body;
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
          email: matched.email || matched.username,
          displayName: matched.displayName,
          role: matched.role
        },
        redirectUrl: matched.role === 'superuser' ? '/super' : (matched.role === 'admin' ? '/usap' : '/usap/mhmc')
      });
    }

    // Email / Username & Password Login
    if (mode === 'password') {
      const identifier = (email || username || '').toLowerCase().trim();
      if (!identifier) {
        return NextResponse.json({ error: 'Please enter your email or username.' }, { status: 400 });
      }

      const matched = users.find(
        u => u.active && (
          (u.email && u.email.toLowerCase() === identifier) ||
          (u.username && u.username.toLowerCase() === identifier)
        )
      );

      if (!matched || matched.password !== password) {
        return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: matched.id,
          username: matched.username,
          email: matched.email || matched.username,
          displayName: matched.displayName,
          role: matched.role
        },
        redirectUrl: matched.role === 'superuser' ? '/super' : (matched.role === 'admin' ? '/usap' : '/usap/mhmc')
      });
    }

    return NextResponse.json({ error: 'Invalid authentication mode.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Authentication error' }, { status: 500 });
  }
}
