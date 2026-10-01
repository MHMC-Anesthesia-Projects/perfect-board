import fs from 'fs';
import path from 'path';
import { BoardState, User, AuditLogEntry, Staff, Department, UniqueScheduleRule } from '@/types/whiteboard';

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'whiteboard_state.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_log.json');

// Ensure data directory exists
function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

// Atomic file write using temporary file to prevent corruption
function safeWriteJSON(filePath: string, data: unknown) {
  ensureDirectoryExistence(filePath);
  const tempPath = `${filePath}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

function safeReadJSON<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      safeWriteJSON(filePath, fallback);
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

// -------------------------------------------------------------
// INITIAL SEED DATA (Clean baseline, ready for live import)
// -------------------------------------------------------------

export function getInitialStaff(): Staff[] {
  return [];
}

export function getInitialBoardState(staff: Staff[] = []): BoardState {
  const createRoom = (deptId: string, name: string, orderIdx: number, notes?: string) => ({
    id: `${deptId}_room_${name}`,
    name,
    orderIndex: orderIdx,
    notes: notes || '',
    slots: [
      {
        id: `${deptId}_room_${name}_slot_0`,
        roleType: 'primary' as const,
        staffId: null,
        breakfastDone: false,
        lunchDone: false,
        notes: ''
      }
    ]
  });

  const departments: Department[] = [
    // 1. MAIN OR
    {
      id: 'dept_main_or',
      name: 'MAIN OR',
      orderIndex: 0,
      runnerSlots: [
        {
          id: 'runner_main_or_1',
          title: 'Runner 1',
          staffId: null,
          breakfastDone: false,
          lunchDone: false
        },
        {
          id: 'runner_main_or_2',
          title: 'Runner 2',
          staffId: null,
          breakfastDone: false,
          lunchDone: false
        }
      ],
      rooms: [
        createRoom('dept_main_or', '1', 1),
        createRoom('dept_main_or', '2', 2),
        createRoom('dept_main_or', '3', 3),
        createRoom('dept_main_or', '4', 4),
        createRoom('dept_main_or', '5', 5),
        createRoom('dept_main_or', '6', 6),
        createRoom('dept_main_or', '7', 7),
        createRoom('dept_main_or', '8', 8),
        createRoom('dept_main_or', '9', 9),
        createRoom('dept_main_or', '10', 10),
        createRoom('dept_main_or', '11', 11),
        createRoom('dept_main_or', '12', 12)
      ]
    },

    // 2. WEST PAV
    {
      id: 'dept_west_pav',
      name: 'WEST PAV',
      orderIndex: 1,
      runnerSlots: [
        {
          id: 'runner_west_pav_1',
          title: 'Runner 1',
          staffId: null,
          breakfastDone: false,
          lunchDone: false
        },
        {
          id: 'runner_west_pav_2',
          title: 'Runner 2',
          staffId: null,
          breakfastDone: false,
          lunchDone: false
        }
      ],
      rooms: [
        createRoom('dept_west_pav', '1', 1),
        createRoom('dept_west_pav', '2', 2),
        createRoom('dept_west_pav', '3', 3),
        createRoom('dept_west_pav', '4', 4),
        createRoom('dept_west_pav', '5', 5),
        createRoom('dept_west_pav', '6', 6),
        createRoom('dept_west_pav', '7', 7),
        createRoom('dept_west_pav', '8', 8),
        createRoom('dept_west_pav', '9', 9),
        createRoom('dept_west_pav', '10', 10),
        createRoom('dept_west_pav', '11', 11),
        createRoom('dept_west_pav', '12', 12)
      ]
    },

    // 3. ORTHO
    {
      id: 'dept_ortho',
      name: 'ORTHO',
      orderIndex: 2,
      runnerSlots: [
        {
          id: 'runner_ortho_1',
          title: 'Runner 1',
          staffId: null,
          breakfastDone: false,
          lunchDone: false
        }
      ],
      rooms: [
        createRoom('dept_ortho', '1', 1),
        createRoom('dept_ortho', '2', 2),
        createRoom('dept_ortho', '3', 3),
        createRoom('dept_ortho', '4', 4),
        createRoom('dept_ortho', '5', 5),
        createRoom('dept_ortho', '6', 6),
        createRoom('dept_ortho', '7', 7),
        createRoom('dept_ortho', '8', 8)
      ]
    },

    // 4. VILLAGE
    {
      id: 'dept_village',
      name: 'VILLAGE',
      orderIndex: 3,
      runnerSlots: [
        {
          id: 'runner_village_1',
          title: 'Runner 1',
          staffId: null,
          breakfastDone: false,
          lunchDone: false
        }
      ],
      rooms: [
        createRoom('dept_village', '1', 1),
        createRoom('dept_village', '2', 2),
        createRoom('dept_village', '3', 3),
        createRoom('dept_village', '4', 4),
        createRoom('dept_village', '5', 5),
        createRoom('dept_village', '6', 6),
        createRoom('dept_village', '7', 7),
        createRoom('dept_village', '8', 8),
        createRoom('dept_village', 'P1', 9),
        createRoom('dept_village', 'P2', 10)
      ]
    },

    // 5. 9th FLOOR
    {
      id: 'dept_9th_floor',
      name: '9th Floor',
      orderIndex: 4,
      runnerSlots: [],
      rooms: [
        createRoom('dept_9th_floor', 'EP1', 1),
        createRoom('dept_9th_floor', 'EP2', 2),
        createRoom('dept_9th_floor', 'CCL', 3),
        createRoom('dept_9th_floor', 'CCL2', 4),
        createRoom('dept_9th_floor', 'CCL3', 5),
        createRoom('dept_9th_floor', 'IR', 6),
        createRoom('dept_9th_floor', 'NIR', 7),
        createRoom('dept_9th_floor', 'TEE', 8)
      ]
    },

    // 6. ENDO
    {
      id: 'dept_endo',
      name: 'ENDO',
      orderIndex: 5,
      runnerSlots: [
        {
          id: 'runner_endo_1',
          title: 'Runner 1',
          staffId: null,
          breakfastDone: false,
          lunchDone: false
        }
      ],
      rooms: [
        createRoom('dept_endo', '1', 1),
        createRoom('dept_endo', '2', 2),
        createRoom('dept_endo', '3', 3),
        createRoom('dept_endo', '4', 4),
        createRoom('dept_endo', 'MRI', 5)
      ]
    },

    // 7. OB
    {
      id: 'dept_ob',
      name: 'OB',
      orderIndex: 6,
      runnerSlots: [
        {
          id: 'runner_ob_1',
          title: 'Runner 1',
          staffId: null,
          breakfastDone: false,
          lunchDone: false
        }
      ],
      rooms: [
        createRoom('dept_ob', '1', 1),
        createRoom('dept_ob', '2', 2),
        createRoom('dept_ob', '3', 3),
        createRoom('dept_ob', '4', 4)
      ]
    },

    // 8. IVF
    {
      id: 'dept_ivf',
      name: 'IVF',
      orderIndex: 7,
      runnerSlots: [],
      rooms: [
        createRoom('dept_ivf', 'LU', 1)
      ]
    }
  ];

  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    departments,
    staff: [],
    departureList: [],
    callTeamList: [],
    departureNotes: '',
    latesList: [],
    latesNotes: '',
    bullpenStaffIds: [],
    bullpenBreaks: {},
    lastBreakResetDate: getLatest1AmThreshold(),
    infrequentStaffIds: [],
    infrequentStaffKeys: [],
    scraperConfig: {
      portalType: 'oneusap',
      portalUrl: 'https://www.oneusap.com/assignments',
      username: '',
      password: '321usap',
      autoSyncIntervalMinutes: 15,
      lastSyncTime: new Date().toISOString(),
      lastSyncStatus: 'success',
      mockMode: false,
      selectedFacilities: ['MHMC', 'MHVIL-SC', 'HIVF-SC']
    },
    uniqueSchedules: getDefaultUniqueSchedules()
  };
}

export function getDefaultUniqueSchedules(): UniqueScheduleRule[] {
  return [
    {
      id: 'rule_hirsch',
      providerName: 'Hirsch',
      qgendaAbbr: 'HirschDou',
      fixedShift: '5p',
      role: 'MD',
      facilityCondition: 'ALL',
      active: true,
      notes: 'Works until 5p daily when working at MHMC / Village'
    },
    {
      id: 'rule_baerenstecher',
      providerName: 'Baerenstecher',
      qgendaAbbr: 'BaerenstecheJoh',
      fixedShift: '5p',
      role: 'MD',
      facilityCondition: 'ALL',
      active: true,
      notes: 'Works until 5p daily when working at MHMC'
    },
    {
      id: 'rule_chuan',
      providerName: 'Chuan',
      qgendaAbbr: 'ChuanJos',
      fixedShift: '4p',
      role: 'MD',
      facilityCondition: 'ALL',
      active: true,
      notes: 'Works until 4p everyday'
    },
    {
      id: 'rule_gunn',
      providerName: 'Gunn',
      qgendaAbbr: 'GunnKat',
      fixedShift: '3p',
      role: 'MD',
      facilityCondition: 'ALL',
      active: true,
      notes: 'Day rotation 3p departure (night doc rotation)'
    },
    {
      id: 'rule_martinez',
      providerName: 'Martinez R',
      qgendaAbbr: 'MartinezRob',
      fixedShift: '3p',
      role: 'MD',
      facilityCondition: 'ALL',
      active: true,
      notes: 'Day rotation 3p departure (night doc rotation)'
    },
    {
      id: 'rule_hiller',
      providerName: 'Hiller',
      qgendaAbbr: 'HillerKen',
      fixedShift: '3p',
      role: 'MD',
      facilityCondition: 'ALL',
      active: true,
      notes: 'Day doctor 3p fixed departure'
    }
  ];
}

export function getInitialUsers(): User[] {
  return [
    {
      id: 'user_superuser_1',
      username: 'admin',
      displayName: 'Dr. Admin (Superuser)',
      role: 'superuser',
      pin: '9999',
      password: 'admin',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'user_runner_1',
      username: 'runner',
      displayName: 'Charge Nurse (Board Runner)',
      role: 'board_runner',
      pin: '1234',
      password: 'runner',
      active: true,
      createdAt: new Date().toISOString()
    }
  ];
}

// -------------------------------------------------------------
// DAILY 1:00 AM BREAK RESET LOGIC
// -------------------------------------------------------------

/**
 * Calculates the date identifier for the most recent 1:00 AM cycle (YYYY-MM-DD).
 * Before 1:00 AM local time, the cycle belongs to yesterday; at or after 1:00 AM, it belongs to today.
 */
export function getLatest1AmThreshold(d: Date = new Date()): string {
  const target = new Date(d);
  if (target.getHours() < 1) {
    target.setDate(target.getDate() - 1);
  }
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Resets break and lunch status across all rooms, runner slots, and bullpen breaks.
 */
export function resetDailyBreaks(state: BoardState): boolean {
  let modified = false;

  for (const dept of state.departments || []) {
    for (const runner of dept.runnerSlots || []) {
      if (runner.breakfastDone || runner.lunchDone || runner.breakfastTime || runner.lunchTime) {
        runner.breakfastDone = false;
        runner.lunchDone = false;
        runner.breakfastTime = null;
        runner.lunchTime = null;
        modified = true;
      }
    }
    for (const room of dept.rooms || []) {
      for (const slot of room.slots || []) {
        if (slot.breakfastDone || slot.lunchDone || slot.breakfastTime || slot.lunchTime) {
          slot.breakfastDone = false;
          slot.lunchDone = false;
          slot.breakfastTime = null;
          slot.lunchTime = null;
          modified = true;
        }
      }
    }
  }

  if (state.bullpenBreaks && Object.keys(state.bullpenBreaks).length > 0) {
    state.bullpenBreaks = {};
    modified = true;
  }

  state.lastBreakResetDate = getLatest1AmThreshold();

  return modified;
}

// -------------------------------------------------------------
// PUBLIC STORAGE API
// -------------------------------------------------------------

export function loadBoardState(): BoardState {
  if (!fs.existsSync(STATE_FILE)) {
    const initialBoard = getInitialBoardState([]);
    safeWriteJSON(STATE_FILE, initialBoard);
    return initialBoard;
  }
  const loaded = safeReadJSON<BoardState>(STATE_FILE, getInitialBoardState([]));
  if (!loaded.callTeamList || !Array.isArray(loaded.callTeamList)) {
    loaded.callTeamList = [];
  }
  if (!loaded.bullpenStaffIds || !Array.isArray(loaded.bullpenStaffIds)) {
    loaded.bullpenStaffIds = [];
  }
  if (!loaded.bullpenBreaks || typeof loaded.bullpenBreaks !== 'object') {
    loaded.bullpenBreaks = {};
  }
  if (!loaded.uniqueSchedules || !Array.isArray(loaded.uniqueSchedules) || loaded.uniqueSchedules.length === 0) {
    loaded.uniqueSchedules = getDefaultUniqueSchedules();
  }
  if (!loaded.infrequentStaffIds || !Array.isArray(loaded.infrequentStaffIds)) {
    loaded.infrequentStaffIds = [];
  }
  if (!loaded.infrequentStaffKeys || !Array.isArray(loaded.infrequentStaffKeys)) {
    loaded.infrequentStaffKeys = [];
  }

  // Automatic Daily 1:00 AM Break Reset check
  const threshold1Am = getLatest1AmThreshold();
  if (loaded.lastBreakResetDate !== threshold1Am) {
    const wasModified = resetDailyBreaks(loaded);
    loaded.lastBreakResetDate = threshold1Am;
    safeWriteJSON(STATE_FILE, loaded);
    if (wasModified) {
      recordAuditLog({
        actionType: 'BREAKFAST_TOGGLED',
        performedBy: 'System Scheduler (1:00 AM Auto-Reset)',
        userRole: 'superuser',
        details: 'Daily 1:00 AM reset: Cleared breakfast and lunch break completion for all rooms, runners, and bullpen staff'
      });
      broadcastStateChange();
    }
  }

  // Bidirectional sync for infrequent staff
  const infrequentIdSet = new Set(loaded.infrequentStaffIds);
  const infrequentKeySet = new Set((loaded.infrequentStaffKeys || []).map(k => k.toLowerCase()));

  for (const s of loaded.staff || []) {
    const qKey = (s.qgendaAbbr || '').toLowerCase();
    const lastKey = (s.lastName || '').toLowerCase();

    if (s.isInfrequent) {
      infrequentIdSet.add(s.id);
      if (qKey) infrequentKeySet.add(qKey);
      if (lastKey) infrequentKeySet.add(lastKey);
    } else if (infrequentIdSet.has(s.id) || (qKey && infrequentKeySet.has(qKey)) || (lastKey && infrequentKeySet.has(lastKey))) {
      s.isInfrequent = true;
    }
  }

  loaded.infrequentStaffIds = Array.from(infrequentIdSet);
  loaded.infrequentStaffKeys = Array.from(infrequentKeySet);
  return loaded;
}

export function saveBoardState(state: BoardState): void {
  state.lastUpdated = new Date().toISOString();
  safeWriteJSON(STATE_FILE, state);
  // Trigger SSE broadcast
  broadcastStateChange();
}

export function loadUsers(): User[] {
  if (!fs.existsSync(USERS_FILE)) {
    const users = getInitialUsers();
    safeWriteJSON(USERS_FILE, users);
    return users;
  }
  return safeReadJSON<User[]>(USERS_FILE, getInitialUsers());
}

export function saveUsers(users: User[]): void {
  safeWriteJSON(USERS_FILE, users);
}

export function loadAuditLog(): AuditLogEntry[] {
  return safeReadJSON<AuditLogEntry[]>(AUDIT_FILE, []);
}

export function recordAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
  const logs = loadAuditLog();
  const newEntry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  logs.unshift(newEntry);
  // Keep last 2,000 entries
  if (logs.length > 2000) {
    logs.length = 2000;
  }
  safeWriteJSON(AUDIT_FILE, logs);
}

// Global SSE listener registry
type SSEClient = (data: string) => void;
const sseClients = new Set<SSEClient>();

export function registerSSEClient(client: SSEClient): () => void {
  sseClients.add(client);
  return () => {
    sseClients.delete(client);
  };
}

export function broadcastStateChange(): void {
  const payload = JSON.stringify({ type: 'BOARD_UPDATED', timestamp: Date.now() });
  for (const client of sseClients) {
    try {
      client(payload);
    } catch {
      // Clean up dead sockets
      sseClients.delete(client);
    }
  }
}

// Background timer to automatically fire break reset at 1:00 AM every day
let timerInitialized = false;

export function initDaily1AmTimer(): void {
  if (timerInitialized) return;
  timerInitialized = true;

  const scheduleNext = () => {
    const now = new Date();
    const next1Am = new Date(now);
    if (now.getHours() >= 1) {
      next1Am.setDate(next1Am.getDate() + 1);
    }
    next1Am.setHours(1, 0, 0, 0);

    const msUntil1Am = Math.max(1000, next1Am.getTime() - now.getTime());
    const timer = setTimeout(() => {
      try {
        const state = loadBoardState();
        const threshold = getLatest1AmThreshold();
        if (state.lastBreakResetDate !== threshold) {
          const wasModified = resetDailyBreaks(state);
          state.lastBreakResetDate = threshold;
          safeWriteJSON(STATE_FILE, state);
          if (wasModified) {
            recordAuditLog({
              actionType: 'BREAKFAST_TOGGLED',
              performedBy: 'System Scheduler (1:00 AM Auto-Reset)',
              userRole: 'superuser',
              details: 'Daily 1:00 AM reset: Cleared breakfast and lunch break status across all rooms, runners, and bullpen staff'
            });
            broadcastStateChange();
          }
        }
      } catch (err) {
        console.error('Error during 1:00 AM break reset:', err);
      }
      scheduleNext();
    }, msUntil1Am);

    if (timer && typeof timer.unref === 'function') {
      timer.unref();
    }
  };

  scheduleNext();
}

// Auto-start on module evaluation
if (typeof process !== 'undefined') {
  initDaily1AmTimer();
}

