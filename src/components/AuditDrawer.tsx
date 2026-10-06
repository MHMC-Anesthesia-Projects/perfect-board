'use client';

import { apiUrl } from '@/lib/api';
import React, { useState, useEffect, useCallback } from 'react';
import { AuditLogEntry, UserRole } from '@/types/whiteboard';
import { FileSpreadsheet, Download, Search, Calendar, X, RefreshCw, Undo2 } from 'lucide-react';

interface AuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { id: string; username: string; displayName: string; role: UserRole } | null;
  onRevertAuditLog?: (log: AuditLogEntry) => Promise<boolean | void>;
}

export const AuditDrawer: React.FC<AuditDrawerProps> = ({ isOpen, onClose, currentUser, onRevertAuditLog }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const isEditor = currentUser && (currentUser.role === 'board_runner' || currentUser.role === 'superuser');

  const isRevertible = (log: AuditLogEntry) => {
    const reversibleTypes = [
      'BREAKFAST_TOGGLED',
      'LUNCH_TOGGLED',
      'ROOM_FUTURE_TIME_SET',
      'ROOM_FUTURE_TIME_CLEARED',
      'DEPARTURE_STRUCK_TOGGLED',
      'STAFF_MOVED',
      'STAFF_ASSIGNED',
      'STAFF_UNASSIGNED',
      'BULLPEN_UPDATED',
      'STAFF_UPDATED'
    ];
    return reversibleTypes.includes(log.actionType);
  };

  const handleRevert = async (log: AuditLogEntry) => {
    if (!onRevertAuditLog) return;
    const confirmMsg = `Revert this action: "${log.actionType.replace(/_/g, ' ')}" for ${log.targetName || log.locationName || 'item'}?\n\nDetails: ${log.details}`;
    if (!window.confirm(confirmMsg)) return;

    setRevertingId(log.id);
    try {
      await onRevertAuditLog(log);
      await fetchLogs();
    } catch (err) {
      console.error('Failed to revert audit log entry:', err);
    } finally {
      setRevertingId(null);
    }
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('q', search);
      if (dateFilter) params.append('date', dateFilter);

      const res = await fetch(apiUrl(`/api/audit?${params.toString()}`));
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [search, dateFilter]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    params.append('format', 'csv');
    if (search) params.append('q', search);
    if (dateFilter) params.append('date', dateFilter);
    window.open(apiUrl(`/api/audit?${params.toString()}`), '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="pin-pad-card"
        onClick={e => e.stopPropagation()}
        style={{ width: 880, maxWidth: '96vw', height: '88vh', padding: 24, textAlign: 'left', alignItems: 'stretch' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'var(--accent-surface)', padding: 8, borderRadius: 8, color: 'var(--accent-primary)' }}>
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase' }}>
                Operational Activity History & Audit Ledger
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Immutable historical document of all staff moves, break completions, and changes for data analysis
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Filter and Export Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            {/* Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--surface-hover)',
              borderRadius: 6,
              border: '1px solid var(--border-light)',
              padding: '6px 10px',
              flex: 1
            }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filter by staff name, room, action, or user..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Date Filter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--surface-hover)',
              borderRadius: 6,
              border: '1px solid var(--border-light)',
              padding: '6px 10px'
            }}>
              <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13 }}
              />
              {dateFilter && (
                <button onClick={() => setDateFilter('')} style={{ color: 'var(--text-muted)' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              onClick={fetchLogs}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                background: 'var(--surface-hover)',
                border: '1px solid var(--border-light)'
              }}
              title="Refresh logs"
            >
              <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
            </button>
          </div>

          {/* Export Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'var(--accent-primary)',
                color: '#fff',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13
              }}
            >
              <Download size={15} />
              <span>Export CSV for Analytics</span>
            </button>
          </div>
        </div>

        {/* Log Entries Table */}
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover)', position: 'sticky', top: 0, borderBottom: '2px solid var(--border-light)', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', width: 90 }}>Time</th>
                <th style={{ padding: '8px 10px', width: 140 }}>Action</th>
                <th style={{ padding: '8px 10px', width: 150 }}>Staff / Target</th>
                <th style={{ padding: '8px 10px', width: 140 }}>Location</th>
                <th style={{ padding: '8px 10px' }}>Details</th>
                <th style={{ padding: '8px 10px', width: 120 }}>Operator</th>
                {isEditor && onRevertAuditLog && (
                  <th style={{ padding: '8px 10px', width: 85, textAlign: 'center' }}>Revert</th>
                )}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {time}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 800,
                        background: log.actionType.includes('BREAK') ? 'rgba(46,160,67,0.12)' : (log.actionType === 'ACTION_REVERTED' ? 'rgba(234,179,8,0.15)' : 'var(--surface-hover)'),
                        color: log.actionType.includes('BREAK') ? 'var(--marker-green)' : (log.actionType === 'ACTION_REVERTED' ? '#ca8a04' : 'var(--accent-primary)')
                      }}>
                        {log.actionType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', fontWeight: 700 }}>
                      {log.targetName || '—'}
                    </td>
                    <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>
                      {log.locationName || '—'}
                    </td>
                    <td style={{ padding: '6px 10px', color: 'var(--text-primary)' }}>
                      {log.details}
                    </td>
                    <td style={{ padding: '6px 10px', color: 'var(--text-muted)', fontSize: 11 }}>
                      {log.performedBy}
                    </td>
                    {isEditor && onRevertAuditLog && (
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        {isRevertible(log) ? (
                          <button
                            type="button"
                            onClick={() => handleRevert(log)}
                            disabled={revertingId === log.id}
                            title={`Revert action: ${log.actionType.replace(/_/g, ' ')}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 4,
                              border: '1px solid var(--border-light)',
                              background: 'var(--surface-hover)',
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              cursor: revertingId === log.id ? 'not-allowed' : 'pointer',
                              opacity: revertingId === log.id ? 0.5 : 1,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Undo2 size={12} className={revertingId === log.id ? 'spin-animation' : ''} />
                            <span>{revertingId === log.id ? '...' : 'Revert'}</span>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={isEditor && onRevertAuditLog ? 7 : 6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
