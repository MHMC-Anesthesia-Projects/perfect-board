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
  onToggleBreak
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
            {bullpenStaff.map(s => {
              const b = bullpenBreaks?.[s.id];
              return (
                <div key={s.id} className="bullpen-magnet-row">
                  <MagnetTile
                    staff={s}
                    slotId={s.id}
                    slotType="bullpen"
                    breakfastDone={b?.breakfastDone ?? false}
                    lunchDone={b?.lunchDone ?? false}
                    currentUserRole={currentUserRole}
                    onToggleBreak={(breakType, currentValue) => {
                      if (onToggleBreak) {
                        onToggleBreak(breakType, s.id, currentValue);
                      }
                    }}
                    onSelectStaff={onSelectStaff}
                    onDragStart={(e, staffMember) => handleDragStart(e, staffMember)}
                    onUnassign={() => onMoveStaffToUnassigned(s.id)}
                  />
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
