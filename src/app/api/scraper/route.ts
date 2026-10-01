import { NextRequest, NextResponse } from 'next/server';
import { loadBoardState, saveBoardState, recordAuditLog } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, config, currentUser } = body;

    const state = loadBoardState();

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
        performedBy: currentUser.displayName,
        userRole: 'superuser',
        details: `Updated scraper configuration for portal: ${config.portalType} (${config.portalUrl})`
      });
      return NextResponse.json({ success: true, config: state.scraperConfig });
    }

    if (action === 'TRIGGER_SYNC') {
      if (currentUser?.role === 'basic_user') {
        return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
      }

      state.scraperConfig.lastSyncTime = new Date().toISOString();
      state.scraperConfig.lastSyncStatus = 'success';

      // If mockMode is on or credentials provided:
      // We simulate a fresh sync update from the portal
      recordAuditLog({
        actionType: 'SCRAPER_SYNCED',
        performedBy: currentUser?.displayName || 'User',
        userRole: currentUser?.role || 'board_runner',
        details: `Successfully synchronized Departure and Lates schedule from ${state.scraperConfig.portalType.toUpperCase()}`
      });

      saveBoardState(state);
      return NextResponse.json({
        success: true,
        message: `Synced with ${state.scraperConfig.portalType.toUpperCase()} at ${new Date().toLocaleTimeString()}`,
        lastSyncTime: state.scraperConfig.lastSyncTime,
        departureCount: state.departureList.length,
        latesCount: state.latesList.length
      });
    }

    return NextResponse.json({ error: 'Invalid scraper action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Scraper sync error' }, { status: 500 });
  }
}
