'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  BoardState, 
  Staff, 
  Department, 
  UserRole, 
  DepartureItem, 
  LateShiftItem, 
  CallTeamItem 
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
  Maximize2,
  CheckCircle2,
  UserCheck,
  Strikethrough,
  AlertCircle,
  X
} from 'lucide-react';
import { MagnetTile } from './MagnetTile';

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
  onSelectEmptySlot: (targetType: 'room_slot' | 'runner_slot', targetId: string, label: string) => void;
  onToggleDepartureStruck: (id: string) => void;
  onUpdateLists: (departureList: DepartureItem[], latesList: LateShiftItem[], isReorder?: boolean) => void;
  onUpdateCallTeam: (callTeamList: CallTeamItem[]) => void;
  onSaveNotes: (type: 'room' | 'departure' | 'lates' | 'general', id: string | undefined, notes: string) => void;
  onOpenVoiceNotes?: (type: 'room' | 'departure' | 'lates' | 'general', id?: string, currentNotes?: string) => void;
  onAddRunnerSlot?: (departmentId: string) => void;
  onRemoveRunnerSlot?: (departmentId: string, runnerSlotId: string) => void;
  onAutoAssign?: () => void;
  isAutoAssigning?: boolean;
  onSwitchToDesktop?: () => void;
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
  onAutoAssign,
  isAutoAssigning = false,
  onSwitchToDesktop
}) => {
  const isEditor = currentUserRole !== 'basic_user';

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
  }, [boardState]);

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

  // Staff lookup helper
  const getStaffById = (id: string | null): Staff | undefined => {
    if (!id) return undefined;
    return boardState.staff.find(s => s.id === id);
  };

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
    const baseCats = ['special', '3p', '4p', '5p', '7p', '8p', '7p-7a'];
    baseCats.forEach(cat => {
      grouped[cat] = [];
    });
    const standardCats = ['3p', '4p', '5p', '7p', '8p', '7p-7a'];
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

    if (grouped['special']) {
      grouped['special'].sort((a, b) => {
        const aMins = parseLateCategoryMinutes(a.timeEstimate || '2p');
        const bMins = parseLateCategoryMinutes(b.timeEstimate || '2p');
        return aMins - bMins;
      });
    }

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
      for (const r of dept.runnerSlots) {
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
          {/* Theme Toggle */}
          <button
            type="button"
            className="mobile-header-btn"
            onClick={onToggleTheme}
            title={theme === 'whiteboard' ? 'Switch to Dark Mode' : 'Switch to Whiteboard Theme'}
          >
            {theme === 'whiteboard' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Desktop Board View Toggle */}
          {onSwitchToDesktop && (
            <button
              type="button"
              className="mobile-header-btn"
              onClick={onSwitchToDesktop}
              title="Switch to Full Board Desktop View"
            >
              <Maximize2 size={16} />
            </button>
          )}

          {/* Auth Button */}
          {currentUser && currentUser.role !== 'basic_user' ? (
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
              title="Unlock Editor PIN"
            >
              <Lock size={14} />
              <span>PIN</span>
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
                  {isEditor && onAddRunnerSlot && (
                    <button
                      type="button"
                      onClick={() => onAddRunnerSlot(activeDepartment.id)}
                      className="dept-add-runner-btn"
                      title={`Add extra runner slot to ${activeDepartment.name}`}
                    >
                      <Plus size={10} />
                      <span>Runner</span>
                    </button>
                  )}
                </div>

                {/* Runner Slots Group */}
                <div className="runner-slots-group">
                  {activeDepartment.runnerSlots.map(runner => {
                    const assignedStaff = getStaffById(runner.staffId);
                    return (
                      <div
                        key={runner.id}
                        className="runner-slot"
                        onClick={() => {
                          if (!assignedStaff) {
                            onSelectEmptySlot('runner_slot', runner.id, `${activeDepartment.name} Runner (${runner.title})`);
                          }
                        }}
                        style={{ position: 'relative' }}
                      >
                        {assignedStaff ? (
                          <MagnetTile
                            staff={assignedStaff}
                            slotId={runner.id}
                            slotType="runner_slot"
                            breakfastDone={runner.breakfastDone}
                            lunchDone={runner.lunchDone}
                            currentUserRole={currentUserRole}
                            onToggleBreak={(type, val) => onToggleBreak('runner_slot', runner.id, type, val)}
                            onSelectStaff={onSelectStaff}
                            isCompact={true}
                            isDraggable={false}
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '2px 4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Plus size={12} />
                              <span>{runner.title}</span>
                            </div>
                            {isEditor && onRemoveRunnerSlot && (!runner.staffId || activeDepartment.runnerSlots.length > 1) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveRunnerSlot(activeDepartment.id, runner.id);
                                }}
                                style={{ color: 'var(--text-muted)', padding: 1, background: 'none', border: 'none', cursor: 'pointer' }}
                                title="Remove extra empty runner slot"
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rooms List */}
              <div className="dept-rooms-list" style={{ overflowY: 'visible', height: 'auto' }}>
                {activeDepartment.rooms.map(room => {
                  return (
                    <div key={room.id} className="room-row mobile-room-row">
                      {/* Room Number / Identifier */}
                      <div className="room-label" title={`Room ${room.name}`}>
                        {room.name}
                      </div>

                      {/* Slots inside Room */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: 3, alignItems: 'center', height: '100%', minWidth: 0 }}>
                        {room.slots
                          .filter((slot, idx) => idx === 0 || !!slot.staffId)
                          .map(slot => {
                            const assignedStaff = getStaffById(slot.staffId);
                            return (
                              <div
                                key={slot.id}
                                className={`room-slot-target ${!assignedStaff ? 'empty' : ''}`}
                                onClick={() => {
                                  if (!assignedStaff) {
                                    onSelectEmptySlot('room_slot', slot.id, `${activeDepartment.name} Room ${room.name}`);
                                  }
                                }}
                              >
                                {assignedStaff ? (
                                  <MagnetTile
                                    staff={assignedStaff}
                                    slotId={slot.id}
                                    slotType="room_slot"
                                    breakfastDone={slot.breakfastDone}
                                    lunchDone={slot.lunchDone}
                                    currentUserRole={currentUserRole}
                                    onToggleBreak={(type, val) => onToggleBreak('room_slot', slot.id, type, val)}
                                    onSelectStaff={onSelectStaff}
                                    isDraggable={false}
                                  />
                                ) : (
                                  <div className="room-empty-dock">
                                    <Plus size={11} />
                                    <span>Assign</span>
                                  </div>
                                )}
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
                  return (
                    <div
                      key={item.id}
                      className={`mobile-departure-row ${item.departed ? 'departed-struck' : ''}`}
                      onClick={() => onToggleDepartureStruck(item.id)}
                    >
                      <div className="mobile-order-badge">#{idx + 1}</div>
                      <div className="mobile-departure-info">
                        <span className="mobile-departure-name">{item.name}</span>
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
                    return (
                      <div
                        key={item.id}
                        className={`mobile-departure-row ${item.departed ? 'departed-struck' : ''}`}
                        onClick={() => onToggleDepartureStruck(item.id)}
                      >
                        <div className="mobile-order-badge">#{idx + 1}</div>
                        <div className="mobile-departure-info">
                          <span className="atypical-time-badge" style={{ marginRight: 6 }}>
                            {item.timeEstimate || '2p'}
                          </span>
                          <span className="mobile-departure-name">{item.name}</span>
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
                  return (
                    <div
                      key={item.id}
                      className={`mobile-departure-row ${item.departed ? 'departed-struck' : ''}`}
                      onClick={() => onToggleDepartureStruck(item.id)}
                    >
                      <div className="mobile-order-badge">#{idx + 1}</div>
                      <div className="mobile-departure-info">
                        <span className="mobile-departure-name">{item.name}</span>
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
                      <span className="mobile-call-doc-name">
                        {item.doctorName ? item.doctorName.toUpperCase() : '(Unassigned)'}
                      </span>
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
                const isAtypical = !['3p', '4p', '5p', '7p', '8p', '7p-7a'].includes(cat.toLowerCase());
                if ((isSpecial || isAtypical) && items.length === 0) return null;
                return (
                  <div key={cat} className="mobile-card mobile-lates-group-card">
                    <div className="mobile-lates-header">
                      <span className="mobile-lates-time-pill" style={(isSpecial || isAtypical) ? { background: '#2563eb', color: '#fff' } : undefined}>
                        {isSpecial ? 'SPECIAL SHIFT' : `${cat.toUpperCase()} SHIFT`}
                      </span>
                      <span className="mobile-lates-count">{items.length} Staff</span>
                    </div>

                    <div className="mobile-lates-tags-list">
                      {items.length === 0 ? (
                        <span className="mobile-lates-empty-note">None scheduled</span>
                      ) : (
                        items.map(item => (
                          <div key={item.id} className="mobile-late-staff-chip">
                            {isSpecial && (
                              <span className="atypical-time-badge" style={{ marginRight: 4 }}>
                                {item.timeEstimate || '2p'}
                              </span>
                            )}
                            <span className="mobile-late-chip-name">{item.name}</span>
                            {item.role && <span className="mobile-late-chip-role">{item.role}</span>}
                          </div>
                        ))
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
                            slotType="bullpen"
                            breakfastDone={breakStatus.breakfastDone}
                            lunchDone={breakStatus.lunchDone}
                            currentUserRole={currentUserRole}
                            onToggleBreak={(type, val) => onToggleBreak('bullpen', s.id, type, val)}
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
      </main>
    </div>
  );
};
