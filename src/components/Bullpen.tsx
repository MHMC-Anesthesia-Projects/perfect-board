'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Staff, Department, UserRole } from '@/types/whiteboard';
import { MagnetTile } from './MagnetTile';
import { Search, UserPlus, Users, X, ChevronDown, ChevronUp } from 'lucide-react';

interface BullpenProps {
  staff: Staff[];
  departments: Department[];
  bullpenStaffIds?: string[];
  bullpenBreaks?: Record<string, { breakfastDone: boolean; lunchDone: boolean; breakfastTime?: string | null; lunchTime?: string | null }>;
  currentUserRole: UserRole;
  onSelectStaff: (staff: Staff) => void;
  onOpenAddStaff: () => void;
  onDropToBullpen: (data: { staffId: string; type: string; id?: string; targetGroup?: 'MD' | 'CRNA' | 'Infrequent' }) => void;
  onToggleBreak?: (breakType: 'breakfast' | 'lunch', staffId: string, currentValue: boolean) => void;
  onSetStaffInfrequent?: (staffId: string, isInfrequent: boolean) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const isPhysician = (s: Staff) => {
  const cred = s.credentials;
  return cred === 'MD' || cred === 'Resident' || cred === 'Fellow';
};

const sortAlphabetical = (a: Staff, b: Staff) => {
  const lastComp = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' });
  if (lastComp !== 0) return lastComp;
  return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' });
};

export const Bullpen: React.FC<BullpenProps> = ({
  staff,
  departments,
  bullpenStaffIds = [],
  bullpenBreaks = {},
  currentUserRole,
  onSelectStaff,
  onOpenAddStaff,
  onDropToBullpen,
  onToggleBreak,
  onSetStaffInfrequent,
  isCollapsed: propIsCollapsed,
  onToggleCollapse
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : internalCollapsed;

  // Resizable drawer height (saved in localStorage)
  const [drawerHeight, setDrawerHeight] = useState(190);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    try {
      const savedHeight = localStorage.getItem('whiteboard_unassigned_drawer_height');
      if (savedHeight) {
        const parsed = parseInt(savedHeight, 10);
        if (!isNaN(parsed) && parsed >= 110 && parsed <= 700) {
          setDrawerHeight(parsed);
        }
      }
    } catch {}
  }, []);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startH = drawerHeight;

    const handleMouseMove = (moveEvt: MouseEvent) => {
      // Dragging UP increases height (drawer sits at bottom of screen)
      const deltaY = startY - moveEvt.clientY;
      const maxH = Math.min(window.innerHeight * 0.75, 700);
      const nextH = Math.min(maxH, Math.max(110, startH + deltaY));
      setDrawerHeight(nextH);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setDrawerHeight(currentH => {
        try {
          localStorage.setItem('whiteboard_unassigned_drawer_height', String(currentH));
        } catch {}
        return currentH;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStartResize = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    setIsResizing(true);
    const startY = e.touches[0].clientY;
    const startH = drawerHeight;

    const handleTouchMove = (moveEvt: TouchEvent) => {
      if (moveEvt.touches.length === 0) return;
      moveEvt.preventDefault();
      const deltaY = startY - moveEvt.touches[0].clientY;
      const maxH = Math.min(window.innerHeight * 0.75, 700);
      const nextH = Math.min(maxH, Math.max(110, startH + deltaY));
      setDrawerHeight(nextH);
    };

    const handleTouchEnd = () => {
      setIsResizing(false);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      setDrawerHeight(currentH => {
        try {
          localStorage.setItem('whiteboard_unassigned_drawer_height', String(currentH));
        } catch {}
        return currentH;
      });
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  };

  const handleToggle = () => {
    if (onToggleCollapse) onToggleCollapse();
    else setInternalCollapsed(prev => !prev);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [hoveredBin, setHoveredBin] = useState<'MD' | 'CRNA' | 'Infrequent' | null>(null);

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

  // Unassigned staff members in pool (excluding rooms/runners and active bullpen)
  const unassignedStaff = useMemo(() => {
    const bullpenSet = new Set(bullpenStaffIds);
    return staff.filter(s => s.active && !assignedStaffIds.has(s.id) && !bullpenSet.has(s.id));
  }, [staff, assignedStaffIds, bullpenStaffIds]);

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

  // Group into 3 Groups: MD, CRNA, Infrequent - sorted alphabetically
  const bins = useMemo(() => {
    const mdList: Staff[] = [];
    const crnaList: Staff[] = [];
    const infrequentList: Staff[] = [];

    for (const s of filteredStaff) {
      if (s.isInfrequent) {
        infrequentList.push(s);
      } else if (isPhysician(s)) {
        mdList.push(s);
      } else {
        crnaList.push(s);
      }
    }

    mdList.sort(sortAlphabetical);
    crnaList.sort(sortAlphabetical);
    infrequentList.sort(sortAlphabetical);

    return [
      {
        key: 'MD' as const,
        label: 'MD',
        title: 'MD / PHYSICIANS',
        headerClass: 'header-md',
        binClass: 'bin-md',
        items: mdList,
        emptyMsg: 'No unassigned MD staff available'
      },
      {
        key: 'CRNA' as const,
        label: 'CRNA',
        title: 'CRNA / ANESTHETISTS',
        headerClass: 'header-crna',
        binClass: 'bin-crna',
        items: crnaList,
        emptyMsg: 'No unassigned CRNA staff available'
      },
      {
        key: 'Infrequent' as const,
        label: 'Infrequent',
        title: 'INFREQUENT / PRN',
        headerClass: 'header-infrequent',
        binClass: 'bin-infrequent',
        items: infrequentList,
        emptyMsg: 'No infrequent staff. Drag staff here to remember them as Infrequent.'
      }
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
    setHoveredBin(null);
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

  const handleBinDragOver = (e: React.DragEvent, binKey: 'MD' | 'CRNA' | 'Infrequent') => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (hoveredBin !== binKey) setHoveredBin(binKey);
  };

  const handleBinDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredBin(null);
  };

  const handleBinDrop = (e: React.DragEvent, binKey: 'MD' | 'CRNA' | 'Infrequent') => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredBin(null);
    setIsDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (binKey === 'Infrequent') {
          if (onSetStaffInfrequent) {
            onSetStaffInfrequent(parsed.staffId, true);
          }
          onDropToBullpen({ ...parsed, targetGroup: 'Infrequent' });
        } else {
          if (onSetStaffInfrequent) {
            onSetStaffInfrequent(parsed.staffId, false);
          }
          onDropToBullpen({ ...parsed, targetGroup: binKey });
        }
      }
    } catch (err) {
      console.error('Error dropping to bin:', err);
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
        type: 'unassigned'
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <footer
      className={`bullpen-drawer ${isCollapsed ? 'collapsed' : ''} ${isDragOver ? 'drag-over' : ''} ${isResizing ? 'resizing' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        height: isCollapsed ? undefined : `${drawerHeight}px`,
        borderTopColor: isDragOver ? 'var(--accent-primary)' : 'var(--board-grid-line)',
        backgroundColor: isDragOver ? 'var(--accent-surface)' : 'var(--surface-card)'
      }}
    >
      {/* Resizable drag handle (Mouse and Touch) across the top edge */}
      {!isCollapsed && (
        <div
          className={`bullpen-resize-handle ${isResizing ? 'resizing' : ''}`}
          onMouseDown={handleMouseDownResize}
          onTouchStart={handleTouchStartResize}
          title="Drag up or down with mouse or finger to expand or shrink Unassigned Staff area"
        />
      )}

      {/* Bullpen Header */}
      <div
        className="bullpen-header"
        onClick={handleToggle}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
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
          {isDragOver && !hoveredBin && (
            <span style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 800, marginLeft: 8 }}>
              • Drop here to unassign
            </span>
          )}
          {hoveredBin && (
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              marginLeft: 8,
              color: hoveredBin === 'Infrequent' ? '#d97706' : (hoveredBin === 'MD' ? '#0969da' : '#1a7f37')
            }}>
              • Drop to place in {hoveredBin === 'Infrequent' ? 'Infrequent (PRN)' : hoveredBin} group
            </span>
          )}
        </div>

        {/* Search, Actions & Collapse Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
          {!isCollapsed && (
            <>
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
            </>
          )}

          {/* Collapse/Expand Toggle Button */}
          <button
            type="button"
            onClick={handleToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 9px',
              borderRadius: 6,
              background: isCollapsed ? 'rgba(9, 105, 218, 0.12)' : 'var(--surface-card)',
              border: isCollapsed ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-light)',
              color: isCollapsed ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer'
            }}
            title={isCollapsed ? 'Expand Unassigned Staff Section' : 'Collapse Staff Section to Bottom'}
          >
            {isCollapsed ? (
              <>
                <ChevronUp size={14} />
                <span>Show Staff</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                <span>Hide</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3 Groups: MD, CRNA, Infrequent - Sorted Alphabetically (Hidden when collapsed) */}
      {!isCollapsed && (
        <div className="bullpen-bins-container">
          {bins.map(bin => {
            const isTarget = hoveredBin === bin.key;
            return (
              <div
                key={bin.key}
                className={`bullpen-bin ${bin.binClass} ${isTarget ? 'drag-target' : ''}`}
                onDragOver={(e) => handleBinDragOver(e, bin.key)}
                onDragLeave={handleBinDragLeave}
                onDrop={(e) => handleBinDrop(e, bin.key)}
              >
                <div className={`bullpen-bin-header ${bin.headerClass}`}>
                  <span>{bin.title}</span>
                  <span className="bullpen-bin-count" style={{ fontWeight: 800, opacity: 0.9 }}>({bin.items.length})</span>
                  {isTarget && (
                    <span style={{ fontSize: 10, fontWeight: 800, marginLeft: 4 }}>
                      • Drop to set as {bin.label}
                    </span>
                  )}
                </div>
                <div className="bullpen-bin-content">
                  {bin.items.map(s => (
                    <MagnetTile
                      key={s.id}
                      staff={s}
                      slotId={s.id}
                      slotType="bullpen"
                      breakfastDone={bullpenBreaks[s.id]?.breakfastDone ?? false}
                      lunchDone={bullpenBreaks[s.id]?.lunchDone ?? false}
                      currentUserRole={currentUserRole}
                      onToggleBreak={(breakType, currentValue) => {
                        if (onToggleBreak) {
                          onToggleBreak(breakType, s.id, currentValue);
                        }
                      }}
                      onSelectStaff={onSelectStaff}
                      onDragStart={(e) => handleTileDragStart(e, s)}
                    />
                  ))}
                  {bin.items.length === 0 && (
                    <div style={{
                      width: '100%',
                      textAlign: 'center',
                      padding: 16,
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      lineHeight: 1.4
                    }}>
                      {bin.emptyMsg}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </footer>
  );
};
