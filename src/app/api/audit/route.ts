import { NextRequest, NextResponse } from 'next/server';
import { loadAuditLog } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');
  const query = searchParams.get('q')?.toLowerCase() || '';
  const dateFilter = searchParams.get('date'); // YYYY-MM-DD

  let logs = await loadAuditLog();

  if (dateFilter) {
    logs = logs.filter(l => l.timestamp.startsWith(dateFilter));
  }

  if (query) {
    logs = logs.filter(l => 
      (l.targetName && l.targetName.toLowerCase().includes(query)) ||
      (l.locationName && l.locationName.toLowerCase().includes(query)) ||
      l.details.toLowerCase().includes(query) ||
      l.performedBy.toLowerCase().includes(query) ||
      l.actionType.toLowerCase().includes(query)
    );
  }

  if (format === 'csv') {
    const headers = ['Timestamp', 'Action', 'Performed By', 'Role', 'Target Staff', 'Location', 'Details'];
    const rows = logs.map(l => [
      `"${l.timestamp}"`,
      `"${l.actionType}"`,
      `"${l.performedBy.replace(/"/g, '""')}"`,
      `"${l.userRole}"`,
      `"${(l.targetName || '').replace(/"/g, '""')}"`,
      `"${(l.locationName || '').replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="whiteboard_audit_${dateFilter || 'all'}.csv"`
      }
    });
  }

  return NextResponse.json(logs);
}
