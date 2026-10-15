import fs from 'fs';
import path from 'path';
import { getSupabaseServerClient } from './supabase';
import { PortalShiftRule, PortalCombinationRule } from '@/types/whiteboard';

const DATA_DIR = path.join(process.cwd(), 'data');
const RULES_FILE = path.join(DATA_DIR, 'portal_rules.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Baseline Seed Shift Rules for USAP / Memorial City and affiliated surgery centers.
 */
export function getDefaultPortalShiftRules(): PortalShiftRule[] {
  return [
    // --- MHMC Day Shifts ---
    {
      id: 'rule_dr8h_mhmc',
      pattern: 'Dr8h_MHMC',
      facilityCode: 'MHMC',
      roleType: 'MD',
      shiftHours: '7a-3p',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '3p',
      lateCategory: '3p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Doctor 8-hour shift, 3p departure',
      priority: 10,
      active: true
    },
    {
      id: 'rule_10h_mhmc',
      pattern: '10h_MHMC',
      facilityCode: 'MHMC',
      roleType: 'CRNA',
      shiftHours: '7a-5p',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '5p',
      lateCategory: '5p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'CRNA 10-hour shift, 5p departure',
      priority: 10,
      active: true
    },
    {
      id: 'rule_dr10h_mhmc',
      pattern: 'Dr10h_MHMC',
      facilityCode: 'MHMC',
      roleType: 'MD',
      shiftHours: '7a-5p',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '5p',
      lateCategory: '5p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Doctor 10-hour shift, 5p departure',
      priority: 10,
      active: true
    },
    {
      id: 'rule_12h_mhmc',
      pattern: '12h_MHMC',
      facilityCode: 'MHMC',
      roleType: 'CRNA',
      shiftHours: '7a-7p',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '7p',
      lateCategory: '7p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'CRNA 12-hour day shift, 7p departure',
      priority: 10,
      active: true
    },
    {
      id: 'rule_13h_mhmc',
      pattern: '13h_MHMC',
      facilityCode: 'MHMC',
      roleType: 'CRNA',
      shiftHours: '7a-8p',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '8p',
      lateCategory: '8p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'CRNA 13-hour shift, 8p departure',
      priority: 10,
      active: true
    },

    // --- MHMC Nocturnist & Call Shifts ---
    {
      id: 'rule_12h_7p_noct_mhmc',
      pattern: '12h-7p:Noct_MHMC',
      facilityCode: 'MHMC',
      roleType: 'CRNA',
      shiftHours: '7p-7a',
      departureCategory: 'none',
      lateCategory: '7p-7a',
      boardStatus: 'include',
      roomAssignmentStrategy: 'unassigned_pool',
      notes: 'Night Nocturnist CRNA (7p-7a)',
      priority: 20,
      active: true
    },
    {
      id: 'rule_l1_mhmc',
      pattern: 'L1_MHMC',
      facilityCode: 'MHMC',
      roleType: 'ANY',
      shiftHours: '7p-7a',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '7p',
      lateCategory: '7p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Late 1 in-house call team, 7p departure to call',
      priority: 15,
      active: true
    },
    {
      id: 'rule_cihobpc_mhmc',
      pattern: 'CIHOBPC_MHMC',
      facilityCode: 'MHMC',
      roleType: 'ANY',
      shiftHours: '7a-10a',
      departureCategory: 'post_call',
      badgeNote: 'postOB',
      lateCategory: 'none',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Post-OB Call working morning',
      priority: 20,
      active: true
    },
    {
      id: 'rule_drwrk_mhmc',
      pattern: 'DrWrk_MHMC',
      facilityCode: 'MHMC',
      roleType: 'MD',
      shiftHours: 'Day Work',
      departureCategory: 'non_call_queue',
      lateCategory: 'none',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'General daytime physician work, ordered by departure sequence',
      priority: 5,
      active: true
    },
    {
      id: 'rule_drwor_mhmc',
      pattern: 'DrWOR_MHMC',
      facilityCode: 'MHMC',
      roleType: 'MD',
      shiftHours: 'Day Work',
      departureCategory: 'none',
      lateCategory: '3p',
      badgeNote: 'WOR',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Doctor working OR shift (3p late candidate with WOR badge)',
      priority: 15,
      active: true
    },
    {
      id: 'rule_wor_mhmc',
      pattern: 'WOR_MHMC',
      facilityCode: 'MHMC',
      roleType: 'CRNA',
      shiftHours: 'Day Work',
      departureCategory: 'none',
      lateCategory: '3p',
      badgeNote: 'WOR',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Working anesthetist OR shift (3p late candidate with WOR badge)',
      priority: 15,
      active: true
    },
    {
      id: 'rule_wov_mhmc',
      pattern: 'WOV_MHMC',
      facilityCode: 'MHMC',
      roleType: 'CRNA',
      shiftHours: 'Day Work',
      departureCategory: 'none',
      lateCategory: '3p',
      badgeNote: 'WOV',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Working anesthetist at Village (3p late candidate with WOV badge)',
      priority: 15,
      active: true
    },
    {
      id: 'rule_ciham_mhmc',
      pattern: 'CIHAM_MHMC',
      facilityCode: 'MHMC',
      roleType: 'MD',
      shiftHours: '7a-3p',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '3p',
      lateCategory: 'none',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Daytime CIH attending (7a-3p)',
      priority: 10,
      active: true
    },
    {
      id: 'rule_cihobam_mhmc',
      pattern: 'CIHOBAM_MHMC',
      facilityCode: 'MHMC',
      roleType: 'CRNA',
      shiftHours: '7a-7p',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '7p',
      lateCategory: '7p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Day OB CRNA (7a-7p)',
      priority: 15,
      active: true
    },
    {
      id: 'rule_cihobpm_mhmc',
      pattern: 'CIHOBPM_MHMC',
      facilityCode: 'MHMC',
      roleType: 'CRNA',
      shiftHours: '7p-7a',
      departureCategory: 'none',
      lateCategory: '7p-7a',
      boardStatus: 'include',
      roomAssignmentStrategy: 'unassigned_pool',
      notes: 'Night OB CRNA (7p-7a)',
      priority: 15,
      active: true
    },

    // --- Village SC Shifts ---
    {
      id: 'rule_dr8h_mhvil',
      pattern: 'Dr8h_MHVIL-SC',
      facilityCode: 'MHVIL-SC',
      roleType: 'MD',
      shiftHours: '7a-3p',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '3p',
      lateCategory: '3p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Village SC MD 8h shift',
      priority: 10,
      active: true
    },
    {
      id: 'rule_10h_mhvil',
      pattern: '10h_MHVIL-SC',
      facilityCode: 'MHVIL-SC',
      roleType: 'CRNA',
      shiftHours: '7a-5p',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '5p',
      lateCategory: '5p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Village SC CRNA 10h shift',
      priority: 10,
      active: true
    },

    // --- Standard Clean Shift Names & Badges ---
    {
      id: 'rule_std_3p',
      pattern: '3p',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7a-3p',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '3p',
      lateCategory: '3p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Standard 3p departure shift',
      priority: 1,
      active: true
    },
    {
      id: 'rule_std_4p',
      pattern: '4p',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7a-4p',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '4p',
      lateCategory: '4p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Standard 4p departure shift',
      priority: 1,
      active: true
    },
    {
      id: 'rule_std_5p',
      pattern: '5p',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7a-5p',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '5p',
      lateCategory: '5p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Standard 5p departure shift',
      priority: 1,
      active: true
    },
    {
      id: 'rule_std_7p',
      pattern: '7p',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7a-7p',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '7p',
      lateCategory: '7p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Standard 7p late shift',
      priority: 1,
      active: true
    },
    {
      id: 'rule_std_8p',
      pattern: '8p',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7a-8p',
      departureCategory: 'scheduled_time',
      departureTimeEstimate: '8p',
      lateCategory: '8p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Standard 8p late shift',
      priority: 1,
      active: true
    },
    {
      id: 'rule_std_postob',
      pattern: 'postOB',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7a-10a',
      departureCategory: 'post_call',
      badgeNote: 'postOB',
      lateCategory: 'none',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Post-OB shift',
      priority: 5,
      active: true
    },
    {
      id: 'rule_std_postc1',
      pattern: 'postC1',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7a-10a',
      departureCategory: 'post_call',
      badgeNote: 'postC1',
      lateCategory: 'none',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Post-Call 1 shift',
      priority: 5,
      active: true
    },
    {
      id: 'rule_std_postc2',
      pattern: 'postC2',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7a-10a',
      departureCategory: 'post_call',
      badgeNote: 'postC2',
      lateCategory: 'none',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Post-Call 2 shift',
      priority: 5,
      active: true
    },
    {
      id: 'rule_std_postcv',
      pattern: 'postCV',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7a-10a',
      departureCategory: 'post_call',
      badgeNote: 'postCV',
      lateCategory: 'none',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Post-CV call shift',
      priority: 5,
      active: true
    },
    {
      id: 'rule_std_prec1',
      pattern: 'preC1',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7a-3p',
      departureCategory: 'non_call_queue',
      badgeNote: 'preC1',
      lateCategory: 'none',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Pre-Call 1 shift, regular day departure with preC1 badge',
      priority: 5,
      active: true
    },
    {
      id: 'rule_std_prec2',
      pattern: 'preC2',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7a-3p',
      departureCategory: 'non_call_queue',
      badgeNote: 'preC2',
      lateCategory: 'none',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Pre-Call 2 shift, regular day departure with preC2 badge',
      priority: 5,
      active: true
    },
    {
      id: 'rule_std_prec3',
      pattern: 'preC3',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7a-3p',
      departureCategory: 'non_call_queue',
      badgeNote: 'preC3',
      lateCategory: 'none',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Pre-Call 3 shift, regular day departure with preC3 badge',
      priority: 5,
      active: true
    },
    {
      id: 'rule_std_precv',
      pattern: 'preCV',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7a-3p',
      departureCategory: 'non_call_queue',
      badgeNote: 'preCV',
      lateCategory: 'none',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Pre-CV call shift, regular day departure with preCV badge',
      priority: 5,
      active: true
    },
    {
      id: 'rule_std_c1',
      pattern: 'C1',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7p-7a',
      departureCategory: 'none',
      lateCategory: '7p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Call 1 in-house assignment',
      priority: 5,
      active: true
    },
    {
      id: 'rule_std_c2',
      pattern: 'C2',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7p-7a',
      departureCategory: 'none',
      lateCategory: '7p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Call 2 in-house assignment',
      priority: 5,
      active: true
    },
    {
      id: 'rule_std_c3',
      pattern: 'C3',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7p-7a',
      departureCategory: 'none',
      lateCategory: '7p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'Call 3 assignment',
      priority: 5,
      active: true
    },
    {
      id: 'rule_std_cv',
      pattern: 'CV',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7p-7a',
      departureCategory: 'none',
      lateCategory: '7p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'CV Call assignment',
      priority: 5,
      active: true
    },
    {
      id: 'rule_std_ob',
      pattern: 'OB',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: '7p-7a',
      departureCategory: 'none',
      lateCategory: '7p',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'OB Call assignment',
      priority: 5,
      active: true
    },
    {
      id: 'rule_std_day',
      pattern: 'Day',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: 'Day Work',
      departureCategory: 'non_call_queue',
      lateCategory: 'none',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: 'General daytime clinical assignment',
      priority: 1,
      active: true
    },
    {
      id: 'rule_std_24h_l1_ob',
      pattern: '24h (L1 + OB)',
      facilityCode: 'ALL',
      roleType: 'CRNA',
      shiftHours: '24h',
      departureCategory: 'none',
      lateCategory: '24h',
      boardStatus: 'include',
      roomAssignmentStrategy: 'scraped',
      notes: '24-hour dual coverage (L1 + OB)',
      priority: 10,
      active: true
    },
    {
      id: 'rule_std_leave',
      pattern: 'Leave',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: 'Off',
      departureCategory: 'none',
      lateCategory: 'none',
      boardStatus: 'exclude',
      roomAssignmentStrategy: 'unassigned_pool',
      notes: 'Staff on leave / PTO; excluded from board',
      priority: 1,
      active: true
    },
    {
      id: 'rule_std_off',
      pattern: 'Off',
      facilityCode: 'ALL',
      roleType: 'ANY',
      shiftHours: 'Off',
      departureCategory: 'none',
      lateCategory: 'none',
      boardStatus: 'exclude',
      roomAssignmentStrategy: 'unassigned_pool',
      notes: 'Staff off duty; excluded from board',
      priority: 1,
      active: true
    }
  ];
}

/**
 * Baseline Seed Combination Rules for resolving multiple roles.
 */
export function getDefaultPortalCombinationRules(): PortalCombinationRule[] {
  return [
    {
      id: 'comb_post_ob_with_outside_call',
      name: 'Post-OB at Local Board + Outside Hospital Call',
      primaryPattern: 'CIHOBPC_MHMC',
      secondaryPattern: 'L1_MHKTY',
      condition: 'has_both',
      boardStatus: 'include',
      departureCategory: 'post_call',
      lateCategory: 'none',
      roomAssignmentStrategy: 'scraped',
      notes: 'Keep provider in morning room at Memorial City; suppress outside Katy late call from MHMC board',
      active: true
    },
    {
      id: 'comb_l1_mhmc_with_cihobpm_mhmc',
      name: '24-Hour Continuous Shift: L1 Day Shift + OB Night Call',
      primaryPattern: 'L1_MHMC',
      secondaryPattern: 'CIHOBPM_MHMC',
      condition: 'has_both',
      boardStatus: 'include',
      departureCategory: 'none',
      lateCategory: '24h',
      badgeNote: '24h (L1 + OB)',
      roomAssignmentStrategy: 'scraped',
      notes: 'Provider working daytime L1 shift and overnight OB call at MHMC; place in 24h section',
      active: true
    }
  ];
}

export interface PortalRulesData {
  shiftRules: PortalShiftRule[];
  combinationRules: PortalCombinationRule[];
  lastUpdated?: string;
}

/**
 * Loads the active Reference Table rules from Supabase (or local fallback).
 */
export async function loadPortalRules(boardId: string = 'current'): Promise<PortalRulesData> {
  const supabase = getSupabaseServerClient();
  const ruleKey = `portal_rules_${boardId}`;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('board_state')
        .select('state')
        .eq('id', ruleKey)
        .maybeSingle();

      if (error) {
        console.error('Supabase error loading portal rules:', error);
      } else if (data && data.state) {
        const parsed = data.state as PortalRulesData;
        if (parsed.shiftRules && Array.isArray(parsed.shiftRules)) {
          return {
            shiftRules: parsed.shiftRules,
            combinationRules: parsed.combinationRules || [],
            lastUpdated: parsed.lastUpdated
          };
        }
      }
    } catch (err) {
      console.error('Failed to load portal rules from Supabase, checking local cache:', err);
    }
  }

  // Local File Cache
  ensureDataDir();
  if (fs.existsSync(RULES_FILE)) {
    try {
      const raw = fs.readFileSync(RULES_FILE, 'utf8');
      const parsed = JSON.parse(raw) as PortalRulesData;
      if (parsed.shiftRules && Array.isArray(parsed.shiftRules) && parsed.shiftRules.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Error reading local portal_rules.json:', e);
    }
  }

  // Baseline defaults
  const defaults: PortalRulesData = {
    shiftRules: getDefaultPortalShiftRules(),
    combinationRules: getDefaultPortalCombinationRules(),
    lastUpdated: new Date().toISOString()
  };

  // Seed default to local and Supabase
  await savePortalRules(defaults, boardId);
  return defaults;
}

/**
 * Saves Reference Table rules to Supabase and local file cache.
 */
export async function savePortalRules(data: PortalRulesData, boardId: string = 'current'): Promise<void> {
  data.lastUpdated = new Date().toISOString();
  ensureDataDir();

  try {
    fs.writeFileSync(RULES_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing local portal_rules.json:', err);
  }

  const supabase = getSupabaseServerClient();
  const ruleKey = `portal_rules_${boardId}`;

  if (supabase) {
    try {
      const { error } = await supabase
        .from('board_state')
        .upsert({
          id: ruleKey,
          state: data,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving portal rules to Supabase:', error);
      }
    } catch (err) {
      console.error('Failed to save portal rules to Supabase:', err);
    }
  }
}

/**
 * Optional SQL schema for users who want dedicated relational tables in Supabase.
 */
export const SUPABASE_PORTAL_RULES_SQL_MIGRATION = `
-- Optional Dedicated Table Migration for Portal Shift Rules
CREATE TABLE IF NOT EXISTS portal_shift_rules (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL DEFAULT 'current',
  pattern TEXT NOT NULL,
  facility_code TEXT NOT NULL DEFAULT 'MHMC',
  role_type TEXT NOT NULL DEFAULT 'ANY',
  shift_hours TEXT,
  departure_category TEXT NOT NULL DEFAULT 'none',
  departure_time_estimate TEXT,
  late_category TEXT NOT NULL DEFAULT 'none',
  board_status TEXT NOT NULL DEFAULT 'include',
  room_assignment_strategy TEXT NOT NULL DEFAULT 'scraped',
  priority INTEGER DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional Dedicated Table Migration for Combination Rules
CREATE TABLE IF NOT EXISTS portal_combination_rules (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL DEFAULT 'current',
  name TEXT NOT NULL,
  primary_pattern TEXT NOT NULL,
  secondary_pattern TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'has_both',
  board_status TEXT NOT NULL DEFAULT 'include',
  departure_category TEXT NOT NULL DEFAULT 'none',
  departure_time_estimate TEXT,
  late_category TEXT NOT NULL DEFAULT 'none',
  room_assignment_strategy TEXT NOT NULL DEFAULT 'scraped',
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for speedy lookups
CREATE INDEX IF NOT EXISTS idx_portal_shift_rules_board ON portal_shift_rules (board_id, pattern);
CREATE INDEX IF NOT EXISTS idx_portal_comb_rules_board ON portal_combination_rules (board_id);
`;
