import { ScraperPreviewResult, ScrapedWorkingStaffItem, StaffCredential } from '@/types/whiteboard';

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
  'vuan': { lastName: 'Vu', firstName: 'An' },
  'yiale': { lastName: 'Yi', firstName: 'Alex' },
  'zemraulud': { lastName: 'Zemrau', firstName: 'Ludwig' }
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

// Facility filter check matching any selected facility code
export function isTargetFacility(facilityStr: string, allowedFacilities: string[] = DEFAULT_FACILITIES): boolean {
  if (!facilityStr || allowedFacilities.length === 0) return false;
  const upper = facilityStr.toUpperCase();
  return allowedFacilities.some(fac => upper.includes(fac.toUpperCase()));
}

export function isOffShift(shiftStr: string): boolean {
  if (!shiftStr) return false;
  const s = shiftStr.toUpperCase();
  return s.includes('PTO') || s.includes('RDO') || s.includes('VACATION') || s.includes('MEETING') || s.includes('OFF');
}

export function getFriendlyFacilityName(facilityStr: string): string {
  const upper = facilityStr.toUpperCase();
  if (upper.includes('MHMC')) return 'MH Memorial City';
  if (upper.includes('MHVIL')) return 'MH Village SC';
  if (upper.includes('HIVF')) return 'Houston IVF';
  if (upper.includes('HMWST')) return 'Methodist West';
  if (upper.includes('MHTW')) return 'MH Woodlands';
  if (upper.includes('HMH')) return 'Methodist Main';

  for (const [code, info] of Object.entries(KNOWN_FACILITIES)) {
    if (upper.includes(code)) return info.name;
  }
  return facilityStr.replace(/^(?:W|SE|MC|NNE|NW|SWSL):\s*/, '').trim();
}

export interface ParseOneUsapResult {
  workingStaff: ScrapedWorkingStaffItem[];
  departureCandidates: Array<{
    name: string;
    category: 'post_call' | 'non_call';
    shift?: string;
    facility: string;
    qgendaAbbr: string;
    roomAssignment?: string;
    orderNumber?: number;
  }>;
  lateCandidates: Array<{
    name: string;
    timeCategory: string;
    facility: string;
    role: string;
    qgendaAbbr: string;
    roomAssignment?: string;
    orderNumber?: number;
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
function resolveEffectiveShift(departureShift?: string, roomTag?: string): string {
  const dShift = (departureShift || '').trim();
  const rTag = (roomTag || '').trim();

  if (!dShift && !rTag) return '';
  if (!dShift) return rTag;
  if (!rTag) return dShift;

  const isLate = (s: string) => /3p|4p|5p|7p|8p|night/i.test(s);
  if (isLate(rTag) && !isLate(dShift)) {
    return `${dShift}, ${rTag}`;
  }
  if (!isLate(rTag) && isLate(dShift)) {
    return dShift;
  }
  if (dShift.toLowerCase() === rTag.toLowerCase()) {
    return dShift;
  }
  if (!dShift.toLowerCase().includes(rTag.toLowerCase())) {
    return `${dShift}, ${rTag}`;
  }
  return dShift;
}

export function parseOneUsapHtml(
  htmlContent: string,
  selectedFacilities: string[] = DEFAULT_FACILITIES
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
      providerRoomShifts.set(baseId.toLowerCase(), shiftTag);
    }
  }

  // 5. Extract active room assignments from HTML rows
  const roomAssignments: Array<{ facility: string; room: string; time: string; doc: string; anes: string }> = [];
  const rows = htmlContent.split(/<tr\b[^>]*>/i);
  let currentSite = '';

  for (const row of rows) {
    if (row.includes('zz_SITE_zz')) {
      const match = row.match(/data-site=["\x27]([^"\x27]+)["\x27]/i);
      currentSite = match ? match[1] : '';
      continue;
    }

    if (currentSite && isTargetFacility(currentSite, activeFacilities) && row.includes('zz_ROOM_zz')) {
      const docMatch = row.match(/data-doc=["\x27]([^"\x27]*)["\x27]/i);
      const anesMatch = row.match(/data-anes=["\x27]([^"\x27]*)["\x27]/i);
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

  // Helper to find all assigned rooms for a given provider QGenda ID / last name
  const findAssignedRooms = (qgendaId: string, lastName: string) => {
    const cleanId = qgendaId.replace(/\[.*?\]/g, '').trim().toLowerCase();
    const cleanLast = lastName.toLowerCase();
    const matched = roomAssignments.filter(r => {
      const docClean = r.doc.replace(/\[.*?\]/g, '').trim().toLowerCase();
      const anesClean = r.anes.replace(/\[.*?\]/g, '').trim().toLowerCase();
      return (
        (docClean && (docClean === cleanId || docClean.includes(cleanLast) || cleanId.includes(docClean))) ||
        (anesClean && (anesClean === cleanId || anesClean.includes(cleanLast) || cleanId.includes(anesClean)))
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

  // 6. Filter for selected target facilities
  const targetDocs = docEntries.filter(d => isTargetFacility(d.facility, activeFacilities));
  const targetAnes = anesEntries.filter(d => isTargetFacility(d.facility, activeFacilities));

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
    const facilityName = getFriendlyFacilityName(facility);
    const qgendaAbbr = rawName.replace(/\[.*?\]/g, '').trim();

    // Tally facility counts
    const upperFac = facility.toUpperCase();
    for (const facCode of activeFacilities) {
      if (upperFac.includes(facCode.toUpperCase())) {
        facilityStaffCounts[facCode] = (facilityStaffCounts[facCode] || 0) + 1;
      }
    }
    if (upperFac.includes('MHMC')) mhmcCount++;
    if (upperFac.includes('MHVIL')) mhvilCount++;

    const phone = phoneBook.get(qgendaAbbr) || '(555) 000-0000';
    const roomInfo = findAssignedRooms(qgendaAbbr, formatted.lastName);
    const roomTag = providerRoomShifts.get(qgendaAbbr.toLowerCase());
    const effectiveShift = resolveEffectiveShift(shift, roomTag);

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

  // Process CRNAs / Anesthetists
  targetAnes.forEach(entry => {
    const { rawName, facility, shift, orderNumber } = entry;
    if (isOffShift(shift)) return;

    const formatted = formatProviderName(rawName);
    const cleanId = rawName.replace(/\[.*?\]/g, '').toLowerCase();
    const facilityName = getFriendlyFacilityName(facility);
    const qgendaAbbr = rawName.replace(/\[.*?\]/g, '').trim();

    // Tally facility counts
    const upperFac = facility.toUpperCase();
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
    const effectiveShift = resolveEffectiveShift(shift, roomTag);

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

  // 8. Build Departure Candidates (Working Doctors)
  const rawDepartureCandidates: ParseOneUsapResult['departureCandidates'] = [];
  const callTeamMap = new Map<string, { doctorName: string; qgendaAbbr: string; orderNumber?: number; isCombined?: boolean }>();

  targetDocs.forEach(entry => {
    const { rawName, facility, shift, orderNumber } = entry;
    if (isOffShift(shift)) return;

    const formatted = formatProviderName(rawName);
    const qgendaAbbr = rawName.replace(/\[.*?\]/g, '').trim();
    const roomTag = providerRoomShifts.get(qgendaAbbr.toLowerCase());
    const effectiveShift = resolveEffectiveShift(shift, roomTag);
    const upperShift = effectiveShift.toUpperCase();

    let facilityLabel = 'MHMC';
    if (facility.includes('HIVF')) facilityLabel = 'HIVF';
    else if (facility.includes('MHVIL')) facilityLabel = 'Village';
    else if (facility.includes('MHMC')) facilityLabel = 'MHMC';
    else facilityLabel = facility.replace(/^(?:W|SE|MC|NNE|NW|SWSL):\s*/, '').replace(/W:\s*/g, '').trim();

    const isPostCall = 
      upperShift.includes('POSTC') || 
      upperShift.includes('POSTCV') || 
      upperShift.includes('POSTOB') || 
      upperShift.includes('POST1') ||
      upperShift.includes('POSTNICU');

    const roomInfo = findAssignedRooms(qgendaAbbr, formatted.lastName);

    rawDepartureCandidates.push({
      name: formatted.lastName.toUpperCase(),
      category: isPostCall ? 'post_call' : 'non_call',
      shift: effectiveShift || undefined,
      facility: facilityLabel,
      qgendaAbbr,
      roomAssignment: roomInfo.roomString || undefined,
      orderNumber
    });
  });

  // Call Team detection from shift codes:
  // Hospital calls are named: Call 1, Call 2, Call 3, CV, OB.
  // Sorted in order: CV, Call 3, Call 2, Call 1, OB.
  // Pass 1: Providers listed with "C1,OB" (like Dr. Lu) are both Call 1 and OB today.
  targetDocs.forEach(entry => {
    if (isOffShift(entry.shift)) return;
    const formatted = formatProviderName(entry.rawName);
    const qgendaAbbr = entry.rawName.replace(/\[.*?\]/g, '').trim();
    const roomTag = providerRoomShifts.get(qgendaAbbr.toLowerCase());
    const effectiveShift = resolveEffectiveShift(entry.shift, roomTag);
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
    const effectiveShift = resolveEffectiveShift(entry.shift, roomTag);
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

  // Sort Departure Candidates by orderNumber ascending:
  // Post-Call doctors in ascending orderNumber, followed by Non-Call doctors in ascending orderNumber
  const sortedPostCall = rawDepartureCandidates
    .filter(d => d.category === 'post_call')
    .sort((a, b) => (a.orderNumber ?? 999) - (b.orderNumber ?? 999));

  const sortedNonCall = rawDepartureCandidates
    .filter(d => d.category === 'non_call')
    .sort((a, b) => (a.orderNumber ?? 999) - (b.orderNumber ?? 999));

  const departureCandidates = [...sortedPostCall, ...sortedNonCall];

  // 9. Build Late List Candidates (CRNAs and Docs with 3p, 4p, 5p, 7p, 8p, Night)
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
    const roomTag = providerRoomShifts.get(qgendaAbbr.toLowerCase());
    const effectiveShift = resolveEffectiveShift(shift, roomTag);
    const upperShift = effectiveShift.toUpperCase();

    let facilityLabel = 'MHMC';
    if (facility.includes('HIVF')) facilityLabel = 'HIVF';
    else if (facility.includes('MHVIL')) facilityLabel = 'Village';
    else if (facility.includes('MHMC')) facilityLabel = 'MHMC';
    else facilityLabel = facility.replace(/^(?:W|SE|MC|NNE|NW|SWSL):\s*/, '').replace(/W:\s*/g, '').trim();

    let timeCat = '';
    if (upperShift.includes('3P')) timeCat = '3p';
    else if (upperShift.includes('4P')) timeCat = '4p';
    else if (upperShift.includes('5P')) timeCat = '5p';
    else if (upperShift.includes('7P-7A') || upperShift.includes('NIGHT')) timeCat = '7p-7a';
    else if (upperShift.includes('7P')) timeCat = '7p';
    else if (upperShift.includes('8P')) timeCat = '8p';

    if (timeCat) {
      const roomInfo = findAssignedRooms(qgendaAbbr, formatted.lastName);
      lateCandidates.push({
        name: formatted.lastName.toUpperCase(),
        timeCategory: timeCat,
        facility: facilityLabel,
        role,
        qgendaAbbr,
        roomAssignment: roomInfo.roomString || undefined,
        orderNumber
      });
    }
  };

  targetDocs.forEach(d => checkLate(d.rawName, d.facility, d.shift, 'MD', d.orderNumber));
  targetAnes.forEach(a => checkLate(a.rawName, a.facility, a.shift, 'CRNA', a.orderNumber));

  // Sort late list candidates: 3p -> 4p -> 5p -> 7p -> 8p -> 7p-7a, and within each category by orderNumber
  const TIME_ORDER: Record<string, number> = { '3p': 1, '4p': 2, '5p': 3, '7p': 4, '8p': 5, '7p-7a': 6 };
  lateCandidates.sort((a, b) => {
    const timeDiff = (TIME_ORDER[a.timeCategory] || 99) - (TIME_ORDER[b.timeCategory] || 99);
    if (timeDiff !== 0) return timeDiff;
    return (a.orderNumber ?? 999) - (b.orderNumber ?? 999);
  });

  // Build Call Team List in exact order: CV, Call 3, Call 2, Call 1, OB
  const callTeamOrder = ['CV', 'Call 3', 'Call 2', 'Call 1', 'OB'];
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
}): Promise<ScraperPreviewResult> {
  const targetDate = options.date || new Date().toISOString().split('T')[0];
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

    const parsed = parseOneUsapHtml(html, selectedFacilities);

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
