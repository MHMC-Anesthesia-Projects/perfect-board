import fs from 'fs';
import path from 'path';
import { BoardState, User, AuditLogEntry, Staff, Department } from '@/types/whiteboard';

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
    }
  };
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
