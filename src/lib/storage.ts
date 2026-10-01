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
// INITIAL SEED DATA (EXACT PHOTO REPLICA)
// -------------------------------------------------------------

export function getInitialStaff(): Staff[] {
  const staffList: Array<{ name: string; cred: 'MD' | 'CRNA' | 'Resident' | 'SRNA'; phone: string }> = [
    // Runners & Placed
    { name: 'Cavanaugh', cred: 'MD', phone: '(555) 234-5678' },
    { name: 'Shenoy', cred: 'MD', phone: '(555) 345-6789' },
    { name: 'Chuan', cred: 'MD', phone: '(555) 456-7890' },
    { name: 'Patel P', cred: 'MD', phone: '(555) 567-8901' },
    { name: 'Gunn', cred: 'MD', phone: '(555) 678-9012' },
    { name: 'Hirsch', cred: 'MD', phone: '(555) 789-0123' },
    { name: 'Martinez R', cred: 'MD', phone: '(555) 890-1234' },
    { name: 'Tallackson', cred: 'MD', phone: '(555) 901-2345' },
    { name: 'Choi', cred: 'CRNA', phone: '(555) 111-2233' },
    { name: 'Gashler', cred: 'CRNA', phone: '(555) 222-3344' },
    { name: 'Vantassel', cred: 'CRNA', phone: '(555) 333-4455' },
    { name: 'Matre', cred: 'CRNA', phone: '(555) 444-5566' },
    { name: 'McGuire', cred: 'CRNA', phone: '(555) 555-6677' },
    { name: 'Hughes', cred: 'CRNA', phone: '(555) 666-7788' },
    { name: 'Kovac', cred: 'CRNA', phone: '(555) 777-8899' },
    { name: 'Beard', cred: 'CRNA', phone: '(555) 888-9900' },
    { name: 'Markette', cred: 'CRNA', phone: '(555) 999-0011' },
    { name: 'Andes M S', cred: 'CRNA', phone: '(555) 123-4401' },
    { name: 'Walker', cred: 'CRNA', phone: '(555) 123-4402' },
    { name: 'Litina', cred: 'CRNA', phone: '(555) 123-4403' },
    { name: 'Tran', cred: 'CRNA', phone: '(555) 123-4404' },
    { name: 'Hiller', cred: 'CRNA', phone: '(555) 123-4405' },
    { name: 'Tekwe', cred: 'CRNA', phone: '(555) 123-4406' },
    { name: 'Flemming', cred: 'CRNA', phone: '(555) 123-4407' },
    { name: 'Louis', cred: 'CRNA', phone: '(555) 123-4408' },
    { name: 'Ramesh', cred: 'CRNA', phone: '(555) 123-4409' },
    { name: 'Normand', cred: 'CRNA', phone: '(555) 123-4410' },
    { name: 'Shevchenko', cred: 'CRNA', phone: '(555) 123-4411' },
    { name: 'Song V', cred: 'CRNA', phone: '(555) 123-4412' },
    { name: 'Crossley', cred: 'CRNA', phone: '(555) 123-4413' },
    { name: 'Towne', cred: 'CRNA', phone: '(555) 123-4414' },
    { name: 'Jeffcoat', cred: 'CRNA', phone: '(555) 123-4415' },
    { name: 'Holton', cred: 'CRNA', phone: '(555) 123-4416' },
    { name: 'Mankarious', cred: 'CRNA', phone: '(555) 123-4417' },
    { name: 'Paloian', cred: 'CRNA', phone: '(555) 123-4418' },
    { name: 'Shirak', cred: 'MD', phone: '(555) 123-4419' },
    { name: 'Dwarakanath', cred: 'MD', phone: '(555) 123-4420' },
    { name: 'Patagoc', cred: 'CRNA', phone: '(555) 123-4421' },
    { name: 'Vu A', cred: 'CRNA', phone: '(555) 123-4422' },
    { name: 'Hudok', cred: 'CRNA', phone: '(555) 123-4423' },
    { name: 'Moody M', cred: 'CRNA', phone: '(555) 123-4424' },
    { name: 'Song B', cred: 'CRNA', phone: '(555) 123-4425' },
    { name: 'Lu', cred: 'CRNA', phone: '(555) 123-4426' },
    { name: 'Njogopa', cred: 'CRNA', phone: '(555) 123-4427' },
    { name: 'Mann', cred: 'MD', phone: '(555) 123-4428' },
    { name: 'Guye', cred: 'CRNA', phone: '(555) 123-4429' },
    { name: 'Schweikert', cred: 'CRNA', phone: '(555) 123-4430' },
    { name: 'Li', cred: 'CRNA', phone: '(555) 123-4431' },
    { name: 'Cut', cred: 'CRNA', phone: '(555) 123-4432' },
    { name: 'Rutas', cred: 'CRNA', phone: '(555) 123-4433' },

    // Bullpen Staff
    // A-F
    { name: 'Alaniz', cred: 'CRNA', phone: '(555) 201-0001' },
    { name: 'Ataga', cred: 'CRNA', phone: '(555) 201-0002' },
    { name: 'Baerenstecher', cred: 'CRNA', phone: '(555) 201-0003' },
    { name: 'Bernell', cred: 'CRNA', phone: '(555) 201-0004' },
    { name: 'Cuzick', cred: 'CRNA', phone: '(555) 201-0005' },
    { name: 'Chen R', cred: 'CRNA', phone: '(555) 201-0006' },
    { name: 'Carvajal', cred: 'CRNA', phone: '(555) 201-0007' },
    { name: 'Chang', cred: 'CRNA', phone: '(555) 201-0008' },
    { name: 'Fuller', cred: 'CRNA', phone: '(555) 201-0009' },
    { name: 'Daumerie', cred: 'CRNA', phone: '(555) 201-0010' },

    // G-L
    { name: 'Isham', cred: 'CRNA', phone: '(555) 202-0001' },
    { name: 'Jansen', cred: 'CRNA', phone: '(555) 202-0002' },
    { name: 'Lamba', cred: 'CRNA', phone: '(555) 202-0003' },
    { name: 'Lowe', cred: 'CRNA', phone: '(555) 202-0004' },
    { name: 'Keyhan', cred: 'CRNA', phone: '(555) 202-0005' },
    { name: 'Li Tommy', cred: 'CRNA', phone: '(555) 202-0006' },
    { name: 'Kent', cred: 'CRNA', phone: '(555) 202-0007' },
    { name: 'Lam V', cred: 'CRNA', phone: '(555) 202-0008' },

    // M-R
    { name: 'Mutyala', cred: 'CRNA', phone: '(555) 203-0001' },
    { name: 'Nguyen K', cred: 'CRNA', phone: '(555) 203-0002' },
    { name: 'Panagott', cred: 'CRNA', phone: '(555) 203-0003' },
    { name: 'Rojas', cred: 'CRNA', phone: '(555) 203-0004' },
    { name: 'Patel J', cred: 'CRNA', phone: '(555) 203-0005' },
    { name: 'Roach', cred: 'CRNA', phone: '(555) 203-0006' },

    // S-Z
    { name: 'Shetty', cred: 'CRNA', phone: '(555) 204-0001' },
    { name: 'Shrockel', cred: 'CRNA', phone: '(555) 204-0002' },
    { name: 'J Kim', cred: 'CRNA', phone: '(555) 204-0003' },
    { name: 'Shich', cred: 'CRNA', phone: '(555) 204-0004' },
    { name: 'Shaw', cred: 'CRNA', phone: '(555) 204-0005' },
    { name: 'Schroepfer', cred: 'CRNA', phone: '(555) 204-0006' },
    { name: 'Taylor', cred: 'CRNA', phone: '(555) 204-0007' },
    { name: 'Walls', cred: 'CRNA', phone: '(555) 204-0008' },
    { name: 'Zembau', cred: 'CRNA', phone: '(555) 204-0009' },
    { name: 'Yi', cred: 'CRNA', phone: '(555) 204-0010' },
    { name: 'Young', cred: 'CRNA', phone: '(555) 204-0011' },
    { name: 'Uuan', cred: 'CRNA', phone: '(555) 204-0012' },
    { name: 'Williams', cred: 'CRNA', phone: '(555) 204-0013' }
  ];

  return staffList.map((s, idx) => {
    const parts = s.name.trim().split(' ');
    const firstName = parts.length > 1 ? parts[0] : '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    return {
      id: `staff_${s.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${idx}`,
      firstName: firstName || s.name,
      lastName: lastName,
      initials: (firstName ? firstName[0] : '') + lastName[0],
      credentials: s.cred,
      phone: s.phone,
      shift: '07:00 - 15:30',
      active: true,
      notes: ''
    };
  });
}

export function getInitialBoardState(staff: Staff[]): BoardState {
  const staffByName = (nameQuery: string): string | null => {
    const found = staff.find(s => 
      s.lastName.toLowerCase() === nameQuery.toLowerCase() ||
      `${s.firstName} ${s.lastName}`.toLowerCase() === nameQuery.toLowerCase()
    );
    return found ? found.id : null;
  };

  const createRoom = (deptId: string, name: string, orderIdx: number, staffName?: string, notes?: string) => ({
    id: `${deptId}_room_${name}`,
    name,
    orderIndex: orderIdx,
    notes: notes || '',
    slots: [
      {
        id: `${deptId}_room_${name}_slot_0`,
        roleType: 'primary' as const,
        staffId: staffName ? staffByName(staffName) : null,
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
          staffId: staffByName('Cavanaugh'),
          breakfastDone: false,
          lunchDone: false
        },
        {
          id: 'runner_main_or_2',
          title: 'Runner 2',
          staffId: staffByName('Shenoy'),
          breakfastDone: false,
          lunchDone: false
        }
      ],
      rooms: [
        createRoom('dept_main_or', '1', 1),
        createRoom('dept_main_or', '2', 2, 'Choi'),
        createRoom('dept_main_or', '3', 3, 'Gashler'),
        createRoom('dept_main_or', '4', 4, 'Vantassel'),
        createRoom('dept_main_or', '5', 5, 'Matre'),
        createRoom('dept_main_or', '6', 6, 'McGuire'),
        createRoom('dept_main_or', '7', 7),
        createRoom('dept_main_or', '8', 8, 'Chen R'),
        createRoom('dept_main_or', '9', 9, 'Njogopa'),
        createRoom('dept_main_or', '10', 10, 'Hughes'),
        createRoom('dept_main_or', '11', 11, 'Kovac'),
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
          staffId: staffByName('Chuan'),
          breakfastDone: false,
          lunchDone: false
        },
        {
          id: 'runner_west_pav_2',
          title: 'Runner 2',
          staffId: staffByName('Patel P'),
          breakfastDone: false,
          lunchDone: false
        }
      ],
      rooms: [
        createRoom('dept_west_pav', '1', 1, 'Beard'),
        createRoom('dept_west_pav', '2', 2, 'Markette'),
        createRoom('dept_west_pav', '3', 3, 'Andes M S'),
        createRoom('dept_west_pav', '4', 4, 'Walker'),
        createRoom('dept_west_pav', '5', 5),
        createRoom('dept_west_pav', '6', 6, 'Litina'),
        createRoom('dept_west_pav', '7', 7, 'Tran'),
        createRoom('dept_west_pav', '8', 8),
        createRoom('dept_west_pav', '9', 9),
        createRoom('dept_west_pav', '10', 10),
        createRoom('dept_west_pav', '11', 11, 'Hiller'),
        createRoom('dept_west_pav', '12', 12, 'Tekwe')
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
          staffId: staffByName('Gunn'),
          breakfastDone: false,
          lunchDone: false
        }
      ],
      rooms: [
        createRoom('dept_ortho', '1', 1, 'Flemming'),
        createRoom('dept_ortho', '2', 2, 'Louis'),
        createRoom('dept_ortho', '3', 3),
        createRoom('dept_ortho', '4', 4, 'Ramesh'),
        createRoom('dept_ortho', '5', 5, 'Normand'),
        createRoom('dept_ortho', '6', 6, 'Shevchenko'),
        createRoom('dept_ortho', '7', 7, 'Song V'),
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
          staffId: staffByName('Hirsch'),
          breakfastDone: false,
          lunchDone: false
        }
      ],
      rooms: [
        createRoom('dept_village', '1', 1, 'Crossley'),
        createRoom('dept_village', '2', 2, 'Towne'),
        createRoom('dept_village', '3', 3, 'Jeffcoat'),
        createRoom('dept_village', '4', 4, 'Holton'),
        createRoom('dept_village', '5', 5, 'Mankarious'),
        createRoom('dept_village', '6', 6, 'Paloian'),
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
        createRoom('dept_9th_floor', 'CCL', 3, 'Shirak'),
        createRoom('dept_9th_floor', 'CCL2', 4, 'Dwarakanath'),
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
          staffId: staffByName('Martinez R'),
          breakfastDone: false,
          lunchDone: false
        }
      ],
      rooms: [
        createRoom('dept_endo', '1', 1, 'Patagoc'),
        createRoom('dept_endo', '2', 2),
        createRoom('dept_endo', '3', 3, 'Vu A'),
        createRoom('dept_endo', '4', 4, 'Hudok'),
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
          staffId: staffByName('Tallackson'),
          breakfastDone: false,
          lunchDone: false
        }
      ],
      rooms: [
        createRoom('dept_ob', '1', 1, 'Moody M'),
        createRoom('dept_ob', '2', 2, 'Song B'),
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
        createRoom('dept_ivf', 'LU', 1, 'Lu')
      ]
    }
  ];

  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    departments,
    staff,
    departureList: [
      { id: 'dep_1', name: 'KOVAC', orderIndex: 0 },
      { id: 'dep_2', name: 'MANN', orderIndex: 1 },
      { id: 'dep_3', name: 'CAV', orderIndex: 2 },
      { id: 'dep_4', name: 'SHIRAK', orderIndex: 3 },
      { id: 'dep_5', name: 'GASHLER', orderIndex: 4 },
      { id: 'dep_6', name: 'PATEL', orderIndex: 5 },
      { id: 'dep_7', name: 'CHUAN', orderIndex: 6 },
      { id: 'dep_8', name: 'CHOI', orderIndex: 7 }
    ],
    callTeamList: [
      { id: 'call_1', role: 'CV', doctorName: 'KD', orderIndex: 0 },
      { id: 'call_2', role: '3rd Call', doctorName: 'SHENOY', orderIndex: 1 },
      { id: 'call_3', role: '2nd Call', doctorName: 'TALL', orderIndex: 2 },
      { id: 'call_4', role: '1st Call', doctorName: 'LU', orderIndex: 3 },
      { id: 'call_5', role: 'OB Call', doctorName: 'LU', orderIndex: 4 }
    ],
    departureNotes: 'RUTS:\nRoom Turnover & General Notes',
    latesList: [
      { id: 'late_1', timeCategory: '4p', name: 'CHUAN', orderIndex: 0 },
      { id: 'late_2', timeCategory: '5p', name: 'HIRSCH', orderIndex: 1 },
      { id: 'late_3', timeCategory: '5p', name: 'ANDES', orderIndex: 2 },
      { id: 'late_4', timeCategory: '5p', name: 'MCGUIRE', orderIndex: 3 },
      { id: 'late_5', timeCategory: '5p', name: 'SCHWEIKERT', orderIndex: 4 },
      { id: 'late_6', timeCategory: '5p', name: 'WALKER', orderIndex: 5 },
      { id: 'late_7', timeCategory: '7p', name: 'GUYE', orderIndex: 6 },
      { id: 'late_8', timeCategory: '7p', name: 'PATAGOC', orderIndex: 7 },
      { id: 'late_9', timeCategory: '7p', name: 'TEKWE', orderIndex: 8 },
      { id: 'late_10', timeCategory: '8p', name: 'BEARD', orderIndex: 9 },
      { id: 'late_11', timeCategory: '8p', name: 'FLEMMING', orderIndex: 10 },
      { id: 'late_12', timeCategory: '8p', name: 'LI', orderIndex: 11 },
      { id: 'late_13', timeCategory: '8p', name: 'TRAN', orderIndex: 12 },
      { id: 'late_14', timeCategory: '8p', name: 'CUT', orderIndex: 13 },
      { id: 'late_15', timeCategory: '7p-7a', name: 'RUTAS', orderIndex: 14 },
      { id: 'late_16', timeCategory: '7p-7a', name: 'NORMAND', orderIndex: 15 }
    ],
    latesNotes: 'Coverage team in effect after 15:00',
    bullpenStaffIds: [],
    scraperConfig: {
      portalType: 'qgenda',
      portalUrl: 'https://app.qgenda.com/login',
      username: 'or_coordinator@hospital.org',
      password: '••••••••••••',
      autoSyncIntervalMinutes: 15,
      lastSyncTime: new Date().toISOString(),
      lastSyncStatus: 'success',
      mockMode: true
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
    const staff = getInitialStaff();
    const initialBoard = getInitialBoardState(staff);
    safeWriteJSON(STATE_FILE, initialBoard);
    return initialBoard;
  }
  const loaded = safeReadJSON<BoardState>(STATE_FILE, getInitialBoardState(getInitialStaff()));
  if (!loaded.callTeamList || !Array.isArray(loaded.callTeamList)) {
    loaded.callTeamList = [
      { id: 'call_1', role: 'CV', doctorName: 'KD', orderIndex: 0 },
      { id: 'call_2', role: '3rd Call', doctorName: 'SHENOY', orderIndex: 1 },
      { id: 'call_3', role: '2nd Call', doctorName: 'TALL', orderIndex: 2 },
      { id: 'call_4', role: '1st Call', doctorName: 'LU', orderIndex: 3 },
      { id: 'call_5', role: 'OB Call', doctorName: 'LU', orderIndex: 4 }
    ];
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
