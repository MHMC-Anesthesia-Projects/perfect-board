import { NextRequest, NextResponse } from 'next/server';
import { loadBoardState, saveBoardState, recordAuditLog } from '@/lib/storage';
import { fetchAndScrapeOneUsap, getHoustonDateString } from '@/lib/oneusapScraper';
import { DepartureItem, LateShiftItem, CallTeamItem, Staff } from '@/types/whiteboard';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, config, currentUser, date } = body;

    const state = await loadBoardState();

    // 1. UPDATE SCRAPER CONFIGURATION
    if (action === 'UPDATE_CONFIG') {
      if (currentUser?.role !== 'superuser') {
        return NextResponse.json({ error: 'Superuser permission required to configure portal integration.' }, { status: 403 });
      }
      state.scraperConfig = {
        ...state.scraperConfig,
        ...config
      };
      await saveBoardState(state);
      await recordAuditLog({
        actionType: 'SCRAPER_SYNCED',
        performedBy: currentUser?.displayName || 'Superuser',
        userRole: 'superuser',
        details: `Updated scraper configuration for portal: ${config.portalType} (${config.portalUrl})`
      });
      return NextResponse.json({ success: true, config: state.scraperConfig });
    }

    // 2. TEST SYNC (PREVIEW SCRAPED DATA WITHOUT MUTATING LIVE WHITEBOARD)
    if (action === 'TEST_SYNC') {
      const activeType = config?.portalType || state.scraperConfig.portalType;
      const activeUrl = config?.portalUrl || state.scraperConfig.portalUrl;
      const activePass = config?.password || state.scraperConfig.password || '321usap';
      const activeFacilities = config?.selectedFacilities || state.scraperConfig.selectedFacilities || ['MHMC', 'MHVIL-SC', 'HIVF-SC'];
      const targetDate = date || getHoustonDateString();

      if (activeType === 'oneusap') {
        const preview = await fetchAndScrapeOneUsap({
          portalUrl: activeUrl,
          password: activePass,
          date: targetDate,
          facilities: activeFacilities,
          uniqueSchedules: state.uniqueSchedules
        });

        return NextResponse.json({
          success: preview.success,
          preview,
          error: preview.error
        });
      }

      // Fallback preview for other portal types
      return NextResponse.json({
        success: true,
        preview: {
          success: true,
          portalType: activeType,
          sourceUrl: activeUrl,
          timestamp: new Date().toISOString(),
          facilities: activeFacilities,
          selectedFacilities: activeFacilities,
          workingStaff: state.staff.filter(s => s.active).map(s => ({
            id: s.id,
            displayName: `${s.lastName.toUpperCase()} ${s.firstName ? s.firstName[0] + '.' : ''}`.trim(),
            lastName: s.lastName,
            firstName: s.firstName,
            credentials: s.credentials,
            phone: s.phone,
            facility: s.facility || 'MH Memorial City',
            shift: s.shift || '07:00 - 15:30',
            roomAssignment: s.assignedRoom,
            qgendaAbbr: s.qgendaAbbr
          })),
          departureCandidates: state.departureList.map(d => ({
            name: d.name,
            category: d.category || 'non_call',
            facility: 'MHMC',
            shift: d.timeEstimate,
            orderNumber: d.orderNumber,
            qgendaAbbr: d.qgendaAbbr,
            roomAssignment: d.assignedRoom
          })),
          lateCandidates: state.latesList.map(l => ({
            name: l.name,
            timeCategory: l.timeCategory,
            timeEstimate: l.timeEstimate,
            facility: 'MHMC',
            role: l.role || 'CRNA',
            orderNumber: l.orderNumber,
            qgendaAbbr: l.qgendaAbbr,
            roomAssignment: l.assignedRoom,
            notes: l.notes
          })),
          callTeamCandidates: state.callTeamList.map(c => ({
            role: c.role,
            doctorName: c.doctorName,
            qgendaAbbr: c.qgendaAbbr
          })),
          rawCounts: {
            totalWorkingStaff: state.staff.filter(s => s.active).length,
            totalDocs: state.staff.filter(s => s.active && s.credentials === 'MD').length,
            totalAnes: state.staff.filter(s => s.active && s.credentials !== 'MD').length,
            mhmcStaffCount: state.staff.filter(s => s.active).length,
            mhvilStaffCount: 0,
            phoneNumbersCount: state.staff.filter(s => s.active && s.phone).length
          }
        }
      });
    }

    // 3. TRIGGER LIVE SYNC
    if (action === 'TRIGGER_SYNC') {
      if (currentUser?.role === 'basic_user') {
        return NextResponse.json({ error: 'Permission denied. Login required.' }, { status: 403 });
      }

      const activeType = state.scraperConfig.portalType;
      const activeFacilities = state.scraperConfig.selectedFacilities || ['MHMC', 'MHVIL-SC', 'HIVF-SC'];

      if (activeType === 'oneusap' && !state.scraperConfig.mockMode) {
        const targetDate = date || getHoustonDateString();
        const scraped = await fetchAndScrapeOneUsap({
          portalUrl: state.scraperConfig.portalUrl,
          password: state.scraperConfig.password || '321usap',
          date: targetDate,
          facilities: activeFacilities,
          uniqueSchedules: state.uniqueSchedules
        });

        if (!scraped.success) {
          state.scraperConfig.lastSyncStatus = 'failed';
          await saveBoardState(state);
          return NextResponse.json({
            success: false,
            error: scraped.error || 'Failed to scrape OneUSAP schedule.'
          }, { status: 502 });
        }

        // Apply Departure List: Post-Call -> Special (atypical times e.g. 2p) -> Non-Call
        const postCallDeps: DepartureItem[] = scraped.departureCandidates
          .filter(c => c.category === 'post_call')
          .map((c, i) => ({
            id: `dep_post_${i}_${Date.now()}`,
            name: c.name,
            orderIndex: i,
            category: 'post_call' as const,
            timeEstimate: c.shift,
            orderNumber: c.orderNumber,
            qgendaAbbr: c.qgendaAbbr,
            assignedRoom: c.roomAssignment
          }));

        const specialDeps: DepartureItem[] = scraped.departureCandidates
          .filter(c => c.category === 'special')
          .map((c, i) => ({
            id: `dep_spec_${i}_${Date.now()}`,
            name: c.name,
            orderIndex: postCallDeps.length + i,
            category: 'special' as const,
            timeEstimate: c.shift,
            orderNumber: c.orderNumber,
            qgendaAbbr: c.qgendaAbbr,
            assignedRoom: c.roomAssignment
          }));

        const nonCallDeps: DepartureItem[] = scraped.departureCandidates
          .filter(c => c.category === 'non_call')
          .map((c, i) => ({
            id: `dep_non_${i}_${Date.now()}`,
            name: c.name,
            orderIndex: postCallDeps.length + specialDeps.length + i,
            category: 'non_call' as const,
            timeEstimate: c.shift,
            orderNumber: c.orderNumber,
            qgendaAbbr: c.qgendaAbbr,
            assignedRoom: c.roomAssignment
          }));

        state.departureList = [...postCallDeps, ...specialDeps, ...nonCallDeps];

        // Apply Call Team List
        if (scraped.callTeamCandidates.length > 0) {
          state.callTeamList = scraped.callTeamCandidates.map((c, i) => ({
            id: `call_${i}_${Date.now()}`,
            role: c.role,
            doctorName: c.doctorName,
            qgendaAbbr: c.qgendaAbbr,
            orderNumber: c.orderNumber,
            orderIndex: i
          }));
        }

        // Apply Lates List
        state.latesList = scraped.lateCandidates.map((l, i) => ({
          id: `late_${i}_${Date.now()}`,
          name: l.name,
          timeCategory: l.timeCategory,
          orderIndex: i,
          orderNumber: l.orderNumber,
          role: l.role,
          qgendaAbbr: l.qgendaAbbr,
          assignedRoom: l.roomAssignment,
          timeEstimate: l.timeEstimate,
          notes: l.notes
        }));

        // Apply Working Staff Roster for Available Unassigned Staff
        // (Builds up and persists the Site Staff Roster over daily syncs)
        const existingStaffList = [...state.staff];
        const matchedExistingIds = new Set<string>();
        let newStaffAddedCount = 0;

        // Helper to match scraped provider against existing site roster
        const findMatch = (ws: typeof scraped.workingStaff[0]): Staff | undefined => {
          const wsQ = (ws.qgendaAbbr || '').trim().toLowerCase();
          const wsLast = (ws.lastName || '').trim().toLowerCase();
          const wsFirst = (ws.firstName || '').trim().toLowerCase();

          // 1. Exact ID match
          if (ws.id) {
            const byId = existingStaffList.find(s => s.id === ws.id);
            if (byId) return byId;
          }

          // 2. QGenda abbreviation match
          if (wsQ) {
            const byQ = existingStaffList.find(s => s.qgendaAbbr && s.qgendaAbbr.trim().toLowerCase() === wsQ);
            if (byQ) return byQ;
          }

          // 3. Last name + First name / First initial match
          if (wsLast) {
            const byLastFirst = existingStaffList.find(s => {
              const sLast = (s.lastName || '').trim().toLowerCase();
              const sFirst = (s.firstName || '').trim().toLowerCase();
              if (sLast === wsLast) {
                if (!wsFirst || !sFirst) return true;
                if (sFirst === wsFirst) return true;
                if (sFirst[0] === wsFirst[0]) return true;
              }
              return false;
            });
            if (byLastFirst) return byLastFirst;

            // 4. Unique last name match in site roster
            const byLastOnly = existingStaffList.filter(s => (s.lastName || '').trim().toLowerCase() === wsLast);
            if (byLastOnly.length === 1) {
              return byLastOnly[0];
            }
          }

          return undefined;
        };

        // Process all scraped working staff for today's selected facilities
        scraped.workingStaff.forEach(ws => {
          const existing = findMatch(ws);

          const isInfrequent = Boolean(existing?.isInfrequent) ||
            Boolean(state.infrequentStaffIds?.includes(ws.id)) ||
            Boolean(ws.qgendaAbbr && state.infrequentStaffKeys?.includes(ws.qgendaAbbr.toLowerCase())) ||
            Boolean(state.infrequentStaffKeys?.includes(ws.lastName.toLowerCase()));

          if (existing) {
            matchedExistingIds.add(existing.id);

            // Update dynamic schedule data for today
            if (ws.phone && (!existing.phone || existing.phone.includes('000-0000'))) {
              existing.phone = ws.phone;
            }
            if (ws.shift) existing.shift = ws.shift;
            if (ws.facility) existing.facility = ws.facility;
            existing.assignedRoom = ws.roomAssignment || undefined;
            existing.assignedRooms = ws.assignedRooms || (ws.roomAssignment ? ws.roomAssignment.split(',').map(s => s.trim()) : undefined);
            if (ws.qgendaAbbr) existing.qgendaAbbr = ws.qgendaAbbr;
            if (ws.orderNumber) existing.orderNumber = ws.orderNumber;

            // PRESERVE user customizations:
            // Custom magnet display name is retained
            if (!existing.displayName && ws.displayName) {
              existing.displayName = ws.displayName;
            }
            // Infrequent status is retained
            existing.isInfrequent = isInfrequent;
            existing.active = true;
          } else {
            // New user detected! Store into Site Staff Roster
            newStaffAddedCount++;
            const newStaffId = ws.id || `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const newStaff: Staff = {
              id: newStaffId,
              firstName: ws.firstName,
              lastName: ws.lastName,
              displayName: ws.displayName || `${ws.lastName.toUpperCase()} ${ws.firstName ? ws.firstName[0] + '.' : ''}`.trim(),
              credentials: ws.credentials,
              phone: ws.phone || '(555) 000-0000',
              shift: ws.shift || '07:00 - 15:30',
              facility: ws.facility,
              assignedRoom: ws.roomAssignment || undefined,
              assignedRooms: ws.assignedRooms || (ws.roomAssignment ? ws.roomAssignment.split(',').map(s => s.trim()) : undefined),
              qgendaAbbr: ws.qgendaAbbr,
              orderNumber: ws.orderNumber,
              isInfrequent,
              active: true
            };
            existingStaffList.push(newStaff);
            matchedExistingIds.add(newStaffId);
          }
        });

        // For existing credentialed staff who are NOT scheduled on today's portal list:
        // KEEP THEM ACTIVE in the Site Staff Roster and unassigned magnets pool, but clear room assignment
        existingStaffList.forEach(s => {
          if (!matchedExistingIds.has(s.id)) {
            s.active = true;
            s.assignedRoom = undefined;
            s.assignedRooms = undefined;
          }
        });

        state.staff = existingStaffList;
      }

      state.scraperConfig.lastSyncTime = new Date().toISOString();
      state.scraperConfig.lastSyncStatus = 'success';

      await recordAuditLog({
        actionType: 'SCRAPER_SYNCED',
        performedBy: currentUser?.displayName || 'User',
        userRole: currentUser?.role || 'board_runner',
        details: `Successfully synchronized Departure, Lates, Call Team and Today's Staff Roster from ${state.scraperConfig.portalType.toUpperCase()}`
      });

      await saveBoardState(state);
      return NextResponse.json({
        success: true,
        message: `Synced with ${state.scraperConfig.portalType.toUpperCase()} at ${new Date().toLocaleTimeString()}`,
        lastSyncTime: state.scraperConfig.lastSyncTime,
        departureCount: state.departureList.length,
        latesCount: state.latesList.length,
        staffCount: state.staff.filter(s => s.active).length
      });
    }

    return NextResponse.json({ error: 'Invalid scraper action' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || 'Scraper sync error' }, { status: 500 });
  }
}
