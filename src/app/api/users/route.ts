import { NextRequest, NextResponse } from 'next/server';
import { loadUsers, saveUsers, recordAuditLog } from '@/lib/storage';
import { User, UserRole } from '@/types/whiteboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const users = await loadUsers();
  const safeUsers = users.map(u => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    pin: u.pin,
    active: u.active,
    createdAt: u.createdAt
  }));
  return NextResponse.json(safeUsers, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, displayName, role, pin, password, currentUser } = body;

    if (!username || !displayName || !role || !pin) {
      return NextResponse.json({ error: 'Username, display name, role, and PIN are required.' }, { status: 400 });
    }

    if (currentUser?.role !== 'superuser') {
      return NextResponse.json({ error: 'Only Superusers can create new system users.' }, { status: 403 });
    }

    const users = await loadUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json({ error: 'Username already exists.' }, { status: 400 });
    }

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: username.trim(),
      displayName: displayName.trim(),
      role: role as UserRole,
      pin: pin.trim(),
      password: password || 'hospital123',
      active: body.active !== undefined ? Boolean(body.active) : true,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await saveUsers(users);

    await recordAuditLog({
      actionType: 'USER_CREATED',
      performedBy: currentUser?.displayName || 'Superuser',
      userRole: 'superuser',
      targetName: newUser.displayName,
      details: `Created user ${newUser.username} with role: ${newUser.role} (PIN: ${newUser.pin})`
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating user' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, username, displayName, role, pin, password, active, currentUser } = body;

    if (currentUser?.role !== 'superuser') {
      return NextResponse.json({ error: 'Only Superusers can modify users.' }, { status: 403 });
    }

    const users = await loadUsers();
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const targetUser = users[userIndex];

    if (username !== undefined && username.trim() !== '' && username.trim().toLowerCase() !== targetUser.username.toLowerCase()) {
      const trimmedUsername = username.trim();
      if (users.some(u => u.id !== id && u.username.toLowerCase() === trimmedUsername.toLowerCase())) {
        return NextResponse.json({ error: 'Username already taken by another account.' }, { status: 400 });
      }
      targetUser.username = trimmedUsername;
    }

    if (displayName !== undefined && displayName.trim() !== '') {
      targetUser.displayName = displayName.trim();
    }

    if (role !== undefined) {
      // Prevent demoting the only active superuser
      if (targetUser.role === 'superuser' && role !== 'superuser') {
        const activeSuperusers = users.filter(u => u.id !== id && u.role === 'superuser' && u.active);
        if (activeSuperusers.length === 0) {
          return NextResponse.json({ error: 'Cannot demote the only active superuser account.' }, { status: 400 });
        }
      }
      targetUser.role = role;
    }

    if (pin !== undefined && pin.trim() !== '') {
      targetUser.pin = pin.trim();
    }

    if (password !== undefined && password.trim() !== '') {
      targetUser.password = password.trim();
    }

    if (active !== undefined) {
      // Prevent deactivating the only active superuser
      if (targetUser.role === 'superuser' && active === false) {
        const activeSuperusers = users.filter(u => u.id !== id && u.role === 'superuser' && u.active);
        if (activeSuperusers.length === 0) {
          return NextResponse.json({ error: 'Cannot deactivate the only active superuser account.' }, { status: 400 });
        }
      }
      targetUser.active = active;
    }

    await saveUsers(users);

    await recordAuditLog({
      actionType: 'USER_UPDATED',
      performedBy: currentUser?.displayName || 'Superuser',
      userRole: 'superuser',
      targetName: targetUser.displayName,
      details: `Updated user @${targetUser.username} (${targetUser.displayName}): role=${targetUser.role}, PIN=${targetUser.pin}, active=${targetUser.active}`
    });

    return NextResponse.json({ success: true, user: targetUser });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const currentRole = req.headers.get('x-user-role');
    const currentName = req.headers.get('x-user-name') || 'Superuser';

    if (currentRole !== 'superuser') {
      return NextResponse.json({ error: 'Superuser permission required.' }, { status: 403 });
    }

    const users = await loadUsers();
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Protect against deleting the only superuser
    const superusers = users.filter(u => u.role === 'superuser' && u.active);
    if (targetUser.role === 'superuser' && superusers.length <= 1) {
      return NextResponse.json({ error: 'Cannot delete the only active superuser account.' }, { status: 400 });
    }

    const updatedUsers = users.filter(u => u.id !== id);
    await saveUsers(updatedUsers);

    await recordAuditLog({
      actionType: 'USER_UPDATED',
      performedBy: currentName,
      userRole: 'superuser',
      targetName: targetUser.displayName,
      details: `Deleted user ${targetUser.username}`
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error deleting user' }, { status: 500 });
  }
}
