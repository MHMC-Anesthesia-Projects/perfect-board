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
  facility?: string;
  assignedRoom?: string;
  qgendaAbbr?: string;
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
  departed?: boolean; // When true, struck through on the board
  category?: 'post_call' | 'non_call'; // 'post_call' or 'non_call' (defaults to 'non_call')
  role?: string;
  timeEstimate?: string;
  notes?: string;
  orderNumber?: number;
  qgendaAbbr?: string;
  assignedRoom?: string;
}

export interface LateShiftItem {
  id: string;
  name: string;
  timeCategory: string; // e.g. "4p", "5p", "7p", "8p", "7p-7a"
  orderIndex: number;
  notes?: string;
  orderNumber?: number;
  qgendaAbbr?: string;
  assignedRoom?: string;
  role?: string;
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
    | 'RUNNER_SLOT_ADDED'
    | 'RUNNER_SLOT_REMOVED'
    | 'DEPARTURE_STRUCK_TOGGLED'
    | 'LAYOUT_CHANGED'
    | 'STAFF_CREATED'
    | 'STAFF_UPDATED'
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'SCRAPER_SYNCED'
    | 'DEPARTURE_UPDATED'
    | 'DEPARTURE_REORDERED'
    | 'LATES_UPDATED'
    | 'CALL_TEAM_UPDATED'
    | 'BULLPEN_UPDATED';
  performedBy: string;
  userRole: UserRole;
  targetName?: string;
  locationName?: string;
  details: string;
}

export interface CallTeamItem {
  id: string;
  role: string;       // e.g. "CV", "1st Call", "2nd Call", "3rd Call", "OB Call"
  doctorName: string; // e.g. "KD", "SHENOY", "TALL", "LU"
  orderIndex: number;
  qgendaAbbr?: string;
}

export interface ScraperConfig {
  portalType: 'oneusap' | 'qgenda' | 'amion' | 'custom';
  portalUrl: string;
  username: string;
  password: string;
  autoSyncIntervalMinutes: number;
  lastSyncTime?: string | null;
  lastSyncStatus?: 'idle' | 'success' | 'failed';
  mockMode: boolean;
  selectedFacilities?: string[];
}

export interface ScrapedWorkingStaffItem {
  id: string;
  displayName: string;
  lastName: string;
  firstName: string;
  credentials: StaffCredential;
  phone: string;
  facility: string;
  shift?: string;
  roomAssignment?: string;
  assignedRooms?: string[];
  startTime?: string;
  rawId?: string;
  qgendaAbbr?: string;
  orderNumber?: number;
}

export interface ScraperPreviewResult {
  success: boolean;
  portalType: string;
  sourceUrl: string;
  timestamp: string;
  facilities: string[];
  selectedFacilities?: string[];
  availableFacilities?: Array<{ code: string; fullCode: string; name: string }>;
  workingStaff: ScrapedWorkingStaffItem[];
  departureCandidates: Array<{
    name: string;
    category: 'post_call' | 'non_call';
    shift?: string;
    facility: string;
    qgendaAbbr?: string;
    roomAssignment?: string;
    orderNumber?: number;
  }>;
  lateCandidates: Array<{
    name: string;
    timeCategory: string;
    facility: string;
    role: string;
    qgendaAbbr?: string;
    roomAssignment?: string;
    orderNumber?: number;
  }>;
  callTeamCandidates: Array<{
    role: string;
    doctorName: string;
    qgendaAbbr?: string;
    orderNumber?: number;
  }>;
  rawCounts: {
    totalWorkingStaff: number;
    totalDocs: number;
    totalAnes: number;
    mhmcStaffCount: number;
    mhvilStaffCount: number;
    phoneNumbersCount: number;
    facilityStaffCounts?: Record<string, number>;
  };
  error?: string;
}

export interface BoardState {
  version: number;
  lastUpdated: string;
  departments: Department[];
  staff: Staff[];
  departureList: DepartureItem[];
  callTeamList: CallTeamItem[];
  bullpenStaffIds?: string[];
  departureNotes: string;
  latesList: LateShiftItem[];
  latesNotes: string;
  scraperConfig: ScraperConfig;
}
