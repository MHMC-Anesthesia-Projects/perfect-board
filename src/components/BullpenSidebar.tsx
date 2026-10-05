'use client';

import React, { useState, useMemo } from 'react';
import { Staff, UserRole } from '@/types/whiteboard';
import { MagnetTile } from './MagnetTile';
import { PanelLeftClose, Users, Sparkles } from 'lucide-react';

interface BullpenSidebarProps {
  bullpenStaffIds: string[];
  bullpenBreaks?: Record<string, { breakfastDone: boolean; lunchDone: boolean; breakfastTime?: string | null; lunchTime?: string | null }>;
  staff: Staff[];
  currentUserRole: UserRole;
  onSelectStaff: (staff: Staff) => void;
  onDropToBullpen: (data: { staffId: string; type: string; id?: string }) => void;
  onMoveStaffToUnassigned: (staffId: string) => void;
  onToggleCollapse: () => void;
  onToggleBreak?: (breakType: 'breakfast' | 'lunch', staffId: string, currentValue: boolean) => void;
  unreadCountsByPhone?: Record<string, number>;
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
  bullpenBreaks,
  staff,
  currentUserRole,
  onSelectStaff,
  onDropToBullpen,
  onMoveStaffToUnassigned,
  onToggleCollapse,
  onToggleBreak,
  unreadCountsByPhone
}) => {
  const getStaffUnreadCount = (staffMember: Staff | null): number => {
    if (!staffMember?.phone || !unreadCountsByPhone) return 0;
    const clean = staffMember.phone.replace(/\D/g, '').slice(-10);
    return unreadCountsByPhone[clean] || 0;
  };
  const isEditor = currentUserRole === 'board_runner' || currentUserRole === 'superuser';
  const [isDragOver, setIsDragOver] = useState(false);

  // Active staff currently in the Bullpen ordered strictly by queue (first in = top is up next for work)
  const bullpenStaff = useMemo(() => {
    const staffMap = new Map(staff.map(s => [s.id, s]));
    return bullpenStaffIds
      .map(id => staffMap.get(id))
      .filter((s): s is Staff => Boolean(s && s.active));
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
    const payloadObj = {
      staffId: staffMember.id,
      type: 'bullpen',
      id: staffMember.id
    };
    const payload = JSON.stringify(payloadObj);
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.setData('text', payload);
    e.dataTransfer.effectAllowed = 'all';
    if (typeof window !== 'undefined') {
      (window as any).__activeDraggedStaff = payloadObj;
      document.body.classList.add('dragging-staff');
    }
  };

  const handleDragEnd = () => {
    if (typeof window !== 'undefined') {
      (window as any).__activeDraggedStaff = null;
      document.body.classList.remove('dragging-staff');
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }
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
              Top is up next for work
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
            {bullpenStaff.map((s, idx) => {
              const b = bullpenBreaks?.[s.id];
              return (
                <div key={s.id} className="bullpen-magnet-row" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 4px',
                      borderRadius: 3,
                      background: idx === 0 ? 'rgba(37, 99, 235, 0.15)' : 'var(--surface-hover)',
                      color: idx === 0 ? '#2563eb' : 'var(--text-muted)',
                      border: idx === 0 ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid var(--border-light)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                    title={idx === 0 ? 'Up next for work (longest in bullpen)' : `Queue position #${idx + 1}`}
                  >
                    {idx === 0 ? '#1' : `#${idx + 1}`}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <MagnetTile
                      staff={s}
                      slotId={s.id}
                      slotType="bullpen"
                      breakfastDone={b?.breakfastDone ?? false}
                      lunchDone={b?.lunchDone ?? false}
                      currentUserRole={currentUserRole}
                      unreadMessageCount={getStaffUnreadCount(s)}
                      onToggleBreak={(breakType, currentValue) => {
                        if (onToggleBreak) {
                          onToggleBreak(breakType, s.id, currentValue);
                        }
                      }}
                      onSelectStaff={onSelectStaff}
                      onDragStart={(e, staffMember) => handleDragStart(e, staffMember)}
                      onDragEnd={handleDragEnd}
                      onUnassign={() => onMoveStaffToUnassigned(s.id)}
                    />
                  </div>
                </div>
              );
            })}
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
