'use client';

import React, { useState, useMemo } from 'react';
import { Staff, UserRole } from '@/types/whiteboard';
import { PanelLeftClose, Users, Sparkles, LogOut, GripVertical } from 'lucide-react';

interface BullpenSidebarProps {
  bullpenStaffIds: string[];
  staff: Staff[];
  currentUserRole: UserRole;
  onSelectStaff: (staff: Staff) => void;
  onDropToBullpen: (data: { staffId: string; type: string; id?: string }) => void;
  onMoveStaffToUnassigned: (staffId: string) => void;
  onToggleCollapse: () => void;
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

export const BullpenSidebar: React.FC<BullpenSidebarProps> = ({
  bullpenStaffIds,
  staff,
  currentUserRole,
  onSelectStaff,
  onDropToBullpen,
  onMoveStaffToUnassigned,
  onToggleCollapse
}) => {
  const isEditor = currentUserRole !== 'basic_user';
  const [isDragOver, setIsDragOver] = useState(false);

  // Active staff currently in the Bullpen
  const bullpenStaff = useMemo(() => {
    const idSet = new Set(bullpenStaffIds);
    return staff
      .filter(s => s.active && idSet.has(s.id))
      .sort(sortStaffByCredThenName);
  }, [staff, bullpenStaffIds]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the sidebar boundary
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
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
      console.error('Error dropping staff to bullpen:', err);
    }
  };

  const handleDragStart = (e: React.DragEvent, staffMember: Staff) => {
    if (!isEditor) {
      e.preventDefault();
      return;
    }
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
    <aside
      className={`bullpen-sidebar ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Bullpen Header */}
      <div className="bullpen-sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="bullpen-header-icon-wrap">
            <Users size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="bullpen-header-title">BULLPEN</span>
              <span className="bullpen-count-pill">
                {bullpenStaff.length}
              </span>
            </div>
            <div className="bullpen-header-sub">
              Available for breaks &amp; cases
            </div>
          </div>
        </div>

        {/* Collapse button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="bullpen-collapse-btn"
          title="Hide Bullpen (Expand Whiteboard)"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {/* Drag Over Banner */}
      {isDragOver && (
        <div className="bullpen-drop-indicator">
          <Sparkles size={14} />
          <span>Drop to place in Bullpen</span>
        </div>
      )}

      {/* Staff List / Tiles */}
      <div className="bullpen-sidebar-content">
        {bullpenStaff.length === 0 ? (
          <div className="bullpen-empty-state">
            <div className="bullpen-empty-icon">
              <Users size={24} />
            </div>
            <div className="bullpen-empty-title">Bullpen is Empty</div>
            <div className="bullpen-empty-desc">
              When a case finishes, drag staff here to track who is available to give breaks, run lunches, or start another case.
            </div>
          </div>
        ) : (
          <div className="bullpen-tiles-container">
            {bullpenStaff.map(s => (
              <div
                key={s.id}
                className="bullpen-staff-card"
                draggable={isEditor}
                onDragStart={(e) => handleDragStart(e, s)}
                onClick={() => onSelectStaff(s)}
                title={`${s.firstName} ${s.lastName} (${s.credentials}) • Drag to room/runner or tap to view`}
              >
                <div className="bullpen-card-left">
                  <div className="bullpen-drag-handle">
                    <GripVertical size={13} />
                  </div>
                  <div className="bullpen-card-identity">
                    <div className="bullpen-card-name-row">
                      <span className="bullpen-card-name">
                        {s.lastName.toUpperCase()}{s.firstName ? ` ${s.firstName[0]}.` : ''}
                      </span>
                      <span className={`magnet-cred cred-${s.credentials}`}>
                        {s.credentials}
                      </span>
                    </div>
                    <div className="bullpen-card-status">
                      <span className="bullpen-status-dot" />
                      <span>Ready for assignment</span>
                    </div>
                  </div>
                </div>

                {/* Quick actions for touchscreen / editor */}
                {isEditor && (
                  <div className="bullpen-card-actions" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className="bullpen-action-btn"
                      onClick={() => onMoveStaffToUnassigned(s.id)}
                      title="Depart for Day / Return to Unassigned Roster"
                    >
                      <LogOut size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bullpen Footer Info */}
      <div className="bullpen-sidebar-footer">
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {bullpenStaff.length} available &bull; Drag to any department slot
        </span>
      </div>
    </aside>
  );
};
