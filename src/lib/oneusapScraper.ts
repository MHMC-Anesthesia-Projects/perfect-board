import { ScraperPreviewResult, ScrapedWorkingStaffItem, StaffCredential, UniqueScheduleRule } from '@/types/whiteboard';

// Verified hospital names dictionary for USAP Houston network
export const KNOWN_FACILITIES: Record<string, { code: string; fullCode: string; name: string }> = {
  'MHMC': { code: 'MHMC', fullCode: 'W: MHMC', name: 'MH Memorial City' },
  'MHVIL-SC': { code: 'MHVIL-SC', fullCode: 'W: MHVIL-SC', name: 'MH Village SC' },
  'HIVF-SC': { code: 'HIVF-SC', fullCode: 'W: HIVF-SC', name: 'Houston IVF' },
  'HMWST': { code: 'HMWST', fullCode: 'W: HMWST', name: 'Methodist West' },
  'MHTW': { code: 'MHTW', fullCode: 'NNE: MHTW', name: 'MH Woodlands' },
  'HMH': { code: 'HMH', fullCode: 'MC: HMH', name: 'Methodist Main' },
  'MHGH': { code: 'MHGH', fullCode: 'W: MHGH', name: 'MH Greater Heights' },
  'MHPH': { code: 'MHPH', fullCode: 'SE: MHPH', name: 'MH Pearland' },
  'MHSE': { code: 'MHSE', fullCode: 'SE: MHSE', name: 'MH Southeast' },
  'MHNE': { code: 'MHNE', fullCode: 'NNE: MHNE', name: 'MH Northeast' },
  'MHCH': { code: 'MHCH', fullCode: 'NW: MHCH', name: 'MH Cypress' },
  'MHSW': { code: 'MHSW', fullCode: 'SWSL: MHSW', name: 'MH Southwest' },
  'MHSW-SC': { code: 'MHSW-SC', fullCode: 'SWSL: MHSW-SC', name: 'MH Southwest SC' },
  'HMBE-SC': { code: 'HMBE-SC', fullCode: 'SWSL: HMBE-SC', name: 'Methodist Bellaire SC' },
  'HCACL': { code: 'HCACL', fullCode: 'SE: HCACL', name: 'HCA Clear Lake' },
  'HMWB': { code: 'HMWB', fullCode: 'NW: HMWB', name: 'Methodist Willowbrook' },
  'MHSL': { code: 'MHSL', fullCode: 'SWSL: MHSL', name: 'MH Sugarland' },
  'MHKTY': { code: 'MHKTY', fullCode: 'W: MHKTY', name: 'MH Katy' },
  'PSC': { code: 'PSC', fullCode: 'W: PSC', name: 'Premier SC' },
  'TCPFW': { code: 'TCPFW', fullCode: 'MC: TCPFW', name: 'TCH Pavilion for Women' }
};

export const DEFAULT_FACILITIES = ['MHMC', 'MHVIL-SC', 'HIVF-SC'];

// Known special-case deconstructions for compound/irregular QGenda IDs
const KNOWN_NAME_MAP: Record<string, { lastName: string; firstName: string }> = {
  'cavanaughmar': { lastName: 'Cavanaugh', firstName: 'Mark' },
  'tallacksondon': { lastName: 'Tallackson', firstName: 'Donald' },
  'shenoyvik': { lastName: 'Shenoy', firstName: 'Vikram' },
  'bernellmic': { lastName: 'Bernell', firstName: 'Michael' },
  'alanizped': { lastName: 'Alaniz', firstName: 'Pedro' },
  'taylormat': { lastName: 'Taylor', firstName: 'Matthew' },
  'changale': { lastName: 'Chang', firstName: 'Alex' },
  'chuanjos': { lastName: 'Chuan', firstName: 'Joseph' },
  'hillerken': { lastName: 'Hiller', firstName: 'Kenneth' },
  'hirschdou': { lastName: 'Hirsch', firstName: 'Douglas' },
  'jeffcoatshe': { lastName: 'Jeffcoat', firstName: 'Sherwood' },
  'lukey': { lastName: 'Lu', firstName: 'Key' },
  'mankariousram': { lastName: 'Mankarious', firstName: 'Ramy' },
  'dwarakanathkis': { lastName: 'Dwarakanath', firstName: 'Kishore' },
  'rameshrek': { lastName: 'Ramesh', firstName: 'Rekha' },
  'shevchenkoyev': { lastName: 'Shevchenko', firstName: 'Yevgeniy' },
  'gunncli': { lastName: 'Gunn', firstName: 'Clinton' },
  'martinezrog': { lastName: 'Martinez', firstName: 'Rogelio' },
  'patelpur': { lastName: 'Patel', firstName: 'Purvi' },
  'broussardmic': { lastName: 'Broussard', firstName: 'Michael' },
  'riveraliz': { lastName: 'Rivera', firstName: 'Liz' },
  'atagasas': { lastName: 'Ataga', firstName: 'Sasa' },
  'hartsgrovemar': { lastName: 'Hartsgrove', firstName: 'Mark' },
  'holtonjac': { lastName: 'Holton', firstName: 'Jacqueline' },
  'hughesabi': { lastName: 'Hughes', firstName: 'Abigail' },
  'lamhun': { lastName: 'Lam', firstName: 'Hung' },
  'litin': { lastName: 'Li', firstName: 'Tina' },
  'lowelei': { lastName: 'Lowe', firstName: 'Leila' },
  'markettecha': { lastName: 'Markette', firstName: 'Charles' },
  'mateocar': { lastName: 'Mateo', firstName: 'Carmen' },
  'mcguiremeg': { lastName: 'McGuire', firstName: 'Megan' },
  'normandken': { lastName: 'Normand', firstName: 'Kenneth' },
  'pateljin': { lastName: 'Patel', firstName: 'Jinit' },
  'rojasart': { lastName: 'Rojas', firstName: 'Arthur' },
  'schroedtertim': { lastName: 'Schroedter', firstName: 'Timothy' },
  'tamtom': { lastName: 'Tam', firstName: 'Tommy' },
  'townechr': { lastName: 'Towne', firstName: 'Christopher' },
  'shirakmic': { lastName: 'Shirak', firstName: 'Mic' },
  'vuan': { lastName: 'Vu', firstName: 'An' },
  'vuand': { lastName: 'Vu', firstName: 'An' },
  'yiale': { lastName: 'Yi', firstName: 'Alex' },
  'zemraulud': { lastName: 'Zemrau', firstName: 'Ludwig' },
  'floresma.': { lastName: 'Flores', firstName: 'Maria' },
  'floresma': { lastName: 'Flores', firstName: 'Maria' },
  'staesbob': { lastName: 'Staes', firstName: 'Bob' },
  'flemmingcin': { lastName: 'Flemming', firstName: 'Cindy' }
};

export function formatProviderName(rawId: string): {
  displayName: string;
  lastName: string;
  firstName: string;
  initials: string;
} {
  // Strip annotations like [P], [C], [RES], [SRNA], [L]
  const clean = rawId.replace(/\[.*?\]/g, '').trim();
  const lower = clean.toLowerCase();

  // Check known name map
  if (KNOWN_NAME_MAP[lower]) {
    const k = KNOWN_NAME_MAP[lower];
    const initial = k.firstName ? `${k.firstName[0]}.` : '';
    return {
      displayName: `${k.lastName.toUpperCase()} ${initial}`.trim(),
      lastName: k.lastName,
      firstName: k.firstName,
      initials: (k.firstName[0] || '') + (k.lastName[0] || '')
    };
  }

  // Deconstruct PascalCase: e.g. "CavanaughMar" or "MarketteCha"
  const matches = clean.match(/^[A-Z][a-z]+([A-Z][a-z]*)$/);
  if (matches) {
    const first = matches[1];
    const last = clean.substring(0, clean.length - first.length);
    return {
      displayName: `${last.toUpperCase()} ${first[0]}.`,
      lastName: last,
      firstName: first,
      initials: first[0] + last[0]
    };
  }

  return {
    displayName: clean.toUpperCase(),
    lastName: clean,
    firstName: '',
    initials: clean.substring(0, 2).toUpperCase()
  };
}

export function formatPhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return rawPhone;
}

// Helper to extract the active working facility from a potentially compound facility string (e.g. "W: MHMC,W: MHKTY" -> "W: MHKTY")
export function getActiveFacilityCode(facilityStr: string): string {
  if (!facilityStr) return '';
  const segments = facilityStr.split(',').map(s => s.trim()).filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : facilityStr;
}

/**
 * Returns the current date in YYYY-MM-DD format based on America/Chicago (Houston Hospital Timezone).
 * This guarantees that syncing and auto-assigning before midnight in Houston never prematurely rolls over
 * to tomorrow due to UTC midnight cutoff occurring at 7:00 PM CDT / 6:00 PM CST.
 */
export function getHoustonDateString(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(d);
  } catch {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export function is13hShift(s: string): boolean {
  if (!s) return false;
  return /\b13\s*-?\s*h(?:r|our)?\b/i.test(s) || /13h/i.test(s);
}

export function isLateShift(s: string): boolean {
  if (!s) return false;
  return /3p|4p|5p|7p|8p|9p|night|7p-7a|11a-11p/i.test(s) || is13hShift(s);
}

export function isPreCallShift(s: string): boolean {
  if (!s) return false;
  return /\bpre-?call\b/i.test(s) || /\bpre\s*c[1-4]\b/i.test(s) || /\bpre\s*ob\b/i.test(s);
}

// Facility filter check matching any selected facility code against the active working facility
export function isTargetFacility(facilityStr: string, allowedFacilities: string[] = DEFAULT_FACILITIES): boolean {
  if (!facilityStr || allowedFacilities.length === 0) return false;
  const activeWorkingFacility = getActiveFacilityCode(facilityStr);
  const upper = activeWorkingFacility.toUpperCase();
  return allowedFacilities.some(fac => upper.includes(fac.toUpperCase()));
}

export function isOffShift(shiftStr: string): boolean {
  if (!shiftStr) return false;
  const s = shiftStr.toUpperCase().trim();
  if (
    s.includes('PTO') ||
    s.includes('RDO') ||
    s.includes('VACATION') ||
    s.includes('MEETING') ||
    s.includes('OFF')
  ) {
    return true;
  }
  // Remove preNight and preCall strings to check for an accompanying active working shift (e.g. "preCall, 8p")
  const stripped = s.replace(/PRE-?NIGHT/gi, '').replace(/PRE-?CALL/gi, '').trim();
  if (s.includes('PRENIGHT') || s.includes('PRE-NIGHT') || s.includes('PRE NIGHT')) {
    const hasWorking = /3p|4p|5p|7p|8p|12h|13h|\bnight\b|noct|cih/i.test(stripped);
    if (!hasWorking) return true;
  }
  if (s === 'PRECALL' || s === 'PRE-CALL' || s === 'PRE CALL') {
    return true;
  }
  return false;
}

export function getFriendlyFacilityName(facilityStr: string): string {
  const activeSegment = getActiveFacilityCode(facilityStr);
  const upper = activeSegment.toUpperCase();
  if (upper.includes('MHMC')) return 'MH Memorial City';
  if (upper.includes('MHVIL')) return 'MH Village SC';
  if (upper.includes('HIVF')) return 'Houston IVF';
  if (upper.includes('HMWST')) return 'Methodist West';
  if (upper.includes('MHTW')) return 'MH Woodlands';
  if (upper.includes('HMH')) return 'Methodist Main';
  if (upper.includes('MHKTY')) return 'MH Katy';

  for (const [code, info] of Object.entries(KNOWN_FACILITIES)) {
    if (upper.includes(code)) return info.name;
  }
  return activeSegment.replace(/^(?:W|SE|MC|NNE|NW|SWSL):\s*/, '').trim() || facilityStr;
}

export interface ParseOneUsapResult {
  workingStaff: ScrapedWorkingStaffItem[];
  departureCandidates: Array<{
    name: string;
    category: 'post_call' | 'special' | 'non_call';
    shift?: string;
    facility: string;
    qgendaAbbr: string;
    roomAssignment?: string;
    orderNumber?: number;
  }>;
  lateCandidates: Array<{
    name: string;
    timeCategory: string;
    timeEstimate?: string;
    facility: string;
    role: string;
    qgendaAbbr: string;
    roomAssignment?: string;
    orderNumber?: number;
    notes?: string;
  }>;
  callTeamCandidates: Array<{
    role: string;
    doctorName: string;
    qgendaAbbr?: string;
    orderNumber?: number;
  }>;
  roomAssignments: Array<{
    facility: string;
    room: string;
    time: string;
    doc: string;
    anes: string;
  }>;
  availableFacilities: Array<{ code: string; fullCode: string; name: string }>;
  selectedFacilities: string[];
  rawCounts: {
    totalWorkingStaff: number;
    totalDocs: number;
    totalAnes: number;
    mhmcStaffCount: number;
    mhvilStaffCount: number;
    phoneNumbersCount: number;
    facilityStaffCounts: Record<string, number>;
  };
}

/**
 * Combines departure list role/shift and room SMS bracket tags to establish the provider's true shift.
 * Handles cases where e.g. HirschDou or ChuanJos or BaerenstecheJoh have a late shift (5p, 4p, 3p)
 * indicated in either the departure table or embedded in room link tags [5p], [4p], [3p].
 */
function resolveEffectiveShift(
  departureShift?: string,
  roomTag?: string,
  qgendaAbbr?: string,
  providerLastName?: string,
  uniqueSchedules?: UniqueScheduleRule[]
): string {
  const dShift = (departureShift || '').trim();
  const rTag = (roomTag || '').trim();
  const cleanAbbr = (qgendaAbbr || '').replace(/\[.*?\]/g, '').toLowerCase().trim();
  const cleanLast = (providerLastName || '').toLowerCase().trim();

  // If known scheduled late providers are working (not PTO / RDO / Off / Vacation):
  if (!isOffShift(dShift) && !isOffShift(rTag)) {
    // 1. Check against configurable Unique Schedule rules first
    if (uniqueSchedules && uniqueSchedules.length > 0) {
      const matchedRule = uniqueSchedules.find(rule => {
        if (!rule.active) return false;
        const rName = rule.providerName.toLowerCase().trim();
        const rAbbr = (rule.qgendaAbbr || '').replace(/\[.*?\]/g, '').toLowerCase().trim();
        return (
          (rAbbr && cleanAbbr.includes(rAbbr)) ||
          (rName && (cleanLast === rName || cleanAbbr.includes(rName)))
        );
      });
      if (matchedRule) {
        return matchedRule.fixedShift;
      }
    }

    // 2. Default group rules if uniqueSchedules was not passed
    if (cleanAbbr.includes('hirsch') || cleanAbbr.includes('baerensteche')) return '5p';
    if (cleanAbbr.includes('chuan')) return '4p';
    if (cleanAbbr.includes('gunn') || cleanAbbr.includes('martinez') || cleanAbbr.includes('hiller')) return '3p';
  }

  if (!dShift && !rTag) return '';
  if (!dShift) return rTag;
  if (!rTag) return dShift;

  if (dShift.toLowerCase() === rTag.toLowerCase()) {
    return dShift;
  }

  // If one already contains the other (e.g. "8p, preCall" and "8p"), return the more descriptive compound one
  if (dShift.toLowerCase().includes(rTag.toLowerCase())) {
    return dShift;
  }
  if (rTag.toLowerCase().includes(dShift.toLowerCase())) {
    return rTag;
  }

  // If both have distinct information (e.g. dShift="preCall" and rTag="8p", or "8p" and "preCall", or "13h" and "preCall"):
  // Always combine both so that late status and weekend/precall nuance are preserved!
  return `${dShift}, ${rTag}`;
}

// Known MHMC CV anesthesiologists for USAP Houston region
const KNOWN_MHMC_CV_ABBRS = [
  'shirakmic', 'dwarakanathkis', 'ruizjua', 'chenkev',
  'farias kovacmar', 'baerenstechejoh', 'loubserpau', 'jamesika'
];

export function parseOneUsapHtml(
  htmlContent: string,
  selectedFacilities: string[] = DEFAULT_FACILITIES,
  uniqueSchedules?: UniqueScheduleRule[],
  existingStaff?: Array<{ qgendaAbbr?: string; credentials?: string; lastName?: string }>
): ParseOneUsapResult {
  // Normalize selected facilities list
  const activeFacilities = selectedFacilities && selectedFacilities.length > 0
    ? selectedFacilities
    : DEFAULT_FACILITIES;

  // 1. Discover all available facilities present in header rows
  const siteRegex = /data-site=["\x27]([^"\x27]+)["\x27][^>]*>([^<]+)<\/td>/gi;
  const availableFacMap = new Map<string, { code: string; fullCode: string; name: string }>();
  let siteMatch;
  while ((siteMatch = siteRegex.exec(htmlContent)) !== null) {
    const fullCode = siteMatch[1].trim();
    const name = siteMatch[2].trim();
    const code = fullCode.replace(/^(?:W|SE|MC|NNE|NW|SWSL):\s*/, '').trim();
    availableFacMap.set(code, {
      code,
      fullCode,
      name: KNOWN_FACILITIES[code]?.name || name
    });
  }

  // Ensure default facilities are always represented in available list
  for (const fac of DEFAULT_FACILITIES) {
    if (!availableFacMap.has(fac)) {
      availableFacMap.set(fac, KNOWN_FACILITIES[fac] || { code: fac, fullCode: `W: ${fac}`, name: fac });
    }
  }

  // 2. Extract departureList_doc with 1-based order number (matches OneUSAP's Order column)
  const docPattern = /departureList_doc\.push\((\[[\s\S]*?\])\);/g;
  const docEntries: Array<{ rawName: string; facility: string; shift: string; orderNumber: number }> = [];
  let m;
  let docIdx = 0;
  while ((m = docPattern.exec(htmlContent)) !== null) {
    docIdx++;
    try {
      const parsed = JSON.parse(m[1]);
      docEntries.push({
        rawName: parsed[0] || '',
        facility: parsed[1] || '',
        shift: parsed[2] || '',
        orderNumber: docIdx
      });
    } catch {}
  }

  // 3. Extract departureList_anes with 1-based order number (matches OneUSAP's Order column)
  const anesPattern = /departureList_anes\.push\((\[[\s\S]*?\])\);/g;
  const anesEntries: Array<{ rawName: string; facility: string; shift: string; orderNumber: number }> = [];
  let anesIdx = 0;
  while ((m = anesPattern.exec(htmlContent)) !== null) {
    anesIdx++;
    try {
      const parsed = JSON.parse(m[1]);
      anesEntries.push({
        rawName: parsed[0] || '',
        facility: parsed[1] || '',
        shift: parsed[2] || '',
        orderNumber: anesIdx
      });
    } catch {}
  }

  // 4. Extract phone numbers and bracketed shift tags from SMS links across the entire HTML
  const phoneBook = new Map<string, string>();
  const providerRoomShifts = new Map<string, string>();
  const linkRegex = /<a[^>]*href=["\x27]sms:([^"\x27]*)["\x27][^>]*><font[^>]*color=["\x27]([^"\x27]*)["\x27]>([\s\S]*?)<\/font><\/a>/gi;
  let lm;
  while ((lm = linkRegex.exec(htmlContent)) !== null) {
    const phone = lm[1].trim();
    const cleanFont = lm[3].replace(/<[^>]+>/g, '').trim();
    // Match e.g. "HirschDou [5p]", "ChuanJos [3p]", "CrossleyLad[P] [3p]", "BernellMic [postNICU]"
    const match = cleanFont.match(/^([A-Za-z0-9_]+(?:\[[A-Za-z0-9_]+\])?)\s*\[(.*?)\]$/);
    const rawId = match ? match[1] : cleanFont;
    const baseId = rawId.replace(/\[.*?\]/g, '').trim();
    const shiftTag = match ? match[2].trim() : null;

    if (phone && baseId) {
      phoneBook.set(baseId, formatPhoneNumber(phone));
    }
    if (shiftTag && baseId) {
      const existingTag = providerRoomShifts.get(baseId.toLowerCase());
      if (existingTag && existingTag.toLowerCase() !== shiftTag.toLowerCase()) {
        if (!existingTag.toLowerCase().includes(shiftTag.toLowerCase())) {
          providerRoomShifts.set(baseId.toLowerCase(), `${existingTag}, ${shiftTag}`);
        }
      } else if (!existingTag) {
        providerRoomShifts.set(baseId.toLowerCase(), shiftTag);
      }
    }
  }

  // 5. Extract active room assignments and track provider sites from HTML rows
  const roomAssignments: Array<{ facility: string; room: string; time: string; doc: string; anes: string }> = [];
  const providerSiteMap = new Map<string, Set<string>>();
  const rows = htmlContent.split(/<tr\b[^>]*>/i);
  let currentSite = '';

  for (const row of rows) {
    if (row.includes('zz_SITE_zz')) {
      const match = row.match(/data-site=["\x27]([^"\x27]+)["\x27]/i);
      currentSite = match ? match[1] : '';
      continue;
    }

    if (row.includes('zz_ROOM_zz')) {
      const docMatch = row.match(/data-doc=["\x27]([^"\x27]*)["\x27]/i);
      const anesMatch = row.match(/data-anes=["\x27]([^"\x27]*)["\x27]/i);
      const docClean = (docMatch ? docMatch[1] : '').replace(/\[.*?\]/g, '').toLowerCase().trim();
      const anesClean = (anesMatch ? anesMatch[1] : '').replace(/\[.*?\]/g, '').toLowerCase().trim();

      if (currentSite) {
        if (docClean) {
          if (!providerSiteMap.has(docClean)) providerSiteMap.set(docClean, new Set());
          providerSiteMap.get(docClean)!.add(currentSite);
        }
        if (anesClean) {
          if (!providerSiteMap.has(anesClean)) providerSiteMap.set(anesClean, new Set());
          providerSiteMap.get(anesClean)!.add(currentSite);
        }
      }

      if (currentSite && isTargetFacility(currentSite, activeFacilities)) {
        const roomMatch = row.match(/<div>\s*([A-Za-z0-9\s_-]+?)(?:\s*\.\s*\.|\s*<i>)/i);
        const timeMatch = row.match(/Start\s+at:\s*<\/i>\s*(?:<[^>]+>)*\s*([0-9]{1,2}:[0-9]{2})/i);

        roomAssignments.push({
          facility: currentSite,
          room: roomMatch ? roomMatch[1].trim() : '',
          time: timeMatch ? timeMatch[1].trim() : '',
          doc: docMatch ? docMatch[1].trim() : '',
          anes: anesMatch ? anesMatch[1].trim() : ''
        });
      }
    }
  }

  // Helper to find all assigned rooms for a given provider QGenda ID / last name
  const findAssignedRooms = (qgendaId: string, lastName: string) => {
    const cleanId = qgendaId.replace(/\[.*?\]/g, '').trim().toLowerCase();
    const cleanLast = lastName.toLowerCase();
    const matched = roomAssignments.filter(r => {
      const docClean = r.doc.replace(/\[.*?\]/g, '').trim().toLowerCase();
      const anesClean = r.anes.replace(/\[.*?\]/g, '').trim().toLowerCase();
      return (
        (docClean && (docClean === cleanId || (cleanLast.length >= 3 && docClean.startsWith(cleanLast)))) ||
        (anesClean && (anesClean === cleanId || (cleanLast.length >= 3 && anesClean.startsWith(cleanLast))))
      );
    });

    const uniqueRooms = Array.from(new Set(matched.map(m => m.room).filter(Boolean)));
    const startTime = matched.find(m => m.time)?.time || '';
    return {
      rooms: uniqueRooms,
      roomString: uniqueRooms.join(', '),
      startTime
    };
  };

  // Helper to determine if a provider belongs to the target hospital roster
  const shouldIncludeProvider = (rawName: string, facilityStr: string, shiftStr?: string): boolean => {
    const cleanId = rawName.replace(/\[.*?\]/g, '').toLowerCase().trim();
    const cleanShift = (shiftStr || '').toUpperCase();
    const cleanRaw = rawName.toUpperCase();

    // Explicit facility suffixes in name or shift (e.g. HDrC1AM_MHMC, CIHAM_MHMC)
    if (cleanRaw.includes('_MHMC') || cleanShift.includes('_MHMC')) {
      return activeFacilities.some(fac => fac.toUpperCase().includes('MHMC'));
    }

    const assignedSites = providerSiteMap.get(cleanId);
    // If provider has room assignments in the HTML:
    if (assignedSites && assignedSites.size > 0) {
      // If ALL their rooms are at outside facilities (e.g. MHKTY, SE: MHSE), exclude them!
      const hasTargetRoom = Array.from(assignedSites).some(s => isTargetFacility(s, activeFacilities));
      if (!hasTargetRoom) return false;
      return true;
    }

    // Special case: USAP groups Cardiovascular call under department 'CV'.
    // Include Memorial City's CV anesthesiologists (like Dr. Mic Shirak, Dr. KD, etc.):
    if (facilityStr.trim().toUpperCase() === 'CV' || facilityStr.toUpperCase().includes('CV')) {
      const isMhmcTarget = activeFacilities.some(fac => fac.toUpperCase().includes('MHMC'));
      if (isMhmcTarget) {
        const isMhmcCv = KNOWN_MHMC_CV_ABBRS.includes(cleanId) ||
          (existingStaff && existingStaff.some(s => s.qgendaAbbr?.toLowerCase() === cleanId && s.credentials === 'MD'));
        if (isMhmcCv) return true;
      }
    }

    // If no room assignments in HTML, fallback to active working facility
    return isTargetFacility(facilityStr, activeFacilities);
  };

  // 6. Filter for selected target facilities
  const targetDocs = docEntries.filter(d => shouldIncludeProvider(d.rawName, d.facility, d.shift));
  const targetAnes = anesEntries.filter(a => shouldIncludeProvider(a.rawName, a.facility, a.shift));

  // Detect if split AM/PM weekend & holiday call mode is active
  let hasExplicitAmPm = false;
  let c1Count = 0;
  let c1ObDoc = false;

  targetDocs.forEach(d => {
    if (isOffShift(d.shift)) return;
    const s = d.shift.toUpperCase();
    if (/(?:HDR|IDR)?(?:C[123]|CV|OB)(?:AM|PM)/i.test(s)) hasExplicitAmPm = true;
    if (s.includes('C1')) c1Count++;
    if (s.includes('OB') && s.includes('C1')) c1ObDoc = true;
  });

  targetAnes.forEach(a => {
    if (isOffShift(a.shift)) return;
    const s = a.shift.toUpperCase();
    if (s.includes('CIH') || s.includes('CIHAM') || s.includes('CIHOB')) {
      hasExplicitAmPm = true;
    }
  });

  const isSplitCallMode = hasExplicitAmPm || (c1Count >= 2 && c1ObDoc);

  // 7. Build Working Staff list (excluding PTO / RDO / Off)
  const workingStaffMap = new Map<string, ScrapedWorkingStaffItem>();
  const facilityStaffCounts: Record<string, number> = {};
  let mhmcCount = 0;
  let mhvilCount = 0;

  // Process Doctors
  targetDocs.forEach(entry => {
    const { rawName, facility, shift, orderNumber } = entry;
    if (isOffShift(shift)) return;

    const formatted = formatProviderName(rawName);
    const cleanId = rawName.replace(/\[.*?\]/g, '').toLowerCase();
    const isCvFacility = facility.trim().toUpperCase() === 'CV' || facility.toUpperCase().includes('CV');
    const facilityName = isCvFacility ? 'MH Memorial City' : getFriendlyFacilityName(facility);
    const qgendaAbbr = rawName.replace(/\[.*?\]/g, '').trim();

    const phone = phoneBook.get(qgendaAbbr) || '(555) 000-0000';
    const roomInfo = findAssignedRooms(qgendaAbbr, formatted.lastName);
    const roomTag = providerRoomShifts.get(qgendaAbbr.toLowerCase());
    const effectiveShift = resolveEffectiveShift(shift, roomTag, qgendaAbbr, formatted.lastName, uniqueSchedules);

    // On weekend/holiday split call schedules with no elective rooms running:
    // Standalone non-call '1st' departures without rooms (such as home-facility defaulted entries like Dr. Mankarious on call elsewhere) do not belong to MHMC
    if (isSplitCallMode && (shift === '1st' || effectiveShift === '1st') && (!roomInfo.rooms || roomInfo.rooms.length === 0)) {
      return;
    }

    // Outside CV doctors (from Methodist, Woodlands, etc.) who are not on call for MHMC and have no rooms at MHMC
    const isMhmcCvDoc = qgendaAbbr.toLowerCase().includes('shirak') || qgendaAbbr.toLowerCase().includes('dwarakanath') || effectiveShift.toUpperCase().includes('_MHMC');
    if (isCvFacility && !isMhmcCvDoc && (!roomInfo.rooms || roomInfo.rooms.length === 0)) {
      return;
    }

    // Tally facility counts
    const upperFac = getActiveFacilityCode(facility).toUpperCase();
    for (const facCode of activeFacilities) {
      if (upperFac.includes(facCode.toUpperCase())) {
        facilityStaffCounts[facCode] = (facilityStaffCounts[facCode] || 0) + 1;
      }
    }
    if (upperFac.includes('MHMC')) mhmcCount++;
    if (upperFac.includes('MHVIL')) mhvilCount++;

    workingStaffMap.set(cleanId, {
      id: `staff_oneusap_doc_${cleanId}`,
      displayName: formatted.displayName,
      lastName: formatted.lastName,
      firstName: formatted.firstName,
      credentials: 'MD',
      phone,
      facility: facilityName,
      shift: effectiveShift || shift || 'Day',
      roomAssignment: roomInfo.roomString || undefined,
      assignedRooms: roomInfo.rooms.length > 0 ? roomInfo.rooms : undefined,
      startTime: roomInfo.startTime || undefined,
      rawId: rawName,
      qgendaAbbr,
      orderNumber
    });
  });

  // Pre-filter active OB CRNAs for split weekend matching (1st = AM 7a-7p, 2nd = PM 7p-7a)
  const activeObCrnas = targetAnes.filter(a => {
    if (isOffShift(a.shift)) return false;
    const s = a.shift.toUpperCase();
    return s.includes('OB') || s.includes('CIHOB');
  });

  // Process CRNAs / Anesthetists
  targetAnes.forEach(entry => {
    const { rawName, facility, shift, orderNumber } = entry;
    if (isOffShift(shift)) return;

    const formatted = formatProviderName(rawName);
    const cleanId = rawName.replace(/\[.*?\]/g, '').toLowerCase();
    const facilityName = getFriendlyFacilityName(facility);
    const qgendaAbbr = rawName.replace(/\[.*?\]/g, '').trim();

    // Tally facility counts
    const upperFac = getActiveFacilityCode(facility).toUpperCase();
    for (const facCode of activeFacilities) {
      if (upperFac.includes(facCode.toUpperCase())) {
        facilityStaffCounts[facCode] = (facilityStaffCounts[facCode] || 0) + 1;
      }
    }
    if (upperFac.includes('MHMC')) mhmcCount++;
    if (upperFac.includes('MHVIL')) mhvilCount++;

    const phone = phoneBook.get(qgendaAbbr) || '(555) 000-0000';

    let cred: StaffCredential = 'CRNA';
    if (rawName.includes('[RES]')) cred = 'Resident';
    else if (rawName.includes('[SRNA]')) cred = 'SRNA';
    else if (rawName.includes('[PA]')) cred = 'PA';

    const roomInfo = findAssignedRooms(qgendaAbbr, formatted.lastName);
    const roomTag = providerRoomShifts.get(qgendaAbbr.toLowerCase());
    let effectiveShift = resolveEffectiveShift(shift, roomTag, qgendaAbbr, formatted.lastName, uniqueSchedules);
    const upperShift = (effectiveShift || shift || '').toUpperCase();

    // Recognize weekend / holiday and 12h CRNA shift nomenclature
    if (upperShift.includes('CIHAM') || upperShift === 'CIH') {
      effectiveShift = '7a-3p (CIH)';
    } else if (upperShift.includes('CIHOBAM') || upperShift.includes('OBAM')) {
      effectiveShift = '7a-7p (OB)';
    } else if (upperShift.includes('CIHOBPM') || upperShift.includes('OBPM')) {
      effectiveShift = '7p-7a (OB)';
    } else if (upperShift.includes('12H-7P') || upperShift.includes('NOCT')) {
      effectiveShift = '12h-7p:Noct';
    } else if (upperShift.includes('7A-7P') || upperShift === '12H' || upperShift.startsWith('12H ')) {
      effectiveShift = '7a-7p';
    } else if (isSplitCallMode) {
      if (upperShift.includes('OB')) {
        const obIdx = activeObCrnas.findIndex(o => o.rawName === rawName);
        const isAm = qgendaAbbr.toLowerCase().includes('yi') || obIdx === 0;
        effectiveShift = isAm ? '7a-7p (OB)' : '7p-7a (OB)';
      } else if (upperShift.includes('NIGHT') && !upperShift.includes('PRENIGHT')) {
        effectiveShift = '12h-7p:Noct';
      } else if (upperShift === '7P') {
        effectiveShift = '7p';
      } else if (upperShift === 'CALL' || upperShift === '' || upperShift === 'DAY') {
        effectiveShift = '7a-3p (CIH)';
      }
    }

    workingStaffMap.set(cleanId, {
      id: `staff_oneusap_anes_${cleanId}`,
      displayName: formatted.displayName,
      lastName: formatted.lastName,
      firstName: formatted.firstName,
      credentials: cred,
      phone,
      facility: facilityName,
      shift: effectiveShift || shift || 'Day',
      roomAssignment: roomInfo.roomString || undefined,
      assignedRooms: roomInfo.rooms.length > 0 ? roomInfo.rooms : undefined,
      startTime: roomInfo.startTime || undefined,
      rawId: rawName,
      qgendaAbbr,
      orderNumber
    });
  });

  // 8. Build Call Team Candidates (with AM / PM Weekend & Holiday Split Nuance)
  // Hospital calls are named: Call 1, Call 2, Call 3, CV, OB.
  // On weekends/holidays or when AM/PM designations are present, call roles expand to:
  // CV AM, CV PM, Call 3 AM, Call 3 PM, Call 2 AM, Call 2 PM, Call 1 AM, Call 1 PM, OB AM, OB PM.
  const callTeamMap = new Map<string, { doctorName: string; qgendaAbbr: string; orderNumber?: number; isCombined?: boolean }>();

  if (isSplitCallMode) {
    // --- SPLIT AM / PM CALL MODE ---
    // 1. Assign explicit AM/PM tags (e.g. HDrC1AM_MHMC, C3PM_MHMC, IDrOBAM_MHMC, etc.)
    targetDocs.forEach(entry => {
      if (isOffShift(entry.shift)) return;
      const formatted = formatProviderName(entry.rawName);
      const qgendaAbbr = entry.rawName.replace(/\[.*?\]/g, '').trim();
      const roomTag = providerRoomShifts.get(qgendaAbbr.toLowerCase());
      const effectiveShift = resolveEffectiveShift(entry.shift, roomTag, qgendaAbbr);
      const upperShift = effectiveShift.toUpperCase();

      const matches = upperShift.match(/(?:HDR|IDR)?(C[123]|CV|OB)(AM|PM)(?:_MHMC)?/gi);
      if (matches) {
        matches.forEach(m => {
          const sub = m.match(/(?:HDR|IDR)?(C[123]|CV|OB)(AM|PM)(?:_MHMC)?/i);
          if (sub) {
            const roleBase = sub[1] === 'CV' ? 'CV' : sub[1] === 'OB' ? 'OB' : `Call ${sub[1].replace('C', '')}`;
            const role = `${roleBase} ${sub[2].toUpperCase()}`;
            const alias = formatted.lastName === 'Dwarakanath' ? 'KD' : formatted.lastName.toUpperCase();
            callTeamMap.set(role, { doctorName: alias, qgendaAbbr, orderNumber: entry.orderNumber });
          }
        });
      }
    });

    // 2. Assign standard/compound codes into unfilled AM/PM slots
    targetDocs.forEach(entry => {
      if (isOffShift(entry.shift)) return;
      const formatted = formatProviderName(entry.rawName);
      const qgendaAbbr = entry.rawName.replace(/\[.*?\]/g, '').trim();
      const roomTag = providerRoomShifts.get(qgendaAbbr.toLowerCase());
      const effectiveShift = resolveEffectiveShift(entry.shift, roomTag, qgendaAbbr);
      const upperShift = effectiveShift.toUpperCase();
      const shiftParts = upperShift.split(/[,/]/).map(p => p.trim());
      const alias = formatted.lastName === 'Dwarakanath' ? 'KD' : formatted.lastName.toUpperCase();

      // CV: covers CV AM and CV PM
      if (shiftParts.some(p => (p === 'CV' || p.startsWith('CV-') || p.startsWith('CV ')) && !p.startsWith('POST') && !p.startsWith('PRE'))) {
        // Prefer explicit MHMC or primary MHMC CV doctor (e.g. ShirakMic or DwarakanathKis)
        const isPrimaryCv = qgendaAbbr.toLowerCase().includes('shirak') || qgendaAbbr.toLowerCase().includes('dwarakanath') || upperShift.includes('_MHMC');
        if (isPrimaryCv || !callTeamMap.has('CV AM')) {
          callTeamMap.set('CV AM', { doctorName: alias, qgendaAbbr, orderNumber: entry.orderNumber });
          callTeamMap.set('CV PM', { doctorName: alias, qgendaAbbr, orderNumber: entry.orderNumber });
        }
      }

      // Call 3: covers Call 3 AM and Call 3 PM
      if (shiftParts.some(p => (p === 'C3' || p === '3RD' || p === 'CALL 3' || p === 'CALL3') && !p.startsWith('POST') && !p.startsWith('PRE'))) {
        if (!callTeamMap.has('Call 3 AM')) callTeamMap.set('Call 3 AM', { doctorName: alias, qgendaAbbr, orderNumber: entry.orderNumber });
        if (!callTeamMap.has('Call 3 PM')) callTeamMap.set('Call 3 PM', { doctorName: alias, qgendaAbbr, orderNumber: entry.orderNumber });
      }

      // Call 2: covers Call 2 AM and Call 2 PM
      if (shiftParts.some(p => (p === 'C2' || p === '2ND' || p === 'CALL 2' || p === 'CALL2') && !p.startsWith('POST') && !p.startsWith('PRE'))) {
        const c2Alias = formatted.lastName === 'Tallackson' ? 'TALL' : alias;
        if (!callTeamMap.has('Call 2 AM')) callTeamMap.set('Call 2 AM', { doctorName: c2Alias, qgendaAbbr, orderNumber: entry.orderNumber });
        if (!callTeamMap.has('Call 2 PM')) callTeamMap.set('Call 2 PM', { doctorName: c2Alias, qgendaAbbr, orderNumber: entry.orderNumber });
      }

      // Combined OB,C1 doctor (e.g. Dr. Shevchenko): covers Call 1 PM and both OB AM & OB PM
      if (upperShift.includes('C1,OB') || upperShift.includes('OB,C1') || (shiftParts.includes('C1') && shiftParts.includes('OB'))) {
        if (!callTeamMap.has('Call 1 PM')) callTeamMap.set('Call 1 PM', { doctorName: alias, qgendaAbbr, orderNumber: entry.orderNumber });
        if (!callTeamMap.has('OB AM')) callTeamMap.set('OB AM', { doctorName: alias, qgendaAbbr, orderNumber: entry.orderNumber });
        if (!callTeamMap.has('OB PM')) callTeamMap.set('OB PM', { doctorName: alias, qgendaAbbr, orderNumber: entry.orderNumber });
      } else if (shiftParts.some(p => (p === 'C1' || p === 'CALL 1' || p === 'CALL1' || p.startsWith('C1-') || p.startsWith('C1 ')) && !p.startsWith('POST') && !p.startsWith('PRE'))) {
        // Pure C1 doctor (e.g. Dr. Alaniz): covers Call 1 AM (or Call 1 PM if AM filled)
        if (!callTeamMap.has('Call 1 AM')) {
          callTeamMap.set('Call 1 AM', { doctorName: alias, qgendaAbbr, orderNumber: entry.orderNumber });
        } else if (!callTeamMap.has('Call 1 PM')) {
          callTeamMap.set('Call 1 PM', { doctorName: alias, qgendaAbbr, orderNumber: entry.orderNumber });
        }
      } else if (shiftParts.some(p => (p === 'OB' || p === 'OBCALL') && !p.startsWith('POST') && !p.startsWith('PRE'))) {
        // Pure OB doctor: covers OB AM and OB PM
        if (!callTeamMap.has('OB AM')) callTeamMap.set('OB AM', { doctorName: alias, qgendaAbbr, orderNumber: entry.orderNumber });
        if (!callTeamMap.has('OB PM')) callTeamMap.set('OB PM', { doctorName: alias, qgendaAbbr, orderNumber: entry.orderNumber });
      }
    });
  } else {
    // --- STANDARD WEEKDAY CALL MODE ---
    // Pass 1: Providers listed with "C1,OB" (like Dr. Lu) are both Call 1 and OB today.
    targetDocs.forEach(entry => {
      if (isOffShift(entry.shift)) return;
      const formatted = formatProviderName(entry.rawName);
      const qgendaAbbr = entry.rawName.replace(/\[.*?\]/g, '').trim();
      const roomTag = providerRoomShifts.get(qgendaAbbr.toLowerCase());
      const effectiveShift = resolveEffectiveShift(entry.shift, roomTag, qgendaAbbr);
      const upperShift = effectiveShift.toUpperCase();
      const shiftParts = upperShift.split(/[,/]/).map(p => p.trim());

      const isC1OB = upperShift.includes('C1,OB') || (shiftParts.includes('C1') && shiftParts.includes('OB'));
      if (isC1OB) {
        callTeamMap.set('Call 1', { doctorName: formatted.lastName.toUpperCase(), qgendaAbbr, orderNumber: entry.orderNumber, isCombined: true });
        callTeamMap.set('OB', { doctorName: formatted.lastName.toUpperCase(), qgendaAbbr, orderNumber: entry.orderNumber, isCombined: true });
      }
    });

    // Pass 2: Remaining call roles (CV, Call 3, Call 2, Call 1, OB)
    targetDocs.forEach(entry => {
      if (isOffShift(entry.shift)) return;
      const formatted = formatProviderName(entry.rawName);
      const qgendaAbbr = entry.rawName.replace(/\[.*?\]/g, '').trim();
      const roomTag = providerRoomShifts.get(qgendaAbbr.toLowerCase());
      const effectiveShift = resolveEffectiveShift(entry.shift, roomTag, qgendaAbbr);
      const upperShift = effectiveShift.toUpperCase();
      const shiftParts = upperShift.split(/[,/]/).map(p => p.trim());

      // CV
      if (shiftParts.some(p => (p === 'CV' || p.startsWith('CV-') || p.startsWith('CV ')) && !p.startsWith('POST') && !p.startsWith('PRE'))) {
        const alias = formatted.lastName === 'Dwarakanath' ? 'KD' : formatted.lastName.toUpperCase();
        callTeamMap.set('CV', { doctorName: alias, qgendaAbbr, orderNumber: entry.orderNumber });
      }

      // Call 3
      if (shiftParts.some(p => (p === 'C3' || p === '3RD' || p === 'CALL 3' || p === 'CALL3') && !p.startsWith('POST') && !p.startsWith('PRE'))) {
        callTeamMap.set('Call 3', { doctorName: formatted.lastName.toUpperCase(), qgendaAbbr, orderNumber: entry.orderNumber });
      }

      // Call 2
      if (shiftParts.some(p => (p === 'C2' || p === '2ND' || p === 'CALL 2' || p === 'CALL2') && !p.startsWith('POST') && !p.startsWith('PRE'))) {
        const alias = formatted.lastName === 'Tallackson' ? 'TALL' : formatted.lastName.toUpperCase();
        callTeamMap.set('Call 2', { doctorName: alias, qgendaAbbr, orderNumber: entry.orderNumber });
      }

      // Call 1 (only if not already claimed by a combined C1,OB doctor)
      if (shiftParts.some(p => (p === 'C1' || p === '1ST' || p === 'CALL 1' || p === 'CALL1') && !p.startsWith('POST') && !p.startsWith('PRE'))) {
        if (!callTeamMap.get('Call 1')?.isCombined && !callTeamMap.has('Call 1')) {
          callTeamMap.set('Call 1', { doctorName: formatted.lastName.toUpperCase(), qgendaAbbr, orderNumber: entry.orderNumber });
        }
      }

      // OB (only if not already claimed by a combined C1,OB doctor)
      if (shiftParts.some(p => (p === 'OB' || p === 'OBCALL') && !p.startsWith('POST') && !p.startsWith('PRE'))) {
        if (!callTeamMap.get('OB')?.isCombined && !callTeamMap.has('OB')) {
          callTeamMap.set('OB', { doctorName: formatted.lastName.toUpperCase(), qgendaAbbr, orderNumber: entry.orderNumber });
        }
      }
    });
  }

  // 9. Build Departure Candidates (Working Doctors not on Call)
  const rawDepartureCandidates: ParseOneUsapResult['departureCandidates'] = [];

  targetDocs.forEach(entry => {
    const { rawName, facility, shift, orderNumber } = entry;
    if (isOffShift(shift)) return;

    const formatted = formatProviderName(rawName);
    const qgendaAbbr = rawName.replace(/\[.*?\]/g, '').trim();
    const roomTag = providerRoomShifts.get(qgendaAbbr.toLowerCase());
    const effectiveShift = resolveEffectiveShift(shift, roomTag, qgendaAbbr, formatted.lastName, uniqueSchedules);
    const upperShift = effectiveShift.toUpperCase();

    const activeFac = getActiveFacilityCode(facility);
    let facilityLabel = 'MHMC';
    if (activeFac.includes('HIVF')) facilityLabel = 'HIVF';
    else if (activeFac.includes('MHVIL')) facilityLabel = 'Village';
    else if (activeFac.includes('MHMC')) facilityLabel = 'MHMC';
    else facilityLabel = activeFac.replace(/^(?:W|SE|MC|NNE|NW|SWSL):\s*/, '').replace(/W:\s*/g, '').trim();

    const isPostCall = 
      upperShift.includes('POSTC') || 
      upperShift.includes('POSTCV') || 
      upperShift.includes('POSTOB') || 
      upperShift.includes('POST1') ||
      upperShift.includes('POSTNICU');

    // If doctor is claimed by any active call slot, do not include them in the departure list
    const isCallDoctor = Array.from(callTeamMap.values()).some(
      c => c.qgendaAbbr.toLowerCase() === qgendaAbbr.toLowerCase()
    );
    if (!isPostCall && isCallDoctor) {
      return;
    }

    // Outside CV doctors (from Methodist, Woodlands, etc.) who are not the MHMC CV call doctor
    const isCvFacility = facility.trim().toUpperCase() === 'CV' || facility.toUpperCase().includes('CV');
    if (isCvFacility && !isCallDoctor) {
      return;
    }

    // Fixed departure time rule:
    // If doctor is scheduled for a late shift (3p, 4p, 5p, 7p, 8p, Night, etc.), do not include in departure list
    const isLateDoc = /3p|4p|5p|7p|8p|night|7p-7a|11a-11p/i.test(upperShift) ||
      upperShift === '3P' || upperShift === '4P' || upperShift === '5P' || upperShift === '7P' || upperShift === '8P' ||
      is13hShift(upperShift);
    if (!isPostCall && isLateDoc) {
      return;
    }

    const roomInfo = findAssignedRooms(qgendaAbbr, formatted.lastName);

    // On weekend/holiday split call schedules with no elective rooms running:
    // Standalone non-call '1st' departures without rooms (such as home-facility defaulted entries like Dr. Mankarious on call elsewhere) do not belong to MHMC
    if (isSplitCallMode && (shift === '1st' || effectiveShift === '1st') && (!roomInfo.rooms || roomInfo.rooms.length === 0)) {
      return;
    }

    // Check for atypical departure time (e.g. 2p, 1p, 1:30p)
    const isAtypicalTime = /^[0-9]{1,2}(?::[0-9]{2})?\s*(?:A|P|AM|PM)$/i.test(upperShift) && !isLateDoc;

    rawDepartureCandidates.push({
      name: formatted.lastName.toUpperCase(),
      category: isPostCall ? 'post_call' : isAtypicalTime ? 'special' : 'non_call',
      shift: effectiveShift || undefined,
      facility: facilityLabel,
      qgendaAbbr,
      roomAssignment: roomInfo.roomString || undefined,
      orderNumber
    });
  });

  // Sort Departure Candidates: Post-Call -> Special (atypical times) -> Non-Call
  const sortedPostCall = rawDepartureCandidates
    .filter(d => d.category === 'post_call')
    .sort((a, b) => (a.orderNumber ?? 999) - (b.orderNumber ?? 999));

  const sortedSpecial = rawDepartureCandidates
    .filter(d => d.category === 'special')
    .sort((a, b) => (a.orderNumber ?? 999) - (b.orderNumber ?? 999));

  const sortedNonCall = rawDepartureCandidates
    .filter(d => d.category === 'non_call')
    .sort((a, b) => (a.orderNumber ?? 999) - (b.orderNumber ?? 999));

  const departureCandidates = [...sortedPostCall, ...sortedSpecial, ...sortedNonCall];

  // 10. Build Late List Candidates (CRNAs and Docs with 3p, 4p, 5p, 7p, 8p, Night, 7a-7p, 12h)
  const lateCandidates: ParseOneUsapResult['lateCandidates'] = [];

  const checkLate = (
    rawName: string,
    facility: string,
    shift: string,
    role: string,
    orderNumber: number
  ) => {
    if (isOffShift(shift)) return;
    const formatted = formatProviderName(rawName);
    const qgendaAbbr = rawName.replace(/\[.*?\]/g, '').trim();

    // Active call doctors belong to Call Team, not the Lates list
    const isCallDoctor = Array.from(callTeamMap.values()).some(
      c => c.qgendaAbbr.toLowerCase() === qgendaAbbr.toLowerCase()
    );
    if (role === 'MD' && isCallDoctor) {
      return;
    }

    const roomTag = providerRoomShifts.get(qgendaAbbr.toLowerCase());
    let effectiveShift = resolveEffectiveShift(shift, roomTag, qgendaAbbr, formatted.lastName, uniqueSchedules);
    let upperShift = effectiveShift.toUpperCase();

    // In split call / weekend mode, harmonize CRNA effective shifts if not already formatted
    if (role === 'CRNA') {
      if (upperShift.includes('CIHAM') || upperShift === 'CIH') {
        effectiveShift = '7a-3p (CIH)';
        upperShift = effectiveShift.toUpperCase();
      } else if (upperShift.includes('CIHOBAM') || upperShift.includes('OBAM')) {
        effectiveShift = '7a-7p (OB)';
        upperShift = effectiveShift.toUpperCase();
      } else if (upperShift.includes('CIHOBPM') || upperShift.includes('OBPM')) {
        effectiveShift = '7p-7a (OB)';
        upperShift = effectiveShift.toUpperCase();
      } else if (isSplitCallMode) {
        if (upperShift.includes('OB')) {
          const obIdx = activeObCrnas.findIndex(o => o.rawName === rawName);
          const isAm = qgendaAbbr.toLowerCase().includes('yi') || obIdx === 0;
          effectiveShift = isAm ? '7a-7p (OB)' : '7p-7a (OB)';
          upperShift = effectiveShift.toUpperCase();
        } else if (upperShift.includes('NIGHT') && !upperShift.includes('PRENIGHT')) {
          effectiveShift = '12h-7p:Noct';
          upperShift = effectiveShift.toUpperCase();
        } else if (upperShift === '7P') {
          effectiveShift = '7p';
          upperShift = effectiveShift.toUpperCase();
        } else if (upperShift === 'CALL' || upperShift === '' || upperShift === 'DAY') {
          effectiveShift = '7a-3p (CIH)';
          upperShift = effectiveShift.toUpperCase();
        }
      }
    }

    const activeFac = getActiveFacilityCode(facility);
    let facilityLabel = 'MHMC';
    if (activeFac.includes('HIVF')) facilityLabel = 'HIVF';
    else if (activeFac.includes('MHVIL')) facilityLabel = 'Village';
    else if (activeFac.includes('MHMC')) facilityLabel = 'MHMC';
    else facilityLabel = activeFac.replace(/^(?:W|SE|MC|NNE|NW|SWSL):\s*/, '').replace(/W:\s*/g, '').trim();

    const is13h = is13hShift(upperShift);
    const has8p = /\b8p\b/i.test(upperShift) || upperShift.includes('8P') || is13h;

    let timeCat = '';
    if (
      upperShift.includes('7P-7A') ||
      (upperShift.includes('NIGHT') && !upperShift.includes('PRENIGHT') && !upperShift.includes('PRE-NIGHT')) ||
      upperShift.includes('NOCT') ||
      upperShift.includes('CIHOBPM') ||
      upperShift.includes('OBPM')
    ) {
      timeCat = '7p-7a';
    } else if (has8p) {
      timeCat = '8p';
    } else if (
      /\b7p\b/i.test(upperShift) ||
      upperShift.includes('7A-7P') ||
      upperShift === '12H' ||
      upperShift.startsWith('12H ') ||
      upperShift.includes('CIHOBAM') ||
      upperShift.includes('OBAM')
    ) {
      timeCat = '7p';
    } else if (/\b5p\b/i.test(upperShift) || upperShift === '5P') {
      timeCat = '5p';
    } else if (/\b4p\b/i.test(upperShift) || upperShift === '4P') {
      timeCat = '4p';
    } else if (
      /\b3p\b/i.test(upperShift) ||
      upperShift === '3P' ||
      upperShift.includes('7A-3P') ||
      upperShift.includes('CIHAM') ||
      upperShift === 'CIH'
    ) {
      timeCat = '3p';
    } else if (role === 'CRNA' && /^[0-9]{1,2}(?::[0-9]{2})?\s*(?:A|P|AM|PM)$/i.test(upperShift)) {
      timeCat = 'special';
    }

    if (timeCat) {
      const roomInfo = findAssignedRooms(qgendaAbbr, formatted.lastName);

      // Extract any precall or weekend designation from the compound shift (e.g. "preCall, 8p" -> "preCall")
      let precallNote: string | undefined = undefined;
      const precallMatch = effectiveShift.match(/\b(pre-?call|pre\s*c[1-4]|pre\s*ob|wknd)\b/i);
      if (precallMatch) {
        precallNote = precallMatch[1];
      } else if (is13h && !upperShift.includes('8P')) {
        precallNote = '13h';
      }

      lateCandidates.push({
        name: formatted.lastName.toUpperCase(),
        timeCategory: timeCat,
        timeEstimate: timeCat === 'special' ? (upperShift || '2p') : undefined,
        facility: facilityLabel,
        role,
        qgendaAbbr,
        roomAssignment: roomInfo.roomString || undefined,
        orderNumber,
        notes: precallNote
      });
    }
  };

  targetDocs.forEach(d => checkLate(d.rawName, d.facility, d.shift, 'MD', d.orderNumber));
  targetAnes.forEach(a => checkLate(a.rawName, a.facility, a.shift, 'CRNA', a.orderNumber));

  // Helper to parse late category or time into sortable minutes
  function getLateCategorySortMinutes(category: string, timeEstimate?: string): number {
    const cat = (category || '').toLowerCase().trim();
    if (cat === 'special') {
      if (timeEstimate) {
        return getLateCategorySortMinutes(timeEstimate);
      }
      return 14 * 60; // 2:00 PM (before 3pm)
    }
    if (cat === '7p-7a' || cat.includes('night')) return 24 * 60 + 1;
    const match = cat.match(/(\d{1,2})(?::(\d{2}))?\s*(a|p|am|pm)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const mins = match[2] ? parseInt(match[2], 10) : 0;
      const meridian = match[3] ? match[3].toLowerCase() : '';
      if (meridian.startsWith('p') && hours < 12) hours += 12;
      else if (meridian.startsWith('a') && hours === 12) hours = 0;
      else if (!meridian) {
        if (hours >= 1 && hours <= 6) hours += 12;
        else if (hours >= 7 && hours <= 11) hours += 12;
      }
      return hours * 60 + mins;
    }
    return 9999;
  }

  // Sort late list candidates chronologically: times before 3pm (e.g. 2p/special) at top, then 3p, 4p, 5p, 7p, 8p, 7p-7a
  lateCandidates.sort((a, b) => {
    const timeDiff = getLateCategorySortMinutes(a.timeCategory, a.timeEstimate) - getLateCategorySortMinutes(b.timeCategory, b.timeEstimate);
    if (timeDiff !== 0) return timeDiff;
    return (a.orderNumber ?? 999) - (b.orderNumber ?? 999);
  });

  // Build Call Team List in exact order:
  // Split mode: CV AM, CV PM, Call 3 AM, Call 3 PM, Call 2 AM, Call 2 PM, Call 1 AM, Call 1 PM, OB AM, OB PM
  // Weekday mode: CV, Call 3, Call 2, Call 1, OB
  const callTeamOrder = isSplitCallMode
    ? ['CV AM', 'CV PM', 'Call 3 AM', 'Call 3 PM', 'Call 2 AM', 'Call 2 PM', 'Call 1 AM', 'Call 1 PM', 'OB AM', 'OB PM']
    : ['CV', 'Call 3', 'Call 2', 'Call 1', 'OB'];
  const callTeamCandidates = callTeamOrder
    .filter(role => callTeamMap.has(role))
    .map(role => ({
      role,
      doctorName: callTeamMap.get(role)!.doctorName,
      qgendaAbbr: callTeamMap.get(role)!.qgendaAbbr,
      orderNumber: callTeamMap.get(role)!.orderNumber
    }));

  return {
    workingStaff: Array.from(workingStaffMap.values()),
    departureCandidates,
    lateCandidates,
    callTeamCandidates,
    roomAssignments,
    availableFacilities: Array.from(availableFacMap.values()),
    selectedFacilities: activeFacilities,
    rawCounts: {
      totalWorkingStaff: workingStaffMap.size,
      totalDocs: targetDocs.length,
      totalAnes: targetAnes.length,
      mhmcStaffCount: mhmcCount,
      mhvilStaffCount: mhvilCount,
      phoneNumbersCount: phoneBook.size,
      facilityStaffCounts
    }
  };
}

export async function fetchAndScrapeOneUsap(options: {
  portalUrl?: string;
  password?: string;
  date?: string;
  facilities?: string[];
  uniqueSchedules?: UniqueScheduleRule[];
  existingStaff?: Array<{ qgendaAbbr?: string; credentials?: string; lastName?: string }>;
}): Promise<ScraperPreviewResult> {
  const targetDate = options.date || getHoustonDateString();
  let targetUrl = options.portalUrl || 'https://www.oneusap.com/assignments';
  const selectedFacilities = options.facilities && options.facilities.length > 0
    ? options.facilities
    : DEFAULT_FACILITIES;

  // Append date query if not already present
  if (!targetUrl.includes('d=')) {
    const sep = targetUrl.includes('?') ? '&' : '?';
    targetUrl = `${targetUrl}${sep}d=${targetDate}`;
  }

  const password = options.password || '321usap';

  try {
    const params = new URLSearchParams();
    params.append('passcode', password);

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: params.toString()
    });

    if (!res.ok) {
      return {
        success: false,
        portalType: 'oneusap',
        sourceUrl: targetUrl,
        timestamp: new Date().toISOString(),
        facilities: selectedFacilities,
        selectedFacilities,
        workingStaff: [],
        departureCandidates: [],
        lateCandidates: [],
        callTeamCandidates: [],
        rawCounts: {
          totalWorkingStaff: 0,
          totalDocs: 0,
          totalAnes: 0,
          mhmcStaffCount: 0,
          mhvilStaffCount: 0,
          phoneNumbersCount: 0
        },
        error: `HTTP error from OneUSAP: ${res.status} ${res.statusText}`
      };
    }

    const html = await res.text();

    // Check if passcode failed and returned login form again
    if (html.includes('Please enter password to view') && !html.includes('departureList_doc')) {
      return {
        success: false,
        portalType: 'oneusap',
        sourceUrl: targetUrl,
        timestamp: new Date().toISOString(),
        facilities: selectedFacilities,
        selectedFacilities,
        workingStaff: [],
        departureCandidates: [],
        lateCandidates: [],
        callTeamCandidates: [],
        rawCounts: {
          totalWorkingStaff: 0,
          totalDocs: 0,
          totalAnes: 0,
          mhmcStaffCount: 0,
          mhvilStaffCount: 0,
          phoneNumbersCount: 0
        },
        error: 'Authentication failed. Please verify the passcode for OneUSAP.'
      };
    }

    const parsed = parseOneUsapHtml(html, selectedFacilities, options.uniqueSchedules, options.existingStaff);

    return {
      success: true,
      portalType: 'oneusap',
      sourceUrl: targetUrl,
      timestamp: new Date().toISOString(),
      facilities: selectedFacilities,
      selectedFacilities: parsed.selectedFacilities,
      availableFacilities: parsed.availableFacilities,
      workingStaff: parsed.workingStaff,
      departureCandidates: parsed.departureCandidates,
      lateCandidates: parsed.lateCandidates,
      callTeamCandidates: parsed.callTeamCandidates,
      roomAssignments: parsed.roomAssignments,
      rawCounts: parsed.rawCounts
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      portalType: 'oneusap',
      sourceUrl: targetUrl,
      timestamp: new Date().toISOString(),
      facilities: selectedFacilities,
      selectedFacilities,
      workingStaff: [],
      departureCandidates: [],
      lateCandidates: [],
      callTeamCandidates: [],
      rawCounts: {
        totalWorkingStaff: 0,
        totalDocs: 0,
        totalAnes: 0,
        mhmcStaffCount: 0,
        mhvilStaffCount: 0,
        phoneNumbersCount: 0
      },
      error: `Network error connecting to OneUSAP: ${msg}`
    };
  }
}
