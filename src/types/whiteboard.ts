export type UserRole = 'superuser' | 'board_runner' | 'basic_user';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  pin: string; // 4-6 digit quick PIN for touchscreens
  password?: string;
  active: boolean;
  createdAt: string;
}

export type StaffCredential = 'MD' | 'CRNA' | 'Resident' | 'SRNA' | 'RN' | 'PA' | 'Fellow';

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  initials?: string;
  credentials: StaffCredential;
  phone: string;
  shift?: string;
  active: boolean;
  notes?: string;
}

export interface RoomSlot {
  id: string;
  roleType: 'primary' | 'secondary' | 'trainee';
  staffId: string | null;
  breakfastDone: boolean;
  lunchDone: boolean;
  breakfastTime?: string | null;
  lunchTime?: string | null;
  notes?: string;
}

export interface Room {
  id: string;
  name: string; // e.g. "1", "2", "EP1", "CCL1", "MRI", "P1"
  orderIndex: number;
  slots: RoomSlot[];
  procedure?: string;
  notes?: string;
}

export interface RunnerSlot {
  id: string;
  title: string; // e.g. "Runner 1", "Runner 2"
  staffId: string | null;
  breakfastDone: boolean;
  lunchDone: boolean;
  breakfastTime?: string | null;
  lunchTime?: string | null;
  notes?: string;
}

export interface Department {
  id: string;
  name: string; // e.g. "MAIN OR", "WEST PAV", "ORTHO", "VILLAGE", "9th Floor", "ENDO", "OB", "IVF"
  orderIndex: number;
  runnerSlots: RunnerSlot[];
  rooms: Room[];
}

export interface DepartureItem {
  id: string;
  name: string;
  orderIndex: number;
  role?: string;
  timeEstimate?: string;
  notes?: string;
}

export interface LateShiftItem {
  id: string;
  name: string;
  timeCategory: string; // e.g. "4p", "5p", "7p", "8p", "7p-7a"
  orderIndex: number;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actionType: 
    | 'STAFF_ASSIGNED' 
    | 'STAFF_UNASSIGNED' 
    | 'STAFF_MOVED'
    | 'BREAKFAST_TOGGLED' 
    | 'LUNCH_TOGGLED' 
    | 'NOTE_UPDATED' 
    | 'RUNNER_ASSIGNED'
    | 'LAYOUT_CHANGED'
    | 'STAFF_CREATED'
    | 'STAFF_UPDATED'
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'SCRAPER_SYNCED'
    | 'DEPARTURE_UPDATED'
    | 'LATES_UPDATED';
  performedBy: string;
  userRole: UserRole;
  targetName?: string;
  locationName?: string;
  details: string;
}

export interface ScraperConfig {
  portalType: 'qgenda' | 'amion' | 'custom';
  portalUrl: string;
  username: string;
  password: string;
  autoSyncIntervalMinutes: number;
  lastSyncTime?: string | null;
  lastSyncStatus?: 'idle' | 'success' | 'failed';
  mockMode: boolean;
}

export interface BoardState {
  version: number;
  lastUpdated: string;
  departments: Department[];
  staff: Staff[];
  departureList: DepartureItem[];
  departureNotes: string;
  latesList: LateShiftItem[];
  latesNotes: string;
  scraperConfig: ScraperConfig;
}
