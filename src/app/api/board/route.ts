import { NextRequest, NextResponse } from 'next/server';
import { loadBoardState, saveBoardState, recordAuditLog, getInitialBoardState } from '@/lib/storage';
import { UserRole, RunnerSlot } from '@/types/whiteboard';
import { autoAssignBoardState } from '@/lib/autoAssign';

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
          state.bullpenStaffIds = (state.bullpenStaffIds || []).filter(id => id !== staffId);
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
              let emptyRunner = dept.runnerSlots.find(r => !r.staffId);
              if (!emptyRunner) {
                emptyRunner = {
                  id: `runner_${dept.id}_${Date.now()}`,
                  title: `RUNNER ${dept.runnerSlots.length + 1}`,
                  staffId: staffId || null,
                  breakfastDone: (staffId && state.bullpenBreaks?.[staffId]?.breakfastDone) || false,
                  lunchDone: (staffId && state.bullpenBreaks?.[staffId]?.lunchDone) || false,
                  breakfastTime: (staffId && state.bullpenBreaks?.[staffId]?.breakfastTime) || null,
                  lunchTime: (staffId && state.bullpenBreaks?.[staffId]?.lunchTime) || null
                };
                dept.runnerSlots.push(emptyRunner);
              } else {
                emptyRunner.staffId = staffId || null;
                if (staffId && state.bullpenBreaks?.[staffId]) {
                  emptyRunner.breakfastDone = Boolean(state.bullpenBreaks[staffId].breakfastDone);
                  emptyRunner.lunchDone = Boolean(state.bullpenBreaks[staffId].lunchDone);
                  emptyRunner.breakfastTime = state.bullpenBreaks[staffId].breakfastTime || null;
                  emptyRunner.lunchTime = state.bullpenBreaks[staffId].lunchTime || null;
                }
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

        state.bullpenStaffIds = state.bullpenStaffIds || [];

        if (staffId) {
          const s = state.staff.find(st => st.id === staffId);
          if (s) staffName = `${s.firstName} ${s.lastName}`.trim();
        }

        // Clear source & preserve source break status if available
        if (fromTargetType === 'bullpen') {
          state.bullpenStaffIds = state.bullpenStaffIds.filter(id => id !== staffId);
          fromLocation = 'Bullpen';
        } else if (fromTargetType === 'runner_slot') {
          for (const dept of state.departments) {
            const r = dept.runnerSlots.find(slot => slot.id === fromId);
            if (r) {
              if (staffId) {
                state.bullpenBreaks = state.bullpenBreaks || {};
                state.bullpenBreaks[staffId] = {
                  breakfastDone: r.breakfastDone,
                  lunchDone: r.lunchDone,
                  breakfastTime: r.breakfastTime,
                  lunchTime: r.lunchTime
                };
              }
              r.staffId = null;
              fromLocation = `${dept.name} Runner (${r.title})`;
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
                slot.staffId = null;
                fromLocation = `${dept.name} Room ${room.name}`;
              }
            }
          }
        }

        // Handle destinations
        if (toTargetType === 'bullpen') {
          if (staffId && !state.bullpenStaffIds.includes(staffId)) {
            state.bullpenStaffIds.push(staffId);
          }
          // Ensure cleared from any room or runner
          for (const dept of state.departments) {
            for (const runner of dept.runnerSlots) {
              if (runner.staffId === staffId) runner.staffId = null;
            }
            for (const room of dept.rooms) {
              for (const slot of room.slots) {
                if (slot.staffId === staffId) slot.staffId = null;
              }
            }
          }
          toLocation = 'Bullpen (Available Staff)';
        } else if (toTargetType === 'unassigned') {
          if (staffId) {
            state.bullpenStaffIds = state.bullpenStaffIds.filter(id => id !== staffId);
          }
          for (const dept of state.departments) {
            for (const runner of dept.runnerSlots) {
              if (runner.staffId === staffId) runner.staffId = null;
            }
            for (const room of dept.rooms) {
              for (const slot of room.slots) {
                if (slot.staffId === staffId) slot.staffId = null;
              }
            }
          }
          toLocation = 'Available Unassigned Staff';
        } else if (toTargetType === 'runner_slot') {
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
          if (staffId) {
            state.bullpenStaffIds = state.bullpenStaffIds.filter(id => id !== staffId);
          }
          for (const dept of state.departments) {
            if (dept.id === toId) {
              let emptyRunner = dept.runnerSlots.find(r => !r.staffId);
              if (!emptyRunner) {
                emptyRunner = {
                  id: `runner_${dept.id}_${Date.now()}`,
                  title: `RUNNER ${dept.runnerSlots.length + 1}`,
                  staffId: staffId,
                  breakfastDone: (staffId && state.bullpenBreaks?.[staffId]?.breakfastDone) || false,
                  lunchDone: (staffId && state.bullpenBreaks?.[staffId]?.lunchDone) || false,
                  breakfastTime: (staffId && state.bullpenBreaks?.[staffId]?.breakfastTime) || null,
                  lunchTime: (staffId && state.bullpenBreaks?.[staffId]?.lunchTime) || null
                };
                dept.runnerSlots.push(emptyRunner);
              } else {
                emptyRunner.staffId = staffId;
                if (staffId && state.bullpenBreaks?.[staffId]) {
                  emptyRunner.breakfastDone = Boolean(state.bullpenBreaks[staffId].breakfastDone);
                  emptyRunner.lunchDone = Boolean(state.bullpenBreaks[staffId].lunchDone);
                  emptyRunner.breakfastTime = state.bullpenBreaks[staffId].breakfastTime || null;
                  emptyRunner.lunchTime = state.bullpenBreaks[staffId].lunchTime || null;
                }
              }
              toLocation = `${dept.name} Runner (${emptyRunner.title})`;
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

        saveBoardState(state);
        recordAuditLog({
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

      // 5c. Auto-Assign magnets to department rooms and runner slots
      case 'AUTO_ASSIGN_ROOMS': {
        if (currentUserRole === 'basic_user') {
          return NextResponse.json({ error: 'Permission denied. Board Runner or Superuser login required.' }, { status: 403 });
        }

        const result = autoAssignBoardState(state);
        state.departments = result.departments;
        state.bullpenStaffIds = result.bullpenStaffIds;

        saveBoardState(state);
        recordAuditLog({
          actionType: 'STAFF_ASSIGNED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          details: `Auto-assigned ${result.assignedCount} staff magnets to department rooms and runner slots based on portal schedule`
        });

        return NextResponse.json({
          success: true,
          state,
          assignedCount: result.assignedCount,
          message: `Auto-assigned ${result.assignedCount} staff magnets to department rooms and runner slots`
        });
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

        // Synchronize Departure List
        const depItem = state.departureList.find(d =>
          d.id === staffId ||
          d.name.toUpperCase() === targetLastName.toUpperCase() ||
          (s?.qgendaAbbr && d.qgendaAbbr?.toUpperCase() === s.qgendaAbbr.toUpperCase())
        );
        if (depItem) {
          depItem.timeEstimate = shift;
        }

        // Synchronize Late List
        const upperShift = (shift || '').toUpperCase().trim();
        const isLateShift = /^[0-9]+[PA]?$|^(?:3P|4P|5P|7P|8P|7P-7A|11A-11P)/i.test(upperShift) ||
          upperShift.includes('7P') || upperShift.includes('4P') || upperShift.includes('5P') || upperShift.includes('3P') || upperShift.includes('8P');

        const lateIdx = state.latesList.findIndex(l =>
          l.id === staffId ||
          l.name.toUpperCase() === targetLastName.toUpperCase()
        );

        if (lateIdx !== -1) {
          if (isLateShift) {
            state.latesList[lateIdx].timeCategory = shift.toLowerCase();
          } else {
            // Shift changed to regular daytime (e.g. 'Day')
            state.latesList.splice(lateIdx, 1);
          }
        } else if (isLateShift) {
          state.latesList.push({
            id: `late_${s.id}_${Date.now()}`,
            name: targetLastName.toUpperCase(),
            timeCategory: shift.toLowerCase(),
            role: targetCreds === 'MD' ? 'MD' : 'CRNA',
            orderIndex: state.latesList.length
          });
        }

        saveBoardState(state);
        recordAuditLog({
          actionType: 'STAFF_UPDATED',
          performedBy: currentUserName,
          userRole: currentUserRole,
          targetName: `${s.firstName} ${s.lastName}`.trim(),
          details: `Updated scheduled shift from "${oldShift}" to "${shift}"`
        });

        return NextResponse.json({ success: true, state });
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
