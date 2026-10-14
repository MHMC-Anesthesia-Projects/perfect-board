import { 
  PortalShiftRule, 
  PortalCombinationRule, 
  DepartureCategoryType, 
  LateCategoryType, 
  RoomAssignmentStrategy, 
  BoardInclusionStatus 
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
}

export interface ResolvedShiftPolicy {
  matchedRuleId?: string;
  matchedPattern?: string;
  boardStatus: BoardInclusionStatus;
  roomAssignmentStrategy: RoomAssignmentStrategy;
  departureCategory: DepartureCategoryType;
  departureTimeEstimate?: string;
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
  const normActive = activeFacilities.map(f => f.toUpperCase());

  // Extract facility suffix e.g. "_MHMC", "_MHKTY", "_MHVIL-SC", "_HMWST"
  const facMatch = token.match(/[-_]([A-Za-z0-9-]+)$/);
  if (facMatch) {
    const rawFac = facMatch[1].toUpperCase();
    const isAffil = normActive.some(af => af.includes(rawFac) || rawFac.includes(af));
    return {
      isAffiliated: isAffil,
      facilityCode: rawFac,
      isOutside: !isAffil
    };
  }

  // Token does not have explicit facility suffix (e.g. "3p", "5p", "C1", "postOB")
  return {
    isAffiliated: true,
    facilityCode: undefined,
    isOutside: false
  };
}

/**
 * Matches candidate tokens against combination rules (e.g. CIHOBPC_MHMC + L1_MHKTY).
 */
export function matchCombinationPolicy(
  tokens: string[],
  combinationRules: PortalCombinationRule[]
): PortalCombinationRule | null {
  if (!combinationRules || combinationRules.length === 0 || tokens.length < 2) {
    return null;
  }

  const activeRules = combinationRules.filter(r => r.active);
  const upperTokens = tokens.map(t => t.toUpperCase());

  for (const rule of activeRules) {
    const pUpper = rule.primaryPattern.toUpperCase();
    const sUpper = rule.secondaryPattern.toUpperCase();

    const hasPrimary = upperTokens.some(t => t === pUpper || t.includes(pUpper));
    const hasSecondary = upperTokens.some(t => t === sUpper || t.includes(sUpper));

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
    combinationRules = []
  } = ctx;

  const rawTokens = extractTokensFromContext(shift, tasks, roomTag, rawName);

  // Classify tokens by affiliation with the active hospital board
  const affiliatedTokens: string[] = [];
  const outsideTokens: string[] = [];

  for (const token of rawTokens) {
    const classification = classifyTokenFacility(token, activeFacilities);
    if (classification.isOutside) {
      outsideTokens.push(token);
    } else {
      affiliatedTokens.push(token);
    }
  }

  // 1. EVALUATE COMBINATION RULES (e.g. CIHOBPC_MHMC + L1_MHKTY)
  const matchedCombination = matchCombinationPolicy(rawTokens, combinationRules);
  if (matchedCombination) {
    const action = matchedCombination;
    return {
      matchedRuleId: action.id,
      matchedPattern: `${action.primaryPattern} + ${action.secondaryPattern}`,
      boardStatus: action.boardStatus,
      roomAssignmentStrategy: action.roomAssignmentStrategy,
      departureCategory: action.departureCategory,
      departureTimeEstimate: action.departureTimeEstimate,
      lateCategory: action.lateCategory,
      effectiveShift: action.notes || (action.departureCategory === 'post_call_10a' ? 'postOB' : 'Day'),
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
  // If provider has NO affiliated tokens for this board, has outside tokens,
  // their facility is outside, and they have NO rooms assigned at this board:
  const normActive = activeFacilities.map(f => f.toUpperCase());
  const isTargetFacility = normActive.some(af => af.includes(facility.toUpperCase()) || facility.toUpperCase().includes(af));
  if (affiliatedTokens.length === 0 && outsideTokens.length > 0 && !isTargetFacility && assignedRooms.length === 0) {
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
    } else if (bestRule.departureCategory === 'post_call_10a') {
      displayShift = 'postOB';
    } else if (bestRule.pattern.toLowerCase().includes('noct')) {
      displayShift = '12h-7p:Noct';
    } else {
      displayShift = role === 'MD' ? 'Day' : '8h';
    }

    // Preserve preCall / postCall annotations if present in raw tokens
    const upperTokens = rawTokens.map(t => t.toUpperCase());
    const hasPrecall = upperTokens.some(t => t.includes('PRECALL') || t.includes('PRE-CALL') || t.includes('PREOB') || t.includes('PREC1'));
    const hasPostcall = upperTokens.some(t => t.includes('POSTOB') || t.includes('POST-OB') || t.includes('POSTC1') || t.includes('POST-C1'));

    if (hasPrecall && !displayShift.toLowerCase().includes('precall')) {
      displayShift = `${displayShift}, preCall`;
    }
    if (hasPostcall && !displayShift.toLowerCase().includes('post')) {
      displayShift = `${displayShift}, postOB`;
    }

    return {
      matchedRuleId: bestRule.id,
      matchedPattern: bestRule.pattern,
      boardStatus: bestRule.boardStatus,
      roomAssignmentStrategy: bestRule.roomAssignmentStrategy,
      departureCategory: bestRule.departureCategory,
      departureTimeEstimate: bestRule.departureTimeEstimate,
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
  const isLate = /3P|4P|5P|7P|8P|NOCT|NIGHT/i.test(combinedRaw);

  let fallbackLate: LateCategoryType = 'none';
  if (combinedRaw.includes('7P-7A') || combinedRaw.includes('NOCT')) fallbackLate = '7p-7a';
  else if (combinedRaw.includes('8P')) fallbackLate = '8p';
  else if (combinedRaw.includes('7P') || combinedRaw.includes('L1')) fallbackLate = '7p';
  else if (combinedRaw.includes('5P') || combinedRaw.includes('10H')) fallbackLate = '5p';
  else if (combinedRaw.includes('4P')) fallbackLate = '4p';
  else if (combinedRaw.includes('3P') || combinedRaw.includes('8H')) fallbackLate = '3p';

  let fallbackDep: DepartureCategoryType = 'none';
  if (isPostCall) fallbackDep = 'post_call_10a';
  else if (role === 'MD' && !isLate) fallbackDep = 'non_call_queue';
  else if (fallbackLate !== 'none') fallbackDep = 'scheduled_time';

  return {
    boardStatus: 'include',
    roomAssignmentStrategy: fallbackLate === '7p-7a' ? 'unassigned_pool' : 'scraped',
    departureCategory: fallbackDep,
    departureTimeEstimate: fallbackLate !== 'none' ? fallbackLate : (isPostCall ? '10:00 AM' : undefined),
    lateCategory: fallbackLate,
    effectiveShift: fallbackLate !== 'none' ? fallbackLate : (isPostCall ? 'postOB' : 'Day'),
    isCombination: false,
    rawTokens,
    affiliatedTokens,
    outsideTokens
  };
}
