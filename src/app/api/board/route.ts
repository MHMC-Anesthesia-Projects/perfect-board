import { NextRequest, NextResponse } from 'next/server';
import { loadBoardState, saveBoardState, recordAuditLog, getInitialBoardState } from '@/lib/storage';
import { UserRole, RunnerSlot } from '@/types/whiteboard';

export async function GET() {
  const state = loadBoardState();
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload, user } = body;

    const state = loadBoardState();
    const currentUserRole: UserRole = user?.role || 'basic_user';
    const currentUserName = user?.displayName || 'Anonymous Staff';

    switch (action) {
      // 1. Toggle Breakfast or Lunch break (Basic User allowed!)
      case 'TOGGLE_BREAK': {
        const { targetType, targetId, breakType, value } = payload;
        // targetType: 'room_slot' | 'runner_slot'
        let staffName = 'Staff';
        let locationName = '';

        if (targetType === 'runner_slot') {
          for (const dept of state.departments) {
            const runner = dept.runnerSlots.find(r => r.id === targetId);
            if (runner) {
              locationName = `${dept.name} Runner (${runner.title})`;
              if (runner.staffId) {
                const s = state.staff.find(st => st.id === runner.staffId);
                if (s) staffName = `${s.firstName} ${s.lastName}`.trim();
              }
              if (breakType === 'breakfast') {
                runner.breakfastDone = value;
                runner.breakfastTime = value ? new Date().toISOString() : null;
              } else if (breakType === 'lunch') {
                runner.lunchDone = value;
                runner.lunchTime = value ? new Date().toISOString() : null;
              }
              break;
            }
          }
        } else if (targetType === 'room_slot') {
          for (const dept of state.departments) {
            for (const room of dept.rooms) {
              const slot = room.slots.find(s => s.id === targetId);
              if (slot) {
                locationName = `${dept.name} Room ${room.name}`;
                if (slot.staffId) {
                  const s = state.staff.find(st => st.id === slot.staffId);
                  if (s) staffName = `${s.firstName} ${s.lastName}`.trim();
                }
                if (breakType === 'breakfast') {
                  slot.breakfastDone = value;
                  slot.breakfastTime = value ? new Date().toISOString() : null;
                } else if (breakType === 'lunch') {
                  slot.lunchDone = value;
                  slot.lunchTime = value ? new Date().toISOString() : null;
                }
                break;
              }
            }
          }
        }

        saveBoardState(state);
        recordAuditLog({
          actionType: breakType === 'breakfast' ? 'BREAKFAST_TOGGLED' : 'LUNCH_TOGGLED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: staffName,
          locationName,
          details: `Marked ${breakType} break as ${value ? 'DONE [✓]' : 'NOT DONE [ ]'}`
        });

        return NextResponse.json({ success: true, state });
      }

      // 2. Assign staff to Room or Runner (Board Runner or Superuser required)
      case 'ASSIGN_STAFF': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }

        const { targetType, targetId, staffId } = payload;
        let staffName = 'Unassigned';
        let locationName = '';

        if (staffId) {
          const s = state.staff.find(st => st.id === staffId);
          if (s) staffName = `${s.firstName} ${s.lastName}`.trim();
        }

        // First remove this staff member from any other room/runner slot to prevent duplicate placement
        if (staffId) {
          for (const dept of state.departments) {
            for (const runner of dept.runnerSlots) {
              if (runner.staffId === staffId && runner.id !== targetId) {
                runner.staffId = null;
              }
            }
            for (const room of dept.rooms) {
              for (const slot of room.slots) {
                if (slot.staffId === staffId && slot.id !== targetId) {
                  slot.staffId = null;
                }
              }
            }
          }
        }

        if (targetType === 'runner_slot') {
          for (const dept of state.departments) {
            const runner = dept.runnerSlots.find(r => r.id === targetId);
            if (runner) {
              runner.staffId = staffId || null;
              locationName = `${dept.name} Runner (${runner.title})`;
              break;
            }
          }
        } else if (targetType === 'runner_dept') {
          for (const dept of state.departments) {
            if (dept.id === targetId) {
              let emptyRunner = dept.runnerSlots.find(r => !r.staffId);
              if (!emptyRunner) {
                emptyRunner = {
                  id: `runner_${dept.id}_${Date.now()}`,
                  title: `RUNNER ${dept.runnerSlots.length + 1}`,
                  staffId: staffId || null,
                  breakfastDone: false,
                  lunchDone: false
                };
                dept.runnerSlots.push(emptyRunner);
              } else {
                emptyRunner.staffId = staffId || null;
              }
              locationName = `${dept.name} Runner (${emptyRunner.title})`;
              break;
            }
          }
        } else if (targetType === 'room_slot') {
          for (const dept of state.departments) {
            for (const room of dept.rooms) {
              const slot = room.slots.find(s => s.id === targetId);
              if (slot) {
                slot.staffId = staffId || null;
                locationName = `${dept.name} Room ${room.name}`;
                break;
              }
            }
          }
        }

        saveBoardState(state);
        recordAuditLog({
          actionType: staffId ? 'STAFF_ASSIGNED' : 'STAFF_UNASSIGNED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: staffName,
          locationName,
          details: staffId ? `Assigned to ${locationName}` : `Cleared from ${locationName} to available staff`
        });

        return NextResponse.json({ success: true, state });
      }

      // 3. Move staff from one slot to another (drag and drop)
      case 'MOVE_STAFF': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }

        const { fromTargetType, fromId, toTargetType, toId, staffId } = payload;
        let staffName = 'Staff';
        let fromLocation = '';
        let toLocation = '';

        if (staffId) {
          const s = state.staff.find(st => st.id === staffId);
          if (s) staffName = `${s.firstName} ${s.lastName}`.trim();
        }

        // Clear source
        if (fromTargetType === 'runner_slot') {
          for (const dept of state.departments) {
            const r = dept.runnerSlots.find(slot => slot.id === fromId);
            if (r) {
              r.staffId = null;
              fromLocation = `${dept.name} Runner (${r.title})`;
            }
          }
        } else if (fromTargetType === 'room_slot') {
          for (const dept of state.departments) {
            for (const room of dept.rooms) {
              const slot = room.slots.find(s => s.id === fromId);
              if (slot) {
                slot.staffId = null;
                fromLocation = `${dept.name} Room ${room.name}`;
              }
            }
          }
        }

        // Set destination (if not moving to bullpen)
        if (toTargetType === 'runner_slot') {
          for (const dept of state.departments) {
            const r = dept.runnerSlots.find(slot => slot.id === toId);
            if (r) {
              r.staffId = staffId;
              toLocation = `${dept.name} Runner (${r.title})`;
            }
          }
        } else if (toTargetType === 'runner_dept') {
          for (const dept of state.departments) {
            if (dept.id === toId) {
              let emptyRunner = dept.runnerSlots.find(r => !r.staffId);
              if (!emptyRunner) {
                emptyRunner = {
                  id: `runner_${dept.id}_${Date.now()}`,
                  title: `RUNNER ${dept.runnerSlots.length + 1}`,
                  staffId: staffId,
                  breakfastDone: false,
                  lunchDone: false
                };
                dept.runnerSlots.push(emptyRunner);
              } else {
                emptyRunner.staffId = staffId;
              }
              toLocation = `${dept.name} Runner (${emptyRunner.title})`;
              break;
            }
          }
        } else if (toTargetType === 'room_slot') {
          for (const dept of state.departments) {
            for (const room of dept.rooms) {
              const slot = room.slots.find(s => s.id === toId);
              if (slot) {
                slot.staffId = staffId;
                toLocation = `${dept.name} Room ${room.name}`;
              }
            }
          }
        } else if (toTargetType === 'bullpen') {
          toLocation = 'Available Unassigned Staff';
        }

        saveBoardState(state);
        recordAuditLog({
          actionType: 'STAFF_MOVED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: staffName,
          locationName: toLocation,
          details: `Moved from ${fromLocation || 'Bullpen'} -> ${toLocation}`
        });

        return NextResponse.json({ success: true, state });
      }

      // 4. Update room or departure scratchpad notes
      case 'UPDATE_NOTES': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }

        const { targetType, targetId, notes } = payload;
        let locationName = '';

        if (targetType === 'room') {
          for (const dept of state.departments) {
            const room = dept.rooms.find(r => r.id === targetId);
            if (room) {
              room.notes = notes;
              locationName = `${dept.name} Room ${room.name}`;
              break;
            }
          }
        } else if (targetType === 'departure') {
          state.departureNotes = notes;
          locationName = 'Departure Scratchpad';
        } else if (targetType === 'lates') {
          state.latesNotes = notes;
          locationName = 'Lates Scratchpad';
        }

        saveBoardState(state);
        recordAuditLog({
          actionType: 'NOTE_UPDATED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          locationName,
          details: `Updated notes: "${notes.slice(0, 50)}${notes.length > 50 ? '...' : ''}"`
        });

        return NextResponse.json({ success: true, state });
      }

      // 5. Update Departure, Call Team, or Lates lists directly
      case 'UPDATE_LISTS': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
        }
        if (payload.departureList) state.departureList = payload.departureList;
        if (payload.latesList) state.latesList = payload.latesList;
        if (payload.callTeamList) state.callTeamList = payload.callTeamList;

        saveBoardState(state);
        recordAuditLog({
          actionType: payload.isReorder ? 'DEPARTURE_REORDERED' : payload.callTeamList ? 'CALL_TEAM_UPDATED' : 'DEPARTURE_UPDATED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          details: payload.details || 'Updated departure, call team, or late staff ordering'
        });

        return NextResponse.json({ success: true, state });
      }

      case 'UPDATE_CALL_TEAM': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
        }
        if (payload.callTeamList) state.callTeamList = payload.callTeamList;
        saveBoardState(state);
        recordAuditLog({
          actionType: 'CALL_TEAM_UPDATED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          details: payload.details || 'Updated Call Team assignments'
        });
        return NextResponse.json({ success: true, state });
      }

      // 6. Toggle Departure Strikethrough (Mark doc as departed/left)
      case 'TOGGLE_DEPARTURE_STRUCK': {
        const { id } = payload;
        const item = state.departureList.find(d => d.id === id);
        if (item) {
          item.departed = !item.departed;
          saveBoardState(state);
          recordAuditLog({
            actionType: 'DEPARTURE_STRUCK_TOGGLED',
            performedBy: currentUserName,
            userRole: currentUserRole,
            targetName: item.name,
            details: item.departed
              ? `Marked doctor ${item.name} as DEPARTED [Strikethrough]`
              : `Unmarked doctor ${item.name} departure status`
          });
          return NextResponse.json({ success: true, state });
        }
        return NextResponse.json({ error: 'Departure item not found' }, { status: 404 });
      }

      // 7. Add runner slot to department dynamically
      case 'ADD_RUNNER_SLOT': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }
        const { departmentId, title } = payload;
        const dept = state.departments.find(d => d.id === departmentId);
        if (dept) {
          const slotNumber = dept.runnerSlots.length + 1;
          const newSlot = {
            id: `runner_${dept.id}_${Date.now()}`,
            title: title || `RUNNER ${slotNumber}`,
            staffId: null,
            breakfastDone: false,
            lunchDone: false
          };
          dept.runnerSlots.push(newSlot);
          saveBoardState(state);
          recordAuditLog({
            actionType: 'RUNNER_SLOT_ADDED',
            performedBy: currentUserName,
            userRole: currentUserRole,
            locationName: dept.name,
            details: `Added new runner slot "${newSlot.title}" to ${dept.name}`
          });
          return NextResponse.json({ success: true, state });
        }
        return NextResponse.json({ error: 'Department not found' }, { status: 404 });
      }

      // 8. Remove runner slot from department
      case 'REMOVE_RUNNER_SLOT': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }
        const { departmentId, runnerSlotId } = payload;
        const dept = state.departments.find(d => d.id === departmentId);
        if (dept) {
          const idx = dept.runnerSlots.findIndex(r => r.id === runnerSlotId);
          if (idx !== -1) {
            const removed = dept.runnerSlots.splice(idx, 1)[0];
            saveBoardState(state);
            recordAuditLog({
              actionType: 'RUNNER_SLOT_REMOVED',
              performedBy: currentUserName,
              userRole: currentUserRole,
              locationName: dept.name,
              details: `Removed runner slot "${removed.title}" from ${dept.name}`
            });
            return NextResponse.json({ success: true, state });
          }
        }
        return NextResponse.json({ error: 'Runner slot not found' }, { status: 404 });
      }

      // 9. Save full state (Superuser only, e.g. after layout editor)
      case 'SAVE_LAYOUT': {
        if (currentUserRole !== 'superuser') {
          return NextResponse.json({ error: 'Superuser permission required to alter board layout.' }, { status: 403 });
        }
        if (payload.departments) {
          state.departments = payload.departments;
        }
        saveBoardState(state);
        recordAuditLog({
          actionType: 'LAYOUT_CHANGED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          details: 'Altered department and room layout structure'
        });
        return NextResponse.json({ success: true, state });
      }

      // 7. Reset to default photo whiteboard state (Superuser only)
      case 'RESET_TO_PHOTO_DEFAULT': {
        if (currentUserRole !== 'superuser') {
          return NextResponse.json({ error: 'Superuser permission required.' }, { status: 403 });
        }
        const initialStaff = state.staff.length > 0 ? state.staff : [];
        const freshBoard = getInitialBoardState(initialStaff);
        saveBoardState(freshBoard);
        recordAuditLog({
          actionType: 'LAYOUT_CHANGED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          details: 'Restored board layout and assignments to initial photo default'
        });
        return NextResponse.json({ success: true, state: freshBoard });
      }

      // 8. Add runner slot to department (Board Runner or Superuser)
      case 'ADD_RUNNER_SLOT': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }
        const { departmentId, title } = payload;
        const dept = state.departments.find(d => d.id === departmentId);
        if (!dept) {
          return NextResponse.json({ error: 'Department not found' }, { status: 404 });
        }

        const runnerIndex = dept.runnerSlots.length + 1;
        const newSlotTitle = title?.trim() || `Runner ${runnerIndex}`;
        const newRunner: RunnerSlot = {
          id: `runner_${dept.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: newSlotTitle,
          staffId: null,
          breakfastDone: false,
          lunchDone: false
        };

        dept.runnerSlots.push(newRunner);

        saveBoardState(state);
        recordAuditLog({
          actionType: 'LAYOUT_CHANGED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          locationName: dept.name,
          details: `Added new runner slot "${newSlotTitle}" to ${dept.name}`
        });

        return NextResponse.json({ success: true, state });
      }

      // 9. Remove runner slot from department (Board Runner or Superuser)
      case 'REMOVE_RUNNER_SLOT': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }
        const { departmentId, runnerSlotId } = payload;
        const dept = state.departments.find(d => d.id === departmentId);
        if (!dept) {
          return NextResponse.json({ error: 'Department not found' }, { status: 404 });
        }

        const slotIndex = dept.runnerSlots.findIndex(r => r.id === runnerSlotId);
        if (slotIndex === -1) {
          return NextResponse.json({ error: 'Runner slot not found' }, { status: 404 });
        }

        const removedSlot = dept.runnerSlots[slotIndex];
        let staffName = '';
        if (removedSlot.staffId) {
          const s = state.staff.find(st => st.id === removedSlot.staffId);
          if (s) staffName = `${s.firstName} ${s.lastName}`.trim();
        }

        dept.runnerSlots.splice(slotIndex, 1);

        saveBoardState(state);
        recordAuditLog({
          actionType: 'LAYOUT_CHANGED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          locationName: dept.name,
          details: `Removed runner slot "${removedSlot.title}" from ${dept.name}${staffName ? ` (Returned ${staffName} to bullpen)` : ''}`
        });

        return NextResponse.json({ success: true, state });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Error handling board action:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
