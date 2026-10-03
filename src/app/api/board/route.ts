import { NextRequest, NextResponse } from 'next/server';
import { loadBoardState, saveBoardState, recordAuditLog, getInitialBoardState, resetDailyBreaks, broadcastStateChange } from '@/lib/storage';
import { UserRole, RunnerSlot } from '@/types/whiteboard';
import { autoAssignBoardState } from '@/lib/autoAssign';
import { getHoustonDateString } from '@/lib/dateUtils';

export async function GET() {
  const state = await loadBoardState();
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload, user } = body;

    const state = await loadBoardState();
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
              if (runner.staffId) {
                state.bullpenBreaks = state.bullpenBreaks || {};
                state.bullpenBreaks[runner.staffId] = {
                  breakfastDone: runner.breakfastDone,
                  lunchDone: runner.lunchDone,
                  breakfastTime: runner.breakfastTime,
                  lunchTime: runner.lunchTime
                };
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
                if (slot.staffId) {
                  state.bullpenBreaks = state.bullpenBreaks || {};
                  state.bullpenBreaks[slot.staffId] = {
                    breakfastDone: slot.breakfastDone,
                    lunchDone: slot.lunchDone,
                    breakfastTime: slot.breakfastTime,
                    lunchTime: slot.lunchTime
                  };
                }
                break;
              }
            }
          }
        } else if (targetType === 'bullpen') {
          state.bullpenBreaks = state.bullpenBreaks || {};
          const existing = state.bullpenBreaks[targetId] || { breakfastDone: false, lunchDone: false };
          const s = state.staff.find(st => st.id === targetId);
          if (s) staffName = `${s.firstName} ${s.lastName}`.trim();
          locationName = 'Bullpen (Available Staff)';

          state.bullpenBreaks[targetId] = {
            ...existing,
            ...(breakType === 'breakfast'
              ? { breakfastDone: value, breakfastTime: value ? new Date().toISOString() : null }
              : { lunchDone: value, lunchTime: value ? new Date().toISOString() : null })
          };
        }

        await saveBoardState(state);
        await recordAuditLog({
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

        // When assigned to a room or runner, they cannot be in the bullpen!
        if (staffId) {
          state.bullpenStaffIds = (state.bullpenStaffIds || []).filter(id => id !== staffId);

          // Only clear from rooms if assigning to a room (runners can be duplicated in multiple locations)
          if (targetType !== 'runner_slot' && targetType !== 'runner_dept') {
            for (const dept of state.departments) {
              for (const room of dept.rooms) {
                for (const slot of room.slots) {
                  if (slot.staffId === staffId && slot.id !== targetId) {
                    slot.staffId = null;
                  }
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
              if (staffId && state.bullpenBreaks?.[staffId]) {
                runner.breakfastDone = Boolean(state.bullpenBreaks[staffId].breakfastDone);
                runner.lunchDone = Boolean(state.bullpenBreaks[staffId].lunchDone);
                runner.breakfastTime = state.bullpenBreaks[staffId].breakfastTime || null;
                runner.lunchTime = state.bullpenBreaks[staffId].lunchTime || null;
              }
              locationName = `${dept.name} Runner (${runner.title})`;
              break;
            }
          }
        } else if (targetType === 'runner_dept') {
          for (const dept of state.departments) {
            if (dept.id === targetId) {
              const alreadyRunnerHere = dept.runnerSlots.some(slot => slot.staffId === staffId);
              if (!alreadyRunnerHere) {
                const emptySlot = dept.runnerSlots.find(slot => !slot.staffId);
                if (emptySlot) {
                  emptySlot.staffId = staffId || null;
                  emptySlot.breakfastDone = (staffId && state.bullpenBreaks?.[staffId]?.breakfastDone) || false;
                  emptySlot.lunchDone = (staffId && state.bullpenBreaks?.[staffId]?.lunchDone) || false;
                  emptySlot.breakfastTime = (staffId && state.bullpenBreaks?.[staffId]?.breakfastTime) || null;
                  emptySlot.lunchTime = (staffId && state.bullpenBreaks?.[staffId]?.lunchTime) || null;
                  locationName = `${dept.name} Runner (${emptySlot.title})`;
                } else {
                  const newRunner = {
                    id: `runner_${dept.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    title: `Runner ${dept.runnerSlots.length + 1}`,
                    staffId: staffId || null,
                    breakfastDone: (staffId && state.bullpenBreaks?.[staffId]?.breakfastDone) || false,
                    lunchDone: (staffId && state.bullpenBreaks?.[staffId]?.lunchDone) || false,
                    breakfastTime: (staffId && state.bullpenBreaks?.[staffId]?.breakfastTime) || null,
                    lunchTime: (staffId && state.bullpenBreaks?.[staffId]?.lunchTime) || null
                  };
                  dept.runnerSlots.push(newRunner);
                  locationName = `${dept.name} Runner (${newRunner.title})`;
                }
              } else {
                locationName = `${dept.name} Runner (Already Assigned)`;
              }
              break;
            }
          }
        } else if (targetType === 'room_slot') {
          for (const dept of state.departments) {
            for (const room of dept.rooms) {
              const slot = room.slots.find(s => s.id === targetId);
              if (slot) {
                slot.staffId = staffId || null;
                if (staffId && state.bullpenBreaks?.[staffId]) {
                  slot.breakfastDone = Boolean(state.bullpenBreaks[staffId].breakfastDone);
                  slot.lunchDone = Boolean(state.bullpenBreaks[staffId].lunchDone);
                  slot.breakfastTime = state.bullpenBreaks[staffId].breakfastTime || null;
                  slot.lunchTime = state.bullpenBreaks[staffId].lunchTime || null;
                }
                locationName = `${dept.name} Room ${room.name}`;
                break;
              }
            }
          }
        }

        await saveBoardState(state);
        await recordAuditLog({
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

        state.bullpenStaffIds = state.bullpenStaffIds || [];

        if (staffId) {
          const s = state.staff.find(st => st.id === staffId);
          if (s) staffName = `${s.firstName} ${s.lastName}`.trim();
        }

        // Clear source & preserve source break status if available
        // Note: runner magnets can be duplicated across departments, but moving to room/bullpen/unassigned clears the source!
        const isTargetRunner = toTargetType === 'runner_dept' || toTargetType === 'runner_slot';

        if (fromTargetType === 'bullpen') {
          state.bullpenStaffIds = state.bullpenStaffIds.filter(id => id !== staffId);
          fromLocation = 'Bullpen';
        } else if (fromTargetType === 'runner_slot') {
          for (const dept of state.departments) {
            const idx = dept.runnerSlots.findIndex(slot => slot.id === fromId);
            if (idx !== -1) {
              const r = dept.runnerSlots[idx];
              if (staffId) {
                state.bullpenBreaks = state.bullpenBreaks || {};
                state.bullpenBreaks[staffId] = {
                  breakfastDone: r.breakfastDone,
                  lunchDone: r.lunchDone,
                  breakfastTime: r.breakfastTime,
                  lunchTime: r.lunchTime
                };
              }
              if (!isTargetRunner) {
                dept.runnerSlots.splice(idx, 1);
              }
              fromLocation = `${dept.name} Runner (${r.title})`;
              break;
            }
          }
        } else if (fromTargetType === 'room_slot') {
          for (const dept of state.departments) {
            for (const room of dept.rooms) {
              const slot = room.slots.find(s => s.id === fromId);
              if (slot) {
                if (staffId) {
                  state.bullpenBreaks = state.bullpenBreaks || {};
                  state.bullpenBreaks[staffId] = {
                    breakfastDone: slot.breakfastDone,
                    lunchDone: slot.lunchDone,
                    breakfastTime: slot.breakfastTime,
                    lunchTime: slot.lunchTime
                  };
                }
                if (!isTargetRunner) {
                  slot.staffId = null;
                }
                fromLocation = `${dept.name} Room ${room.name}`;
              }
            }
          }
        }

        // Handle destinations
        if (toTargetType === 'bullpen') {
          if (staffId) {
            state.bullpenStaffIds = (state.bullpenStaffIds || []).filter(id => id !== staffId);
            state.bullpenStaffIds.push(staffId);

            // Runners cannot be in the bullpen: remove this staff from all runner slots across all departments
            for (const dept of state.departments) {
              dept.runnerSlots = (dept.runnerSlots || []).filter(r => r.staffId !== staffId);
              dept.runnerSlots.forEach((r, idx) => {
                if (!r.title || r.title.match(/^RUNNER\s*\d*$/i)) {
                  r.title = `Runner ${idx + 1}`;
                }
              });
            }

            // Also clear room slots if moved to bullpen
            for (const dept of state.departments) {
              for (const room of dept.rooms) {
                for (const slot of room.slots) {
                  if (slot.staffId === staffId) slot.staffId = null;
                }
              }
            }
          }
          toLocation = 'Bullpen (Available Staff)';
        } else if (toTargetType === 'unassigned' || toTargetType === 'infrequent' || toTargetType === 'md' || toTargetType === 'crna') {
          if (staffId) {
            state.bullpenStaffIds = state.bullpenStaffIds.filter(id => id !== staffId);

            // Also remove from all runner slots across all departments
            for (const dept of state.departments) {
              dept.runnerSlots = (dept.runnerSlots || []).filter(r => r.staffId !== staffId);
              dept.runnerSlots.forEach((r, idx) => {
                if (!r.title || r.title.match(/^RUNNER\s*\d*$/i)) {
                  r.title = `Runner ${idx + 1}`;
                }
              });
            }

            // Clear room slots
            for (const dept of state.departments) {
              for (const room of dept.rooms) {
                for (const slot of room.slots) {
                  if (slot.staffId === staffId) slot.staffId = null;
                }
              }
            }
          }

          state.infrequentStaffIds = state.infrequentStaffIds || [];
          state.infrequentStaffKeys = state.infrequentStaffKeys || [];

          const targetMember = state.staff.find(st => st.id === staffId);
          const targetGroup = payload.targetGroup || (toTargetType === 'infrequent' ? 'Infrequent' : (toTargetType === 'md' ? 'MD' : (toTargetType === 'crna' ? 'CRNA' : undefined)));

          if (targetMember && targetGroup) {
            const qKey = (targetMember.qgendaAbbr || '').toLowerCase();
            const lastKey = (targetMember.lastName || '').toLowerCase();

            if (targetGroup === 'Infrequent') {
              targetMember.isInfrequent = true;
              if (!state.infrequentStaffIds.includes(targetMember.id)) {
                state.infrequentStaffIds.push(targetMember.id);
              }
              if (qKey && !state.infrequentStaffKeys.includes(qKey)) {
                state.infrequentStaffKeys.push(qKey);
              }
              if (lastKey && !state.infrequentStaffKeys.includes(lastKey)) {
                state.infrequentStaffKeys.push(lastKey);
              }
              toLocation = 'Infrequent Staff Group';
            } else if (targetGroup === 'MD' || targetGroup === 'CRNA') {
              targetMember.isInfrequent = false;
              state.infrequentStaffIds = state.infrequentStaffIds.filter(id => id !== targetMember.id);
              if (qKey) state.infrequentStaffKeys = state.infrequentStaffKeys.filter(k => k !== qKey);
              if (lastKey) state.infrequentStaffKeys = state.infrequentStaffKeys.filter(k => k !== lastKey);
              toLocation = `${targetGroup} Staff Group`;
            }
          } else {
            toLocation = 'Available Unassigned Staff';
          }
        } else if (toTargetType === 'runner_slot') {
          // Runners cannot be in the bullpen!
          if (staffId) {
            state.bullpenStaffIds = state.bullpenStaffIds.filter(id => id !== staffId);
          }
          for (const dept of state.departments) {
            const r = dept.runnerSlots.find(slot => slot.id === toId);
            if (r) {
              r.staffId = staffId;
              if (staffId && state.bullpenBreaks?.[staffId]) {
                r.breakfastDone = Boolean(state.bullpenBreaks[staffId].breakfastDone);
                r.lunchDone = Boolean(state.bullpenBreaks[staffId].lunchDone);
                r.breakfastTime = state.bullpenBreaks[staffId].breakfastTime || null;
                r.lunchTime = state.bullpenBreaks[staffId].lunchTime || null;
              }
              toLocation = `${dept.name} Runner (${r.title})`;
            }
          }
        } else if (toTargetType === 'runner_dept') {
          // Runners cannot be in the bullpen!
          if (staffId) {
            state.bullpenStaffIds = state.bullpenStaffIds.filter(id => id !== staffId);
          }
          for (const dept of state.departments) {
            if (dept.id === toId) {
              const alreadyRunnerHere = dept.runnerSlots.some(slot => slot.staffId === staffId);
              if (!alreadyRunnerHere) {
                const emptySlot = dept.runnerSlots.find(slot => !slot.staffId);
                if (emptySlot) {
                  emptySlot.staffId = staffId;
                  emptySlot.breakfastDone = (staffId && state.bullpenBreaks?.[staffId]?.breakfastDone) || false;
                  emptySlot.lunchDone = (staffId && state.bullpenBreaks?.[staffId]?.lunchDone) || false;
                  emptySlot.breakfastTime = (staffId && state.bullpenBreaks?.[staffId]?.breakfastTime) || null;
                  emptySlot.lunchTime = (staffId && state.bullpenBreaks?.[staffId]?.lunchTime) || null;
                  toLocation = `${dept.name} Runner (${emptySlot.title})`;
                } else {
                  const newRunner = {
                    id: `runner_${dept.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    title: `Runner ${dept.runnerSlots.length + 1}`,
                    staffId: staffId,
                    breakfastDone: (staffId && state.bullpenBreaks?.[staffId]?.breakfastDone) || false,
                    lunchDone: (staffId && state.bullpenBreaks?.[staffId]?.lunchDone) || false,
                    breakfastTime: (staffId && state.bullpenBreaks?.[staffId]?.breakfastTime) || null,
                    lunchTime: (staffId && state.bullpenBreaks?.[staffId]?.lunchTime) || null
                  };
                  dept.runnerSlots.push(newRunner);
                  toLocation = `${dept.name} Runner (${newRunner.title})`;
                }
              } else {
                toLocation = `${dept.name} Runner (Already Assigned)`;
              }
              break;
            }
          }
        } else if (toTargetType === 'room_slot') {
          if (staffId) {
            state.bullpenStaffIds = state.bullpenStaffIds.filter(id => id !== staffId);
          }
          for (const dept of state.departments) {
            for (const room of dept.rooms) {
              const slot = room.slots.find(s => s.id === toId);
              if (slot) {
                slot.staffId = staffId;
                if (staffId && state.bullpenBreaks?.[staffId]) {
                  slot.breakfastDone = Boolean(state.bullpenBreaks[staffId].breakfastDone);
                  slot.lunchDone = Boolean(state.bullpenBreaks[staffId].lunchDone);
                  slot.breakfastTime = state.bullpenBreaks[staffId].breakfastTime || null;
                  slot.lunchTime = state.bullpenBreaks[staffId].lunchTime || null;
                }
                toLocation = `${dept.name} Room ${room.name}`;
              }
            }
          }
        }

        await saveBoardState(state);
        await recordAuditLog({
          actionType: toTargetType === 'bullpen' ? 'BULLPEN_UPDATED' : (toTargetType === 'unassigned' ? 'STAFF_UNASSIGNED' : 'STAFF_MOVED'),
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: staffName,
          locationName: toLocation,
          details: `Moved from ${fromLocation || 'Staff Pool'} -> ${toLocation}`
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

        await saveBoardState(state);
        await recordAuditLog({
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

        await saveBoardState(state);
        await recordAuditLog({
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
        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'CALL_TEAM_UPDATED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          details: payload.details || 'Updated Call Team assignments'
        });
        return NextResponse.json({ success: true, state });
      }

      // 5c. Auto-Assign magnets to department rooms and runner slots
      case 'AUTO_ASSIGN_ROOMS': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }

        const targetDate = body.date || payload?.date || getHoustonDateString();
        const result = autoAssignBoardState(state);
        state.departments = result.departments;
        state.bullpenStaffIds = result.bullpenStaffIds;

        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'STAFF_ASSIGNED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          details: `Auto-assigned ${result.assignedCount} staff magnets to department rooms and runner slots for ${targetDate}`
        });

        return NextResponse.json({
          success: true,
          state,
          assignedCount: result.assignedCount,
          message: `Auto-assigned ${result.assignedCount} staff magnets to department rooms and runner slots`
        });
      }

      // 5c2. Clean Whiteboard (Reset all room magnets and runner slots for the new day)
      case 'CLEAR_WHITEBOARD': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }

        // Reset all runner slots and room slots cleanly
        state.departments.forEach(dept => {
          const defaultRunnerSlots = (dept.id.includes('main_or') || dept.id.includes('west_pav'))
            ? 2
            : (dept.id.includes('9th') || dept.id.includes('ivf'))
              ? 0
              : 1;
          dept.runnerSlots = dept.runnerSlots.slice(0, defaultRunnerSlots);
          dept.runnerSlots.forEach(slot => {
            slot.staffId = null;
            slot.breakfastDone = false;
            slot.lunchDone = false;
          });

          dept.rooms.forEach(room => {
            room.slots = [{
              id: `${dept.id}_room_${room.name}_slot_0`,
              roleType: 'primary',
              staffId: null,
              breakfastDone: false,
              lunchDone: false,
              notes: ''
            }];
          });
        });

        // Clear bullpen and break records
        state.bullpenStaffIds = [];
        state.bullpenBreaks = {};

        // Reset departure struck flags for fresh day
        if (state.departureList) {
          state.departureList.forEach(d => {
            d.departed = false;
          });
        }

        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'STAFF_UNASSIGNED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          details: 'Cleaned Whiteboard for new operating day (Cleared all room magnets, runner slots, and bullpen)'
        });

        broadcastStateChange();
        return NextResponse.json({
          success: true,
          state,
          message: 'Whiteboard cleared successfully for the new day'
        });
      }

      // 5d. Save Unique Schedules (Configurable Departure & Late Rules)
      case 'SAVE_UNIQUE_SCHEDULES': {
        if (currentUserRole !== 'superuser' && currentUserRole !== 'board_runner') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }
        const rules = payload.uniqueSchedules || [];
        state.uniqueSchedules = rules;
        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'UNIQUE_SCHEDULE_UPDATED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          details: `Updated unique schedule rules (${rules.length} configured rules)`
        });
        return NextResponse.json({ success: true, state });
      }

      // 6. Toggle Departure Strikethrough (Mark doc as departed/left)
      case 'TOGGLE_DEPARTURE_STRUCK': {
        const { id } = payload;
        const item = state.departureList.find(d => d.id === id);
        if (item) {
          item.departed = !item.departed;
          await saveBoardState(state);
          await recordAuditLog({
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

      // 6b. Update staff scheduled shift / late departure time
      case 'UPDATE_STAFF_SHIFT': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }
        const { staffId, shift, lastName, credentials } = payload;
        let s = state.staff.find(st => st.id === staffId);
        if (!s && lastName) {
          s = state.staff.find(st => st.lastName.toUpperCase() === lastName.toUpperCase());
        }

        const oldShift = s?.shift || '';
        const targetLastName = s ? s.lastName : (lastName || 'Staff');
        const targetCreds = s ? s.credentials : (credentials || 'MD');

        if (s) {
          s.shift = shift;
        } else {
          s = {
            id: staffId || `staff_${Date.now()}`,
            firstName: '',
            lastName: targetLastName.toUpperCase(),
            credentials: targetCreds,
            phone: '(555) 000-0000',
            shift,
            facility: 'MHMC',
            active: true
          };
          state.staff.push(s);
        }

        // Classify shift: standard late (>= 3p) vs atypical/special (e.g. 2p, 1p, Special) vs call shift
        const upperShift = (shift || '').toUpperCase().trim();
        const isCallShift = /CALL|C1|C2|C3|CV|OB/i.test(upperShift);
        const standardLateKeys = ['3P', '4P', '5P', '7P', '8P', '7P-7A', '11A-11P'];
        const isStandardLate = !isCallShift && standardLateKeys.some(k => upperShift === k || upperShift.startsWith(k));
        const isAtypicalTime = !isCallShift && (
          upperShift === 'SPECIAL' ||
          /^[0-9]{1,2}(?::[0-9]{2})?\s*(?:A|P|AM|PM)?$/i.test(upperShift)
        ) && !isStandardLate;
        const effectiveTimeEstimate = isAtypicalTime ? (upperShift === 'SPECIAL' ? '2p' : shift) : undefined;

        // Synchronize Departure List & Call Team
        let depItem = state.departureList.find(d =>
          d.id === staffId ||
          d.name.toUpperCase() === targetLastName.toUpperCase() ||
          (s?.qgendaAbbr && d.qgendaAbbr?.toUpperCase() === s.qgendaAbbr.toUpperCase())
        );

        state.callTeamList = state.callTeamList || [];

        if (targetCreds === 'MD') {
          if (isCallShift) {
            // Assign doctor to Call Team matching role
            const isCV = upperShift.includes('CV');
            const isOB = upperShift.includes('OB');
            const isCall1 = upperShift.includes('CALL 1') || upperShift.includes('C1') || (!isCV && !isOB && !upperShift.includes('2') && !upperShift.includes('3'));
            const isCall2 = upperShift.includes('CALL 2') || upperShift.includes('C2');
            const isCall3 = upperShift.includes('CALL 3') || upperShift.includes('C3');

            const assignCallRole = (roleName: string) => {
              let existing = state.callTeamList.find(c => c.role.toUpperCase() === roleName.toUpperCase());
              if (existing) {
                existing.doctorName = targetLastName.toUpperCase();
                existing.qgendaAbbr = s?.qgendaAbbr;
              } else {
                state.callTeamList.push({
                  id: `call_${roleName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
                  role: roleName,
                  doctorName: targetLastName.toUpperCase(),
                  orderIndex: state.callTeamList.length,
                  qgendaAbbr: s?.qgendaAbbr
                });
              }
            };

            if (isCV) assignCallRole('CV');
            if (isOB) assignCallRole('OB');
            if (isCall1) assignCallRole('Call 1');
            if (isCall2) assignCallRole('Call 2');
            if (isCall3) assignCallRole('Call 3');

            // Maintain exact Call Team Order: CV, Call 3, Call 2, Call 1, OB
            const CALL_ORDER: Record<string, number> = { 'CV': 1, 'CALL 3': 2, 'CALL 2': 3, 'CALL 1': 4, 'OB': 5 };
            state.callTeamList.sort((a, b) => (CALL_ORDER[a.role.toUpperCase()] || 99) - (CALL_ORDER[b.role.toUpperCase()] || 99));

            // Call doctors must NOT exist in departure list
            if (depItem) {
              state.departureList = state.departureList.filter(d => d.id !== depItem!.id);
            }
          } else {
            // If moved away from Call shift to regular Day or Late, clear their name from callTeamList
            state.callTeamList.forEach(c => {
              if (c.doctorName?.toUpperCase() === targetLastName.toUpperCase()) {
                c.doctorName = '';
              }
            });

            if (isStandardLate) {
              // Standard late doctors (3p, 4p, 5p, etc.) must not exist in departure list
              if (depItem) {
                state.departureList = state.departureList.filter(d => d.id !== depItem!.id);
              }
            } else if (isAtypicalTime) {
              // MD with atypical departure time (e.g. 2p) goes to "Special" section between post-call and non-call
              if (depItem) {
                depItem.category = 'special';
                depItem.timeEstimate = effectiveTimeEstimate;
              } else {
                state.departureList.push({
                  id: `dep_${Date.now()}`,
                  name: targetLastName.toUpperCase(),
                  orderIndex: state.departureList.length,
                  category: 'special',
                  timeEstimate: effectiveTimeEstimate,
                  qgendaAbbr: s?.qgendaAbbr
                });
              }
            } else {
              // Regular non-call or post-call doctor
              if (depItem) {
                if (depItem.category === 'special') depItem.category = 'non_call';
                depItem.timeEstimate = shift;
              } else {
                state.departureList.push({
                  id: `dep_${Date.now()}`,
                  name: targetLastName.toUpperCase(),
                  orderIndex: state.departureList.length,
                  category: 'non_call',
                  timeEstimate: shift,
                  qgendaAbbr: s?.qgendaAbbr
                });
              }
            }
          }
        } else {
          // CRNAs belong in Late list, not in Departure list
          if (depItem) {
            state.departureList = state.departureList.filter(d => d.id !== depItem!.id);
          }
        }

        // Re-index departure list: Post-Call -> Special -> Non-Call
        const postList = state.departureList.filter(d => d.category === 'post_call');
        const specList = state.departureList.filter(d => d.category === 'special');
        const nonList = state.departureList.filter(d => d.category === 'non_call');
        state.departureList = [
          ...postList.map((d, i) => ({ ...d, orderIndex: i })),
          ...specList.map((d, i) => ({ ...d, orderIndex: postList.length + i })),
          ...nonList.map((d, i) => ({ ...d, orderIndex: postList.length + specList.length + i }))
        ];

        // Synchronize Late List
        const lateIdx = state.latesList.findIndex(l =>
          l.id === staffId ||
          l.name.toUpperCase() === targetLastName.toUpperCase()
        );

        const shouldBeInLates = !isCallShift && (isStandardLate || isAtypicalTime);
        const lateCategory = isStandardLate ? shift.toLowerCase() : (isAtypicalTime ? 'special' : '');

        if (lateIdx !== -1) {
          if (shouldBeInLates) {
            state.latesList[lateIdx].timeCategory = lateCategory;
            state.latesList[lateIdx].timeEstimate = effectiveTimeEstimate;
          } else {
            state.latesList.splice(lateIdx, 1);
          }
        } else if (shouldBeInLates) {
          state.latesList.push({
            id: `late_${s.id}_${Date.now()}`,
            name: targetLastName.toUpperCase(),
            timeCategory: lateCategory,
            role: targetCreds === 'MD' ? 'MD' : 'CRNA',
            timeEstimate: effectiveTimeEstimate,
            orderIndex: state.latesList.length
          });
        }

        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'STAFF_UPDATED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: `${s.firstName} ${s.lastName}`.trim(),
          details: `Updated scheduled shift from "${oldShift}" to "${shift}"`
        });

        return NextResponse.json({ success: true, state });
      }

      // 6c. Set staff infrequent status (remembers infrequent MD/CRNA grouping)
      case 'SET_STAFF_INFREQUENT': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }
        const { staffId, isInfrequent } = payload;
        const s = state.staff.find(st => st.id === staffId);
        if (!s) {
          return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
        }

        s.isInfrequent = Boolean(isInfrequent);

        state.infrequentStaffIds = state.infrequentStaffIds || [];
        state.infrequentStaffKeys = state.infrequentStaffKeys || [];

        const staffName = `${s.firstName} ${s.lastName}`.trim();
        const qKey = (s.qgendaAbbr || '').toLowerCase();
        const lastKey = (s.lastName || '').toLowerCase();

        if (s.isInfrequent) {
          if (!state.infrequentStaffIds.includes(s.id)) {
            state.infrequentStaffIds.push(s.id);
          }
          if (qKey && !state.infrequentStaffKeys.includes(qKey)) {
            state.infrequentStaffKeys.push(qKey);
          }
          if (lastKey && !state.infrequentStaffKeys.includes(lastKey)) {
            state.infrequentStaffKeys.push(lastKey);
          }
        } else {
          state.infrequentStaffIds = state.infrequentStaffIds.filter(id => id !== s.id);
          if (qKey) {
            state.infrequentStaffKeys = state.infrequentStaffKeys.filter(k => k !== qKey);
          }
          if (lastKey) {
            state.infrequentStaffKeys = state.infrequentStaffKeys.filter(k => k !== lastKey);
          }
        }

        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'STAFF_UPDATED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: staffName,
          details: s.isInfrequent
            ? `Marked ${staffName} as Infrequent / PRN staff`
            : `Moved ${staffName} to regular ${s.credentials === 'MD' ? 'MD' : 'CRNA'} staff group`
        });

        return NextResponse.json({ success: true, state });
      }

      // 6c-2. Set staff display name (custom magnet name on whiteboard)
      case 'SET_STAFF_DISPLAY_NAME': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }
        const { staffId, displayName } = payload;
        const s = state.staff.find(st => st.id === staffId);
        if (!s) {
          return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
        }

        const oldName = s.displayName || `${s.lastName.toUpperCase()} ${s.firstName ? s.firstName[0] + '.' : ''}`.trim();
        s.displayName = displayName?.trim() || undefined;

        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'STAFF_UPDATED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: `${s.firstName} ${s.lastName}`.trim(),
          details: `Updated magnet display name from "${oldName}" to "${s.displayName || 'Default'}"`
        });

        return NextResponse.json({ success: true, state });
      }

      // 6d. Set Relief Assignment (Red Box)
      case 'SET_RELIEF': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }
        const { targetType, targetId, reliefStaffId, reliefTime, notes } = payload;
        let targetLocation = '';
        let outgoingStaffName = '';
        let incomingStaffName = '';

        const incomingStaff = state.staff.find(s => s.id === reliefStaffId);
        if (incomingStaff) incomingStaffName = `${incomingStaff.lastName} (${incomingStaff.credentials})`;

        if (targetType === 'runner_slot') {
          return NextResponse.json({ error: 'Runners do not support relief assignments.' }, { status: 400 });
        }

        // room_slot
        for (const dept of state.departments) {
            for (const room of dept.rooms) {
              const slot = room.slots.find(s => s.id === targetId);
              if (slot) {
                slot.relief = {
                  staffId: reliefStaffId,
                  time: reliefTime || '',
                  notes: notes || ''
                };
                const outgoing = state.staff.find(s => s.id === slot.staffId);
                if (outgoing) outgoingStaffName = `${outgoing.lastName} (${outgoing.credentials})`;
                targetLocation = `${dept.name} Room ${room.name}`;
                break;
              }
            }
          }

        await saveBoardState(state);
        const isSelfRelief = outgoingStaffName && incomingStaffName && outgoingStaffName === incomingStaffName;
        await recordAuditLog({
          actionType: 'STAFF_ASSIGNED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: incomingStaffName,
          locationName: targetLocation,
          details: isSelfRelief
            ? `${incomingStaffName} designated as relieving themselves in ${targetLocation}`
            : `Assigned relief: ${incomingStaffName} relieving ${outgoingStaffName || 'current staff'} in ${targetLocation}`
        });

        return NextResponse.json({ success: true, state });
      }

      // 6e. Remove Relief Assignment
      case 'REMOVE_RELIEF': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }
        const { targetType, targetId } = payload;
        let targetLocation = '';

        if (targetType === 'runner_slot') {
          for (const dept of state.departments) {
            const runner = dept.runnerSlots.find(r => r.id === targetId);
            if (runner) {
              runner.relief = null;
              targetLocation = `${dept.name} Runner (${runner.title})`;
              break;
            }
          }
        } else {
          for (const dept of state.departments) {
            for (const room of dept.rooms) {
              const slot = room.slots.find(s => s.id === targetId);
              if (slot) {
                slot.relief = null;
                targetLocation = `${dept.name} Room ${room.name}`;
                break;
              }
            }
          }
        }

        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'STAFF_UNASSIGNED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: 'Relief Assignment',
          locationName: targetLocation,
          details: `Removed relief assignment for ${targetLocation}`
        });

        return NextResponse.json({ success: true, state });
      }

      // 6f-1. Complete All Relief Assignments (Suite-Wide Handoff)
      case 'COMPLETE_ALL_RELIEFS': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }

        const completedHandoffs: Array<{ location: string; outgoing: string; incoming: string }> = [];
        const incomingStaffIds = new Set<string>();

        // Collect all incoming relief staff IDs
        for (const dept of state.departments) {
          for (const runner of dept.runnerSlots) {
            if (runner.relief?.staffId) {
              incomingStaffIds.add(runner.relief.staffId);
            }
          }
          for (const room of dept.rooms) {
            for (const slot of room.slots) {
              if (slot.relief?.staffId) {
                incomingStaffIds.add(slot.relief.staffId);
              }
            }
          }
        }

        if (incomingStaffIds.size === 0) {
          return NextResponse.json({ success: true, state, count: 0, message: 'No relief assignments to complete' });
        }

        // Remove incoming providers from bullpen so they aren't duplicated
        state.bullpenStaffIds = (state.bullpenStaffIds || []).filter(id => !incomingStaffIds.has(id));

        // Execute runner slot handoffs
        for (const dept of state.departments) {
          for (const runner of dept.runnerSlots) {
            if (runner.relief?.staffId) {
              const outgoingId = runner.staffId;
              const incomingId = runner.relief.staffId;

              const outgoing = state.staff.find(s => s.id === outgoingId);
              const incoming = state.staff.find(s => s.id === incomingId);
              const outName = outgoing ? `${outgoing.lastName} (${outgoing.credentials})` : 'Unassigned';
              const inName = incoming ? `${incoming.lastName} (${incoming.credentials})` : 'Staff';

              completedHandoffs.push({
                location: `${dept.name} Runner (${runner.title})`,
                outgoing: outName,
                incoming: inName
              });

              runner.staffId = incomingId;
              runner.relief = null;
            }
          }
        }

        // Execute room slot handoffs
        for (const dept of state.departments) {
          for (const room of dept.rooms) {
            for (const slot of room.slots) {
              if (slot.relief?.staffId) {
                const outgoingId = slot.staffId;
                const incomingId = slot.relief.staffId;

                const outgoing = state.staff.find(s => s.id === outgoingId);
                const incoming = state.staff.find(s => s.id === incomingId);
                const outName = outgoing ? `${outgoing.lastName} (${outgoing.credentials})` : 'Unassigned';
                const inName = incoming ? `${incoming.lastName} (${incoming.credentials})` : 'Staff';

                completedHandoffs.push({
                  location: `${dept.name} Rm ${room.name}`,
                  outgoing: outName,
                  incoming: inName
                });

                slot.staffId = incomingId;
                slot.relief = null;
              }
            }
          }
        }

        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'STAFF_MOVED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: `${completedHandoffs.length} Relief Provider(s)`,
          locationName: 'Suite-Wide Relief',
          details: `Completed all ${completedHandoffs.length} scheduled relief handoffs: ${completedHandoffs.map(h => `${h.location}: ${h.incoming} relieved ${h.outgoing}`).join('; ')}`
        });

        return NextResponse.json({
          success: true,
          state,
          count: completedHandoffs.length,
          completedHandoffs
        });
      }

      // 6f. Execute Relief Handoff (Swap relief to active slot, outgoing departs)
      case 'EXECUTE_RELIEF_HANDOFF': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }
        const { targetType, targetId } = payload;
        let targetLocation = '';
        let outgoingStaffName = '';
        let incomingStaffName = '';

        if (targetType === 'runner_slot') {
          for (const dept of state.departments) {
            const runner = dept.runnerSlots.find(r => r.id === targetId);
            if (runner && runner.relief) {
              const outgoingId = runner.staffId;
              const incomingId = runner.relief.staffId;

              const outgoing = state.staff.find(s => s.id === outgoingId);
              const incoming = state.staff.find(s => s.id === incomingId);
              if (outgoing) outgoingStaffName = `${outgoing.lastName} (${outgoing.credentials})`;
              if (incoming) incomingStaffName = `${incoming.lastName} (${incoming.credentials})`;

              // Remove incomingId from any other room/slot/bullpen
              state.bullpenStaffIds = (state.bullpenStaffIds || []).filter(id => id !== incomingId);
              for (const d of state.departments) {
                for (const r of d.runnerSlots) {
                  if (r.id !== runner.id && r.staffId === incomingId) r.staffId = null;
                }
                for (const rm of d.rooms) {
                  for (const sl of rm.slots) {
                    if (sl.staffId === incomingId) sl.staffId = null;
                  }
                }
              }

              // Takeover
              runner.staffId = incomingId;
              runner.relief = null;
              targetLocation = `${dept.name} Runner (${runner.title})`;
              break;
            }
          }
        } else {
          // room_slot
          for (const dept of state.departments) {
            for (const room of dept.rooms) {
              const slot = room.slots.find(s => s.id === targetId);
              if (slot && slot.relief) {
                const outgoingId = slot.staffId;
                const incomingId = slot.relief.staffId;

                const outgoing = state.staff.find(s => s.id === outgoingId);
                const incoming = state.staff.find(s => s.id === incomingId);
                if (outgoing) outgoingStaffName = `${outgoing.lastName} (${outgoing.credentials})`;
                if (incoming) incomingStaffName = `${incoming.lastName} (${incoming.credentials})`;

                // Remove incomingId from any other room/slot/bullpen
                state.bullpenStaffIds = (state.bullpenStaffIds || []).filter(id => id !== incomingId);
                for (const d of state.departments) {
                  for (const r of d.runnerSlots) {
                    if (r.staffId === incomingId) r.staffId = null;
                  }
                  for (const rm of d.rooms) {
                    for (const sl of rm.slots) {
                      if (sl.id !== slot.id && sl.staffId === incomingId) sl.staffId = null;
                    }
                  }
                }

                // Takeover
                slot.staffId = incomingId;
                slot.relief = null;
                targetLocation = `${dept.name} Room ${room.name}`;
                break;
              }
            }
          }
        }

        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'STAFF_MOVED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: incomingStaffName,
          locationName: targetLocation,
          details: `Handoff completed in ${targetLocation}: ${incomingStaffName} took over from ${outgoingStaffName}`
        });

        return NextResponse.json({ success: true, state });
      }

      // 6g. Manual or testing trigger for 1:00 AM break reset
      case 'RESET_DAILY_BREAKS': {
        const wasModified = resetDailyBreaks(state);
        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'BREAKFAST_TOGGLED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          details: 'Daily break reset: Cleared breakfast and lunch breaks for all staff'
        });
        return NextResponse.json({ success: true, state, wasModified });
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
            title: title?.trim() ? title.trim().replace(/^RUNNER(\s+\d+)?$/i, (m: string, n?: string) => `Runner${n || ''}`) : `Runner ${slotNumber}`,
            staffId: null,
            breakfastDone: false,
            lunchDone: false
          };
          dept.runnerSlots.push(newSlot);
          await saveBoardState(state);
          await recordAuditLog({
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
            await saveBoardState(state);
            await recordAuditLog({
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
        await saveBoardState(state);
        await recordAuditLog({
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
        await saveBoardState(freshBoard);
        await recordAuditLog({
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

        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'LAYOUT_CHANGED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          locationName: dept.name,
          details: `Added new runner slot "${newSlotTitle}" to ${dept.name}`
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
