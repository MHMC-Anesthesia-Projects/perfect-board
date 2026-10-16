import { 
  PortalShiftRule, 
  PortalCombinationRule, 
  DepartureCategoryType, 
  LateCategoryType, 
  RoomAssignmentStrategy, 
  BoardInclusionStatus,
  UniqueScheduleRule
} from '@/types/whiteboard';

export interface ProviderShiftContext {
  rawName: string;
  qgendaAbbr?: string;
  role: 'MD' | 'CRNA';
  facility: string; // e.g. "MHMC", "MHVIL-SC", "CV", "W: MHMC"
  shift?: string;
  tasks?: string;
  roomTag?: string;
  assignedRooms?: string[];
  activeFacilities: string[];
  portalRules?: PortalShiftRule[];
  combinationRules?: PortalCombinationRule[];
  uniqueSchedules?: UniqueScheduleRule[];
}

export interface ResolvedShiftPolicy {
  matchedRuleId?: string;
  matchedPattern?: string;
  boardStatus: BoardInclusionStatus;
  roomAssignmentStrategy: RoomAssignmentStrategy;
  departureCategory: DepartureCategoryType;
  departureTimeEstimate?: string;
  badgeNote?: string;
  lateCategory: LateCategoryType;
  effectiveShift: string;
  isCombination: boolean;
  combinationRuleId?: string;
  rawTokens: string[];
  affiliatedTokens: string[];
  outsideTokens: string[];
}

/**
 * Extracts discrete shift and role tokens from multiple possible sources in QGenda/OneUSAP.
 */
export function extractTokensFromContext(
  shift?: string,
  tasks?: string,
  roomTag?: string,
  rawName?: string
): string[] {
  const rawSources = [shift, tasks, roomTag, rawName].filter(Boolean) as string[];
  const tokenSet = new Set<string>();

  for (const src of rawSources) {
    const isRawNameSource = src === rawName;

    // 1. Extract bracketed tokens like [3p], [5p], [postOB], [postC1]
    const bracketMatches = Array.from(src.matchAll(/\[(.*?)\]/g));
    for (const bm of bracketMatches) {
      const content = bm[1].trim();
      if (content && !['P', 'C', 'RES', 'SRNA', 'L', 'CRNA', 'MD'].includes(content.toUpperCase())) {
        tokenSet.add(content);
      }
    }

    // 2. Strip brackets and split by commas, semicolons, slashes
    // If this source is rawName, only extract parts that resemble roles (e.g. contains "_" or digits)
    const cleanSrc = src.replace(/\[.*?\]/g, ' ').replace(/<[^>]+>/g, ' ');
    const parts = cleanSrc.split(/[,;\/\n\r]+/).map(p => p.trim()).filter(Boolean);

    for (const part of parts) {
      if (isRawNameSource && !part.includes('_') && !/\b[0-9]{1,2}h\b/i.test(part)) {
        // Skip bare personal names like "SmithJohn" or "Cavanaugh"
        continue;
      }

      // If composite like "12h-7p:Noct_MHMC" or "Dr8h_MHMC" or "CIHOBPC_MHMC"
      if (/^[A-Za-z0-9_:-]+$/.test(part) && part.length >= 2) {
        tokenSet.add(part);
      } else {
        // Space separated sub-tokens
        const subTokens = part.split(/\s+/).map(st => st.trim()).filter(Boolean);
        for (const st of subTokens) {
          if (st.length >= 2 && !['THE', 'AND', 'OF', 'OR', 'AT', 'FOR', 'TASKS:'].includes(st.toUpperCase())) {
            tokenSet.add(st);
          }
        }
      }
    }
  }

  return Array.from(tokenSet);
}

/**
 * Checks if a token belongs to one of the board's active facilities or an outside facility.
 */
export function classifyTokenFacility(
  token: string, 
  activeFacilities: string[]
): { isAffiliated: boolean; facilityCode?: string; isOutside: boolean } {
  const normActiveBases = activeFacilities.map(af => 
    af.toUpperCase().replace(/^(?:W|SE|MC|NNE|NW|SWSL):\s*/i, '').replace(/[-_]SC$/i, '')
  );

  // Extract facility suffix e.g. "_MHMC", "_MHKTY", "_MHVIL-SC", "_HMWST", "_MHFC_SC", "_MHRIC_SC"
  const facMatch = token.match(/_([A-Za-z0-9]+(?:[-_]SC)?)$/i) || token.match(/[-]([A-Za-z]{2,10}(?:[-_]SC)?)$/i);
  if (facMatch) {
    const rawFac = facMatch[1].toUpperCase();
    if (rawFac !== 'SC') {
      const normCode = rawFac.replace(/_/g, '-');
      const baseCode = normCode.replace(/[-_]SC$/i, '');
      const isAffil = normActiveBases.includes(baseCode) || (baseCode === 'CCRM' && normActiveBases.includes('HIVF'));
      return {
        isAffiliated: isAffil,
        facilityCode: normCode,
        isOutside: !isAffil
      };
    }
  }

  // Token does not have explicit facility suffix (e.g. "3p", "5p", "C1", "postOB")
  return {
    isAffiliated: false,
    facilityCode: undefined,
    isOutside: false
  };
}

function tokenMatchesCombinationPattern(token: string, pattern: string): boolean {
  const tUpper = token.toUpperCase().trim();
  const pUpper = pattern.toUpperCase().trim();

  // If pattern is looking for active OB call (and not explicitly post-call), do not match post-call tokens
  if (
    pUpper.includes('OB') &&
    !pUpper.includes('POST') &&
    !pUpper.includes('PC') &&
    (tUpper.includes('POST') || tUpper.includes('PC'))
  ) {
    return false;
  }

  if (pUpper.includes('*')) {
    const regexPattern = '^' + pUpper.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*') + '$';
    try {
      if (new RegExp(regexPattern, 'i').test(tUpper)) return true;
    } catch {}
  }

  if (tUpper === pUpper) return true;

  // Prefix match (e.g. pattern "L1" matches "L1_MHMC" or "L1-MHMC")
  if (tUpper.startsWith(`${pUpper}_`) || tUpper.startsWith(`${pUpper}-`)) return true;

  return false;
}

/**
 * Matches candidate tokens against combination rules (e.g. CIHOBPC_MHMC + L1_MHKTY, or L1* + *OB*).
 */
export function matchCombinationPolicy(
  tokens: string[],
  combinationRules: PortalCombinationRule[]
): PortalCombinationRule | null {
  if (!combinationRules || combinationRules.length === 0 || tokens.length < 2) {
    return null;
  }

  const activeRules = combinationRules.filter(r => r.active);
  const upperTokens = tokens.map(t => t.toUpperCase().trim());

  for (const rule of activeRules) {
    const hasPrimary = upperTokens.some(t => tokenMatchesCombinationPattern(t, rule.primaryPattern));
    const hasSecondary = upperTokens.some(t => tokenMatchesCombinationPattern(t, rule.secondaryPattern));

    if (hasPrimary && hasSecondary) {
      return rule;
    }
  }

  return null;
}

/**
 * Matches an individual token against shift rules reference table.
 */
export function matchShiftRule(
  token: string,
  role: 'MD' | 'CRNA',
  facility: string,
  activeFacilities: string[],
  shiftRules: PortalShiftRule[]
): PortalShiftRule | null {
  if (!shiftRules || shiftRules.length === 0) return null;

  const tUpper = token.toUpperCase().trim();
  const fUpper = facility.toUpperCase().trim();
  const activeUpper = activeFacilities.map(f => f.toUpperCase());

  const candidates: Array<{ rule: PortalShiftRule; score: number }> = [];

  for (const rule of shiftRules) {
    if (!rule.active) continue;

    // 1. Role match check
    if (rule.roleType !== 'ANY' && rule.roleType !== role) {
      continue;
    }

    // 2. Facility check
    if (rule.facilityCode && rule.facilityCode !== 'ALL') {
      const rfUpper = rule.facilityCode.toUpperCase();
      const matchesFac = activeUpper.some(af => af.includes(rfUpper) || rfUpper.includes(af)) ||
                         fUpper.includes(rfUpper) ||
                         tUpper.includes(rfUpper);
      if (!matchesFac) {
        continue;
      }
    }

    // 3. Pattern match
    const pUpper = rule.pattern.toUpperCase().trim();
    let isMatch = false;
    let score = rule.priority ?? 10;

    if (pUpper.includes('*')) {
      // Wildcard match
      const regexPattern = '^' + pUpper.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*') + '$';
      try {
        const regex = new RegExp(regexPattern, 'i');
        if (regex.test(tUpper)) {
          isMatch = true;
          score += 5;
        }
      } catch {}
    } else if (tUpper === pUpper) {
      // Exact match gets highest score
      isMatch = true;
      score += 20;
    } else if (tUpper.includes(pUpper) || pUpper.includes(tUpper)) {
      // Substring match
      isMatch = true;
      score += 2;
    }

    if (isMatch) {
      candidates.push({ rule, score });
    }
  }

  if (candidates.length === 0) return null;

  // Pick candidate with highest score
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].rule;
}

/**
 * Main Decoupled Resolution Engine:
 * Resolves a provider's complete schedule policy using the Master Reference Table.
 */
export function resolveProviderShiftPolicy(
  ctx: ProviderShiftContext
): ResolvedShiftPolicy {
  const {
    rawName,
    qgendaAbbr = '',
    role,
    facility,
    shift = '',
    tasks = '',
    roomTag = '',
    assignedRooms = [],
    activeFacilities,
    portalRules = [],
    combinationRules = [],
    uniqueSchedules = []
  } = ctx;

  // 0. CHECK EXPLICIT USER CONFIGURED UNIQUE SCHEDULES (e.g. Chuan 4p, Hirsch 5p, Baerenstecher 5p)
  if (uniqueSchedules && uniqueSchedules.length > 0) {
    const cleanAbbr = (qgendaAbbr || rawName).replace(/\[.*?\]/g, '').toLowerCase().trim();
    const cleanLast = rawName.replace(/\[.*?\]/g, '').replace(/^[A-Za-z0-9_-]+[:\s]+/, '').toLowerCase().trim();
    const facilityStr = facility || '';

    const matchedUnique = uniqueSchedules.find(rule => {
      if (!rule.active) return false;
      if (rule.facilityCondition && rule.facilityCondition !== 'ALL') {
        const ruleFac = rule.facilityCondition.toUpperCase();
        const targetFac = facilityStr.toUpperCase();
        if (!targetFac.includes(ruleFac)) return false;
      }
      const rName = (rule.providerName || '').toLowerCase().trim();
      const rAbbr = (rule.qgendaAbbr || '').replace(/\[.*?\]/g, '').toLowerCase().trim();
      return (
        (rAbbr && cleanAbbr.includes(rAbbr)) ||
        (rName && (cleanLast.includes(rName) || cleanAbbr.includes(rName)))
      );
    });

    if (matchedUnique) {
      const fixedShift = matchedUnique.fixedShift.toLowerCase().trim();
      const isLateTime = ['3p', '4p', '5p', '7p', '3p-7a', '7p-7a', '8p', '24h'].includes(fixedShift);
      return {
        matchedRuleId: matchedUnique.id,
        matchedPattern: `Unique Schedule: ${matchedUnique.providerName} (${matchedUnique.fixedShift})`,
        boardStatus: 'include',
        roomAssignmentStrategy: 'scraped',
        departureCategory: isLateTime ? 'none' : 'scheduled_time',
        departureTimeEstimate: fixedShift,
        badgeNote: undefined,
        lateCategory: isLateTime ? (fixedShift as LateCategoryType) : 'none',
        effectiveShift: fixedShift,
        isCombination: false,
        rawTokens: [matchedUnique.fixedShift],
        affiliatedTokens: [matchedUnique.fixedShift],
        outsideTokens: []
      };
    }
  }

  const rawTokens = extractTokensFromContext(shift, tasks, roomTag, rawName);

  // Classify tokens by affiliation with the active hospital board
  const affiliatedTokens: string[] = [];
  const outsideTokens: string[] = [];

  for (const token of rawTokens) {
    const classification = classifyTokenFacility(token, activeFacilities);
    if (classification.isOutside) {
      outsideTokens.push(token);
    } else if (classification.isAffiliated) {
      affiliatedTokens.push(token);
    }
  }

  // 1. EVALUATE COMBINATION RULES (e.g. CIHOBPC_MHMC + L1_MHKTY)
  const matchedCombination = matchCombinationPolicy(rawTokens, combinationRules);
  if (matchedCombination) {
    const action = matchedCombination;
    const isPostCallComb = action.departureCategory === 'post_call' || action.departureCategory === 'post_call_10a';
    return {
      matchedRuleId: action.id,
      matchedPattern: `${action.primaryPattern} + ${action.secondaryPattern}`,
      boardStatus: action.boardStatus,
      roomAssignmentStrategy: action.roomAssignmentStrategy,
      departureCategory: isPostCallComb ? 'post_call' : action.departureCategory,
      departureTimeEstimate: isPostCallComb ? undefined : action.departureTimeEstimate,
      badgeNote: action.badgeNote || (isPostCallComb ? 'postOB' : (action.lateCategory === '3p-7a' ? '3p-7a (L1 + OB)' : (action.lateCategory === '24h' ? '24h (L1 + OB)' : undefined))),
      lateCategory: action.lateCategory,
      effectiveShift: isPostCallComb ? 'postOB' : (action.lateCategory !== 'none' ? action.lateCategory : 'Day'),
      isCombination: true,
      combinationRuleId: action.id,
      rawTokens,
      affiliatedTokens,
      outsideTokens
    };
  }

  // 2. MULTI-TOKEN FACILITY ISOLATION:
  // If provider has both affiliated tokens (for this board) and outside tokens (e.g. other hospital),
  // evaluate affiliated tokens FIRST so outside hospital roles do not misplace the provider here!
  const candidateTokens = affiliatedTokens.length > 0 ? affiliatedTokens : rawTokens;

  // 2b. EXCLUSION OF PURELY OUTSIDE FACILITY PROVIDERS:
  // If provider has NO affiliated tokens for this board, their home facility is outside,
  // and they have NO rooms assigned at this board:
  const normActiveBases = activeFacilities.map(af => 
    af.toUpperCase().replace(/^(?:W|SE|MC|NNE|NW|SWSL):\s*/i, '').replace(/[-_]SC$/i, '')
  );
  const facSegments = facility.split(',').map(s => s.trim()).filter(Boolean);
  const isTargetHomeFac = facSegments.some(seg => {
    const base = seg.toUpperCase().replace(/^(?:W|SE|MC|NNE|NW|SWSL):\s*/i, '').replace(/[-_]SC$/i, '');
    return normActiveBases.includes(base) || (base === 'CCRM' && normActiveBases.includes('HIVF'));
  });
  const hasTargetRooms = assignedRooms.length > 0 && assignedRooms.some(r => {
    const rBase = r.toUpperCase().replace(/^(?:W|SE|MC|NNE|NW|SWSL):\s*/i, '').replace(/[-_]SC$/i, '');
    return normActiveBases.some(ab => rBase.includes(ab) || ab.includes(rBase));
  });

  if (affiliatedTokens.length === 0 && !isTargetHomeFac && !hasTargetRooms) {
    return {
      boardStatus: 'exclude',
      roomAssignmentStrategy: 'scraped',
      departureCategory: 'none',
      lateCategory: 'none',
      effectiveShift: 'Outside',
      isCombination: false,
      rawTokens,
      affiliatedTokens,
      outsideTokens
    };
  }

  // 3. MATCH SHIFT RULES AGAINST CANDIDATE TOKENS
  let bestRule: PortalShiftRule | null = null;
  let bestScore = -1;

  for (const token of candidateTokens) {
    const rule = matchShiftRule(token, role, facility, activeFacilities, portalRules);
    if (rule) {
      const score = (rule.priority ?? 10) + (rule.pattern.toUpperCase() === token.toUpperCase() ? 20 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestRule = rule;
      }
    }
  }

  // 4. IF A RULE MATCHED IN THE REFERENCE TABLE:
  if (bestRule) {
    // Determine effective display shift string
    let displayShift = bestRule.shiftHours || '';
    if (bestRule.departureTimeEstimate) {
      displayShift = bestRule.departureTimeEstimate;
    } else if (bestRule.lateCategory && bestRule.lateCategory !== 'none') {
      displayShift = bestRule.lateCategory;
    } else if (bestRule.departureCategory === 'post_call' || bestRule.departureCategory === 'post_call_10a') {
      displayShift = bestRule.badgeNote || 'postOB';
    } else if (bestRule.pattern.toLowerCase().includes('noct')) {
      displayShift = '12h-7p:Noct';
    } else {
      displayShift = role === 'MD' ? 'Day' : '8h';
    }

    // Preserve preCall / postCall annotations if present in raw tokens
    const upperTokens = rawTokens.map(t => t.toUpperCase());
    const hasPrecall = upperTokens.some(t => t.includes('PRECALL') || t.includes('PRE-CALL') || t.includes('PREOB') || t.includes('PREC1'));
    const hasPostcall = upperTokens.some(t => t.includes('POSTOB') || t.includes('POST-OB') || t.includes('POSTC1') || t.includes('POST-C1'));

    if (hasPrecall && !displayShift.toLowerCase().includes('precall') && !displayShift.toLowerCase().includes('prec')) {
      displayShift = `${displayShift}, preCall`;
    }
    if (hasPostcall && !displayShift.toLowerCase().includes('post')) {
      displayShift = `${displayShift}, postOB`;
    }

    const isPostCall = bestRule.departureCategory === 'post_call' || bestRule.departureCategory === 'post_call_10a';

    return {
      matchedRuleId: bestRule.id,
      matchedPattern: bestRule.pattern,
      boardStatus: bestRule.boardStatus,
      roomAssignmentStrategy: bestRule.roomAssignmentStrategy,
      departureCategory: isPostCall ? 'post_call' : bestRule.departureCategory,
      departureTimeEstimate: isPostCall ? undefined : bestRule.departureTimeEstimate,
      badgeNote: bestRule.badgeNote,
      lateCategory: bestRule.lateCategory,
      effectiveShift: displayShift,
      isCombination: false,
      rawTokens,
      affiliatedTokens,
      outsideTokens
    };
  }

  // 5. SAFE FALLBACK (NO RULE MATCHED):
  // Preserve graceful behavior so an unmapped token doesn't crash or hide active staff
  const combinedRaw = `${shift} ${tasks} ${roomTag}`.toUpperCase();
  const isPostCall = combinedRaw.includes('POST') || combinedRaw.includes('OBPC');
  const isLate = /3P|4P|5P|7P|8P|NOCT|NIGHT|3P-7A|7P-7A/i.test(combinedRaw);

  let fallbackLate: LateCategoryType = 'none';
  if (combinedRaw.includes('3P-7A')) fallbackLate = '3p-7a';
  else if (combinedRaw.includes('7P-7A') || combinedRaw.includes('NOCT')) fallbackLate = '7p-7a';
  else if (combinedRaw.includes('8P')) fallbackLate = '8p';
  else if (combinedRaw.includes('7P') || combinedRaw.includes('L1')) fallbackLate = '7p';
  else if (combinedRaw.includes('5P') || combinedRaw.includes('10H')) fallbackLate = '5p';
  else if (combinedRaw.includes('4P')) fallbackLate = '4p';
  else if (combinedRaw.includes('3P') || combinedRaw.includes('8H')) fallbackLate = '3p';

  let fallbackDep: DepartureCategoryType = 'none';
  if (isPostCall) fallbackDep = 'post_call';
  else if (role === 'MD' && !isLate) fallbackDep = 'non_call_queue';
  else if (fallbackLate !== 'none') fallbackDep = 'scheduled_time';

  return {
    boardStatus: 'include',
    roomAssignmentStrategy: (fallbackLate === '7p-7a' || fallbackLate === '3p-7a') ? 'unassigned_pool' : 'scraped',
    departureCategory: fallbackDep,
    departureTimeEstimate: fallbackLate !== 'none' ? fallbackLate : undefined,
    badgeNote: isPostCall ? 'postOB' : undefined,
    lateCategory: fallbackLate,
    effectiveShift: fallbackLate !== 'none' ? fallbackLate : (isPostCall ? 'postOB' : 'Day'),
    isCombination: false,
    rawTokens,
    affiliatedTokens,
    outsideTokens
  };
}
