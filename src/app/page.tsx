'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BoardState, Staff, Department, UserRole, User } from '@/types/whiteboard';
import { HeaderNav } from '@/components/HeaderNav';
import { DepartmentGrid } from '@/components/DepartmentGrid';
import { RightSidebar } from '@/components/RightSidebar';
import { Bullpen } from '@/components/Bullpen';
import { PinPadModal } from '@/components/PinPadModal';
import { StaffModal } from '@/components/StaffModal';
import { SlotAssignModal } from '@/components/SlotAssignModal';
import { VoiceNoteModal } from '@/components/VoiceNoteModal';
import { VirtualKeyboard } from '@/components/VirtualKeyboard';
import { AdminModal } from '@/components/AdminModal';
import { AuditDrawer } from '@/components/AuditDrawer';

export default function WhiteboardPage() {
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'whiteboard' | 'dark'>('whiteboard');

  // Active User session (Defaults to basic_user for zero-login friction!)
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    displayName: string;
    role: UserRole;
  } | null>(null);

  // Modals
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [slotAssignTarget, setSlotAssignTarget] = useState<{
    type: 'room_slot' | 'runner_slot';
    id: string;
    label: string;
  } | null>(null);
  const [voiceNoteTarget, setVoiceNoteTarget] = useState<{
    type: 'room' | 'departure' | 'lates';
    id?: string;
    currentNotes: string;
  } | null>(null);
  const [isVirtualKeyboardOpen, setIsVirtualKeyboardOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize theme and load board
  useEffect(() => {
    const savedTheme = (localStorage.getItem('whiteboard_theme') as 'whiteboard' | 'dark') || 'whiteboard';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    const savedUser = localStorage.getItem('whiteboard_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {}
    }

    fetchBoardState();
  }, []);

  // Set up real-time SSE listener
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime');
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'BOARD_UPDATED') {
            fetchBoardState(false);
          }
        } catch {}
      };
    } catch (err) {
      console.error('SSE initialization error:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const fetchBoardState = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/board');
      const data = await res.json();
      if (data && data.departments) {
        setBoardState(data);
      }
    } catch (err) {
      console.error('Failed to load board state:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'whiteboard' ? 'dark' : 'whiteboard';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('whiteboard_theme', nextTheme);
  };

  const handleLoginSuccess = (user: { id: string; username: string; displayName: string; role: UserRole }) => {
    setCurrentUser(user);
    localStorage.setItem('whiteboard_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('whiteboard_user');
  };

  // User role helper
  const currentUserRole: UserRole = currentUser?.role || 'basic_user';

  // Find all assigned staff IDs across departments
  const assignedStaffIds = useMemo(() => {
    const set = new Set<string>();
    if (!boardState) return set;
    for (const dept of boardState.departments) {
      for (const r of dept.runnerSlots) {
        if (r.staffId) set.add(r.staffId);
      }
      for (const room of dept.rooms) {
        for (const slot of room.slots) {
          if (slot.staffId) set.add(slot.staffId);
        }
      }
    }
    return set;
  }, [boardState]);

  // 1. Break toggle (Basic User Allowed!)
  const handleToggleBreak = async (
    targetType: 'room_slot' | 'runner_slot',
    targetId: string,
    breakType: 'breakfast' | 'lunch',
    value: boolean
  ) => {
    // Optimistic UI update
    setBoardState(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      for (const dept of updated.departments) {
        if (targetType === 'runner_slot') {
          const r = dept.runnerSlots.find(slot => slot.id === targetId);
          if (r) {
            if (breakType === 'breakfast') r.breakfastDone = value;
            if (breakType === 'lunch') r.lunchDone = value;
            break;
          }
        } else {
          for (const room of dept.rooms) {
            const s = room.slots.find(slot => slot.id === targetId);
            if (s) {
              if (breakType === 'breakfast') s.breakfastDone = value;
              if (breakType === 'lunch') s.lunchDone = value;
              break;
            }
          }
        }
      }
      return updated;
    });

    try {
      await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_BREAK',
          payload: { targetType, targetId, breakType, value },
          user: currentUser || { role: 'basic_user', displayName: 'Staff (Basic User)' }
        })
      });
    } catch (err) {
      console.error('Error toggling break:', err);
      fetchBoardState(false);
    }
  };

  // 2. Assign staff to slot
  const handleAssignStaff = async (
    targetType: 'room_slot' | 'runner_slot',
    targetId: string,
    staffId: string
  ) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ASSIGN_STAFF',
          payload: { targetType, targetId, staffId },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Error assigning staff:', err);
    }
  };

  // 3. Move staff via drag & drop
  const handleDropStaff = async (
    fromData: { staffId: string; type: string; id?: string },
    toType: 'room_slot' | 'runner_slot',
    toId: string
  ) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MOVE_STAFF',
          payload: {
            fromTargetType: fromData.type,
            fromId: fromData.id,
            toTargetType: toType,
            toId: toId,
            staffId: fromData.staffId
          },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Error moving staff:', err);
    }
  };

  // 4. Return to Bullpen
  const handleDropToBullpen = async (fromData: { staffId: string; type: string; id?: string }) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MOVE_STAFF',
          payload: {
            fromTargetType: fromData.type,
            fromId: fromData.id,
            toTargetType: 'bullpen',
            staffId: fromData.staffId
          },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Error unassigning to bullpen:', err);
    }
  };

  // 5. Update Notes
  const handleSaveNotes = async (type: 'room' | 'departure' | 'lates', id: string | undefined, notes: string) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_NOTES',
          payload: { targetType: type, targetId: id, notes },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  };

  // 6. Update Departure or Lates lists
  const handleUpdateLists = async (departureList: any, latesList: any) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_LISTS',
          payload: { departureList, latesList },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Error updating lists:', err);
    }
  };

  // 7. Trigger Scraper Portal Sync
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TRIGGER_SYNC',
          currentUser: currentUser || { role: 'basic_user', displayName: 'Staff' }
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchBoardState(false);
      }
    } catch (err) {
      console.error('Scraper sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // 8. Superuser Layout actions
  const handleSaveDepartments = async (departments: Department[]) => {
    try {
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_LAYOUT',
          payload: { departments },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Error saving layout:', err);
    }
  };

  const handleResetToPhotoDefault = async () => {
    try {
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_TO_PHOTO_DEFAULT',
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  if (loading || !boardState) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'var(--bg-app)',
        color: 'var(--text-primary)'
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'var(--accent-primary)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: 22
        }}>
          OR
        </div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Loading Surgical Suite Whiteboard...</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Syncing rooms, runners, and staff roster</div>
      </div>
    );
  }

  return (
    <div className="whiteboard-container">
      {/* Top Navigation & Status Bar */}
      <HeaderNav
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenAudit={() => setIsAuditDrawerOpen(true)}
        onToggleKeyboard={() => setIsVirtualKeyboardOpen(prev => !prev)}
        isKeyboardOpen={isVirtualKeyboardOpen}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
        lastSyncTime={boardState.scraperConfig.lastSyncTime}
      />

      {/* Main Whiteboard Display Area */}
      <main className="board-main-area">
        {/* Left 8 Departments (Main OR, West Pav, Ortho, Village, 9th Floor, Endo, OB, IVF) */}
        <DepartmentGrid
          departments={boardState.departments}
          staff={boardState.staff}
          currentUserRole={currentUserRole}
          onToggleBreak={handleToggleBreak}
          onSelectStaff={staff => setSelectedStaff(staff)}
          onSelectEmptySlot={(type, id, label) => setSlotAssignTarget({ type, id, label })}
          onDropStaff={handleDropStaff}
          onOpenVoiceNotes={(type, id, currentNotes) => setVoiceNoteTarget({ type, id, currentNotes: currentNotes || '' })}
        />

        {/* Right 2 Columns: DEPARTURE & LATES */}
        <RightSidebar
          departureList={boardState.departureList}
          departureNotes={boardState.departureNotes}
          latesList={boardState.latesList}
          latesNotes={boardState.latesNotes}
          currentUserRole={currentUserRole}
          onUpdateDepartureNotes={notes => handleSaveNotes('departure', undefined, notes)}
          onUpdateLatesNotes={notes => handleSaveNotes('lates', undefined, notes)}
          onUpdateLists={handleUpdateLists}
          onOpenVoiceNotes={(type, notes) => setVoiceNoteTarget({ type, currentNotes: notes })}
          onTriggerSync={handleTriggerSync}
          isSyncing={isSyncing}
        />
      </main>

      {/* Bottom Bullpen (Alphabetical Staff Holding Bins) */}
      <Bullpen
        staff={boardState.staff}
        departments={boardState.departments}
        currentUserRole={currentUserRole}
        onSelectStaff={staff => setSelectedStaff(staff)}
        onOpenAddStaff={() => setIsAdminModalOpen(true)}
        onDropToBullpen={handleDropToBullpen}
      />

      {/* Modals & Slide-outs */}
      <PinPadModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <StaffModal
        staff={selectedStaff}
        departments={boardState.departments}
        currentUserRole={currentUserRole}
        onClose={() => setSelectedStaff(null)}
        onAssignToSlot={handleAssignStaff}
        onUnassign={staffId => handleDropToBullpen({ staffId, type: 'room_slot' })}
        onToggleBreak={handleToggleBreak}
      />

      <SlotAssignModal
        isOpen={!!slotAssignTarget}
        targetSlot={slotAssignTarget}
        staff={boardState.staff}
        assignedStaffIds={assignedStaffIds}
        currentUserRole={currentUserRole}
        onClose={() => setSlotAssignTarget(null)}
        onAssign={handleAssignStaff}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      <VoiceNoteModal
        isOpen={!!voiceNoteTarget}
        target={voiceNoteTarget}
        onClose={() => setVoiceNoteTarget(null)}
        onSaveNotes={handleSaveNotes}
        onOpenVirtualKeyboard={() => setIsVirtualKeyboardOpen(true)}
      />

      <VirtualKeyboard
        isOpen={isVirtualKeyboardOpen}
        onClose={() => setIsVirtualKeyboardOpen(false)}
        onInsertChar={char => {
          // If a note modal or scratchpad is open, we can send character
        }}
        onBackspace={() => {}}
        onClear={() => {}}
        onEnter={() => setIsVirtualKeyboardOpen(false)}
      />

      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUser={currentUser || { id: 'admin', username: 'admin', displayName: 'Admin', role: 'superuser' }}
        departments={boardState.departments}
        staff={boardState.staff}
        scraperConfig={boardState.scraperConfig}
        onSaveDepartments={handleSaveDepartments}
        onResetToPhotoDefault={handleResetToPhotoDefault}
        onRefreshData={() => fetchBoardState(false)}
      />

      <AuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
      />
    </div>
  );
}
