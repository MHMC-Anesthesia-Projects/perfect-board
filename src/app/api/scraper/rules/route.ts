import { NextRequest, NextResponse } from 'next/server';
import { loadPortalRules, savePortalRules, getDefaultPortalShiftRules, getDefaultPortalCombinationRules } from '@/lib/portalRulesStorage';
import { loadBoardState } from '@/lib/storage';
import { fetchAndScrapeOneUsap } from '@/lib/oneusapScraper';
import { PortalShiftRule, PortalCombinationRule, ScannedRoleItem, ScannedCombinationItem } from '@/types/whiteboard';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get('boardId') || 'current';
    const rules = await loadPortalRules(boardId);
    return NextResponse.json({ success: true, ...rules });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, boardId = 'current', payload, currentUser } = body;

    // Permissions check
    if (currentUser?.role === 'basic_user') {
      return NextResponse.json({ error: 'Permission denied. Admin or Superuser required.' }, { status: 403 });
    }

    const currentRules = await loadPortalRules(boardId);

    // 1. SAVE ALL RULES
    if (action === 'SAVE_RULES') {
      const { shiftRules, combinationRules } = payload;
      await savePortalRules({
        shiftRules: shiftRules || currentRules.shiftRules,
        combinationRules: combinationRules || currentRules.combinationRules
      }, boardId);
      return NextResponse.json({ success: true, message: 'Rules saved successfully.' });
    }

    // 2. ADD OR UPDATE SINGLE SHIFT RULE
    if (action === 'UPSERT_SHIFT_RULE') {
      const rule: PortalShiftRule = payload.rule;
      if (!rule || !rule.pattern) {
        return NextResponse.json({ error: 'Rule pattern is required.' }, { status: 400 });
      }

      const existingIdx = currentRules.shiftRules.findIndex(r => r.id === rule.id || r.pattern.toUpperCase() === rule.pattern.toUpperCase());
      if (existingIdx !== -1) {
        currentRules.shiftRules[existingIdx] = {
          ...currentRules.shiftRules[existingIdx],
          ...rule,
          updatedAt: new Date().toISOString()
        };
      } else {
        currentRules.shiftRules.unshift({
          ...rule,
          id: rule.id || `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      await savePortalRules(currentRules, boardId);
      return NextResponse.json({ success: true, shiftRules: currentRules.shiftRules });
    }

    // 3. DELETE SHIFT RULE
    if (action === 'DELETE_SHIFT_RULE') {
      const { ruleId } = payload;
      currentRules.shiftRules = currentRules.shiftRules.filter(r => r.id !== ruleId);
      await savePortalRules(currentRules, boardId);
      return NextResponse.json({ success: true, shiftRules: currentRules.shiftRules });
    }

    // 4. ADD OR UPDATE COMBINATION RULE
    if (action === 'UPSERT_COMBINATION_RULE') {
      const combRule: PortalCombinationRule = payload.combinationRule;
      if (!combRule || !combRule.primaryPattern || !combRule.secondaryPattern) {
        return NextResponse.json({ error: 'Primary and secondary patterns are required.' }, { status: 400 });
      }

      const existingIdx = currentRules.combinationRules.findIndex(r => r.id === combRule.id);
      if (existingIdx !== -1) {
        currentRules.combinationRules[existingIdx] = {
          ...currentRules.combinationRules[existingIdx],
          ...combRule,
          updatedAt: new Date().toISOString()
        };
      } else {
        currentRules.combinationRules.unshift({
          ...combRule,
          id: combRule.id || `comb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      await savePortalRules(currentRules, boardId);
      return NextResponse.json({ success: true, combinationRules: currentRules.combinationRules });
    }

    // 5. DELETE COMBINATION RULE
    if (action === 'DELETE_COMBINATION_RULE') {
      const { ruleId } = payload;
      currentRules.combinationRules = currentRules.combinationRules.filter(r => r.id !== ruleId);
      await savePortalRules(currentRules, boardId);
      return NextResponse.json({ success: true, combinationRules: currentRules.combinationRules });
    }

    // 6. RESET TO DEFAULTS
    if (action === 'RESET_DEFAULT_RULES') {
      const defaults = {
        shiftRules: getDefaultPortalShiftRules(),
        combinationRules: getDefaultPortalCombinationRules(),
        lastUpdated: new Date().toISOString()
      };
      await savePortalRules(defaults, boardId);
      return NextResponse.json({ success: true, ...defaults });
    }

    // 7. SCAN & HARVEST ROLES (FROM LIVE OR HISTORICAL SCHEDULE)
    if (action === 'SCAN_ROLES') {
      const boardState = await loadBoardState(boardId);
      const activeFacilities = boardState.scraperConfig.selectedFacilities || ['MHMC', 'MHVIL-SC', 'HIVF-SC'];

      // Fetch preview without mutating live board
      const scraped = await fetchAndScrapeOneUsap({
        portalUrl: boardState.scraperConfig.portalUrl,
        password: boardState.scraperConfig.password || '321usap',
        date: payload?.date,
        facilities: activeFacilities,
        existingStaff: boardState.staff
      });

      if (!scraped.success) {
        return NextResponse.json({ success: false, error: scraped.error || 'Failed to fetch schedule for scanning.' }, { status: 502 });
      }

      // Harvest all unique shift tokens and detect combinations
      const roleMap = new Map<string, {
        token: string;
        facilityCode?: string;
        roleType: 'MD' | 'CRNA' | 'ANY';
        sampleProvider?: string;
        frequency: number;
        isAffiliatedWithBoard: boolean;
      }>();

      const combinationMap = new Map<string, {
        pairKey: string;
        primaryToken: string;
        secondaryToken: string;
        sampleProvider: string;
      }>();

      const activeRules = currentRules.shiftRules;
      const activeCombRules = currentRules.combinationRules;

      for (const ws of scraped.workingStaff) {
        const rawShift = ws.shift || '';
        const rawTasks = (ws as any).rawTasks || '';
        const tokens = `${rawShift} ${rawTasks}`
          .split(/[,/]+/)
          .map(t => t.trim())
          .filter(t => t.length > 1 && !t.startsWith('('));

        const providerName = ws.displayName || ws.lastName;
        const creds = ws.credentials === 'MD' ? 'MD' : 'CRNA';

        // Multi-role detection
        if (tokens.length >= 2) {
          const sorted = [...tokens].sort();
          const pairKey = sorted.join(' + ');
          if (!combinationMap.has(pairKey)) {
            combinationMap.set(pairKey, {
              pairKey,
              primaryToken: sorted[0],
              secondaryToken: sorted[1],
              sampleProvider: providerName
            });
          }
        }

        // Single role tokens
        for (const token of tokens) {
          const key = token.toUpperCase();
          const existing = roleMap.get(key);
          const hasAffiliatedFacility = activeFacilities.some(f => key.includes(f));
          const isAffiliated = hasAffiliatedFacility || ws.facility === 'MH Memorial City' || !key.includes('_');

          // Extract facility if suffixed
          const facMatch = token.match(/_([A-Za-z0-9-]+)$/);
          const facilityCode = facMatch ? facMatch[1].toUpperCase() : (hasAffiliatedFacility ? activeFacilities[0] : undefined);

          if (existing) {
            existing.frequency += 1;
          } else {
            roleMap.set(key, {
              token,
              facilityCode,
              roleType: creds,
              sampleProvider: providerName,
              frequency: 1,
              isAffiliatedWithBoard: isAffiliated
            });
          }
        }
      }

      // Check mapping status for each scanned role
      const scannedRoles: ScannedRoleItem[] = Array.from(roleMap.values()).map(item => {
        const matchedRule = activeRules.find(r => {
          if (!r.active) return false;
          if (r.pattern.toUpperCase() === item.token.toUpperCase()) return true;
          // Wildcard match, e.g. 10h_*
          if (r.pattern.includes('*')) {
            const regex = new RegExp(`^${r.pattern.replace(/\*/g, '.*')}$`, 'i');
            return regex.test(item.token);
          }
          return false;
        });

        return {
          ...item,
          isMapped: Boolean(matchedRule),
          matchedRuleId: matchedRule?.id
        };
      });

      // Check handling status for each combination
      const scannedCombinations: ScannedCombinationItem[] = Array.from(combinationMap.values()).map(comb => {
        const matchedComb = activeCombRules.find(c => {
          if (!c.active) return false;
          const match1 = (c.primaryPattern.toUpperCase() === comb.primaryToken.toUpperCase() && c.secondaryPattern.toUpperCase() === comb.secondaryToken.toUpperCase());
          const match2 = (c.primaryPattern.toUpperCase() === comb.secondaryToken.toUpperCase() && c.secondaryPattern.toUpperCase() === comb.primaryToken.toUpperCase());
          return match1 || match2;
        });

        return {
          ...comb,
          isHandled: Boolean(matchedComb),
          matchedRuleId: matchedComb?.id
        };
      });

      // Calculate coverage statistics
      const affiliatedRoles = scannedRoles.filter(r => r.isAffiliatedWithBoard);
      const mappedAffiliated = affiliatedRoles.filter(r => r.isMapped).length;
      const coveragePercent = affiliatedRoles.length > 0
        ? Math.round((mappedAffiliated / affiliatedRoles.length) * 100)
        : 100;

      return NextResponse.json({
        success: true,
        scannedRoles,
        scannedCombinations,
        stats: {
          totalRolesFound: scannedRoles.length,
          affiliatedRolesCount: affiliatedRoles.length,
          mappedCount: mappedAffiliated,
          unmappedCount: affiliatedRoles.length - mappedAffiliated,
          coveragePercent,
          combinationsCount: scannedCombinations.length,
          unhandledCombinationsCount: scannedCombinations.filter(c => !c.isHandled).length
        }
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('Error in /api/scraper/rules route:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
