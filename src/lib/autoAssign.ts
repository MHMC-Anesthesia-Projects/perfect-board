import { BoardState, Department, Room, Staff } from '@/types/whiteboard';

/**
 * Maps OneUSAP scraped room strings to standard whiteboard Department ID and Room Name.
 * Examples:
 *   "MHMC OR4" -> { deptKey: 'dept_main_or', roomName: '4' }
 *   "MHMC DS 01" -> { deptKey: 'dept_west_pav', roomName: '1' }
 *   "MHMC DS 14" -> { deptKey: 'dept_west_pav', roomName: '14' }
 *   "MHMC Ortho1" -> { deptKey: 'dept_ortho', roomName: '1' }
 *   "Village OR1" -> { deptKey: 'dept_village', roomName: '1' }
 *   "Village Proc2" -> { deptKey: 'dept_village', roomName: 'P2' }
 *   "MHMC Cath1" -> { deptKey: 'dept_9th_floor', roomName: 'CCL1' }
 *   "MHMC Cath2" -> { deptKey: 'dept_9th_floor', roomName: 'CCL2' }
 *   "MHMC TEE" -> { deptKey: 'dept_9th_floor', roomName: 'TEE' }
 *   "MHMC EP1" -> { deptKey: 'dept_9th_floor', roomName: 'EP1' }
 *   "MHMC Endo1" -> { deptKey: 'dept_endo', roomName: '1' }
 *   "MHMC MRI" -> { deptKey: 'dept_endo', roomName: 'MRI' }
 *   "MHMC OB2" -> { deptKey: 'dept_ob', roomName: '2' }
 *   "Houston IVF" -> { deptKey: 'dept_ivf', roomName: 'LU' }
 */
export function mapScrapedRoomToDeptAndRoom(rawRoom: string): { deptKey: string; roomName: string } | null {
  if (!rawRoom) return null;
  const clean = rawRoom.trim();
  const upper = clean.toUpperCase();

  // 1. VILLAGE (Priority check before generic OR matching):
  // "Village OR1" to "Village OR8", "Village Proc1" / "Proc2", "P1" / "P2"
  if (upper.includes('VILLAGE') || upper.startsWith('VIL')) {
    const vilProcMatch = upper.match(/(?:PROC|P)\s*0?([0-9]{1,2})\b/);
    if (vilProcMatch) {
      return { deptKey: 'dept_village', roomName: `P${vilProcMatch[1]}` };
    }
    const vilOrMatch = upper.match(/(?:OR\s*)?0?([0-9]{1,2})\b/);
    if (vilOrMatch) {
      return { deptKey: 'dept_village', roomName: String(parseInt(vilOrMatch[1], 10)) };
    }
    return { deptKey: 'dept_village', roomName: '1' };
  }

  // 2. WEST PAV (Day Surgery): "MHMC DS 01" to "MHMC DS 14", "DS 01" .. "DS 14"
  if (upper.includes('DS') || upper.includes('PAV')) {
    const dsMatch = upper.match(/DS\s*0?([0-9]{1,2})\b/);
    if (dsMatch) {
      const num = parseInt(dsMatch[1], 10);
      return { deptKey: 'dept_west_pav', roomName: String(num) };
    }
  }

  // 3. ORTHO: "MHMC Ortho1" to "MHMC Ortho8", "Ortho 1" .. "Ortho 8"
  if (upper.includes('ORTHO')) {
    const orthoMatch = upper.match(/ORTHO\s*0?([0-9]{1,2})\b/);
    if (orthoMatch) {
      return { deptKey: 'dept_ortho', roomName: String(parseInt(orthoMatch[1], 10)) };
    }
  }

  // 4. 9th Floor: Cath1 -> CCL1/CCL, Cath2 -> CCL2, Cath3 -> CCL3, EP1, EP2, TEE, IR, NIR
  if (upper.includes('CATH1') || upper.includes('CCL1')) {
    return { deptKey: 'dept_9th_floor', roomName: 'CCL1' };
  }
  if (upper.includes('CATH2') || upper.includes('CCL2')) {
    return { deptKey: 'dept_9th_floor', roomName: 'CCL2' };
  }
  if (upper.includes('CATH3') || upper.includes('CCL3')) {
    return { deptKey: 'dept_9th_floor', roomName: 'CCL3' };
  }
  if (upper.includes('EP1')) return { deptKey: 'dept_9th_floor', roomName: 'EP1' };
  if (upper.includes('EP2')) return { deptKey: 'dept_9th_floor', roomName: 'EP2' };
  if (upper.includes('TEE')) return { deptKey: 'dept_9th_floor', roomName: 'TEE' };
  if (upper.includes('NIR')) return { deptKey: 'dept_9th_floor', roomName: 'NIR' };
  if (upper.includes('IR')) return { deptKey: 'dept_9th_floor', roomName: 'IR' };

  // 5. ENDO: "MHMC Endo1" .. "Endo4", "MRI"
  if (upper.includes('ENDO') || upper.includes('MRI')) {
    if (upper.includes('MRI')) {
      return { deptKey: 'dept_endo', roomName: 'MRI' };
    }
    const endoMatch = upper.match(/ENDO\s*0?([0-9]{1,2})\b/);
    if (endoMatch) {
      return { deptKey: 'dept_endo', roomName: String(parseInt(endoMatch[1], 10)) };
    }
  }

  // 6. OB: "MHMC OB1" .. "OB4"
  if (upper.includes('OB')) {
    const obMatch = upper.match(/OB\s*0?([0-9]{1,2})\b/);
    if (obMatch) {
      return { deptKey: 'dept_ob', roomName: String(parseInt(obMatch[1], 10)) };
    }
  }

  // 7. IVF: "Houston IVF", "HIVF", "IVF"
  if (upper.includes('IVF')) {
    return { deptKey: 'dept_ivf', roomName: 'LU' };
  }

  // 8. MAIN OR: "MHMC OR1" to "MHMC OR12"
  const orMatch = upper.match(/(?:MHMC\s+)?OR\s*0?([0-9]{1,2})\b/);
  if (orMatch) {
    return { deptKey: 'dept_main_or', roomName: String(parseInt(orMatch[1], 10)) };
  }

  return null;
}

export function findDepartment(departments: Department[], deptKey: string): Department | undefined {
  return departments.find(d => {
    if (d.id === deptKey) return true;
    const nameUpper = d.name.toUpperCase();
    if (deptKey === 'dept_main_or' && nameUpper.includes('MAIN OR')) return true;
    if (deptKey === 'dept_west_pav' && (nameUpper.includes('WEST') || nameUpper.includes('PAV'))) return true;
    if (deptKey === 'dept_ortho' && nameUpper.includes('ORTHO')) return true;
    if (deptKey === 'dept_village' && nameUpper.includes('VILLAGE')) return true;
    if (deptKey === 'dept_9th_floor' && (nameUpper.includes('9TH') || nameUpper.includes('NINTH') || nameUpper.includes('FLOOR'))) return true;
    if (deptKey === 'dept_endo' && nameUpper.includes('ENDO')) return true;
    if (deptKey === 'dept_ob' && nameUpper.includes('OB')) return true;
    if (deptKey === 'dept_ivf' && nameUpper.includes('IVF')) return true;
    return false;
  });
}

export function findRoom(dept: Department, targetRoomName: string): Room | undefined {
  // Exact match first
  let r = dept.rooms.find(rm => rm.name.toUpperCase() === targetRoomName.toUpperCase());
  if (r) return r;

  // Numeric comparison (e.g. "01" vs "1")
  const num = parseInt(targetRoomName, 10);
  if (!isNaN(num)) {
    r = dept.rooms.find(rm => parseInt(rm.name, 10) === num);
    if (r) return r;
  }

  // CCL vs CCL1 alias
  if (targetRoomName.toUpperCase() === 'CCL' || targetRoomName.toUpperCase() === 'CCL1') {
    r = dept.rooms.find(rm => rm.name.toUpperCase() === 'CCL1' || rm.name.toUpperCase() === 'CCL');
    if (r) return r;
  }

  // For West Pav DS 14 when rooms only go up to 12
  if (dept.id.includes('west') && (targetRoomName === '14' || targetRoomName === '13')) {
    r = dept.rooms.find(rm => rm.name === '12');
    if (r) return r;
  }

  return undefined;
}

export interface AutoAssignResult {
  departments: Department[];
  bullpenStaffIds: string[];
  assignedCount: number;
}

/**
 * Auto-assigns staff magnets into corresponding department rooms and runner slots
 * based on the initial assignments synced from the portal.
 */
export function autoAssignBoardState(state: BoardState): AutoAssignResult {
  // Deep clone departments so we don't mutate unexpectedly
  const departments: Department[] = JSON.parse(JSON.stringify(state.departments));

  // 1. Reset all room slot and runner slot staff assignments
  departments.forEach(dept => {
    dept.runnerSlots.forEach(slot => {
      slot.staffId = null;
    });
    dept.rooms.forEach(room => {
      room.slots.forEach(slot => {
        slot.staffId = null;
      });
    });
  });

  const activeStaff = state.staff.filter(s => s.active);
  const assignedStaffIds = new Set<string>();

  // Helper to get all room strings for a staff member
  const getStaffRooms = (s: Staff): string[] => {
    if (s.assignedRooms && s.assignedRooms.length > 0) {
      return s.assignedRooms;
    }
    if (s.assignedRoom) {
      return s.assignedRoom.split(',').map(r => r.trim()).filter(Boolean);
    }
    return [];
  };

  // 2. Identify and place Department Runners (MDs supervising multiple rooms in the same department)
  const mdStaff = activeStaff.filter(s => s.credentials === 'MD' || s.credentials === 'Fellow');
  const runnerMdIds = new Set<string>();

  mdStaff.forEach(md => {
    const rawRooms = getStaffRooms(md);
    if (rawRooms.length < 2) return;

    // Map each room to its department
    const deptCount: Record<string, number> = {};
    rawRooms.forEach(r => {
      const mapped = mapScrapedRoomToDeptAndRoom(r);
      if (mapped) {
        deptCount[mapped.deptKey] = (deptCount[mapped.deptKey] || 0) + 1;
      }
    });

    // Check if MD has >= 2 rooms in a single department
    for (const [deptKey, count] of Object.entries(deptCount)) {
      if (count >= 2) {
        const dept = findDepartment(departments, deptKey);
        if (dept) {
          runnerMdIds.add(md.id);

          // Find first available runner slot
          let emptyRunner = dept.runnerSlots.find(rs => !rs.staffId);
          if (!emptyRunner) {
            // Dynamically add another runner slot if needed
            const newIndex = dept.runnerSlots.length + 1;
            const newSlot = {
              id: `runner_${dept.id}_${Date.now()}_${newIndex}`,
              title: `Runner ${newIndex}`,
              staffId: null,
              breakfastDone: false,
              lunchDone: false
            };
            dept.runnerSlots.push(newSlot);
            emptyRunner = newSlot;
          }

          emptyRunner.staffId = md.id;
          assignedStaffIds.add(md.id);
          break; // Assigned as runner for this department
        }
      }
    }
  });

  // 3. Assign CRNAs / Non-MD Providers to Room Slots
  const crnaStaff = activeStaff.filter(s => s.credentials !== 'MD' && s.credentials !== 'Fellow');

  crnaStaff.forEach(crna => {
    if (assignedStaffIds.has(crna.id)) return;
    const rawRooms = getStaffRooms(crna);
    if (rawRooms.length === 0) return;

    // Try each assigned room until placed
    for (const rawRoom of rawRooms) {
      const mapped = mapScrapedRoomToDeptAndRoom(rawRoom);
      if (!mapped) continue;

      const dept = findDepartment(departments, mapped.deptKey);
      if (!dept) continue;

      const room = findRoom(dept, mapped.roomName);
      if (!room) continue;

      // Assign to primary slot if available
      if (room.slots.length > 0 && !room.slots[0].staffId) {
        room.slots[0].staffId = crna.id;
        assignedStaffIds.add(crna.id);
        break;
      }

      // Or secondary slot if primary is occupied
      if (room.slots.length > 1 && !room.slots[1].staffId) {
        room.slots[1].staffId = crna.id;
        assignedStaffIds.add(crna.id);
        break;
      }
    }
  });

  // 4. Assign single-room MDs (who were not assigned as runners)
  mdStaff.forEach(md => {
    if (assignedStaffIds.has(md.id) || runnerMdIds.has(md.id)) return;
    const rawRooms = getStaffRooms(md);
    if (rawRooms.length === 0) return;

    for (const rawRoom of rawRooms) {
      const mapped = mapScrapedRoomToDeptAndRoom(rawRoom);
      if (!mapped) continue;

      const dept = findDepartment(departments, mapped.deptKey);
      if (!dept) continue;

      const room = findRoom(dept, mapped.roomName);
      if (!room) continue;

      // Place in primary slot if empty
      if (room.slots.length > 0 && !room.slots[0].staffId) {
        room.slots[0].staffId = md.id;
        assignedStaffIds.add(md.id);
        break;
      }

      // If primary is taken by CRNA, place in secondary slot
      if (room.slots.length > 1 && !room.slots[1].staffId) {
        room.slots[1].staffId = md.id;
        assignedStaffIds.add(md.id);
        break;
      } else if (room.slots.length === 1) {
        // Add secondary slot to accommodate both CRNA and MD
        const newSlot = {
          id: `${room.id}_slot_${room.slots.length}_${Date.now()}`,
          roleType: 'secondary' as const,
          staffId: md.id,
          breakfastDone: false,
          lunchDone: false,
          notes: ''
        };
        room.slots.push(newSlot);
        assignedStaffIds.add(md.id);
        break;
      }
    }
  });

  // 5. Update bullpen: remove any staff assigned to rooms or runners
  const updatedBullpenStaffIds = (state.bullpenStaffIds || []).filter(
    id => !assignedStaffIds.has(id)
  );

  return {
    departments,
    bullpenStaffIds: updatedBullpenStaffIds,
    assignedCount: assignedStaffIds.size
  };
}
