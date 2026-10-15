import { NextRequest, NextResponse } from 'next/server';
import { loadBoardState, saveBoardState, recordAuditLog } from '@/lib/storage';
import { Staff } from '@/types/whiteboard';

export async function GET() {
  const state = await loadBoardState();
  return NextResponse.json(state.staff);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, credentials, phone, shift, currentUser } = body;

    if (!lastName || !credentials || !phone) {
      return NextResponse.json({ error: 'Last name, credentials, and phone number are required.' }, { status: 400 });
    }

    if (!currentUser || currentUser?.role === 'basic_user' || currentUser?.role === 'view_only') {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    }

    const state = await loadBoardState();
    const formattedDisplayName = body.displayName?.trim() || `${lastName.trim().toUpperCase()} ${firstName?.trim() ? firstName.trim()[0] + '.' : ''}`.trim();
    const newStaff: Staff = {
      id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      firstName: firstName?.trim() || '',
      lastName: lastName.trim(),
      displayName: formattedDisplayName,
      initials: (firstName?.trim() ? firstName.trim()[0] : '') + lastName.trim()[0],
      credentials: credentials,
      phone: phone.trim(),
      shift: shift || '07:00 - 15:30',
      active: true,
      isInfrequent: Boolean(body.isInfrequent),
      notes: ''
    };

    state.staff.push(newStaff);
    if (newStaff.isInfrequent) {
      state.infrequentStaffIds = state.infrequentStaffIds || [];
      state.infrequentStaffKeys = state.infrequentStaffKeys || [];
      if (!state.infrequentStaffIds.includes(newStaff.id)) {
        state.infrequentStaffIds.push(newStaff.id);
      }
      const lastKey = newStaff.lastName.toLowerCase();
      if (lastKey && !state.infrequentStaffKeys.includes(lastKey)) {
        state.infrequentStaffKeys.push(lastKey);
      }
    }
    await saveBoardState(state);

    await recordAuditLog({
      actionType: 'STAFF_CREATED',
      performedBy: currentUser?.displayName || 'User',
      userRole: currentUser?.role || 'board_runner',
      targetName: `${newStaff.firstName} ${newStaff.lastName}`.trim(),
      details: `Added new staff: ${newStaff.displayName} (${newStaff.credentials}) | Phone: ${newStaff.phone}`
    });

    return NextResponse.json({ success: true, staff: newStaff });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating staff' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, firstName, lastName, displayName, credentials, phone, shift, active, isInfrequent, currentUser } = body;

    if (!currentUser || currentUser?.role === 'basic_user' || currentUser?.role === 'view_only') {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    }

    const state = await loadBoardState();
    const staffMember = state.staff.find(s => s.id === id);
    if (!staffMember) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
    }

    if (firstName !== undefined) staffMember.firstName = firstName.trim();
    if (lastName !== undefined) staffMember.lastName = lastName.trim();
    if (displayName !== undefined) staffMember.displayName = displayName.trim() || undefined;
    staffMember.initials = (staffMember.firstName ? staffMember.firstName[0] : '') + (staffMember.lastName ? staffMember.lastName[0] : '');
    if (credentials !== undefined) staffMember.credentials = credentials;
    if (phone !== undefined) staffMember.phone = phone.trim();
    if (shift !== undefined) staffMember.shift = shift;
    if (active !== undefined) staffMember.active = active;
    if (body.hasStudent !== undefined) staffMember.hasStudent = Boolean(body.hasStudent);
    if (body.studentName !== undefined) staffMember.studentName = body.studentName ? String(body.studentName).trim() : undefined;
    if (isInfrequent !== undefined) {
      staffMember.isInfrequent = Boolean(isInfrequent);
      state.infrequentStaffIds = state.infrequentStaffIds || [];
      state.infrequentStaffKeys = state.infrequentStaffKeys || [];
      const qKey = (staffMember.qgendaAbbr || '').toLowerCase();
      const lastKey = (staffMember.lastName || '').toLowerCase();

      if (staffMember.isInfrequent) {
        if (!state.infrequentStaffIds.includes(staffMember.id)) {
          state.infrequentStaffIds.push(staffMember.id);
        }
        if (qKey && !state.infrequentStaffKeys.includes(qKey)) {
          state.infrequentStaffKeys.push(qKey);
        }
        if (lastKey && !state.infrequentStaffKeys.includes(lastKey)) {
          state.infrequentStaffKeys.push(lastKey);
        }
      } else {
        state.infrequentStaffIds = state.infrequentStaffIds.filter(sid => sid !== staffMember.id);
        if (qKey) {
          state.infrequentStaffKeys = state.infrequentStaffKeys.filter(k => k !== qKey);
        }
        if (lastKey) {
          state.infrequentStaffKeys = state.infrequentStaffKeys.filter(k => k !== lastKey);
        }
      }
    }

    await saveBoardState(state);

    await recordAuditLog({
      actionType: 'STAFF_UPDATED',
      performedBy: currentUser?.displayName || 'User',
      userRole: currentUser?.role || 'board_runner',
      targetName: `${staffMember.firstName} ${staffMember.lastName}`.trim(),
      details: `Updated details: ${staffMember.credentials}, Phone: ${staffMember.phone}, Active: ${staffMember.active}`
    });

    return NextResponse.json({ success: true, staff: staffMember });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating staff' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const role = req.headers.get('x-user-role');
    const name = req.headers.get('x-user-name') || 'User';

    if (!role || role === 'basic_user' || role === 'view_only') {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    }

    const state = await loadBoardState();
    const staffIndex = state.staff.findIndex(s => s.id === id);
    if (staffIndex === -1) {
      return NextResponse.json({ error: 'Staff not found.' }, { status: 404 });
    }

    const removed = state.staff[staffIndex];
    state.staff.splice(staffIndex, 1);

    // Also clear from any room or runner slots (including relief slots)
    for (const dept of state.departments || []) {
      for (const r of dept.runnerSlots || []) {
        if (r.staffId === id) r.staffId = null;
        if (r.relief?.staffId === id) {
          if (r.relief.isRedBox) {
            r.relief.staffId = null;
          } else {
            r.relief = undefined;
          }
        }
      }
      for (const room of dept.rooms || []) {
        for (const slot of room.slots || []) {
          if (slot.staffId === id) slot.staffId = null;
          if (slot.relief?.staffId === id) {
            if (slot.relief.isRedBox) {
              slot.relief.staffId = null;
            } else {
              slot.relief = undefined;
            }
          }
        }
      }
    }

    // Clear from active bullpen
    if (state.bullpenStaffIds && Array.isArray(state.bullpenStaffIds) && id) {
      state.bullpenStaffIds = state.bullpenStaffIds.filter(sid => sid !== id);
    }
    if (state.bullpenBreaks && id && state.bullpenBreaks[id]) {
      delete state.bullpenBreaks[id];
    }

    // Clear from infrequent lists
    if (state.infrequentStaffIds && id) {
      state.infrequentStaffIds = state.infrequentStaffIds.filter(sid => sid !== id);
    }
    const qKey = (removed.qgendaAbbr || '').toLowerCase();
    const lastKey = (removed.lastName || '').toLowerCase();
    if (state.infrequentStaffKeys) {
      const otherHasQKey = qKey && state.staff.some(s => (s.qgendaAbbr || '').toLowerCase() === qKey && s.isInfrequent);
      if (!otherHasQKey && qKey) {
        state.infrequentStaffKeys = state.infrequentStaffKeys.filter(k => k !== qKey);
      }
      const otherHasLastKey = lastKey && state.staff.some(s => (s.lastName || '').toLowerCase() === lastKey && s.isInfrequent);
      if (!otherHasLastKey && lastKey) {
        state.infrequentStaffKeys = state.infrequentStaffKeys.filter(k => k !== lastKey);
      }
    }

    // Clear magnet notes & stickers
    if (state.magnetNotes && id) {
      delete state.magnetNotes[id];
    }
    if (state.magnetStickers && id) {
      delete state.magnetStickers[id];
    }

    // Clear from departure, lates, and call team lists
    const matchRemoved = (item: { id?: string; name?: string; qgendaAbbr?: string; doctorName?: string }) => {
      if (item.id === id) return true;
      const itemName = (item.name || item.doctorName || '').trim().toLowerCase();
      if (lastKey && (itemName === lastKey || itemName === `${lastKey}, ${removed.firstName?.toLowerCase()}` || itemName.startsWith(`${lastKey} `))) {
        return true;
      }
      if (qKey && item.qgendaAbbr && item.qgendaAbbr.trim().toLowerCase() === qKey) {
        return true;
      }
      return false;
    };

    if (state.departureList) {
      state.departureList = state.departureList.filter(item => !matchRemoved(item));
    }
    if (state.latesList) {
      state.latesList = state.latesList.filter(item => !matchRemoved(item));
    }
    if (state.callTeamList) {
      state.callTeamList = state.callTeamList.filter(item => !matchRemoved(item));
    }

    await saveBoardState(state);

    await recordAuditLog({
      actionType: 'STAFF_UPDATED',
      performedBy: name,
      userRole: (role as any) || 'board_runner',
      targetName: `${removed.firstName} ${removed.lastName}`.trim(),
      details: `Removed staff member ${removed.displayName || removed.lastName} (${removed.credentials}) from site roster, credentialed list, and board`
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error removing staff' }, { status: 500 });
  }
}
