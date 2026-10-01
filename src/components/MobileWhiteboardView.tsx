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
  AlertCircle
} from 'lucide-react';

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

  // Departure list partitioned
  const postCallDepartures = useMemo(() => {
    return (boardState.departureList || [])
      .filter(d => d.category === 'post_call')
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [boardState.departureList]);

  const nonCallDepartures = useMemo(() => {
    return (boardState.departureList || [])
      .filter(d => d.category !== 'post_call')
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [boardState.departureList]);

  // Lates grouped by shift category
  const timeCategories = ['4p', '5p', '7p', '8p', '7p-7a'];
  const latesGrouped = useMemo(() => {
    const grouped: Record<string, LateShiftItem[]> = {};
    timeCategories.forEach(cat => {
      grouped[cat] = [];
    });
    (boardState.latesList || []).forEach(item => {
      if (!grouped[item.timeCategory]) {
        grouped[item.timeCategory] = [];
      }
      grouped[item.timeCategory].push(item);
    });
    return grouped;
  }, [boardState.latesList]);

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

  return (
    <div className="mobile-whiteboard-root">
      {/* 1. Mobile Top Compact Header */}
      <header className="mobile-top-header">
        <div className="mobile-header-brand">
          <div className="mobile-brand-icon">OR</div>
          <div className="mobile-brand-text">
            <span className="mobile-brand-title">WHITEBOARD</span>
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

      {/* Quick Horizontal Pill Tabs for Fast Thumb Switching */}
      <div className="mobile-pills-scroll-container">
        {navViews.map((item) => {
          const isActive = item.key === selectedView;
          return (
            <button
              key={item.key}
              type="button"
              className={`mobile-pill-btn ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedView(item.key)}
            >
              {item.shortLabel}
            </button>
          );
        })}
      </div>

      {/* 3. Dynamic Screen Content based on Selected View */}
      <main className="mobile-main-content">
        {/* ======================= VIEW A: DEPARTMENT SCREEN ======================= */}
        {activeDepartment && (
          <div className="mobile-screen-container">
            {/* Department Summary Header Card */}
            <div className="mobile-card mobile-dept-header-card">
              <div className="mobile-dept-title-row">
                <div>
                  <h1 className="mobile-dept-heading">{activeDepartment.name}</h1>
                  <span className="mobile-dept-subtext">
                    {activeDepartment.rooms.filter(r => r.slots.some(s => !!s.staffId)).length} of {activeDepartment.rooms.length} Rooms Assigned
                  </span>
                </div>
                {isEditor && onAddRunnerSlot && (
                  <button
                    type="button"
                    className="mobile-action-sm-btn"
                    onClick={() => onAddRunnerSlot(activeDepartment.id)}
                    title="Add extra runner slot to this department"
                  >
                    <Plus size={14} />
                    <span>Runner</span>
                  </button>
                )}
              </div>

              {/* Runners Section */}
              <div className="mobile-runners-section">
                <div className="mobile-section-label">Department Runners</div>
                <div className="mobile-runners-list">
                  {activeDepartment.runnerSlots.map(runner => {
                    const assignedStaff = getStaffById(runner.staffId);
                    return (
                      <div key={runner.id} className="mobile-runner-item">
                        <div className="mobile-runner-title-row">
                          <span className="mobile-runner-title">{runner.title}</span>
                          {isEditor && onRemoveRunnerSlot && (!runner.staffId || activeDepartment.runnerSlots.length > 1) && (
                            <button
                              type="button"
                              onClick={() => onRemoveRunnerSlot(activeDepartment.id, runner.id)}
                              className="mobile-icon-btn text-muted"
                              title="Remove extra runner slot"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {assignedStaff ? (
                          <div className="mobile-staff-assigned-box">
                            <div 
                              className="mobile-staff-info-row"
                              onClick={() => onSelectStaff(assignedStaff)}
                            >
                              <span className="mobile-staff-name">
                                {assignedStaff.lastName.toUpperCase()}, {assignedStaff.firstName}
                              </span>
                              <span className={`mobile-cred-badge ${getCredBadgeClass(assignedStaff.credentials)}`}>
                                {assignedStaff.credentials}
                              </span>
                            </div>

                            {/* Touch-Friendly Break Buttons */}
                            <div className="mobile-breaks-row">
                              <button
                                type="button"
                                className={`mobile-break-touch-btn ${runner.breakfastDone ? 'done' : ''}`}
                                onClick={() => onToggleBreak('runner_slot', runner.id, 'breakfast', !runner.breakfastDone)}
                              >
                                <span className="mobile-break-status-icon">{runner.breakfastDone ? '✓' : '○'}</span>
                                <span>Breakfast</span>
                              </button>

                              <button
                                type="button"
                                className={`mobile-break-touch-btn ${runner.lunchDone ? 'done' : ''}`}
                                onClick={() => onToggleBreak('runner_slot', runner.id, 'lunch', !runner.lunchDone)}
                              >
                                <span className="mobile-break-status-icon">{runner.lunchDone ? '✓' : '○'}</span>
                                <span>Lunch</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="mobile-empty-slot-btn"
                            onClick={() => onSelectEmptySlot('runner_slot', runner.id, `${activeDepartment.name} Runner (${runner.title})`)}
                          >
                            <Plus size={14} />
                            <span>Assign {runner.title}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Rooms Vertical Roster */}
            <div className="mobile-rooms-container">
              <div className="mobile-section-label">Operating Rooms ({activeDepartment.rooms.length})</div>
              {activeDepartment.rooms.map(room => {
                return (
                  <div key={room.id} className="mobile-card mobile-room-card">
                    {/* Room Title Header */}
                    <div className="mobile-room-header">
                      <div className="mobile-room-badge">
                        ROOM {room.name}
                      </div>
                      {room.notes && (
                        <span className="mobile-room-note-indicator" title={room.notes}>
                          📝 {room.notes}
                        </span>
                      )}
                    </div>

                    {/* Room Slots */}
                    <div className="mobile-room-slots">
                      {room.slots.map(slot => {
                        const assignedStaff = getStaffById(slot.staffId);
                        return (
                          <div key={slot.id} className="mobile-slot-item">
                            {assignedStaff ? (
                              <div className="mobile-slot-assigned">
                                <div 
                                  className="mobile-staff-info-row"
                                  onClick={() => onSelectStaff(assignedStaff)}
                                >
                                  <div>
                                    <span className="mobile-staff-name">
                                      {assignedStaff.lastName.toUpperCase()}, {assignedStaff.firstName}
                                    </span>
                                    {assignedStaff.phone && (
                                      <div className="mobile-staff-phone">
                                        <Phone size={11} />
                                        <span>{assignedStaff.phone}</span>
                                      </div>
                                    )}
                                  </div>
                                  <span className={`mobile-cred-badge ${getCredBadgeClass(assignedStaff.credentials)}`}>
                                    {assignedStaff.credentials}
                                  </span>
                                </div>

                                {/* Touch-Friendly Break Buttons */}
                                <div className="mobile-breaks-row">
                                  <button
                                    type="button"
                                    className={`mobile-break-touch-btn ${slot.breakfastDone ? 'done' : ''}`}
                                    onClick={() => onToggleBreak('room_slot', slot.id, 'breakfast', !slot.breakfastDone)}
                                    title={`Breakfast: ${slot.breakfastDone ? 'Completed' : 'Pending'}`}
                                  >
                                    <span className="mobile-break-status-icon">{slot.breakfastDone ? '✓' : '○'}</span>
                                    <span>Breakfast</span>
                                  </button>

                                  <button
                                    type="button"
                                    className={`mobile-break-touch-btn ${slot.lunchDone ? 'done' : ''}`}
                                    onClick={() => onToggleBreak('room_slot', slot.id, 'lunch', !slot.lunchDone)}
                                    title={`Lunch: ${slot.lunchDone ? 'Completed' : 'Pending'}`}
                                  >
                                    <span className="mobile-break-status-icon">{slot.lunchDone ? '✓' : '○'}</span>
                                    <span>Lunch</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="mobile-empty-slot-btn"
                                onClick={() => onSelectEmptySlot('room_slot', slot.id, `${activeDepartment.name} Room ${room.name}`)}
                              >
                                <Plus size={14} />
                                <span>Assign Staff to Room {room.name}</span>
                              </button>
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
                  <div key={item.id} className="mobile-card mobile-call-card">
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
                        {item.doctorName ? 'Assigned On-Call' : 'Pending Assignment'}
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
              {timeCategories.map(cat => {
                const items = latesGrouped[cat] || [];
                return (
                  <div key={cat} className="mobile-card mobile-lates-group-card">
                    <div className="mobile-lates-header">
                      <span className="mobile-lates-time-pill">{cat.toUpperCase()} SHIFT</span>
                      <span className="mobile-lates-count">{items.length} Staff</span>
                    </div>

                    <div className="mobile-lates-tags-list">
                      {items.length === 0 ? (
                        <span className="mobile-lates-empty-note">None scheduled</span>
                      ) : (
                        items.map(item => (
                          <div key={item.id} className="mobile-late-staff-chip">
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
                (boardState.bullpenStaffIds || []).map(staffId => {
                  const staffMember = getStaffById(staffId);
                  if (!staffMember) return null;
                  const breakStatus = boardState.bullpenBreaks?.[staffId] || { breakfastDone: false, lunchDone: false };

                  return (
                    <div key={staffId} className="mobile-card mobile-bullpen-staff-card">
                      <div 
                        className="mobile-staff-info-row"
                        onClick={() => onSelectStaff(staffMember)}
                      >
                        <div>
                          <span className="mobile-staff-name">
                            {staffMember.lastName.toUpperCase()}, {staffMember.firstName}
                          </span>
                          {staffMember.phone && (
                            <div className="mobile-staff-phone">
                              <Phone size={11} />
                              <span>{staffMember.phone}</span>
                            </div>
                          )}
                        </div>
                        <span className={`mobile-cred-badge ${getCredBadgeClass(staffMember.credentials)}`}>
                          {staffMember.credentials}
                        </span>
                      </div>

                      {/* Touch-Friendly Break Buttons */}
                      <div className="mobile-breaks-row">
                        <button
                          type="button"
                          className={`mobile-break-touch-btn ${breakStatus.breakfastDone ? 'done' : ''}`}
                          onClick={() => onToggleBreak('bullpen', staffId, 'breakfast', !breakStatus.breakfastDone)}
                        >
                          <span className="mobile-break-status-icon">{breakStatus.breakfastDone ? '✓' : '○'}</span>
                          <span>Breakfast</span>
                        </button>

                        <button
                          type="button"
                          className={`mobile-break-touch-btn ${breakStatus.lunchDone ? 'done' : ''}`}
                          onClick={() => onToggleBreak('bullpen', staffId, 'lunch', !breakStatus.lunchDone)}
                        >
                          <span className="mobile-break-status-icon">{breakStatus.lunchDone ? '✓' : '○'}</span>
                          <span>Lunch</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
