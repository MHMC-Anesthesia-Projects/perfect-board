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
  displayName?: string; // Custom magnet name (e.g. Dr. Dave, Johnny, Smith, J.)
  initials?: string;
  credentials: StaffCredential;
  phone: string;
  shift?: string;
  active: boolean;
  notes?: string;
  facility?: string;
  assignedRoom?: string;
  assignedRooms?: string[];
  qgendaAbbr?: string;
  orderNumber?: number;
  isInfrequent?: boolean;
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
  category?: 'post_call' | 'special' | 'non_call'; // 'post_call', 'special' (atypical times), or 'non_call'
  role?: string;
  timeEstimate?: string; // e.g. "2p", "1:30p"
  notes?: string;
  orderNumber?: number;
  qgendaAbbr?: string;
  assignedRoom?: string;
}

export interface LateShiftItem {
  id: string;
  name: string;
  timeCategory: string; // e.g. "special", "3p", "4p", "5p", "7p", "8p", "7p-7a"
  orderIndex: number;
  notes?: string;
  orderNumber?: number;
  qgendaAbbr?: string;
  assignedRoom?: string;
  role?: string;
  timeEstimate?: string; // Atypical time e.g. "2p"
}

export interface UniqueScheduleRule {
  id: string;
  providerName: string;
  qgendaAbbr?: string;
  fixedShift: string; // e.g. "5p", "4p", "3p", "2p", "7p-7a"
  role: 'MD' | 'CRNA' | 'ANY';
  facilityCondition?: string;
  active: boolean;
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
    | 'BULLPEN_UPDATED'
    | 'AUTO_ASSIGNED_ROOMS'
    | 'UNIQUE_SCHEDULE_UPDATED';
  performedBy: string;
  userRole: UserRole;
  targetName?: string;
  locationName?: string;
  details: string;
}

export interface CallTeamItem {
  id: string;
  role: string;       // e.g. "CV", "Call 3", "Call 2", "Call 1", "OB"
  doctorName: string; // e.g. "KD", "SHENOY", "TALL", "LU"
  orderIndex: number;
  qgendaAbbr?: string;
  orderNumber?: number;
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
    category: 'post_call' | 'special' | 'non_call';
    shift?: string;
    facility: string;
    qgendaAbbr?: string;
    roomAssignment?: string;
    orderNumber?: number;
  }>;
  lateCandidates: Array<{
    name: string;
    timeCategory: string;
    timeEstimate?: string;
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
  roomAssignments?: Array<{
    facility: string;
    room: string;
    time: string;
    doc: string;
    anes: string;
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
  bullpenBreaks?: Record<string, { breakfastDone: boolean; lunchDone: boolean; breakfastTime?: string | null; lunchTime?: string | null }>;
  lastBreakResetDate?: string;
  infrequentStaffIds?: string[];
  infrequentStaffKeys?: string[];
  departureNotes: string;
  latesList: LateShiftItem[];
  latesNotes: string;
  scraperConfig: ScraperConfig;
  uniqueSchedules?: UniqueScheduleRule[];
}
