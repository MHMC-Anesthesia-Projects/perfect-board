'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  BoardState, 
  Staff, 
  Department, 
  UserRole, 
  DepartureItem, 
  LateShiftItem, 
  CallTeamItem,
  ReliefAssignment,
  RunnerSlot
} from '@/types/whiteboard';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  Lock, 
  LogIn, 
  LogOut, 
  Plus, 
  Trash2, 
  Check, 
  Clock, 
  Sparkles, 
  Phone, 
  CheckCircle2,
  UserCheck,
  Strikethrough,
  AlertCircle,
  ArrowRight,
  MessageSquare,
  CheckCheck,
  Undo2
} from 'lucide-react';
import { MagnetTile } from './MagnetTile';
import { RoomLabel } from './RoomLabel';

interface MobileWhiteboardViewProps {
  boardState: BoardState;
  currentUser: { id: string; username: string; displayName: string; role: UserRole } | null;
  currentUserRole: UserRole;
  theme: 'whiteboard' | 'dark';
  onToggleTheme: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onToggleBreak: (targetType: 'room_slot' | 'runner_slot' | 'bullpen', targetId: string, breakType: 'breakfast' | 'lunch', value: boolean) => void;
  onSelectStaff: (staff: Staff) => void;
  onSelectEmptySlot: (targetType: 'room_slot' | 'runner_slot', targetId: string, label: string, roomId?: string, currentFutureTime?: string | null) => void;
  onToggleDepartureStruck: (id: string) => void;
  onUpdateLists: (departureList: DepartureItem[], latesList: LateShiftItem[], isReorder?: boolean) => void;
  onUpdateCallTeam: (callTeamList: CallTeamItem[]) => void;
  onSaveNotes: (type: 'room' | 'departure' | 'lates' | 'general', id: string | undefined, notes: string) => void;
  onOpenVoiceNotes?: (type: 'room' | 'departure' | 'lates' | 'general', id?: string, currentNotes?: string) => void;
  onAddRunnerSlot?: (departmentId: string) => void;
  onRemoveRunnerSlot?: (departmentId: string, runnerSlotId: string) => void;
  onSetRoomFutureTime?: (roomId: string, futureTime: string | null) => void;
  onAutoAssign?: () => void;
  isAutoAssigning?: boolean;
  onSwitchToDesktop?: () => void;
  onOpenReliefModal?: (target: {
    type: 'room_slot' | 'runner_slot';
    id: string;
    roomName: string;
    departmentName: string;
    currentStaff: Staff | null;
    currentRelief?: ReliefAssignment | null;
  }) => void;
  onExecuteHandoff?: (targetType: 'room_slot' | 'runner_slot', targetId: string) => void;
  onRemoveRelief?: (targetType: 'room_slot' | 'runner_slot', targetId: string) => void;
  onSetRelief?: (targetType: 'room_slot' | 'runner_slot', targetId: string, reliefStaffId: string, reliefTime?: string, notes?: string, isRedBox?: boolean) => void;
  onOpenReliefTextModal?: () => void;
  onCompleteAllReliefs?: () => void;
  reliefCount?: number;
  isCompletingRelief?: boolean;
  unreadCountsByPhone?: Record<string, number>;
  onUpdateMagnetNote?: (staffId: string, note: string) => void;
  onUpdateRoomNote?: (roomId: string, note: string) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  undoCount?: number;
  lastUndoDescription?: string;
}

export const MobileWhiteboardView: React.FC<MobileWhiteboardViewProps> = ({
  boardState,
  currentUser,
  currentUserRole,
  theme,
  onToggleTheme,
  onOpenLogin,
  onLogout,
  onToggleBreak,
  onSelectStaff,
  onSelectEmptySlot,
  onToggleDepartureStruck,
  onUpdateLists,
  onUpdateCallTeam,
  onSaveNotes,
  onOpenVoiceNotes,
  onAddRunnerSlot,
  onRemoveRunnerSlot,
  onSetRoomFutureTime,
  onAutoAssign,
  isAutoAssigning = false,
  onSwitchToDesktop,
  onOpenReliefModal,
  onExecuteHandoff,
  onRemoveRelief,
  onSetRelief,
  onOpenReliefTextModal,
  onCompleteAllReliefs,
  reliefCount = 0,
  isCompletingRelief = false,
  unreadCountsByPhone,
  onUpdateMagnetNote,
  onUpdateRoomNote,
  onUndo,
  canUndo = false,
  undoCount = 0,
  lastUndoDescription
}) => {
  const isEditor = currentUserRole === 'board_runner' || currentUserRole === 'admin' || currentUserRole === 'superuser';

  const getStaffUnreadCount = (staffMember: Staff | null): number => {
    if (!staffMember?.phone || !unreadCountsByPhone) return 0;
    const clean = staffMember.phone.replace(/\D/g, '').slice(-10);
    return unreadCountsByPhone[clean] || 0;
  };

  // The first department is default as requested: "make it so that it the default screen shows the first department."
  const defaultViewKey = useMemo(() => {
    return boardState.departments[0]?.id ? `dept_${boardState.departments[0].id}` : 'departure';
  }, [boardState.departments]);

  const [selectedView, setSelectedView] = useState<string>(defaultViewKey);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Update clock every second
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync selectedView if boardState loads later
  useEffect(() => {
    if (!selectedView || selectedView === 'dept_undefined') {
      setSelectedView(defaultViewKey);
    }
  }, [defaultViewKey, selectedView]);

  // Staff lookup helper
  const getStaffById = (id: string | null): Staff | undefined => {
    if (!id) return undefined;
    return boardState.staff.find(s => s.id === id);
  };

  const staffMap = useMemo(() => {
    const map = new Map<string, Staff>();
    boardState.staff.forEach(s => map.set(s.id, s));
    return map;
  }, [boardState.staff]);

  // Aggregate all active relief assignments across all departments
  const reliefsList = useMemo(() => {
    const list: Array<{
      departmentId: string;
      departmentName: string;
      roomId?: string;
      roomName: string;
      slotType: 'room_slot' | 'runner_slot';
      slotId: string;
      currentStaff: Staff | null;
      reliefStaff: Staff | null;
      relief: ReliefAssignment;
    }> = [];

    boardState.departments.forEach(dept => {
      dept.runnerSlots.forEach(r => {
        if (r.relief) {
          const current = staffMap.get(r.staffId || '') || null;
          const relief = r.relief.staffId ? (staffMap.get(r.relief.staffId) || null) : null;
          list.push({
            departmentId: dept.id,
            departmentName: dept.name,
            roomName: r.title,
            slotType: 'runner_slot',
            slotId: r.id,
            currentStaff: current,
            reliefStaff: relief,
            relief: r.relief
          });
        }
      });

      dept.rooms.forEach(room => {
        room.slots.forEach(slot => {
          if (slot.relief) {
            const current = staffMap.get(slot.staffId || '') || null;
            const relief = slot.relief.staffId ? (staffMap.get(slot.relief.staffId) || null) : null;
            list.push({
              departmentId: dept.id,
              departmentName: dept.name,
              roomId: room.id,
              roomName: `Room ${room.name}`,
              slotType: 'room_slot',
              slotId: slot.id,
              currentStaff: current,
              reliefStaff: relief,
              relief: slot.relief
            });
          }
        });
      });
    });

    return list;
  }, [boardState.departments, staffMap]);

  // Map of relief staffId -> string[] of locations they are assigned to relieve
  const pendingReliefMap = useMemo(() => {
    const map = new Map<string, string[]>();
    (boardState.departments || []).forEach(dept => {
      (dept.runnerSlots || []).forEach(runner => {
        if (runner.relief?.staffId && runner.relief.staffId.trim() !== '') {
          const loc = `${dept.name} (${runner.title || 'Runner'})`;
          const existing = map.get(runner.relief.staffId) || [];
          existing.push(loc);
          map.set(runner.relief.staffId, existing);
        }
      });

      (dept.rooms || []).forEach(room => {
        (room.slots || []).forEach(slot => {
          if (slot.relief?.staffId && slot.relief.staffId.trim() !== '') {
            const loc = `${dept.name} Rm ${room.name}`;
            const existing = map.get(slot.relief.staffId) || [];
            existing.push(loc);
            map.set(slot.relief.staffId, existing);
          }
        });
      });
    });

    return map;
  }, [boardState.departments]);

  // Helper to match clinicians in Departure/Lates/Call Team to pending relief assignments
  const getReliefLocations = (name: string, id?: string, qgendaAbbr?: string): string[] | null => {
    if (pendingReliefMap.size === 0) return null;

    // 1. Direct ID match
    if (id && pendingReliefMap.has(id)) {
      return pendingReliefMap.get(id) || null;
    }

    const cleanName = (name || '').trim().toUpperCase();
    const normalizedClean = cleanName.replace(/^DR\.?\s*/i, '').trim();

    // 2. Iterate pending relief map entries and match against staff
    for (const [reliefStaffId, locations] of pendingReliefMap.entries()) {
      if (id && reliefStaffId === id) return locations;

      const s = (boardState.staff || []).find(st => st.id === reliefStaffId);
      if (s) {
        const sLast = (s.lastName || '').trim().toUpperCase();
        const sFirst = (s.firstName || '').trim().toUpperCase();
        const sDisplay = s.displayName ? s.displayName.trim().toUpperCase() : '';
        const sQgenda = s.qgendaAbbr ? s.qgendaAbbr.trim().toUpperCase() : '';
        const itemQgenda = qgendaAbbr ? qgendaAbbr.trim().toUpperCase() : '';

        // Match by Qgenda abbreviation
        if (itemQgenda && sQgenda && itemQgenda === sQgenda) {
          return locations;
        }

        if (normalizedClean) {
          // Exact match on last name or display name
          if (sLast && normalizedClean === sLast) return locations;
          if (sDisplay && (normalizedClean === sDisplay || normalizedClean === sDisplay.replace(/^DR\.?\s*/i, '').trim())) {
            return locations;
          }

          // Match full name formats
          if (sFirst && sLast) {
            if (
              normalizedClean === `${sFirst} ${sLast}` ||
              normalizedClean === `${sLast}, ${sFirst}` ||
              normalizedClean === `${sLast} ${sFirst}` ||
              normalizedClean === `${sFirst[0]}. ${sLast}` ||
              normalizedClean === `${sLast} ${sFirst[0]}.`
            ) {
              return locations;
            }
          }

          // Well-known hospital aliases
          if (normalizedClean === 'KD' && (sLast === 'DAVID' || sFirst === 'KAMILAH' || sQgenda === 'KD')) {
            return locations;
          }
          if (normalizedClean === 'TALL' && (sLast === 'TALLACKSON' || sQgenda === 'TALL')) {
            return locations;
          }

          // Split hyphenated or multi-part last names
          const lastParts = sLast.split(/[-\s]+/);
          if (lastParts.length > 1 && lastParts.includes(normalizedClean)) {
            return locations;
          }
        }
      }
    }

    return null;
  };

  // Build the list of all navigation views
  const navViews = useMemo(() => {
    const views: { key: string; label: string; shortLabel: string; category: 'department' | 'roster' }[] = [];

    // 1. All Departments
    boardState.departments.forEach(dept => {
      const assignedCount = dept.rooms.filter(r => r.slots.some(s => !!s.staffId)).length;
      views.push({
        key: `dept_${dept.id}`,
        label: `${dept.name} (${assignedCount}/${dept.rooms.length})`,
        shortLabel: dept.name,
        category: 'department'
      });
    });

    // 2. Rosters & Shift Lists
    views.push({
      key: 'reliefs',
      label: `🟥 Relief Schedule (${reliefsList.length})`,
      shortLabel: 'Reliefs',
      category: 'roster'
    });

    views.push({
      key: 'departure',
      label: `✈️ Departure List (${boardState.departureList?.length || 0})`,
      shortLabel: 'Departure',
      category: 'roster'
    });

    views.push({
      key: 'call_team',
      label: `📞 Call Team (${boardState.callTeamList?.length || 0})`,
      shortLabel: 'Call Team',
      category: 'roster'
    });

    views.push({
      key: 'lates',
      label: `⏰ Lates List (${boardState.latesList?.length || 0})`,
      shortLabel: 'Lates',
      category: 'roster'
    });

    views.push({
      key: 'bullpen',
      label: `👥 Bullpen (${boardState.bullpenStaffIds?.length || 0} Available)`,
      shortLabel: 'Bullpen',
      category: 'roster'
    });

    views.push({
      key: 'available_staff',
      label: `📋 Available Staff (MD, CRNA, Infrequent)`,
      shortLabel: 'Available Staff',
      category: 'roster'
    });

    return views;
  }, [boardState, reliefsList]);

  // Current view index for next/prev arrows
  const currentViewIndex = useMemo(() => {
    const idx = navViews.findIndex(v => v.key === selectedView);
    return idx >= 0 ? idx : 0;
  }, [navViews, selectedView]);

  const handlePrevView = () => {
    const nextIdx = (currentViewIndex - 1 + navViews.length) % navViews.length;
    setSelectedView(navViews[nextIdx].key);
  };

  const handleNextView = () => {
    const nextIdx = (currentViewIndex + 1) % navViews.length;
    setSelectedView(navViews[nextIdx].key);
  };


  const reliefsByTime = useMemo(() => {
    const groups: Record<string, typeof reliefsList> = {};
    reliefsList.forEach(item => {
      const time = item.relief.time || '3:00 PM';
      if (!groups[time]) groups[time] = [];
      groups[time].push(item);
    });
    return Object.keys(groups).map(time => ({
      time,
      items: groups[time]
    }));
  }, [reliefsList]);

  // Identify active department if view is a department
  const activeDepartment = useMemo(() => {
    if (!selectedView.startsWith('dept_')) return null;
    const deptId = selectedView.replace('dept_', '');
    return boardState.departments.find(d => d.id === deptId) || boardState.departments[0];
  }, [boardState.departments, selectedView]);

  // Helper for atypical departure time
  const isAtypicalDepartureTime = (t?: string) => {
    if (!t) return false;
    const clean = t.toLowerCase().trim();
    if (/3p|4p|5p|7p|8p|night|7p-7a|11a-11p/i.test(clean)) return false;
    return /^\s*([1-9]|1[0-2])(?::[0-5][0-9])?\s*(?:a|p|am|pm)?\s*$/i.test(clean);
  };

  // Departure list partitioned
  const postCallDepartures = useMemo(() => {
    return (boardState.departureList || [])
      .filter(d => d.category === 'post_call')
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [boardState.departureList]);

  const specialDepartures = useMemo(() => {
    return (boardState.departureList || [])
      .filter(d => {
        if (d.category === 'special') return true;
        if (d.category === 'post_call') return false;
        const matchedStaff = (boardState.staff || []).find(s =>
          s.lastName.toUpperCase() === d.name.toUpperCase() ||
          (d.qgendaAbbr && s.qgendaAbbr?.toUpperCase() === d.qgendaAbbr.toUpperCase())
        );
        return isAtypicalDepartureTime(d.timeEstimate) || isAtypicalDepartureTime(matchedStaff?.shift);
      })
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [boardState.departureList, boardState.staff]);

  const nonCallDepartures = useMemo(() => {
    return (boardState.departureList || [])
      .filter(d => {
        if (d.category === 'post_call' || d.category === 'special') return false;
        const timeEst = (d.timeEstimate || '').toLowerCase().trim();
        const matchedStaff = (boardState.staff || []).find(s =>
          s.lastName.toUpperCase() === d.name.toUpperCase() ||
          (d.qgendaAbbr && s.qgendaAbbr?.toUpperCase() === d.qgendaAbbr.toUpperCase())
        );
        const staffShift = (matchedStaff?.shift || '').toLowerCase().trim();
        if (isAtypicalDepartureTime(timeEst) || isAtypicalDepartureTime(staffShift)) return false;
        const isLate = /3p|4p|5p|7p|8p|night|7p-7a|11a-11p/i.test(timeEst) || /3p|4p|5p|7p|8p|night|7p-7a|11a-11p/i.test(staffShift);
        if (isLate) return false;
        return true;
      })
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [boardState.departureList, boardState.staff]);

  // Helper to parse late category or time into sortable minutes
  const parseLateCategoryMinutes = (category: string, items?: LateShiftItem[]): number => {
    const cat = (category || '').toLowerCase().trim();
    if (cat === 'special') {
      const itemTime = items?.find(i => Boolean(i.timeEstimate))?.timeEstimate || items?.[0]?.timeEstimate;
      if (itemTime) {
        return parseLateCategoryMinutes(itemTime);
      }
      return 14 * 60; // 2:00 PM (before 3pm)
    }
    if (cat === '7p-7a' || cat.includes('night')) return 19 * 60 + 1;
    if (cat === '24h') return 24 * 60 + 50; // 24-hour shift at bottom of late list
    const match = cat.match(/(\d{1,2})(?::(\d{2}))?\s*(a|p|am|pm)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const mins = match[2] ? parseInt(match[2], 10) : 0;
      const meridian = match[3] ? match[3].toLowerCase() : '';
      if (meridian.startsWith('p') && hours < 12) hours += 12;
      else if (meridian.startsWith('a') && hours === 12) hours = 0;
      else if (!meridian) {
        if (hours >= 1 && hours <= 6) hours += 12;
        else if (hours >= 7 && hours <= 11) hours += 12;
      }
      return hours * 60 + mins;
    }
    return 9999;
  };

  // Lates grouped by shift category - chronologically sorted (times before 3pm appear at top)
  const latesGrouped = useMemo(() => {
    const grouped: Record<string, LateShiftItem[]> = {};
    const baseCats = ['special', '3p', '4p', '5p', '7p', '8p', '7p-7a', '24h'];
    baseCats.forEach(cat => {
      grouped[cat] = [];
    });
    const standardCats = ['3p', '4p', '5p', '7p', '8p', '7p-7a', '24h'];
    (boardState.latesList || []).forEach(item => {
      const rawCat = (item.timeCategory || '').trim();
      const lowerCat = rawCat.toLowerCase();
      const isStandard = standardCats.includes(lowerCat);
      const groupKey = isStandard ? lowerCat : 'special';
      const effectiveTime = item.timeEstimate || (!isStandard && rawCat !== 'special' && rawCat ? rawCat : '2p');

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push({
        ...item,
        timeEstimate: effectiveTime
      });
    });

    const isItemMd = (item: LateShiftItem) => {
      if (item.role === 'MD') return true;
      if (item.role === 'CRNA') return false;
      const match = (boardState.staff || []).find(s =>
        s.lastName.toUpperCase() === item.name.toUpperCase() ||
        (item.qgendaAbbr && s.qgendaAbbr?.toUpperCase() === item.qgendaAbbr.toUpperCase())
      );
      return match?.credentials === 'MD';
    };

    baseCats.forEach(cat => {
      if (grouped[cat]) {
        grouped[cat].sort((a, b) => {
          if (cat === 'special' && a.timeEstimate && b.timeEstimate && a.timeEstimate !== b.timeEstimate) {
            const aMins = parseLateCategoryMinutes(a.timeEstimate);
            const bMins = parseLateCategoryMinutes(b.timeEstimate);
            if (aMins !== bMins) return aMins - bMins;
          }

          const isMdA = isItemMd(a);
          const isMdB = isItemMd(b);
          if (isMdA && !isMdB) return -1;
          if (!isMdA && isMdB) return 1;

          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });
      }
    });

    return grouped;
  }, [boardState.latesList]);

  const sortedTimeCategories = useMemo(() => {
    return Object.keys(latesGrouped).sort((a, b) => {
      return parseLateCategoryMinutes(a, latesGrouped[a]) - parseLateCategoryMinutes(b, latesGrouped[b]);
    });
  }, [latesGrouped]);

  // Credential color helper
  const getCredBadgeClass = (cred: string) => {
    switch (cred) {
      case 'MD': return 'mobile-badge-md';
      case 'CRNA': return 'mobile-badge-crna';
      case 'Resident': return 'mobile-badge-resident';
      case 'SRNA': return 'mobile-badge-srna';
      default: return 'mobile-badge-default';
    }
  };

  const isPhysician = (s: Staff) => {
    const cred = s.credentials;
    return cred === 'MD' || cred === 'Resident' || cred === 'Fellow';
  };

  const sortAlphabetical = (a: Staff, b: Staff) => {
    const nameA = a.displayName || a.lastName;
    const nameB = b.displayName || b.lastName;
    const comp = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    if (comp !== 0) return comp;
    return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' });
  };

  // Find all assigned staff IDs across rooms, runners, and bullpen
  const assignedStaffIds = useMemo(() => {
    const ids = new Set<string>();
    for (const dept of boardState.departments) {
      for (const r of dept.runnerSlots || []) {
        if (r.staffId) ids.add(r.staffId);
      }
      for (const room of dept.rooms) {
        for (const slot of room.slots) {
          if (slot.staffId) ids.add(slot.staffId);
        }
      }
    }
    for (const id of boardState.bullpenStaffIds || []) {
      ids.add(id);
    }
    return ids;
  }, [boardState]);

  // Available unassigned staff partitioned into MD, CRNA, and Infrequent (alphabetical)
  const mobileAvailableStaffGroups = useMemo(() => {
    const unassigned = (boardState.staff || []).filter(s => s.active !== false && !assignedStaffIds.has(s.id));
    const mdList: Staff[] = [];
    const crnaList: Staff[] = [];
    const infrequentList: Staff[] = [];

    for (const s of unassigned) {
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
      { key: 'md', label: 'MD / Physicians', title: 'MD / PHYSICIANS', color: '#0969da', items: mdList },
      { key: 'crna', label: 'CRNA / Anesthetists', title: 'CRNA / ANESTHETISTS', color: '#1a7f37', items: crnaList },
      { key: 'infrequent', label: 'Infrequent / PRN', title: 'INFREQUENT / PRN', color: '#d97706', items: infrequentList }
    ];
  }, [boardState.staff, assignedStaffIds]);

  return (
    <div className="mobile-whiteboard-root">
      {/* 1. Mobile Top Compact Header */}
      <header className="mobile-top-header">
        <div className="mobile-header-brand">
          <div className="mobile-brand-icon">OR</div>
          <div className="mobile-brand-text">
            <span className="mobile-brand-title">PERFECT BOARD</span>
            <div className="mobile-sync-status">
              <span className="mobile-pulse-dot" />
              <span>LIVE</span>
            </div>
          </div>
        </div>

        <div className="mobile-header-clock">
          <Clock size={12} />
          <span>{currentTime || '12:00 PM'}</span>
        </div>

        <div className="mobile-header-actions">
          {/* Undo Button */}
          {onUndo && (
            <button
              type="button"
              className="mobile-header-btn"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onUndo();
              }}
              style={{
                opacity: canUndo ? 1 : 0.45,
                color: canUndo ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: canUndo ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2
              }}
              title={canUndo ? `Undo: ${lastUndoDescription || 'last action'}` : 'Nothing to undo'}
            >
              <Undo2 size={16} />
              {undoCount && undoCount > 0 ? (
                <span style={{ fontSize: 10, fontWeight: 800 }}>{undoCount}</span>
              ) : null}
            </button>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            className="mobile-header-btn"
            onClick={onToggleTheme}
            title={theme === 'whiteboard' ? 'Switch to Dark Mode' : 'Switch to Whiteboard Theme'}
          >
            {theme === 'whiteboard' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Auth Button */}
          {currentUser && currentUser.role !== 'view_only' ? (
            <button
              type="button"
              className="mobile-auth-btn logged-in"
              onClick={onLogout}
              title={`Logged in as ${currentUser.displayName}. Tap to Logout`}
            >
              <UserCheck size={14} />
              <span>{currentUser.displayName.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              type="button"
              className="mobile-auth-btn"
              onClick={onOpenLogin}
              title="Unlock Access PIN"
            >
              <Lock size={14} />
              <span>Login</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Dropdown View Selector Bar (Prominent Top Controls) */}
      <div className="mobile-view-selector-bar">
        <button
          type="button"
          className="mobile-nav-arrow"
          onClick={handlePrevView}
          title="Previous View"
        >
          <ChevronLeft size={22} />
        </button>

        {/* The Requested View Dropdown Menu */}
        <div className="mobile-select-wrapper">
          <select
            id="mobile-view-dropdown"
            className="mobile-select-dropdown"
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value)}
          >
            <optgroup label="🏥 Operating Room Departments">
              {boardState.departments.map(dept => {
                const assignedCount = dept.rooms.filter(r => r.slots.some(s => !!s.staffId)).length;
                return (
                  <option key={`dept_${dept.id}`} value={`dept_${dept.id}`}>
                    {dept.name} ({assignedCount}/{dept.rooms.length} Rooms)
                  </option>
                );
              })}
            </optgroup>

            <optgroup label="📋 Roster & Shifts">
              <option value="reliefs">
                🟥 Relief Schedule ({reliefsList.length})
              </option>
              <option value="departure">
                ✈️ Departure List ({boardState.departureList?.length || 0})
              </option>
              <option value="call_team">
                📞 Call Team ({boardState.callTeamList?.length || 0})
              </option>
              <option value="lates">
                ⏰ Lates List ({boardState.latesList?.length || 0})
              </option>
              <option value="bullpen">
                👥 Bullpen ({boardState.bullpenStaffIds?.length || 0} Available)
              </option>
            </optgroup>
          </select>
        </div>

        <button
          type="button"
          className="mobile-nav-arrow"
          onClick={handleNextView}
          title="Next View"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* 2b. Administrator Relief Action Bar */}
      {isEditor && onOpenReliefTextModal && (
        <div 
          className="mobile-admin-quick-bar"
          style={{
            padding: '7px 14px',
            background: 'var(--surface-header, #f8fafc)',
            borderBottom: '1px solid var(--border-light, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
            <span style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              background: reliefsList.length > 0 ? 'var(--marker-red, #dc2626)' : 'var(--text-muted, #94a3b8)' 
            }} />
            <span>{reliefsList.length} Relief{reliefsList.length === 1 ? '' : 's'} Active</span>
          </div>

          <button
            type="button"
            id="btn-mobile-relief-assignments"
            onClick={onOpenReliefTextModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 6,
              background: 'var(--marker-red, #dc2626)',
              color: '#ffffff',
              border: 'none',
              fontSize: 12.5,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
              letterSpacing: 0.3
            }}
            title="Build text thread and notify all room, relief, and runner staff"
          >
            <MessageSquare size={13} />
            <span>Relief Assignments</span>
          </button>
        </div>
      )}

      {/* 3. Dynamic Screen Content based on Selected View */}
      <main className="mobile-main-content">
        {/* ======================= VIEW A: DEPARTMENT SCREEN ======================= */}
        {activeDepartment && (
          <div className="mobile-screen-container">
            <div className="dept-column mobile-dept-column">
              {/* Department Header with Runner Magnet Slots */}
              <div className="dept-header">
                <div className="dept-title">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="dept-name-text" style={{ fontSize: 13, fontWeight: 800 }}>
                      {activeDepartment.name}
                    </span>
                    <span className="dept-occupancy-pill" title={`${activeDepartment.rooms.filter(r => r.slots.some(s => !!s.staffId)).length} of ${activeDepartment.rooms.length} rooms assigned`}>
                      {activeDepartment.rooms.filter(r => r.slots.some(s => !!s.staffId)).length}/{activeDepartment.rooms.length}
                    </span>
                  </div>
                </div>

                {/* Runner Slots Group (Only occupied runners) */}
                {(() => {
                  const occupied = (activeDepartment.runnerSlots || []).filter(r => Boolean(r.staffId && getStaffById(r.staffId)));
                  if (occupied.length === 0) return null;
                  const isMultiRunner = occupied.length > 1;

                  return (
                    <div className="runner-slots-group">
                      {occupied.map((runner, idx) => {
                        const assignedStaff = getStaffById(runner.staffId);
                        if (!assignedStaff) return null;
                        const reliefStaff = getStaffById(runner.relief?.staffId || null);
                        const hasAssignedRelief = Boolean(runner.relief && reliefStaff);

                        return (
                          <div
                            key={runner.id}
                            className={`runner-slot ${isMultiRunner ? 'multi' : 'single'}`}
                            style={{
                              flex: isMultiRunner ? '1 1 0' : '1 1 100%',
                              minWidth: 0,
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', gap: 4 }}>
                              <div
                                style={{
                                  flex: hasAssignedRelief ? '1 1 50%' : 1,
                                  minWidth: 0,
                                  maxWidth: hasAssignedRelief ? '50%' : '100%',
                                  height: '100%'
                                }}
                              >
                                <MagnetTile
                                  staff={assignedStaff}
                                  slotId={runner.id}
                                  slotType="runner_slot"
                                  breakfastDone={runner.breakfastDone}
                                  lunchDone={runner.lunchDone}
                                  currentUserRole={currentUserRole}
                                  unreadMessageCount={getStaffUnreadCount(assignedStaff)}
                                  magnetNote={boardState?.magnetNotes?.[assignedStaff.id] ?? assignedStaff.magnetNote ?? ''}
                                  onUpdateNote={onUpdateMagnetNote ? (note) => onUpdateMagnetNote(assignedStaff.id, note) : undefined}
                                  onToggleBreak={(type, val) => onToggleBreak('runner_slot', runner.id, type, val)}
                                  onSelectStaff={onSelectStaff}
                                  isDraggable={false}
                                />
                              </div>

                              {hasAssignedRelief && reliefStaff && (
                                <div
                                  style={{
                                    flex: '1 1 50%',
                                    minWidth: 0,
                                    maxWidth: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    height: '100%'
                                  }}
                                >
                                  <span
                                    className="relief-arrow"
                                    title="Relief assignment"
                                    style={{
                                      fontSize: 11,
                                      color: 'var(--marker-red, #dc2626)',
                                      fontWeight: 900,
                                      flexShrink: 0,
                                      lineHeight: 1
                                    }}
                                  >
                                    ➔
                                  </span>
                                  <div
                                    className="relief-box mobile-relief-box"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onOpenReliefModal) {
                                        onOpenReliefModal({
                                          type: 'runner_slot',
                                          id: runner.id,
                                          roomName: `Runner`,
                                          departmentName: activeDepartment.name,
                                          currentStaff: assignedStaff || null,
                                          currentRelief: runner.relief
                                        });
                                      }
                                    }}
                                    title={`Relief: ${reliefStaff.lastName} (${reliefStaff.credentials})${runner.relief?.time ? ` • ${runner.relief.time}` : ''}. Tap to edit or hand off.`}
                                  >
                                    <div className="relief-identity">
                                      <span className="relief-name">
                                        {reliefStaff.displayName 
                                          ? reliefStaff.displayName.toUpperCase() 
                                          : `${reliefStaff.lastName.toUpperCase()}${reliefStaff.firstName ? ` ${reliefStaff.firstName[0]}.` : ''}`}
                                      </span>
                                    </div>
                                    {runner.relief?.time && (
                                      <span
                                        className="relief-time-tag"
                                        style={{
                                          background: 'rgba(0, 0, 0, 0.3)',
                                          color: '#ffffff',
                                          fontSize: 9,
                                          fontWeight: 900,
                                          padding: '1px 4px',
                                          borderRadius: 3,
                                          border: '1px solid rgba(255, 255, 255, 0.25)',
                                          flexShrink: 0,
                                          lineHeight: 1.2
                                        }}
                                        title={`Relief time: ${runner.relief.time}`}
                                      >
                                        {runner.relief.time}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Rooms List */}
              <div className="dept-rooms-list" style={{ overflowY: 'visible', height: 'auto' }}>
                {activeDepartment.rooms.map(room => {
                  return (
                    <div key={room.id} className="room-row mobile-room-row">
                      {/* Room Number / Identifier & Free-text Note */}
                      <RoomLabel
                        room={room}
                        deptName={activeDepartment.name}
                        roomNote={boardState?.roomNotes?.[room.id] ?? room.note ?? ''}
                        onUpdateRoomNote={onUpdateRoomNote}
                        currentUserRole={currentUserRole}
                        onOpenLogin={onOpenLogin}
                      />

                      {/* Slots inside Room */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: 3, alignItems: 'center', height: '100%', minWidth: 0 }}>
                        {room.futureTime && (
                          <div
                            className="room-future-time-badge"
                            title={`Estimated future case time: ${room.futureTime}. Tap to edit, clear time, or assign staff.`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const firstSlot = room.slots[0];
                              const targetSlotId = firstSlot?.id || `room_slot_${room.id}`;
                              onSelectEmptySlot('room_slot', targetSlotId, `${activeDepartment.name} Room ${room.name}`, room.id, room.futureTime);
                            }}
                          >
                            <span className="room-future-time-text">{room.futureTime}</span>
                          </div>
                        )}

                        {room.slots
                          .filter((slot, idx) => idx === 0 || !!slot.staffId)
                          .map(slot => {
                            const assignedStaff = getStaffById(slot.staffId);
                            const reliefStaff = getStaffById(slot.relief?.staffId || null);
                            const hasAssignedRelief = Boolean(slot.relief && reliefStaff);
                            const isOpenRedBox = Boolean(slot.relief && (!slot.relief.staffId || slot.relief.isRedBox) && !hasAssignedRelief);

                            return (
                              <div
                                key={slot.id}
                                className={`room-slot-target ${!assignedStaff ? 'empty' : ''}`}
                                style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 4 }}
                              >
                                {assignedStaff ? (
                                  <div
                                    style={{
                                      flex: hasAssignedRelief ? '1 1 50%' : 1,
                                      minWidth: 0,
                                      maxWidth: hasAssignedRelief ? '50%' : '100%'
                                    }}
                                  >
                                    <MagnetTile
                                      staff={assignedStaff}
                                      slotId={slot.id}
                                      slotType="room_slot"
                                      breakfastDone={slot.breakfastDone}
                                      lunchDone={slot.lunchDone}
                                      currentUserRole={currentUserRole}
                                      unreadMessageCount={getStaffUnreadCount(assignedStaff)}
                                      magnetNote={boardState?.magnetNotes?.[assignedStaff.id] ?? assignedStaff.magnetNote ?? ''}
                                      onUpdateNote={onUpdateMagnetNote ? (note) => onUpdateMagnetNote(assignedStaff.id, note) : undefined}
                                      onToggleBreak={(type, val) => onToggleBreak('room_slot', slot.id, type, val)}
                                      onSelectStaff={onSelectStaff}
                                      isDraggable={false}
                                    />
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      flex: hasAssignedRelief ? '1 1 50%' : 1,
                                      minWidth: 0,
                                      maxWidth: hasAssignedRelief ? '50%' : '100%',
                                      height: '100%',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                      onSelectEmptySlot('room_slot', slot.id, `${activeDepartment.name} Room ${room.name}`, room.id, room.futureTime);
                                    }}
                                  />
                                )}

                                {/* Relief zone on mobile: 50% row width with prominent red fill */}
                                {hasAssignedRelief && reliefStaff ? (
                                  <div
                                    style={{
                                      flex: '1 1 50%',
                                      minWidth: 0,
                                      maxWidth: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 3,
                                      height: '100%'
                                    }}
                                  >
                                    <span
                                      className="relief-arrow"
                                      title="Relief assignment"
                                      style={{
                                        fontSize: 11,
                                        color: 'var(--marker-red, #dc2626)',
                                        fontWeight: 900,
                                        flexShrink: 0,
                                        lineHeight: 1
                                      }}
                                    >
                                      ➔
                                    </span>
                                    <div
                                      className="relief-box mobile-relief-box"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onOpenReliefModal) {
                                          onOpenReliefModal({
                                            type: 'room_slot',
                                            id: slot.id,
                                            roomName: `Room ${room.name}`,
                                            departmentName: activeDepartment.name,
                                            currentStaff: assignedStaff || null,
                                            currentRelief: slot.relief
                                          });
                                        }
                                      }}
                                      title={`Relief: ${reliefStaff.lastName} (${reliefStaff.credentials})${slot.relief?.time ? ` • ${slot.relief.time}` : ''}. Tap to edit or hand off.`}
                                    >
                                      <div className="relief-identity">
                                        <span className="relief-name">
                                          {reliefStaff.displayName 
                                            ? reliefStaff.displayName.toUpperCase() 
                                            : `${reliefStaff.lastName.toUpperCase()}${reliefStaff.firstName ? ` ${reliefStaff.firstName[0]}.` : ''}`}
                                        </span>
                                      </div>
                                      {slot.relief?.time && (
                                        <span
                                          className="relief-time-tag"
                                          style={{
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            color: '#ffffff',
                                            fontSize: 9,
                                            fontWeight: 900,
                                            padding: '1px 4px',
                                            borderRadius: 3,
                                            border: '1px solid rgba(255, 255, 255, 0.25)',
                                            flexShrink: 0,
                                            lineHeight: 1.2
                                          }}
                                          title={`Relief time: ${slot.relief.time}`}
                                        >
                                          {slot.relief.time}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : isOpenRedBox ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onOpenReliefModal) {
                                          onOpenReliefModal({
                                            type: 'room_slot',
                                            id: slot.id,
                                            roomName: `Room ${room.name}`,
                                            departmentName: activeDepartment.name,
                                            currentStaff: assignedStaff || null,
                                            currentRelief: slot.relief
                                          });
                                        }
                                      }}
                                      style={{
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        border: '1.5px dashed var(--marker-red, #dc2626)',
                                        background: 'rgba(239, 68, 68, 0.12)',
                                        color: 'var(--marker-red, #dc2626)',
                                        fontSize: 10,
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 3
                                      }}
                                      title="Red Box: Tap to assign relief clinician"
                                    >
                                      <Clock size={10} />
                                      <span>+ Relief</span>
                                    </button>
                                    {isEditor && onRemoveRelief && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onRemoveRelief('room_slot', slot.id);
                                        }}
                                        style={{
                                          padding: '2px 5px',
                                          borderRadius: 4,
                                          border: 'none',
                                          background: 'rgba(239, 68, 68, 0.15)',
                                          color: 'var(--marker-red, #dc2626)',
                                          fontSize: 11,
                                          fontWeight: 900,
                                          cursor: 'pointer',
                                          lineHeight: 1
                                        }}
                                        title="Clear red box"
                                        aria-label="Clear red box"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                ) : isEditor ? (
                                  <button
                                    type="button"
                                    className="relief-add-trigger"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onSetRelief) {
                                        onSetRelief('room_slot', slot.id, '', '', '', true);
                                      }
                                    }}
                                    title="Single tap to designate relief (Red Box)"
                                  >
                                    <Clock size={10} />
                                    <span>Relief</span>
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================= VIEW R: RELIEF SCHEDULE SCREEN ======================= */}
        {selectedView === 'reliefs' && (
          <div className="mobile-screen-container">
            <div className="mobile-card mobile-dept-header-card">
              <div className="mobile-dept-title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <h1 className="mobile-dept-heading">Relief Schedule</h1>
                  <span className="mobile-dept-subtext">
                    {reliefsList.length} Active Relief Assignment{reliefsList.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {isEditor && onCompleteAllReliefs && (
                    <button
                      type="button"
                      onClick={onCompleteAllReliefs}
                      disabled={reliefCount === 0 || isCompletingRelief}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '7px 12px',
                        borderRadius: 6,
                        background: (reliefCount ?? 0) > 0 ? 'var(--marker-red, #dc2626)' : 'var(--surface-hover)',
                        color: (reliefCount ?? 0) > 0 ? '#ffffff' : 'var(--text-muted)',
                        border: (reliefCount ?? 0) > 0 ? '1.5px solid #b91c1c' : '1px solid var(--border-light)',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: (reliefCount ?? 0) > 0 && !isCompletingRelief ? 'pointer' : 'not-allowed',
                        boxShadow: (reliefCount ?? 0) > 0 ? '0 2px 6px rgba(220, 38, 38, 0.3)' : 'none'
                      }}
                      title={(reliefCount ?? 0) > 0 ? `Complete all ${reliefCount} relief handoffs` : 'No active relief assignments'}
                    >
                      <CheckCheck size={14} className={isCompletingRelief ? 'spin-animation' : ''} />
                      <span>Complete Relief{reliefCount ? ` (${reliefCount})` : ''}</span>
                    </button>
                  )}
                  {isEditor && onOpenReliefTextModal && (
                    <button
                      type="button"
                      onClick={onOpenReliefTextModal}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 12px',
                        borderRadius: 6,
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1.5px solid var(--marker-red, #dc2626)',
                        color: 'var(--marker-red, #dc2626)',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      <MessageSquare size={13} />
                      <span>Relief Assignments</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="mobile-helper-text" style={{ marginTop: 6 }}>
                Staff scheduled for afternoon relief. Tap Complete Relief above to swap all relief providers into active slots.
              </div>
            </div>

            {reliefsList.length === 0 ? (
              <div className="mobile-card mobile-list-card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>No Reliefs Assigned Yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  To assign a relief, tap "+ Relief" on any room slot on the board.
                </div>
              </div>
            ) : (
              <div className="mobile-card mobile-list-card">
                {reliefsList.map((item) => (
                  <div
                    key={`${item.slotType}_${item.slotId}`}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid var(--border-light, #f1f5f9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {item.departmentName} • {item.roomName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        {/* Outgoing */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 800 }}>
                            {item.currentStaff ? item.currentStaff.lastName.toUpperCase() : 'Unassigned'}
                          </span>
                          {item.currentStaff && (
                            <span className={`magnet-cred cred-${item.currentStaff.credentials}`} style={{ fontSize: 8, padding: '0 3px' }}>
                              {item.currentStaff.credentials}
                            </span>
                          )}
                        </div>

                        <span style={{ color: 'var(--marker-red, #dc2626)', fontWeight: 900, fontSize: 12 }}>➔</span>

                        {/* Incoming Relief */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: item.reliefStaff ? '1.5px solid var(--marker-red, #dc2626)' : '1.5px dashed var(--marker-red, #dc2626)',
                          background: 'rgba(239, 68, 68, 0.08)'
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--marker-red, #dc2626)' }}>
                            {item.reliefStaff ? item.reliefStaff.lastName.toUpperCase() : '3 PM COUNT (NEEDS COVERAGE)'}
                          </span>
                          {item.reliefStaff && (
                            <span className={`magnet-cred cred-${item.reliefStaff.credentials}`} style={{ fontSize: 8, padding: '0 3px' }}>
                              {item.reliefStaff.credentials}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================= VIEW B: DEPARTURE LIST SCREEN ======================= */}
        {selectedView === 'departure' && (
          <div className="mobile-screen-container">
            <div className="mobile-card mobile-dept-header-card">
              <div className="mobile-dept-title-row">
                <div>
                  <h1 className="mobile-dept-heading">Departure List</h1>
                  <span className="mobile-dept-subtext">
                    {boardState.departureList.filter(d => !d.departed).length} of {boardState.departureList.length} Remaining
                  </span>
                </div>
              </div>
              <div className="mobile-helper-text">
                Tap any doctor name to mark as departed (strike-through). Tap again to unstrike.
              </div>
            </div>

            {/* Post-Call Departures */}
            <div className="mobile-section-label">
              Post-Call ({postCallDepartures.length})
            </div>
            <div className="mobile-card mobile-list-card">
              {postCallDepartures.length === 0 ? (
                <div className="mobile-empty-state">No post-call staff today</div>
              ) : (
                postCallDepartures.map((item, idx) => {
                  const reliefLocs = getReliefLocations(item.name, item.id, item.qgendaAbbr);
                  return (
                    <div
                      key={item.id}
                      className={`mobile-departure-row ${item.departed ? 'departed-struck' : ''}`}
                      onClick={() => onToggleDepartureStruck(item.id)}
                    >
                      <div className="mobile-order-badge">#{idx + 1}</div>
                      <div className="mobile-departure-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {reliefLocs && (
                            <span
                              className="pending-relief-indicator-dot"
                              title={`Assigned as pending relief for: ${reliefLocs.join(', ')}`}
                            />
                          )}
                          <span className="mobile-departure-name">{item.name}</span>
                        </div>
                        {item.role && <span className="mobile-departure-role">{item.role}</span>}
                      </div>
                      <button
                        type="button"
                        className={`mobile-strike-toggle-btn ${item.departed ? 'checked' : ''}`}
                        title={item.departed ? 'Mark Not Departed' : 'Mark Departed'}
                      >
                        {item.departed ? <Check size={14} /> : <Strikethrough size={14} />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Special Atypical Departures (e.g. 2p) */}
            {specialDepartures.length > 0 && (
              <>
                <div className="mobile-section-label" style={{ marginTop: 16 }}>
                  Special Departures ({specialDepartures.length})
                </div>
                <div className="mobile-card mobile-list-card">
                  {specialDepartures.map((item, idx) => {
                    const reliefLocs = getReliefLocations(item.name, item.id, item.qgendaAbbr);
                    return (
                      <div
                        key={item.id}
                        className={`mobile-departure-row ${item.departed ? 'departed-struck' : ''}`}
                        onClick={() => onToggleDepartureStruck(item.id)}
                      >
                        <div className="mobile-order-badge">#{idx + 1}</div>
                        <div className="mobile-departure-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="atypical-time-badge" style={{ marginRight: 2 }}>
                              {item.timeEstimate || '2p'}
                            </span>
                            {reliefLocs && (
                              <span
                                className="pending-relief-indicator-dot"
                                title={`Assigned as pending relief for: ${reliefLocs.join(', ')}`}
                              />
                            )}
                            <span className="mobile-departure-name">{item.name}</span>
                          </div>
                          {item.role && <span className="mobile-departure-role">{item.role}</span>}
                        </div>
                        <button
                          type="button"
                          className={`mobile-strike-toggle-btn ${item.departed ? 'checked' : ''}`}
                          title={item.departed ? 'Mark Not Departed' : 'Mark Departed'}
                        >
                          {item.departed ? <Check size={14} /> : <Strikethrough size={14} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Non-Call Departures */}
            <div className="mobile-section-label" style={{ marginTop: 16 }}>
              Non-Call Departures ({nonCallDepartures.length})
            </div>
            <div className="mobile-card mobile-list-card">
              {nonCallDepartures.length === 0 ? (
                <div className="mobile-empty-state">No non-call staff listed</div>
              ) : (
                nonCallDepartures.map((item, idx) => {
                  const reliefLocs = getReliefLocations(item.name, item.id, item.qgendaAbbr);
                  return (
                    <div
                      key={item.id}
                      className={`mobile-departure-row ${item.departed ? 'departed-struck' : ''}`}
                      onClick={() => onToggleDepartureStruck(item.id)}
                    >
                      <div className="mobile-order-badge">#{idx + 1}</div>
                      <div className="mobile-departure-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {reliefLocs && (
                            <span
                              className="pending-relief-indicator-dot"
                              title={`Assigned as pending relief for: ${reliefLocs.join(', ')}`}
                            />
                          )}
                          <span className="mobile-departure-name">{item.name}</span>
                        </div>
                        {item.role && <span className="mobile-departure-role">{item.role}</span>}
                      </div>
                      <button
                        type="button"
                        className={`mobile-strike-toggle-btn ${item.departed ? 'checked' : ''}`}
                        title={item.departed ? 'Mark Not Departed' : 'Mark Departed'}
                      >
                        {item.departed ? <Check size={14} /> : <Strikethrough size={14} />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Notes Section */}
            {boardState.departureNotes && (
              <div className="mobile-card" style={{ marginTop: 16 }}>
                <div className="mobile-section-label">Departure Notes</div>
                <div className="mobile-notes-text">{boardState.departureNotes}</div>
              </div>
            )}
          </div>
        )}

        {/* ======================= VIEW C: CALL TEAM SCREEN ======================= */}
        {selectedView === 'call_team' && (
          <div className="mobile-screen-container">
            <div className="mobile-card mobile-dept-header-card">
              <div className="mobile-dept-title-row">
                <div>
                  <h1 className="mobile-dept-heading">Call Team</h1>
                  <span className="mobile-dept-subtext">Tonight's On-Call Roster</span>
                </div>
                {isEditor && onAutoAssign && (
                  <button
                    type="button"
                    className="mobile-action-sm-btn accent"
                    onClick={onAutoAssign}
                    disabled={isAutoAssigning}
                    title="Auto-Assign Call Doctors from Schedule"
                  >
                    <Sparkles size={14} />
                    <span>{isAutoAssigning ? 'Assigning...' : 'Auto-Assign'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="mobile-call-team-grid">
              {(boardState.callTeamList || []).map((item) => {
                const isOB = item.role.toUpperCase() === 'OB';
                const isCV = item.role.toUpperCase() === 'CV';
                return (
                  <div
                    key={item.id}
                    className="mobile-card mobile-call-card"
                    style={{ cursor: item.doctorName ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (!item.doctorName) return;
                      const matched = (boardState.staff || []).find(s =>
                        s.lastName.toUpperCase() === item.doctorName.toUpperCase() ||
                        (item.qgendaAbbr && s.qgendaAbbr?.toUpperCase() === item.qgendaAbbr.toUpperCase())
                      );
                      if (matched) {
                        onSelectStaff(matched);
                      } else {
                        onSelectStaff({
                          id: item.id || `staff_call_${item.doctorName.toLowerCase()}`,
                          firstName: '',
                          lastName: item.doctorName.toUpperCase(),
                          credentials: 'MD',
                          phone: '(555) 000-0000',
                          shift: item.role,
                          facility: 'MHMC',
                          active: true,
                          qgendaAbbr: item.qgendaAbbr
                        });
                      }
                    }}
                  >
                    <div className="mobile-call-badge-col">
                      <span className={`mobile-call-role-badge ${isOB ? 'role-ob' : isCV ? 'role-cv' : 'role-general'}`}>
                        {item.role}
                      </span>
                    </div>
                    <div className="mobile-call-details">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.doctorName && (() => {
                          const reliefLocs = getReliefLocations(item.doctorName, item.id, item.qgendaAbbr);
                          return reliefLocs ? (
                            <span
                              className="pending-relief-indicator-dot"
                              title={`Assigned as pending relief for: ${reliefLocs.join(', ')}`}
                            />
                          ) : null;
                        })()}
                        <span className="mobile-call-doc-name">
                          {item.doctorName ? item.doctorName.toUpperCase() : '(Unassigned)'}
                        </span>
                      </div>
                      <span className="mobile-call-status-label">
                        {item.doctorName ? 'Assigned On-Call (Tap for details)' : 'Pending Assignment'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================= VIEW D: LATES LIST SCREEN ======================= */}
        {selectedView === 'lates' && (
          <div className="mobile-screen-container">
            <div className="mobile-card mobile-dept-header-card">
              <div className="mobile-dept-title-row">
                <div>
                  <h1 className="mobile-dept-heading">Lates Shifts</h1>
                  <span className="mobile-dept-subtext">
                    {boardState.latesList?.length || 0} Staff on Late Assignments
                  </span>
                </div>
              </div>
            </div>

            <div className="mobile-lates-container">
              {sortedTimeCategories.map(cat => {
                const items = latesGrouped[cat] || [];
                const isSpecial = cat === 'special';
                const is24h = cat.toLowerCase() === '24h';
                const isAtypical = !['3p', '4p', '5p', '7p', '8p', '7p-7a', '24h'].includes(cat.toLowerCase());
                if ((isSpecial || is24h || isAtypical) && items.length === 0) return null;
                return (
                  <div key={cat} className="mobile-card mobile-lates-group-card">
                    <div className="mobile-lates-header">
                      <span className="mobile-lates-time-pill" style={(isSpecial || isAtypical) ? { background: '#2563eb', color: '#fff' } : is24h ? { background: '#ea580c', color: '#fff' } : undefined}>
                        {isSpecial ? 'SPECIAL SHIFT' : `${cat.toUpperCase()} SHIFT`}
                      </span>
                      <span className="mobile-lates-count">{items.length} Staff</span>
                    </div>

                    <div className="mobile-lates-tags-list">
                      {items.length === 0 ? (
                        <span className="mobile-lates-empty-note">None scheduled</span>
                      ) : (
                        items.map(item => {
                          const reliefLocs = getReliefLocations(item.name, item.id, item.qgendaAbbr);
                          return (
                          <div key={item.id} className="mobile-late-staff-chip">
                            {isSpecial && (
                              <span className="atypical-time-badge" style={{ marginRight: 4 }}>
                                {item.timeEstimate || '2p'}
                              </span>
                            )}
                            {reliefLocs && (
                              <span
                                className="pending-relief-indicator-dot"
                                title={`Assigned as pending relief for: ${reliefLocs.join(', ')}`}
                              />
                            )}
                            <span className="mobile-late-chip-name">{item.name}</span>
                            {item.notes && (
                              <span
                                className="mobile-late-chip-role"
                                style={{
                                  background: 'rgba(234, 88, 12, 0.12)',
                                  color: '#ea580c',
                                  border: '1px solid rgba(234, 88, 12, 0.3)'
                                }}
                              >
                                {item.notes}
                              </span>
                            )}
                            {item.role && <span className="mobile-late-chip-role">{item.role}</span>}
                          </div>
                        );
                      })
                      )}
                    </div>
                  </div>
                );
              })}

              {boardState.latesNotes && (
                <div className="mobile-card" style={{ marginTop: 12 }}>
                  <div className="mobile-section-label">Lates Notes</div>
                  <div className="mobile-notes-text">{boardState.latesNotes}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= VIEW E: BULLPEN SCREEN ======================= */}
        {selectedView === 'bullpen' && (
          <div className="mobile-screen-container">
            <div className="mobile-card mobile-dept-header-card">
              <div className="mobile-dept-title-row">
                <div>
                  <h1 className="mobile-dept-heading">Bullpen</h1>
                  <span className="mobile-dept-subtext">
                    {boardState.bullpenStaffIds?.length || 0} Available Staff for Relief &amp; Cases
                  </span>
                </div>
              </div>
            </div>

            <div className="mobile-bullpen-list">
              {(boardState.bullpenStaffIds || []).length === 0 ? (
                <div className="mobile-card mobile-empty-card">
                  <AlertCircle size={24} style={{ color: 'var(--text-muted)', marginBottom: 6 }} />
                  <div style={{ fontWeight: 700 }}>No staff currently in Bullpen</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Staff moved here from rooms or rosters will appear ready for breaks.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(boardState.bullpenStaffIds || []).map(staffId => {
                    const staffMember = getStaffById(staffId);
                    if (!staffMember) return null;
                    const breakStatus = boardState.bullpenBreaks?.[staffId] || { breakfastDone: false, lunchDone: false };

                    return (
                      <div key={staffId} style={{ height: 26, minHeight: 26 }}>
                        <MagnetTile
                          staff={staffMember}
                          slotId={staffId}
                          slotType="bullpen"
                          breakfastDone={breakStatus.breakfastDone}
                          lunchDone={breakStatus.lunchDone}
                          currentUserRole={currentUserRole}
                          unreadMessageCount={getStaffUnreadCount(staffMember)}
                          magnetNote={boardState?.magnetNotes?.[staffMember.id] ?? staffMember.magnetNote ?? ''}
                          onUpdateNote={onUpdateMagnetNote ? (note) => onUpdateMagnetNote(staffMember.id, note) : undefined}
                          onToggleBreak={(type, val) => onToggleBreak('bullpen', staffId, type, val)}
                          onSelectStaff={onSelectStaff}
                          isDraggable={false}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= VIEW F: AVAILABLE STAFF SCREEN ======================= */}
        {selectedView === 'available_staff' && (
          <div className="mobile-screen-container">
            <div className="mobile-card mobile-dept-header-card">
              <div className="mobile-dept-title-row">
                <div>
                  <h1 className="mobile-dept-heading">Available Staff</h1>
                  <span className="mobile-dept-subtext">
                    3 Groups: MD, CRNA, Infrequent (Alphabetical)
                  </span>
                </div>
              </div>
            </div>

            {mobileAvailableStaffGroups.map(grp => (
              <div key={grp.key} style={{ marginBottom: 16 }}>
                <div
                  className="mobile-section-label"
                  style={{
                    color: grp.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 800
                  }}
                >
                  <span>{grp.title}</span>
                  <span style={{ fontSize: 11 }}>({grp.items.length})</span>
                </div>
                <div className="mobile-card mobile-list-card" style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {grp.items.length === 0 ? (
                    <div className="mobile-empty-state">No unassigned staff in {grp.label}</div>
                  ) : (
                    grp.items.map(s => {
                      const breakStatus = boardState.bullpenBreaks?.[s.id] || { breakfastDone: false, lunchDone: false };
                      return (
                        <div key={s.id} style={{ height: 26, minHeight: 26 }}>
                          <MagnetTile
                            staff={s}
                            slotId={s.id}
                            slotType="unassigned"
                            showBreaks={false}
                            currentUserRole={currentUserRole}
                            unreadMessageCount={getStaffUnreadCount(s)}
                            magnetNote={boardState?.magnetNotes?.[s.id] ?? s.magnetNote ?? ''}
                            onUpdateNote={onUpdateMagnetNote ? (note) => onUpdateMagnetNote(s.id, note) : undefined}
                            onSelectStaff={onSelectStaff}
                            isDraggable={false}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ======================= VIEW G: RELIEF SCHEDULE SCREEN ======================= */}
        {selectedView === 'reliefs' && (
          <div className="mobile-screen-container">
            <div className="mobile-card mobile-dept-header-card">
              <div className="mobile-dept-title-row">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: 'var(--marker-red)', textTransform: 'uppercase' }}>
                    <Clock size={13} />
                    <span>Handoffs &amp; Afternoon Transitions</span>
                  </div>
                  <h1 className="mobile-dept-heading" style={{ color: 'var(--marker-red)' }}>Relief Schedule</h1>
                  <span className="mobile-dept-subtext">
                    {reliefsList.length} Scheduled Relief{reliefsList.length === 1 ? '' : 's'} across all departments
                  </span>
                </div>
              </div>
            </div>

            {reliefsList.length === 0 ? (
              <div className="mobile-card mobile-empty-card">
                <AlertCircle size={28} style={{ color: 'var(--marker-red)', marginBottom: 8 }} />
                <div style={{ fontWeight: 800, fontSize: 15 }}>No Reliefs Currently Scheduled</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                  When 3 PM, 5 PM, or on-call reliefs are set for rooms, they will appear here grouped by time wave.
                </div>
              </div>
            ) : (
              reliefsByTime.map(group => (
                <div key={group.time} style={{ marginBottom: 16 }}>
                  <div
                    className="mobile-section-label"
                    style={{
                      color: 'var(--marker-red)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontWeight: 900,
                      fontSize: 13
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} />
                      <span>{group.time} WAVE</span>
                    </div>
                    <span style={{ fontSize: 11, background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: 12 }}>
                      {group.items.length} Room{group.items.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.items.map(item => (
                      <div
                        key={`${item.slotType}_${item.slotId}`}
                        className="mobile-card"
                        style={{
                          borderLeft: '4px solid var(--marker-red)',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10
                        }}
                      >
                        {/* Header: Dept & Room */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                            {item.departmentName} • {item.roomName}
                          </div>
                          <span style={{
                            background: 'var(--marker-red)',
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 900,
                            padding: '2px 6px',
                            borderRadius: 4
                          }}>
                            {item.relief.time}
                          </span>
                        </div>

                        {/* Transition Row: Outgoing -> Incoming */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto 1fr',
                          alignItems: 'center',
                          gap: 8,
                          background: 'var(--surface-hover)',
                          borderRadius: 6,
                          padding: '8px 10px',
                          border: '1px solid var(--border-light)'
                        }}>
                          {/* Outgoing */}
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              Outgoing (Leaving):
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                              {item.currentStaff ? `${item.currentStaff.lastName}` : 'Vacant'}
                              {item.currentStaff && (
                                <span className={`magnet-cred cred-${item.currentStaff.credentials}`} style={{ fontSize: 9, padding: '1px 4px', marginLeft: 4 }}>
                                  {item.currentStaff.credentials}
                                </span>
                              )}
                            </div>
                          </div>

                          <ArrowRight size={16} style={{ color: 'var(--marker-red)' }} />

                          {/* Incoming Relief */}
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--marker-red)', textTransform: 'uppercase' }}>
                              Relief (Taking Over):
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>
                              {item.reliefStaff ? `${item.reliefStaff.lastName}` : 'Unassigned'}
                              {item.reliefStaff && (
                                <span className={`magnet-cred cred-${item.reliefStaff.credentials}`} style={{ fontSize: 9, padding: '1px 4px', marginLeft: 4 }}>
                                  {item.reliefStaff.credentials}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Editor Controls */}
                        {isEditor && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                            {onExecuteHandoff && (
                              <button
                                type="button"
                                onClick={() => onExecuteHandoff(item.slotType, item.slotId)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  background: 'var(--marker-green, #10b981)',
                                  color: '#fff',
                                  fontSize: 11,
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  cursor: 'pointer'
                                }}
                              >
                                <Check size={13} />
                                <span>Complete Handoff</span>
                              </button>
                            )}
                            {onRemoveRelief && (
                              <button
                                type="button"
                                onClick={() => onRemoveRelief(item.slotType, item.slotId)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  background: 'var(--surface-hover)',
                                  color: 'var(--marker-red)',
                                  border: '1px solid var(--border-light)',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};
