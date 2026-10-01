'use client';

import React, { useState, useMemo } from 'react';
import { Staff, Department, UserRole } from '@/types/whiteboard';
import { MagnetTile } from './MagnetTile';
import { Search, UserPlus, Users, X } from 'lucide-react';

interface BullpenProps {
  staff: Staff[];
  departments: Department[];
  currentUserRole: UserRole;
  onSelectStaff: (staff: Staff) => void;
  onOpenAddStaff: () => void;
  onDropToBullpen: (data: { staffId: string; type: string; id?: string }) => void;
}

const CREDENTIAL_ORDER: Record<string, number> = {
  MD: 1,
  Fellow: 2,
  CRNA: 3,
  Resident: 4,
  SRNA: 5,
  PA: 6,
  RN: 7
};

const sortStaffByCredThenName = (a: Staff, b: Staff) => {
  const rankA = CREDENTIAL_ORDER[a.credentials] ?? 99;
  const rankB = CREDENTIAL_ORDER[b.credentials] ?? 99;
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  const lastComp = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' });
  if (lastComp !== 0) return lastComp;
  return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' });
};

export const Bullpen: React.FC<BullpenProps> = ({
  staff,
  departments,
  currentUserRole,
  onSelectStaff,
  onOpenAddStaff,
  onDropToBullpen
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Find all assigned staff IDs across rooms and runners
  const assignedStaffIds = useMemo(() => {
    const ids = new Set<string>();
    for (const dept of departments) {
      for (const r of dept.runnerSlots) {
        if (r.staffId) ids.add(r.staffId);
      }
      for (const room of dept.rooms) {
        for (const slot of room.slots) {
          if (slot.staffId) ids.add(slot.staffId);
        }
      }
    }
    return ids;
  }, [departments]);

  // Unassigned staff members in bullpen
  const unassignedStaff = useMemo(() => {
    return staff.filter(s => s.active && !assignedStaffIds.has(s.id));
  }, [staff, assignedStaffIds]);

  // Filtered by search
  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return unassignedStaff;
    const q = searchQuery.toLowerCase().trim();
    return unassignedStaff.filter(s => 
      s.lastName.toLowerCase().includes(q) ||
      s.firstName.toLowerCase().includes(q) ||
      s.credentials.toLowerCase().includes(q) ||
      s.phone.includes(q)
    );
  }, [unassignedStaff, searchQuery]);

  // Group into Alphabetical Bins
  const bins = useMemo(() => {
    const aToF = filteredStaff.filter(s => /^[a-f]/i.test(s.lastName)).sort(sortStaffByCredThenName);
    const gToL = filteredStaff.filter(s => /^[g-l]/i.test(s.lastName)).sort(sortStaffByCredThenName);
    const mToR = filteredStaff.filter(s => /^[m-r]/i.test(s.lastName)).sort(sortStaffByCredThenName);
    const sToZ = filteredStaff.filter(s => /^[s-z]/i.test(s.lastName)).sort(sortStaffByCredThenName);
    return [
      { key: 'A-F', label: 'A - F', items: aToF },
      { key: 'G-L', label: 'G - L', items: gToL },
      { key: 'M-R', label: 'M - R', items: mToR },
      { key: 'S-Z', label: 'S - Z', items: sToZ }
    ];
  }, [filteredStaff]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const parsed = JSON.parse(raw);
        onDropToBullpen(parsed);
      }
    } catch (err) {
      console.error('Error dropping to bullpen:', err);
    }
  };

  const handleTileDragStart = (
    e: React.DragEvent,
    staffMember: Staff
  ) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        staffId: staffMember.id,
        type: 'bullpen'
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <footer
      className={`bullpen-drawer ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        borderTopColor: isDragOver ? 'var(--accent-primary)' : 'var(--board-grid-line)',
        backgroundColor: isDragOver ? 'var(--accent-surface)' : 'var(--surface-card)'
      }}
    >
      {/* Bullpen Header */}
      <div className="bullpen-header">
        <div className="bullpen-title">
          <Users size={16} style={{ color: 'var(--accent-primary)' }} />
          <span>AVAILABLE UNASSIGNED STAFF</span>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 12,
            background: 'var(--accent-surface)',
            color: 'var(--accent-primary)',
            fontWeight: 800
          }}>
            {unassignedStaff.length} AVAILABLE
          </span>
        </div>

        {/* Search & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--surface-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 6,
            padding: '2px 8px'
          }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter staff by name or credential..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 12,
                color: 'var(--text-primary)',
                width: 220
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ color: 'var(--text-muted)' }}>
                <X size={12} />
              </button>
            )}
          </div>

          {currentUserRole !== 'basic_user' && (
            <button
              onClick={onOpenAddStaff}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'var(--surface-hover)',
                border: '1px solid var(--border-light)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-primary)'
              }}
            >
              <UserPlus size={14} />
              <span>Add Staff</span>
            </button>
          )}
        </div>
      </div>

      {/* Alphabetical Bins */}
      <div className="bullpen-bins-container">
        {bins.map(bin => (
          <div key={bin.key} className="bullpen-bin">
            <div className="bullpen-bin-header">
              {bin.label} ({bin.items.length})
            </div>
            <div className="bullpen-bin-content">
              {bin.items.map(s => (
                <MagnetTile
                  key={s.id}
                  staff={s}
                  slotType="bullpen"
                  currentUserRole={currentUserRole}
                  onSelectStaff={onSelectStaff}
                  onDragStart={(e) => handleTileDragStart(e, s)}
                />
              ))}
              {bin.items.length === 0 && (
                <div style={{
                  width: '100%',
                  textAlign: 'center',
                  padding: 12,
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontStyle: 'italic'
                }}>
                  No staff in {bin.label}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
};
