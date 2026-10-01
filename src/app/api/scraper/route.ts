import { NextRequest, NextResponse } from 'next/server';
import { loadBoardState, saveBoardState, recordAuditLog } from '@/lib/storage';
import { fetchAndScrapeOneUsap } from '@/lib/oneusapScraper';
import { DepartureItem, LateShiftItem, CallTeamItem, Staff } from '@/types/whiteboard';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, config, currentUser, date } = body;

    const state = loadBoardState();

    // 1. UPDATE SCRAPER CONFIGURATION
    if (action === 'UPDATE_CONFIG') {
      if (currentUser?.role !== 'superuser') {
        return NextResponse.json({ error: 'Superuser permission required to configure portal integration.' }, { status: 403 });
      }
      state.scraperConfig = {
        ...state.scraperConfig,
        ...config
      };
      saveBoardState(state);
      recordAuditLog({
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
      const targetDate = date || new Date().toISOString().split('T')[0];

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
            facility: 'MHMC',
            role: l.role || 'CRNA',
            orderNumber: l.orderNumber,
            qgendaAbbr: l.qgendaAbbr,
            roomAssignment: l.assignedRoom
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
        const targetDate = date || new Date().toISOString().split('T')[0];
        const scraped = await fetchAndScrapeOneUsap({
          portalUrl: state.scraperConfig.portalUrl,
          password: state.scraperConfig.password || '321usap',
          date: targetDate,
          facilities: activeFacilities,
          uniqueSchedules: state.uniqueSchedules
        });

        if (!scraped.success) {
          state.scraperConfig.lastSyncStatus = 'failed';
          saveBoardState(state);
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
          timeEstimate: (l as any).shift || (l.timeCategory === 'special' ? (l as any).shift : undefined)
        }));

        // Apply Working Staff Roster for Available Unassigned Staff
        // (Ensures the unassigned list contains all staff working today at selected facilities)
        const existingStaffMap = new Map<string, Staff>();
        state.staff.forEach(s => {
          const key = (s.qgendaAbbr || s.lastName).toLowerCase();
          existingStaffMap.set(key, s);
        });

        // Update or add working staff
        const updatedStaffList: Staff[] = [];

        scraped.workingStaff.forEach(ws => {
          const qKey = (ws.qgendaAbbr || ws.lastName).toLowerCase();
          const lastKey = ws.lastName.toLowerCase();
          const existing = existingStaffMap.get(qKey) || existingStaffMap.get(lastKey);
          
          if (existing) {
            existing.phone = ws.phone || existing.phone;
            existing.shift = ws.shift || existing.shift;
            existing.facility = ws.facility || existing.facility;
            existing.assignedRoom = ws.roomAssignment || existing.assignedRoom;
            existing.assignedRooms = ws.assignedRooms || (ws.roomAssignment ? ws.roomAssignment.split(',').map(s => s.trim()) : existing.assignedRooms);
            existing.qgendaAbbr = ws.qgendaAbbr || existing.qgendaAbbr;
            existing.orderNumber = ws.orderNumber || existing.orderNumber;
            existing.active = true;
            updatedStaffList.push(existing);
            existingStaffMap.delete(qKey);
            existingStaffMap.delete(lastKey);
          } else {
            updatedStaffList.push({
              id: ws.id,
              firstName: ws.firstName,
              lastName: ws.lastName,
              credentials: ws.credentials,
              phone: ws.phone,
              shift: ws.shift,
              facility: ws.facility,
              assignedRoom: ws.roomAssignment,
              assignedRooms: ws.assignedRooms || (ws.roomAssignment ? ws.roomAssignment.split(',').map(s => s.trim()) : undefined),
              qgendaAbbr: ws.qgendaAbbr,
              orderNumber: ws.orderNumber,
              active: true
            });
          }
        });

        // Set non-working staff to inactive so they don't clutter today's roster
        existingStaffMap.forEach(inactiveStaff => {
          inactiveStaff.active = false;
          updatedStaffList.push(inactiveStaff);
        });

        state.staff = updatedStaffList;
      }

      state.scraperConfig.lastSyncTime = new Date().toISOString();
      state.scraperConfig.lastSyncStatus = 'success';

      recordAuditLog({
        actionType: 'SCRAPER_SYNCED',
        performedBy: currentUser?.displayName || 'User',
        userRole: currentUser?.role || 'board_runner',
        details: `Successfully synchronized Departure, Lates, Call Team and Today's Staff Roster from ${state.scraperConfig.portalType.toUpperCase()}`
      });

      saveBoardState(state);
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
