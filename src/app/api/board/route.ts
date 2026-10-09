import { NextRequest, NextResponse } from 'next/server';
import { loadBoardState, saveBoardState, recordAuditLog, loadAuditLog, getInitialBoardState, resetDailyBreaks, broadcastStateChange } from '@/lib/storage';
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
    const currentUserRole: UserRole = user?.role || 'view_only';
    const currentUserName = user?.displayName || 'Anonymous Staff';

    if (currentUserRole === 'view_only') {
      return NextResponse.json({ error: 'View only access. Please log in to make changes.' }, { status: 403 });
    }

    if (currentUserRole === 'basic_user' && action !== 'TOGGLE_BREAK' && action !== 'SET_STAFF_STUDENT' && action !== 'REVERT_ACTION') {
      return NextResponse.json({ error: 'Permission denied. Board runner or admin access required.' }, { status: 403 });
    }

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
                // Sync break status across other runner & room slots for this staff member
                for (const otherDept of state.departments) {
                  for (const r of otherDept.runnerSlots || []) {
                    if (r.staffId === runner.staffId) {
                      r.breakfastDone = runner.breakfastDone;
                      r.lunchDone = runner.lunchDone;
                      r.breakfastTime = runner.breakfastTime;
                      r.lunchTime = runner.lunchTime;
                    }
                  }
                  for (const rm of otherDept.rooms || []) {
                    for (const s of rm.slots || []) {
                      if (s.staffId === runner.staffId) {
                        s.breakfastDone = runner.breakfastDone;
                        s.lunchDone = runner.lunchDone;
                        s.breakfastTime = runner.breakfastTime;
                        s.lunchTime = runner.lunchTime;
                      }
                    }
                  }
                }
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
                  // Sync break status across other runner & room slots for this staff member
                  for (const otherDept of state.departments) {
                    for (const r of otherDept.runnerSlots || []) {
                      if (r.staffId === slot.staffId) {
                        r.breakfastDone = slot.breakfastDone;
                        r.lunchDone = slot.lunchDone;
                        r.breakfastTime = slot.breakfastTime;
                        r.lunchTime = slot.lunchTime;
                      }
                    }
                    for (const rm of otherDept.rooms || []) {
                      for (const s of rm.slots || []) {
                        if (s.staffId === slot.staffId) {
                          s.breakfastDone = slot.breakfastDone;
                          s.lunchDone = slot.lunchDone;
                          s.breakfastTime = slot.breakfastTime;
                          s.lunchTime = slot.lunchTime;
                        }
                      }
                    }
                  }
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
          details: `Marked ${breakType} break as ${value ? 'DONE [✓]' : 'NOT DONE [ ]'}`,
          metadata: {
            targetType,
            targetId,
            breakType,
            breakValue: value,
            staffName
          }
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
              if (!runner.staffId || !staffId) {
                runner.staffId = staffId || null;
                if (staffId && state.bullpenBreaks?.[staffId]) {
                  runner.breakfastDone = Boolean(state.bullpenBreaks[staffId].breakfastDone);
                  runner.lunchDone = Boolean(state.bullpenBreaks[staffId].lunchDone);
                  runner.breakfastTime = state.bullpenBreaks[staffId].breakfastTime || null;
                  runner.lunchTime = state.bullpenBreaks[staffId].lunchTime || null;
                }
                locationName = `${dept.name} Runner (${runner.title})`;
              } else {
                // Drop on existing runner: becomes an additional runner, NOT replace!
                const alreadyRunnerHere = dept.runnerSlots.some(slot => slot.staffId === staffId);
                if (!alreadyRunnerHere) {
                  const newRunner = {
                    id: `runner_${dept.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    title: `Runner ${dept.runnerSlots.length + 1}`,
                    staffId: staffId,
                    breakfastDone: Boolean(state.bullpenBreaks?.[staffId]?.breakfastDone),
                    lunchDone: Boolean(state.bullpenBreaks?.[staffId]?.lunchDone),
                    breakfastTime: state.bullpenBreaks?.[staffId]?.breakfastTime || null,
                    lunchTime: state.bullpenBreaks?.[staffId]?.lunchTime || null
                  };
                  dept.runnerSlots.push(newRunner);
                  locationName = `${dept.name} Runner (${newRunner.title})`;
                } else {
                  locationName = `${dept.name} Runner (Already Assigned)`;
                }
              }
              break;
            }
          }
        } else if (targetType === 'runner_dept') {
          for (const dept of state.departments) {
            if (dept.id === targetId) {
              const alreadyRunnerHere = dept.runnerSlots.some(slot => slot.staffId === staffId);
              if (!alreadyRunnerHere) {
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

        const { fromTargetType, fromId, toTargetType, toId, staffId, reliefHandling } = payload;
        let staffName = 'Staff';
        let fromLocation = '';
        let toLocation = '';
        let transferredRelief: any = null;

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
                if (slot.relief) {
                  if (reliefHandling === 'move_with_staff') {
                    transferredRelief = { ...slot.relief };
                    slot.relief = null;
                  } else if (reliefHandling === 'remove') {
                    slot.relief = null;
                  }
                  // Note: if reliefHandling === 'keep_in_room' (default), slot.relief stays intact on the slot even when slot.staffId = null!
                }
                if (!isTargetRunner) {
                  slot.staffId = null;
                }
                fromLocation = `${dept.name} Room ${room.name}`;
              }
            }
          }
        }

        // Check if removing from a specific slot (e.g. runner magnet or room slot)
        const isSpecificSlotRemoval = Boolean(
          fromId && 
          (fromTargetType === 'runner_slot' || fromTargetType === 'room_slot') && 
          !payload.removeAllLocations
        );

        // Check if staff has other assignments across departments
        const hasOtherRunnerPlacements = state.departments.some(d =>
          d.runnerSlots?.some(r => r.staffId === staffId && r.id !== fromId)
        );
        const hasOtherRoomPlacements = state.departments.some(d =>
          d.rooms?.some(rm => rm.slots?.some(s => s.staffId === staffId && s.id !== fromId))
        );
        const hasOtherPlacements = hasOtherRunnerPlacements || hasOtherRoomPlacements;

        // Handle destinations
        if (toTargetType === 'bullpen') {
          if (staffId) {
            // Only add to bullpen and clear all assignments if this staff member is NOT still assigned elsewhere,
            // OR if this was an explicit global bullpen move (!isSpecificSlotRemoval).
            if (!isSpecificSlotRemoval || !hasOtherPlacements) {
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
              toLocation = 'Bullpen (Available Staff)';
            } else {
              // Staff was removed from a specific runner/room slot, but is still running other departments (e.g. Village).
              // The specific slot was removed above. Do not touch other departments or place in bullpen pool.
              toLocation = 'Unassigned from slot';
            }
          }
        } else if (toTargetType === 'unassigned' || toTargetType === 'infrequent' || toTargetType === 'md' || toTargetType === 'crna') {
          if (staffId) {
            if (!isSpecificSlotRemoval || !hasOtherPlacements) {
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
            } else {
              // Staff was removed from a specific runner/room slot, but is still running other departments (e.g. Village).
              toLocation = 'Unassigned from slot';
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
              if (!r.staffId || !staffId) {
                r.staffId = staffId;
                if (staffId && state.bullpenBreaks?.[staffId]) {
                  r.breakfastDone = Boolean(state.bullpenBreaks[staffId].breakfastDone);
                  r.lunchDone = Boolean(state.bullpenBreaks[staffId].lunchDone);
                  r.breakfastTime = state.bullpenBreaks[staffId].breakfastTime || null;
                  r.lunchTime = state.bullpenBreaks[staffId].lunchTime || null;
                }
                toLocation = `${dept.name} Runner (${r.title})`;
              } else {
                // Drop on existing runner: becomes an additional runner, NOT replace!
                const alreadyRunnerHere = dept.runnerSlots.some(slot => slot.staffId === staffId);
                if (!alreadyRunnerHere) {
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
                } else {
                  toLocation = `${dept.name} Runner (Already Assigned)`;
                }
              }
              break;
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
                if (transferredRelief) {
                  slot.relief = transferredRelief;
                }
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
          details: `Moved from ${fromLocation || 'Staff Pool'} -> ${toLocation}`,
          metadata: {
            fromTargetType,
            fromId,
            toTargetType,
            toId,
            staffId,
            fromLocation,
            toLocation
          }
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

      // 4b. Update free-text note on a staff magnet (max 15 chars, travels with magnet)
      case 'UPDATE_MAGNET_NOTE': {
        const { staffId, note } = payload;
        const cleanNote = typeof note === 'string' ? note.trim().slice(0, 15) : '';
        state.magnetNotes = state.magnetNotes || {};
        if (cleanNote) {
          state.magnetNotes[staffId] = cleanNote;
        } else {
          delete state.magnetNotes[staffId];
        }

        if (state.staff && Array.isArray(state.staff)) {
          state.staff.forEach(s => {
            if (s.id === staffId) {
              s.magnetNote = cleanNote;
            }
          });
        }

        await saveBoardState(state);
        const staffMember = state.staff?.find(s => s.id === staffId);
        await recordAuditLog({
          actionType: 'NOTE_UPDATED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: staffMember ? `${staffMember.lastName} ${staffMember.firstName}` : staffId,
          details: cleanNote ? `Updated magnet red note: "${cleanNote}"` : 'Cleared magnet red note'
        });

        broadcastStateChange();
        return NextResponse.json({ success: true, state });
      }

      // 5. Update Departure, Call Team, or Lates lists directly
      case 'UPDATE_LISTS': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
        }
        const prevDepartureList = state.departureList ? JSON.parse(JSON.stringify(state.departureList)) : [];
        const prevLatesList = state.latesList ? JSON.parse(JSON.stringify(state.latesList)) : [];
        const prevCallTeamList = state.callTeamList ? JSON.parse(JSON.stringify(state.callTeamList)) : [];

        if (payload.departureList) state.departureList = payload.departureList;
        if (payload.latesList) state.latesList = payload.latesList;
        if (payload.callTeamList) state.callTeamList = payload.callTeamList;

        await saveBoardState(state);
        await recordAuditLog({
          actionType: payload.isReorder ? 'DEPARTURE_REORDERED' : payload.callTeamList ? 'CALL_TEAM_UPDATED' : 'DEPARTURE_UPDATED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          details: payload.details || (payload.isReorder ? 'Reordered departure list' : 'Updated departure, call team, or late staff ordering'),
          metadata: {
            previousDepartureList: prevDepartureList,
            previousLatesList: prevLatesList,
            previousCallTeamList: prevCallTeamList
          }
        });

        broadcastStateChange();
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
            room.futureTime = null;
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

        // Clear student assignments for the new day
        if (state.staff) {
          state.staff.forEach(s => {
            s.hasStudent = false;
            s.studentName = undefined;
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
        if (currentUserRole !== 'admin' && currentUserRole !== 'superuser' && currentUserRole !== 'board_runner') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Admin login required.' }, { status: 403 });
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
        const { staffId, shift, lastName, credentials, restoreLists, isCallTeamAssignment } = payload;
        let s = state.staff.find(st => st.id === staffId);
        if (!s && lastName) {
          s = state.staff.find(st => st.lastName.toUpperCase() === lastName.toUpperCase());
        }

        const oldShift = s?.shift || '';
        const targetLastName = s ? s.lastName : (lastName || 'Staff');
        const targetCreds = s ? s.credentials : (credentials || 'MD');

        const oldDepartureList = state.departureList ? JSON.parse(JSON.stringify(state.departureList)) : [];
        const oldLatesList = state.latesList ? JSON.parse(JSON.stringify(state.latesList)) : [];
        const oldCallTeamList = state.callTeamList ? JSON.parse(JSON.stringify(state.callTeamList)) : [];

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

        if (restoreLists) {
          if (restoreLists.departureList) state.departureList = restoreLists.departureList;
          if (restoreLists.latesList) state.latesList = restoreLists.latesList;
          if (restoreLists.callTeamList) state.callTeamList = restoreLists.callTeamList;
        } else {
        // Classify shift: standard late (>= 3p) vs atypical/special (e.g. 2p, 1p, Special) vs post-call vs call team
        const upperShift = (shift || '').toUpperCase().trim();
        const isL1 = upperShift.includes('L1_MHMC') || upperShift.includes('L1-MHMC') || /\bL1\b/i.test(upperShift);
        const is8h = upperShift.includes('8H_MHMC') || upperShift.includes('8H-MHMC') || /\b8H\b/i.test(upperShift);

        // Departure badge classifications:
        // 1. Post-call badges (e.g. postCV, postC1, postC2, postOB, post1st, Post-Call)
        const isPostCall = upperShift.startsWith('POST') || upperShift.includes(',POST') || upperShift.includes(' POST');
        // 2. Pre-call badges (e.g. pre1st, preCV, preC3, preC1, preC2, preOB)
        const isPreCall = upperShift.startsWith('PRE') || upperShift.includes(',PRE') || upperShift.includes(' PRE');
        // 3. Outside/backup call badges that belong on departure list (e.g. OBcall, CVcall, C1 from HDRC1PM_HMWST)
        const isOutsideCallBadge = upperShift === 'OBCALL' || upperShift === 'CVCALL' || upperShift === 'C1';

        // Active in-house Call Team assignment for tonight (kept OFF departure list)
        // ONLY true if explicitly assigned to in-house Call Team and NOT a departure badge like postCV, pre1st, OBcall, etc.
        const isCallShift = !isL1 && !is8h && !isPostCall && !isPreCall && !isOutsideCallBadge && (
          isCallTeamAssignment === true ||
          upperShift === 'CALL 1' || upperShift === 'CALL 2' || upperShift === 'CALL 3' ||
          upperShift === 'C1,OB' || upperShift === 'OB,C1' ||
          upperShift === 'CALL CV' || upperShift === 'CV CALL' || upperShift === 'CALL OB' || upperShift === 'OB CALL' ||
          upperShift === 'CALL' || upperShift === 'CALL TEAM'
        );

        const standardLateKeys = ['3P', '4P', '5P', '7P', '8P', '7P-7A', '11A-11P', '24H'];
        const is24h = /24\s*-?\s*h/i.test(upperShift) || upperShift === '24H' ||
          (upperShift.includes('L1') && (
            upperShift.includes('8H') || upperShift.includes('10H') || upperShift.includes('3P') ||
            upperShift.includes('OB') || upperShift.includes('CIHOB')
          ));
        const isStandardLate = !isCallShift && !isPostCall && (is24h || isL1 || is8h || standardLateKeys.some(k => upperShift === k || upperShift.startsWith(k)));

        const isAtypicalTime = !isCallShift && !isPostCall && (
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

            // Maintain exact Call Team Order: CV (AM/PM), Call 3 (AM/PM), Call 2 (AM/PM), Call 1 (AM/PM), OB (AM/PM)
            const CALL_ORDER: Record<string, number> = {
              'CV': 1, 'CV AM': 1, 'CV PM': 2,
              'CALL 3': 3, 'CALL 3 AM': 3, 'CALL 3 PM': 4,
              'CALL 2': 5, 'CALL 2 AM': 5, 'CALL 2 PM': 6,
              'CALL 1': 7, 'CALL 1 AM': 7, 'CALL 1 PM': 8,
              'OB': 9, 'OB AM': 9, 'OB PM': 10
            };
            state.callTeamList.sort((a, b) => (CALL_ORDER[a.role.toUpperCase()] || 99) - (CALL_ORDER[b.role.toUpperCase()] || 99));

            // Call doctors must NOT exist in departure list
            if (depItem) {
              state.departureList = state.departureList.filter(d => d.id !== depItem!.id);
            }
          } else {
            // If moved away from Call shift to regular Day, Post-Call, or Late, clear their name from callTeamList
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
            } else if (isPostCall) {
              // MD is post-call -> belongs in POST-CALL section!
              const postBadge = (upperShift === 'POST' || upperShift === 'POST-CALL' || upperShift === 'POST CALL')
                ? (depItem?.timeEstimate && depItem.timeEstimate.toLowerCase().startsWith('post') ? depItem.timeEstimate : 'Post-Call')
                : shift;

              if (depItem) {
                depItem.category = 'post_call';
                depItem.timeEstimate = postBadge;
              } else {
                state.departureList.push({
                  id: `dep_${Date.now()}`,
                  name: targetLastName.toUpperCase(),
                  orderIndex: 0,
                  category: 'post_call',
                  timeEstimate: postBadge,
                  qgendaAbbr: s?.qgendaAbbr
                });
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
              // Regular departure doctor: Non-Call (including pre-call like pre1st, outside call like OBcall/C1, or generic day)
              const isGenericDay = upperShift === 'DAY' || upperShift === '1ST' || upperShift === 'NONE' || upperShift === 'CLEAR' || upperShift === '';
              const departureBadge = isGenericDay ? undefined : shift;

              if (depItem) {
                if (depItem.category === 'special' || isGenericDay || isPreCall || isOutsideCallBadge) {
                  depItem.category = 'non_call';
                }
                depItem.timeEstimate = departureBadge;
              } else {
                state.departureList.push({
                  id: `dep_${Date.now()}`,
                  name: targetLastName.toUpperCase(),
                  orderIndex: state.departureList.length,
                  category: 'non_call',
                  timeEstimate: departureBadge,
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
          (l.qgendaAbbr && s?.qgendaAbbr && l.qgendaAbbr.toUpperCase() === s.qgendaAbbr.toUpperCase()) ||
          (l.name.toUpperCase() === targetLastName.toUpperCase() && (
            l.role === (targetCreds === 'MD' ? 'MD' : 'CRNA') ||
            !l.role
          ))
        );

        const shouldBeInLates = !isCallShift && (isStandardLate || isAtypicalTime);
        const lateCategory = is24h ? '24h' : (isL1 ? '7p' : (is8h ? '3p' : (isStandardLate ? shift.toLowerCase() : (isAtypicalTime ? 'special' : ''))));

        if (lateIdx !== -1) {
          if (shouldBeInLates) {
            state.latesList[lateIdx].timeCategory = lateCategory;
            state.latesList[lateIdx].timeEstimate = is24h ? '24h' : effectiveTimeEstimate;
            if (is24h) {
              state.latesList[lateIdx].role = 'CRNA';
              const has8h = upperShift.includes('8H') || upperShift.includes('3P');
              const has10h = upperShift.includes('10H');
              const hasL1 = upperShift.includes('L1');
              const hasOb = upperShift.includes('OB') || upperShift.includes('CIHOB') || upperShift.includes('OBPM') || upperShift.includes('CIHOBPM');
              state.latesList[lateIdx].notes = (has8h && hasL1 && hasOb) ? '24h (8h+L1+OB)' : (has8h && hasL1) ? '8h + L1' : (has10h && hasL1) ? '10h + L1' : (hasL1 && hasOb) ? 'L1 + OB' : '24h (L1 + OB)';
            } else if (isL1) {
              state.latesList[lateIdx].role = 'CRNA';
              const hasPostCall = upperShift.includes('POSTOB') ? 'postOB' :
                                  upperShift.includes('POSTC1') ? 'postC1' :
                                  upperShift.includes('POST') ? 'postCall' : '';
              state.latesList[lateIdx].notes = hasPostCall ? `L1, ${hasPostCall}` : 'L1';
            } else if (is8h) {
              state.latesList[lateIdx].role = 'CRNA';
            }
          } else {
            state.latesList.splice(lateIdx, 1);
          }
        } else if (shouldBeInLates) {
          const hasPostCall = upperShift.includes('POSTOB') ? 'postOB' :
                              upperShift.includes('POSTC1') ? 'postC1' :
                              upperShift.includes('POST') ? 'postCall' : '';
          const has8h = upperShift.includes('8H') || upperShift.includes('3P');
          const has10h = upperShift.includes('10H');
          const hasL1 = upperShift.includes('L1');
          const hasOb = upperShift.includes('OB') || upperShift.includes('CIHOB') || upperShift.includes('OBPM') || upperShift.includes('CIHOBPM');
          const lateNote = is24h ? ((has8h && hasL1 && hasOb) ? '24h (8h+L1+OB)' : (has8h && hasL1) ? '8h + L1' : (has10h && hasL1) ? '10h + L1' : (hasL1 && hasOb) ? 'L1 + OB' : '24h (L1 + OB)') : (isL1 ? (hasPostCall ? `L1, ${hasPostCall}` : 'L1') : undefined);

          state.latesList.push({
            id: `late_${s.id}_${Date.now()}`,
            name: targetLastName.toUpperCase(),
            timeCategory: lateCategory,
            role: (isL1 || is8h) ? 'CRNA' : (targetCreds === 'MD' ? 'MD' : 'CRNA'),
            timeEstimate: effectiveTimeEstimate,
            orderIndex: state.latesList.length,
            notes: lateNote,
            qgendaAbbr: s.qgendaAbbr
          });
        }
        }

        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'STAFF_UPDATED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: `${s.firstName} ${s.lastName}`.trim(),
          details: restoreLists
            ? `Restored scheduled shift from "${oldShift}" to "${shift}"`
            : `Updated scheduled shift from "${oldShift}" to "${shift}"`,
          metadata: {
            staffId: s.id,
            oldShift,
            newShift: shift,
            lastName: targetLastName,
            credentials: targetCreds,
            previousDepartureList: oldDepartureList,
            previousLatesList: oldLatesList,
            previousCallTeamList: oldCallTeamList
          }
        });

        broadcastStateChange();
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

      // 6c-3. Set staff student info
      case 'SET_STAFF_STUDENT': {
        const { staffId, hasStudent, studentName } = payload;
        const s = state.staff.find(st => st.id === staffId);
        if (!s) {
          return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
        }

        const prevHasStudent = s.hasStudent;
        const prevStudentName = s.studentName;

        s.hasStudent = Boolean(hasStudent);
        s.studentName = hasStudent && studentName ? String(studentName).trim() : undefined;

        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'STAFF_UPDATED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: `${s.firstName} ${s.lastName}`.trim(),
          details: s.hasStudent
            ? `Assigned student "${s.studentName || 'Student'}" to ${s.lastName}`
            : `Removed student assignment from ${s.lastName}`,
          metadata: {
            staffId,
            hasStudent: s.hasStudent,
            studentName: s.studentName,
            previousHasStudent: prevHasStudent,
            previousStudentName: prevStudentName
          }
        });

        broadcastStateChange();
        return NextResponse.json({ success: true, state });
      }

      // 6d. Set Relief Assignment (Red Box)
      case 'SET_RELIEF': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }
        const { targetType, targetId, reliefStaffId, reliefTime, notes, isRedBox, fromSource } = payload;
        let targetLocation = '';
        let outgoingStaffName = '';
        let incomingStaffName = '';
        let fromLocation = '';

        const incomingStaff = reliefStaffId ? state.staff.find(s => s.id === reliefStaffId) : null;
        if (incomingStaff) incomingStaffName = `${incomingStaff.lastName} (${incomingStaff.credentials})`;

        if (targetType === 'runner_slot') {
          return NextResponse.json({ error: 'Runners do not support relief assignments.' }, { status: 400 });
        }

        // room_slot target
        let targetSlot: any = null;
        for (const dept of state.departments) {
          for (const room of dept.rooms) {
            const slot = room.slots.find(s => s.id === targetId);
            if (slot) {
              targetSlot = slot;
              const wasPreviouslyRedBox = Boolean(slot.relief?.isRedBox);
              const isPlannedRedBox = isRedBox !== undefined ? Boolean(isRedBox) : wasPreviouslyRedBox;
              slot.relief = {
                staffId: reliefStaffId || null,
                time: reliefTime || slot.relief?.time || '3:00 PM',
                notes: notes !== undefined ? notes : (slot.relief?.notes || ''),
                isRedBox: Boolean(isPlannedRedBox || !reliefStaffId)
              };
              const outgoing = state.staff.find(s => s.id === slot.staffId);
              if (outgoing) outgoingStaffName = `${outgoing.lastName} (${outgoing.credentials})`;
              targetLocation = `${dept.name} Room ${room.name}`;
              break;
            }
          }
          if (targetSlot) break;
        }

        const isSelfRelief = Boolean(targetSlot && targetSlot.staffId && targetSlot.staffId === reliefStaffId);

        // If a magnet in a room is dragged/assigned to be relief (and not self-relieving):
        // Remove the magnet from the room it came from and show it in the bullpen!
        if (reliefStaffId && !isSelfRelief) {
          state.bullpenStaffIds = state.bullpenStaffIds || [];
          state.bullpenBreaks = state.bullpenBreaks || {};

          for (const dept of state.departments) {
            for (const room of dept.rooms) {
              for (const slot of room.slots) {
                const isSource = fromSource?.id ? slot.id === fromSource.id : (slot.staffId === reliefStaffId && slot.id !== targetId);
                if (isSource && slot.staffId === reliefStaffId) {
                  slot.staffId = null;
                  fromLocation = `${dept.name} Room ${room.name}`;
                  state.bullpenBreaks[reliefStaffId] = {
                    breakfastDone: slot.breakfastDone,
                    lunchDone: slot.lunchDone,
                    breakfastTime: slot.breakfastTime,
                    lunchTime: slot.lunchTime
                  };
                }
              }
            }

            // Also check runnerSlots if they came from a runner
            const isRunnerSource = fromSource?.type === 'runner_slot' || (!fromSource && dept.runnerSlots.some(r => r.staffId === reliefStaffId));
            if (isRunnerSource) {
              const rIdx = dept.runnerSlots.findIndex(r => fromSource?.id ? r.id === fromSource.id : r.staffId === reliefStaffId);
              if (rIdx !== -1) {
                const r = dept.runnerSlots[rIdx];
                state.bullpenBreaks[reliefStaffId] = {
                  breakfastDone: r.breakfastDone,
                  lunchDone: r.lunchDone,
                  breakfastTime: r.breakfastTime,
                  lunchTime: r.lunchTime
                };
                fromLocation = `${dept.name} Runner (${r.title})`;
                dept.runnerSlots.splice(rIdx, 1);
              }
            }
          }

          // Show in the bullpen!
          if (!state.bullpenStaffIds.includes(reliefStaffId)) {
            state.bullpenStaffIds.push(reliefStaffId);
          }
        }

        await saveBoardState(state);
        const isOpenRedBox = !reliefStaffId;
        await recordAuditLog({
          actionType: isOpenRedBox ? 'ROOM_UPDATED' : 'STAFF_ASSIGNED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: isOpenRedBox ? '3 PM Count (Red Box)' : incomingStaffName,
          locationName: targetLocation,
          details: isOpenRedBox
            ? `Marked ${targetLocation} for 3 PM Count (Open Red Box awaiting coverage)`
            : isSelfRelief
              ? `${incomingStaffName} designated as relieving themselves in ${targetLocation}`
              : fromLocation
                ? `Assigned relief: ${incomingStaffName} relieving ${outgoingStaffName || 'Room'} in ${targetLocation} (moved from ${fromLocation} to bullpen)`
                : `Assigned relief: ${incomingStaffName} relieving ${outgoingStaffName || 'Room'} in ${targetLocation}`
        });

        broadcastStateChange();
        return NextResponse.json({ success: true, state });
      }

      // 6e. Remove Relief Assignment
      case 'REMOVE_RELIEF': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }
        const { targetType, targetId, forceDelete } = payload;
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
              if (slot && slot.relief) {
                // If this room had a planned relief box (isRedBox), and had a clinician assigned,
                // removing that clinician returns the planned red box reminder!
                if (!forceDelete && slot.relief.isRedBox && slot.relief.staffId) {
                  slot.relief = {
                    staffId: null,
                    time: slot.relief.time || '3:00 PM',
                    notes: slot.relief.notes || '',
                    isRedBox: true
                  };
                  targetLocation = `${dept.name} Room ${room.name} (Restored Planned Red Box)`;
                } else {
                  slot.relief = null;
                  targetLocation = `${dept.name} Room ${room.name}`;
                }
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
              runner.staffId = incomingId || null;
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
                slot.staffId = incomingId || null;
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
        let dept = departmentId ? state.departments.find(d => d.id === departmentId) : null;
        if (!dept) {
          dept = state.departments.find(d => d.runnerSlots?.some(r => r.id === runnerSlotId));
        }
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

      // 8b. Set or clear estimated future case time for a room (e.g. "1030")
      case 'SET_ROOM_FUTURE_TIME': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }
        const { roomId, futureTime } = payload;
        let foundRoom: any = null;
        let foundDeptName = '';

        for (const dept of state.departments) {
          for (const room of dept.rooms) {
            if (room.id === roomId) {
              foundRoom = room;
              foundDeptName = dept.name;
              break;
            }
          }
          if (foundRoom) break;
        }

        if (foundRoom) {
          const prevTime = foundRoom.futureTime;
          const cleanTime = futureTime ? String(futureTime).trim().replace(/[^0-9]/g, '').slice(0, 4) : null;
          foundRoom.futureTime = cleanTime || null;
          await saveBoardState(state);
          await recordAuditLog({
            actionType: cleanTime ? 'ROOM_FUTURE_TIME_SET' : 'ROOM_FUTURE_TIME_CLEARED',
            performedBy: currentUserName,
            userRole: currentUserRole,
            locationName: `${foundDeptName} Room ${foundRoom.name}`,
            details: cleanTime
              ? `Set estimated future case time to ${cleanTime} in ${foundDeptName} Room ${foundRoom.name}`
              : `Cleared estimated future case time in ${foundDeptName} Room ${foundRoom.name}`,
            metadata: {
              roomId,
              futureTime: cleanTime,
              previousTime: prevTime
            }
          });
          return NextResponse.json({ success: true, state });
        }
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      // 9. Save full state (Admin & Superuser only, e.g. after layout editor)
      case 'SAVE_LAYOUT': {
        if (currentUserRole !== 'admin' && currentUserRole !== 'superuser') {
          return NextResponse.json({ error: 'Admin permission required to alter board layout.' }, { status: 403 });
        }
        if (payload.departments) {
          state.departments = payload.departments;
        }
        if (payload.layoutConfig) {
          state.layoutConfig = payload.layoutConfig;
        }
        await saveBoardState(state);
        await recordAuditLog({
          actionType: 'LAYOUT_CHANGED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          details: 'Altered department layout, order, and board architecture'
        });
        broadcastStateChange();
        return NextResponse.json({ success: true, state });
      }

      // 7. Reset to default photo whiteboard state (Admin & Superuser only)
      case 'RESET_TO_PHOTO_DEFAULT': {
        if (currentUserRole !== 'admin' && currentUserRole !== 'superuser') {
          return NextResponse.json({ error: 'Admin permission required.' }, { status: 403 });
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

      // 9. Revert / Undo a past action
      case 'REVERT_ACTION': {
        const { logId, logEntry: providedLogEntry } = payload || {};
        let logEntry = providedLogEntry;
        if (!logEntry && logId) {
          const allLogs = await loadAuditLog();
          logEntry = allLogs.find(l => l.id === logId);
        }

        if (!logEntry) {
          return NextResponse.json({ error: 'Audit log entry not found to revert' }, { status: 404 });
        }

        // Role check
        if (currentUserRole === 'basic_user') {
          const isAllowedForBasic = 
            logEntry.actionType === 'BREAKFAST_TOGGLED' || 
            logEntry.actionType === 'LUNCH_TOGGLED' || 
            (logEntry.actionType === 'STAFF_UPDATED' && logEntry.details.toLowerCase().includes('student'));
          if (!isAllowedForBasic) {
            return NextResponse.json({ error: 'Permission denied. Board runner or admin access required.' }, { status: 403 });
          }
        }

        let revertedDescription = '';
        const meta = logEntry.metadata || {};

        switch (logEntry.actionType) {
          case 'BREAKFAST_TOGGLED':
          case 'LUNCH_TOGGLED': {
            const breakType = logEntry.actionType === 'BREAKFAST_TOGGLED' ? 'breakfast' : 'lunch';
            const wasDone = logEntry.details.includes('DONE [✓]') || meta.breakValue === true;
            const newRevertedValue = !wasDone;

            let applied = false;
            if (meta.targetType === 'runner_slot' && meta.targetId) {
              for (const dept of state.departments) {
                const r = dept.runnerSlots?.find(s => s.id === meta.targetId);
                if (r) {
                  if (breakType === 'breakfast') { r.breakfastDone = newRevertedValue; r.breakfastTime = newRevertedValue ? new Date().toISOString() : null; }
                  else { r.lunchDone = newRevertedValue; r.lunchTime = newRevertedValue ? new Date().toISOString() : null; }
                  applied = true;
                  break;
                }
              }
            } else if (meta.targetType === 'room_slot' && meta.targetId) {
              for (const dept of state.departments) {
                for (const rm of dept.rooms) {
                  const s = rm.slots.find(slot => slot.id === meta.targetId);
                  if (s) {
                    if (breakType === 'breakfast') { s.breakfastDone = newRevertedValue; s.breakfastTime = newRevertedValue ? new Date().toISOString() : null; }
                    else { s.lunchDone = newRevertedValue; s.lunchTime = newRevertedValue ? new Date().toISOString() : null; }
                    applied = true;
                    break;
                  }
                }
              }
            }

            if (!applied && logEntry.targetName) {
              const staff = state.staff.find(s => 
                `${s.firstName} ${s.lastName}`.trim().toLowerCase() === logEntry.targetName.trim().toLowerCase() || 
                (s.displayName && s.displayName.trim().toLowerCase() === logEntry.targetName.trim().toLowerCase())
              );
              if (staff) {
                state.bullpenBreaks = state.bullpenBreaks || {};
                const existing = state.bullpenBreaks[staff.id] || { breakfastDone: false, lunchDone: false };
                state.bullpenBreaks[staff.id] = {
                  ...existing,
                  ...(breakType === 'breakfast'
                    ? { breakfastDone: newRevertedValue, breakfastTime: newRevertedValue ? new Date().toISOString() : null }
                    : { lunchDone: newRevertedValue, lunchTime: newRevertedValue ? new Date().toISOString() : null })
                };

                for (const dept of state.departments) {
                  for (const r of dept.runnerSlots || []) {
                    if (r.staffId === staff.id) {
                      if (breakType === 'breakfast') { r.breakfastDone = newRevertedValue; r.breakfastTime = newRevertedValue ? new Date().toISOString() : null; }
                      else { r.lunchDone = newRevertedValue; r.lunchTime = newRevertedValue ? new Date().toISOString() : null; }
                    }
                  }
                  for (const rm of dept.rooms || []) {
                    for (const s of rm.slots || []) {
                      if (s.staffId === staff.id) {
                        if (breakType === 'breakfast') { s.breakfastDone = newRevertedValue; s.breakfastTime = newRevertedValue ? new Date().toISOString() : null; }
                        else { s.lunchDone = newRevertedValue; s.lunchTime = newRevertedValue ? new Date().toISOString() : null; }
                      }
                    }
                  }
                }
                applied = true;
              }
            }
            revertedDescription = `Toggled ${breakType} break to ${newRevertedValue ? 'DONE' : 'NOT DONE'} for ${logEntry.targetName || 'staff'}`;
            break;
          }

          case 'ROOM_FUTURE_TIME_SET':
          case 'ROOM_FUTURE_TIME_CLEARED': {
            const restoreTime = logEntry.actionType === 'ROOM_FUTURE_TIME_SET' ? null : (meta.previousTime || null);
            for (const dept of state.departments) {
              for (const rm of dept.rooms) {
                if (rm.id === meta.roomId || (logEntry.locationName && logEntry.locationName.includes(rm.name))) {
                  rm.futureTime = restoreTime;
                  revertedDescription = `Set Room ${rm.name} future time to ${restoreTime || 'none'}`;
                  break;
                }
              }
            }
            break;
          }

          case 'DEPARTURE_STRUCK_TOGGLED': {
            const item = state.departureList?.find(d => d.id === meta.id || d.name === logEntry.targetName);
            if (item) {
              item.departed = !item.departed;
              revertedDescription = `Toggled departure strikethrough for ${item.name}`;
            }
            break;
          }

          case 'STAFF_MOVED':
          case 'BULLPEN_UPDATED':
          case 'STAFF_UNASSIGNED':
          case 'STAFF_ASSIGNED': {
            const staffId = meta.staffId || state.staff.find(s => 
              `${s.firstName} ${s.lastName}`.trim().toLowerCase() === logEntry.targetName?.trim().toLowerCase() ||
              (s.displayName && s.displayName.trim().toLowerCase() === logEntry.targetName?.trim().toLowerCase())
            )?.id;

            if (staffId) {
              const originalFromType = meta.fromTargetType;
              const originalFromId = meta.fromId;

              // Clear from all current room and runner slots
              for (const dept of state.departments) {
                dept.runnerSlots = (dept.runnerSlots || []).filter(r => r.staffId !== staffId);
                for (const rm of dept.rooms) {
                  for (const s of rm.slots) {
                    if (s.staffId === staffId) s.staffId = null;
                  }
                }
              }
              state.bullpenStaffIds = (state.bullpenStaffIds || []).filter(id => id !== staffId);

              if (originalFromType === 'bullpen') {
                state.bullpenStaffIds.push(staffId);
                revertedDescription = `Returned ${logEntry.targetName || 'staff'} back to Bullpen`;
              } else if (originalFromType === 'room_slot' && originalFromId) {
                for (const dept of state.departments) {
                  for (const rm of dept.rooms) {
                    const slot = rm.slots.find(s => s.id === originalFromId);
                    if (slot) {
                      slot.staffId = staffId;
                      revertedDescription = `Returned ${logEntry.targetName || 'staff'} back to Room ${rm.name}`;
                      break;
                    }
                  }
                }
              } else if (originalFromType === 'runner_slot' && originalFromId) {
                for (const dept of state.departments) {
                  const r = dept.runnerSlots?.find(slot => slot.id === originalFromId);
                  if (r) {
                    r.staffId = staffId;
                    revertedDescription = `Returned ${logEntry.targetName || 'staff'} back to Runner`;
                    break;
                  }
                }
              } else {
                revertedDescription = `Returned ${logEntry.targetName || 'staff'} back to Unassigned Staff`;
              }
            }
            break;
          }

          case 'DEPARTURE_REORDERED': {
            if (meta.previousDepartureList) {
              state.departureList = meta.previousDepartureList;
              if (meta.previousLatesList) state.latesList = meta.previousLatesList;
              revertedDescription = 'Reverted departure list reordering';
            } else {
              return NextResponse.json({ error: 'Previous departure ordering metadata not found' }, { status: 400 });
            }
            break;
          }

          case 'STAFF_UPDATED': {
            if (logEntry.details.toLowerCase().includes('student')) {
              const staffId = meta.staffId || state.staff.find(s => 
                `${s.firstName} ${s.lastName}`.trim().toLowerCase() === logEntry.targetName?.trim().toLowerCase() ||
                (s.displayName && s.displayName.trim().toLowerCase() === logEntry.targetName?.trim().toLowerCase())
              )?.id;
              const staff = state.staff.find(s => s.id === staffId);
              if (staff) {
                const wasAssigned = logEntry.details.includes('Assigned student');
                staff.hasStudent = !wasAssigned;
                staff.studentName = wasAssigned ? undefined : (meta.previousStudentName || 'Student');
                revertedDescription = wasAssigned
                  ? `Removed student assignment from ${staff.lastName}`
                  : `Restored student assignment for ${staff.lastName}`;
              }
            } else if (logEntry.details.toLowerCase().includes('shift')) {
              const staffId = meta.staffId || state.staff.find(s => 
                `${s.firstName} ${s.lastName}`.trim().toLowerCase() === logEntry.targetName?.trim().toLowerCase() ||
                (s.displayName && s.displayName.trim().toLowerCase() === logEntry.targetName?.trim().toLowerCase())
              )?.id;
              const staff = state.staff.find(s => s.id === staffId);
              if (staff) {
                staff.shift = meta.oldShift || '';
                if (meta.previousDepartureList) state.departureList = meta.previousDepartureList;
                if (meta.previousLatesList) state.latesList = meta.previousLatesList;
                if (meta.previousCallTeamList) state.callTeamList = meta.previousCallTeamList;
                revertedDescription = `Reverted scheduled shift for ${staff.lastName} back to "${meta.oldShift || 'Default'}"`;
              }
            }
            break;
          }

          default:
            return NextResponse.json({ error: `Cannot automatically revert action type: ${logEntry.actionType}` }, { status: 400 });
        }

        await saveBoardState(state);
        broadcastStateChange();
        await recordAuditLog({
          actionType: 'ACTION_REVERTED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: logEntry.targetName || '',
          locationName: logEntry.locationName || '',
          details: `Reverted past action [${logEntry.actionType.replace(/_/g, ' ')}] from ${new Date(logEntry.timestamp).toLocaleTimeString()}: ${revertedDescription || logEntry.details}`,
          metadata: {
            revertedLogId: logEntry.id,
            originalActionType: logEntry.actionType
          }
        });

        return NextResponse.json({ success: true, state, message: revertedDescription || 'Action reverted successfully.' });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Error handling board action:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
