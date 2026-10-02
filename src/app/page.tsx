'use client';

import { apiUrl } from '@/lib/api';
import { getBrowserSupabase } from '@/lib/supabase';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BoardState, Staff, Department, UserRole, User, CallTeamItem, DepartureItem, LateShiftItem, StaffCredential } from '@/types/whiteboard';
import { HeaderNav } from '@/components/HeaderNav';
import { DepartmentGrid } from '@/components/DepartmentGrid';
import { RightSidebar } from '@/components/RightSidebar';
import { Bullpen } from '@/components/Bullpen';
import { BullpenSidebar } from '@/components/BullpenSidebar';
import { StaffUnassignModal } from '@/components/StaffUnassignModal';
import { PinPadModal } from '@/components/PinPadModal';
import { StaffModal } from '@/components/StaffModal';
import { SlotAssignModal } from '@/components/SlotAssignModal';
import { VoiceNoteModal } from '@/components/VoiceNoteModal';
import { VirtualKeyboard } from '@/components/VirtualKeyboard';
import { AdminModal } from '@/components/AdminModal';
import { AuditDrawer } from '@/components/AuditDrawer';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { MobileWhiteboardView } from '@/components/MobileWhiteboardView';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function WhiteboardPage() {
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'whiteboard' | 'dark'>('whiteboard');

  // Mobile responsive detection & manual toggle
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [forcedDesktop, setForcedDesktop] = useState(false);

  // Active User session (Defaults to basic_user for zero-login friction!)
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    displayName: string;
    role: UserRole;
  } | null>(null);

  // Layout screen real estate toggles
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isBullpenOpen, setIsBullpenOpen] = useState(true);
  const [isBullpenCollapsed, setIsBullpenCollapsed] = useState(false);

  // Accidental unassign routing prompt (Whiteboard -> Unassigned Staff)
  const [unassignPromptTarget, setUnassignPromptTarget] = useState<{
    staff: Staff;
    fromData: { staffId: string; type: string; id?: string };
    fromLocationName: string;
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
    type: 'room' | 'departure' | 'lates' | 'general';
    id?: string;
    currentNotes: string;
  } | null>(null);
  const [isVirtualKeyboardOpen, setIsVirtualKeyboardOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncWarningOpen, setIsSyncWarningOpen] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [isCleanBoardModalOpen, setIsCleanBoardModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Responsive mobile screen detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileScreen(window.innerWidth <= 850);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize Touch Drag-and-Drop Polyfill for touchscreen displays
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@dragdroptouch/drag-drop-touch')
        .then(({ enableDragDropTouch }) => {
          try {
            enableDragDropTouch(document, document, {
              forceListen: true,
              dragThresholdPixels: 5
            });
          } catch (err) {
            console.warn('Touch drag-drop polyfill error:', err);
          }
        })
        .catch(err => {
          console.warn('Could not load DragDropTouch module:', err);
        });
    }
  }, []);

  // Set up real-time board updates via Supabase Realtime (with SSE fallback)
  useEffect(() => {
    const supabase = getBrowserSupabase();

    // 1. If Supabase is configured in the environment, use Realtime WebSockets (<50ms sync)
    if (supabase) {
      const channel = supabase
        .channel('whiteboard-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'whiteboard',
            table: 'board_state',
          },
          (payload) => {
            if (payload.new && (payload.new as any).state && (payload.new as any).state.departments) {
              setBoardState((payload.new as any).state);
              setLoadError(null);
            } else {
              fetchBoardState(false);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    // 2. Fallback to SSE listener when running locally without Supabase keys
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(apiUrl('/api/realtime'));
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
      const res = await fetch(apiUrl('/api/board'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.departments) {
        setBoardState(data);
        setLoadError(null);
      } else {
        throw new Error('Incomplete data received');
      }
    } catch (err: any) {
      console.error('Failed to load board state:', err);
      setLoadError(err.message || 'Connection failed');
      // If we don't have board state yet, retry in 2.5 seconds
      setTimeout(() => {
        setBoardState(prev => {
          if (!prev) fetchBoardState(false);
          return prev;
        });
      }, 2500);
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
    targetType: 'room_slot' | 'runner_slot' | 'bullpen',
    targetId: string,
    breakType: 'breakfast' | 'lunch',
    value: boolean
  ) => {
    // Optimistic UI update
    setBoardState(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (targetType === 'bullpen') {
        const existing = updated.bullpenBreaks?.[targetId] || { breakfastDone: false, lunchDone: false };
        updated.bullpenBreaks = {
          ...(updated.bullpenBreaks || {}),
          [targetId]: {
            ...existing,
            ...(breakType === 'breakfast'
              ? { breakfastDone: value, breakfastTime: value ? new Date().toISOString() : null }
              : { lunchDone: value, lunchTime: value ? new Date().toISOString() : null })
          }
        };
        return updated;
      }
      for (const dept of updated.departments) {
        if (targetType === 'runner_slot') {
          const r = dept.runnerSlots.find(slot => slot.id === targetId);
          if (r) {
            if (breakType === 'breakfast') r.breakfastDone = value;
            if (breakType === 'lunch') r.lunchDone = value;
            if (r.staffId) {
              updated.bullpenBreaks = {
                ...(updated.bullpenBreaks || {}),
                [r.staffId]: {
                  breakfastDone: r.breakfastDone,
                  lunchDone: r.lunchDone,
                  breakfastTime: r.breakfastTime,
                  lunchTime: r.lunchTime
                }
              };
            }
            break;
          }
        } else {
          for (const room of dept.rooms) {
            const s = room.slots.find(slot => slot.id === targetId);
            if (s) {
              if (breakType === 'breakfast') s.breakfastDone = value;
              if (breakType === 'lunch') s.lunchDone = value;
              if (s.staffId) {
                updated.bullpenBreaks = {
                  ...(updated.bullpenBreaks || {}),
                  [s.staffId]: {
                    breakfastDone: s.breakfastDone,
                    lunchDone: s.lunchDone,
                    breakfastTime: s.breakfastTime,
                    lunchTime: s.lunchTime
                  }
                };
              }
              break;
            }
          }
        }
      }
      return updated;
    });

    try {
      await fetch(apiUrl('/api/board'), {
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
      const res = await fetch(apiUrl('/api/board'), {
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
    toType: 'room_slot' | 'runner_slot' | 'runner_dept',
    toId: string
  ) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/board'), {
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

  // Dynamic Runner Slot actions
  const handleAddRunnerSlot = async (departmentId: string) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_RUNNER_SLOT',
          payload: { departmentId },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Error adding runner slot:', err);
    }
  };

  const handleRemoveRunnerSlot = async (departmentId: string, runnerSlotId: string) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REMOVE_RUNNER_SLOT',
          payload: { departmentId, runnerSlotId },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Error removing runner slot:', err);
    }
  };

  // Toggle Departure Strikethrough
  const handleToggleDepartureStruck = async (id: string) => {
    // Optimistic UI update
    setBoardState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        departureList: prev.departureList.map(d => d.id === id ? { ...d, departed: !d.departed } : d)
      };
    });

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_DEPARTURE_STRUCK',
          payload: { id },
          user: currentUser || { role: 'basic_user', displayName: 'Staff' }
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Error toggling departure status:', err);
      fetchBoardState(false);
    }
  };

  // Update staff scheduled shift / late departure time
  const handleUpdateStaffShift = async (
    staffId: string,
    newShift: string,
    lastName?: string,
    credentials?: StaffCredential
  ) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STAFF_SHIFT',
          payload: { staffId, shift: newShift, lastName, credentials },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
        setSelectedStaff(prev => {
          if (!prev) return null;
          if (prev.id === staffId || (lastName && prev.lastName.toUpperCase() === lastName.toUpperCase())) {
            return { ...prev, shift: newShift };
          }
          return prev;
        });
        setToastMessage(`✓ Updated shift for ${lastName || 'Staff'} to ${newShift}`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error updating staff shift:', err);
    }
  };

  // 4a. Move staff directly to Bullpen (available for breaks & cases)
  const handleDropToBullpen = async (fromData: { staffId: string; type: string; id?: string }) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/board'), {
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
      console.error('Error placing staff in bullpen:', err);
    }
  };

  // 4b. Move staff directly to Unassigned Staff (leaving for day)
  const handleMoveStaffToUnassigned = async (
    staffId: string,
    fromData?: { type?: string; id?: string; targetGroup?: 'MD' | 'CRNA' | 'Infrequent' }
  ) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MOVE_STAFF',
          payload: {
            fromTargetType: fromData?.type || 'bullpen',
            fromId: fromData?.id,
            toTargetType: fromData?.targetGroup === 'Infrequent' ? 'infrequent' : (fromData?.targetGroup === 'MD' ? 'md' : (fromData?.targetGroup === 'CRNA' ? 'crna' : 'unassigned')),
            targetGroup: fromData?.targetGroup,
            staffId: staffId
          },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Error moving staff to unassigned:', err);
    }
  };

  // 4c. Set staff infrequent status
  const handleSetStaffInfrequent = async (staffId: string, isInfrequent: boolean) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_STAFF_INFREQUENT',
          payload: { staffId, isInfrequent },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Error setting staff infrequent:', err);
    }
  };

  // 4d. Dropped onto bottom "AVAILABLE UNASSIGNED STAFF" drawer:
  const handleDropToUnassignedDrawer = (fromData: { staffId: string; type: string; id?: string; targetGroup?: 'MD' | 'CRNA' | 'Infrequent' }) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    // If explicitly dropped into MD, CRNA, or Infrequent bin, apply immediately
    if (fromData.targetGroup || fromData.type === 'unassigned') {
      handleMoveStaffToUnassigned(fromData.staffId, fromData);
      return;
    }

    if (fromData.type === 'room_slot' || fromData.type === 'runner_slot') {
      const staffMember = boardState?.staff.find(s => s.id === fromData.staffId);
      let locName = 'Whiteboard';
      if (boardState) {
        for (const dept of boardState.departments) {
          if (fromData.type === 'runner_slot') {
            const runner = dept.runnerSlots.find(r => r.id === fromData.id);
            if (runner) {
              locName = `${dept.name} (${runner.title})`;
              break;
            }
          } else {
            for (const room of dept.rooms) {
              const slot = room.slots.find(s => s.id === fromData.id);
              if (slot) {
                locName = `${dept.name} Room ${room.name}`;
                break;
              }
            }
          }
        }
      }

      if (staffMember) {
        setUnassignPromptTarget({
          staff: staffMember,
          fromData,
          fromLocationName: locName
        });
        return;
      }
    }

    if (fromData.type === 'bullpen') {
      const staffMember = boardState?.staff.find(s => s.id === fromData.staffId);
      if (staffMember) {
        setUnassignPromptTarget({
          staff: staffMember,
          fromData,
          fromLocationName: 'Bullpen'
        });
        return;
      }
    }

    // Default: move directly to unassigned
    handleMoveStaffToUnassigned(fromData.staffId, fromData);
  };

  const handleConfirmUnassignToBullpen = async () => {
    if (!unassignPromptTarget) return;
    const { fromData } = unassignPromptTarget;
    setUnassignPromptTarget(null);
    await handleDropToBullpen(fromData);
  };

  const handleConfirmUnassignLeaving = async () => {
    if (!unassignPromptTarget) return;
    const { staff, fromData } = unassignPromptTarget;
    setUnassignPromptTarget(null);
    await handleMoveStaffToUnassigned(staff.id, fromData);
  };

  // 5. Update Notes
  const handleSaveNotes = async (type: 'room' | 'departure' | 'lates' | 'general', id: string | undefined, notes: string) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_NOTES',
          payload: { targetType: type === 'general' ? 'lates' : type, targetId: id, notes },
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
  const handleUpdateLists = async (departureList: DepartureItem[], latesList: LateShiftItem[], isReorder?: boolean) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_LISTS',
          payload: { departureList, latesList, isReorder },
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

  // 6b. Update Call Team list
  const handleUpdateCallTeam = async (callTeamList: CallTeamItem[]) => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_CALL_TEAM',
          payload: { callTeamList },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Error updating call team:', err);
    }
  };

  // 7. Trigger Scraper Portal Sync
  const executeTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(apiUrl('/api/scraper'), {
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
        setToastMessage('✓ Synchronized Departure, Lates, Call Team and Staff Roster!');
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.error('Scraper sync failed:', err);
      setToastMessage('Portal sync failed. Please check credentials or network.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // 7. Trigger Scraper Portal Sync
  const handleTriggerSync = async () => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    if (!boardState) {
      await executeTriggerSync();
      return;
    }

    // Check if changes have been made since last sync
    const lastSync = boardState.scraperConfig?.lastSyncTime
      ? new Date(boardState.scraperConfig.lastSyncTime).getTime()
      : 0;
    const lastUpdated = new Date(boardState.lastUpdated).getTime();

    // If modifications have occurred since last sync, warn user!
    if (lastUpdated > lastSync) {
      setIsSyncWarningOpen(true);
      return;
    }

    await executeTriggerSync();
  };

  // 7b. Trigger Auto-Assign of Magnets to Rooms and Runner Slots
  const handleAutoAssign = async () => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    setIsAutoAssigning(true);
    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'AUTO_ASSIGN_ROOMS',
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.success && data.state) {
        setBoardState(data.state);
        setToastMessage(`✓ Auto-assigned ${data.assignedCount || 0} staff magnets to department rooms and runner slots!`);
        setTimeout(() => setToastMessage(null), 4500);
      } else {
        setToastMessage(`Auto-assign error: ${data.error || 'Failed'}`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.error('Error auto-assigning rooms:', err);
      setToastMessage('Error auto-assigning staff magnets.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsAutoAssigning(false);
    }
  };

  // 7b. Clean Whiteboard for the new operating day
  const handleCleanWhiteboard = async () => {
    if (currentUserRole === 'basic_user') {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLEAR_WHITEBOARD',
          payload: {},
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
        setIsCleanBoardModalOpen(false);
        setToastMessage('✓ Whiteboard cleaned for new operating day');
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        setToastMessage(`Clear error: ${data.error || 'Failed'}`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error cleaning whiteboard:', err);
      setToastMessage('Error cleaning whiteboard.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // 8. Superuser Layout actions
  const handleSaveDepartments = async (departments: Department[]) => {
    try {
      const res = await fetch(apiUrl('/api/board'), {
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
      const res = await fetch(apiUrl('/api/board'), {
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
        color: 'var(--text-primary)',
        padding: 24,
        textAlign: 'center'
      }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: 'var(--accent-primary)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: 24,
          boxShadow: '0 4px 14px rgba(9, 105, 218, 0.35)'
        }}>
          OR
        </div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Loading Perfect Board...</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {loadError ? `Connection notice: ${loadError}. Reconnecting...` : 'Syncing rooms, runners, and staff roster...'}
        </div>
        {loadError && (
          <button
            type="button"
            onClick={() => fetchBoardState(true)}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              background: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              marginTop: 6
            }}
          >
            Retry Connection
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {isMobileScreen && !forcedDesktop ? (
        <MobileWhiteboardView
          boardState={boardState}
          currentUser={currentUser}
          currentUserRole={currentUserRole}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          onToggleBreak={handleToggleBreak}
          onSelectStaff={staff => setSelectedStaff(staff)}
          onSelectEmptySlot={(type, id, label) => setSlotAssignTarget({ type, id, label })}
          onToggleDepartureStruck={handleToggleDepartureStruck}
          onUpdateLists={handleUpdateLists}
          onUpdateCallTeam={handleUpdateCallTeam}
          onSaveNotes={handleSaveNotes}
          onOpenVoiceNotes={(type, id, currentNotes) => setVoiceNoteTarget({ type, id, currentNotes: currentNotes || '' })}
          onAddRunnerSlot={handleAddRunnerSlot}
          onRemoveRunnerSlot={handleRemoveRunnerSlot}
          onAutoAssign={handleAutoAssign}
          isAutoAssigning={isAutoAssigning}
          onSwitchToDesktop={() => setForcedDesktop(true)}
        />
      ) : (
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
            onOpenVoiceAi={() => setVoiceNoteTarget({ type: 'general', currentNotes: '' })}
            onAutoAssign={handleAutoAssign}
            isAutoAssigning={isAutoAssigning}
            onCleanWhiteboard={() => setIsCleanBoardModalOpen(true)}
            isSyncing={isSyncing}
            lastSyncTime={boardState.scraperConfig.lastSyncTime}
            isRightSidebarOpen={isRightSidebarOpen}
            onToggleRightSidebar={() => setIsRightSidebarOpen(prev => !prev)}
            isBullpenOpen={isBullpenOpen}
            onToggleBullpen={() => setIsBullpenOpen(prev => !prev)}
            bullpenCount={boardState.bullpenStaffIds?.length || 0}
            onSwitchToMobile={() => setForcedDesktop(false)}
          />

      {/* Main Whiteboard Display Area */}
      <main className="board-main-area">
        {/* Left Bullpen (Expandable left-sided vertical menu for available staff) */}
        {isBullpenOpen ? (
          <BullpenSidebar
            bullpenStaffIds={boardState.bullpenStaffIds || []}
            bullpenBreaks={boardState.bullpenBreaks || {}}
            staff={boardState.staff}
            currentUserRole={currentUserRole}
            onSelectStaff={staff => setSelectedStaff(staff)}
            onDropToBullpen={handleDropToBullpen}
            onMoveStaffToUnassigned={handleMoveStaffToUnassigned}
            onToggleCollapse={() => setIsBullpenOpen(false)}
            onToggleBreak={(breakType, staffId, currentValue) => handleToggleBreak('bullpen', staffId, breakType, currentValue)}
          />
        ) : (
          /* Expand Tab on Left Edge to slide Bullpen back open */
          <button
            type="button"
            className="bullpen-expand-tab"
            onClick={() => setIsBullpenOpen(true)}
            title="Show Bullpen (Available Staff for Breaks / Cases)"
          >
            <ChevronRight size={16} />
            <span className="bullpen-expand-tab-text">
              BULLPEN {(boardState.bullpenStaffIds?.length ?? 0) > 0 ? `(${boardState.bullpenStaffIds?.length})` : ''}
            </span>
          </button>
        )}

        {/* 8 Departments (Main OR, West Pav, Ortho, Village, 9th Floor, Endo, OB, IVF) */}
        <DepartmentGrid
          departments={boardState.departments}
          staff={boardState.staff}
          currentUserRole={currentUserRole}
          onToggleBreak={handleToggleBreak}
          onSelectStaff={staff => setSelectedStaff(staff)}
          onSelectEmptySlot={(type, id, label) => setSlotAssignTarget({ type, id, label })}
          onDropStaff={handleDropStaff}
          onOpenVoiceNotes={(type, id, currentNotes) => setVoiceNoteTarget({ type, id, currentNotes: currentNotes || '' })}
          onAddRunnerSlot={handleAddRunnerSlot}
          onRemoveRunnerSlot={handleRemoveRunnerSlot}
        />

        {/* Right 2 Columns: DEPARTURE & LATES (Can be hidden to the right) */}
        {isRightSidebarOpen ? (
          <RightSidebar
            departureList={boardState.departureList}
            callTeamList={boardState.callTeamList || []}
            departureNotes={boardState.departureNotes}
            latesList={boardState.latesList}
            latesNotes={boardState.latesNotes}
            currentUserRole={currentUserRole}
            staff={boardState.staff}
            onSelectStaff={staff => setSelectedStaff(staff)}
            onUpdateDepartureNotes={notes => handleSaveNotes('departure', undefined, notes)}
            onUpdateLatesNotes={notes => handleSaveNotes('lates', undefined, notes)}
            onUpdateLists={handleUpdateLists}
            onUpdateCallTeam={handleUpdateCallTeam}
            onOpenVoiceNotes={(type, notes) => setVoiceNoteTarget({ type, currentNotes: notes })}
            onToggleDepartureStruck={handleToggleDepartureStruck}
            onToggleCollapse={() => setIsRightSidebarOpen(false)}
          />
        ) : (
          /* Expand Tab on Right Edge to slide Departure & Lates back open */
          <button
            type="button"
            className="sidebar-expand-tab"
            onClick={() => setIsRightSidebarOpen(true)}
            title="Show Departure & Lates (Expand Whiteboard)"
          >
            <ChevronLeft size={16} />
            <span className="sidebar-expand-tab-text">DEPARTURE &amp; LATES</span>
          </button>
        )}
      </main>

      {/* Bottom Available Unassigned Staff (Alphabetical Staff Holding Bins - Collapsible to Bottom) */}
      <Bullpen
        staff={boardState.staff}
        departments={boardState.departments}
        bullpenStaffIds={boardState.bullpenStaffIds || []}
        bullpenBreaks={boardState.bullpenBreaks || {}}
        currentUserRole={currentUserRole}
        onSelectStaff={staff => setSelectedStaff(staff)}
        onOpenAddStaff={() => setIsAdminModalOpen(true)}
        onDropToBullpen={handleDropToUnassignedDrawer}
        onToggleBreak={(breakType, staffId, currentValue) => handleToggleBreak('bullpen', staffId, breakType, currentValue)}
        onSetStaffInfrequent={handleSetStaffInfrequent}
        isCollapsed={isBullpenCollapsed}
        onToggleCollapse={() => setIsBullpenCollapsed(prev => !prev)}
      />
        </div>
      )}

      {/* Modals & Slide-outs */}
      <PinPadModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <StaffModal
        staff={selectedStaff}
        departments={boardState.departments}
        bullpenStaffIds={boardState.bullpenStaffIds || []}
        bullpenBreaks={boardState.bullpenBreaks || {}}
        currentUserRole={currentUserRole}
        onClose={() => setSelectedStaff(null)}
        onAssignToSlot={handleAssignStaff}
        onMoveToBullpen={staffId => handleDropToBullpen({ staffId, type: 'room_slot' })}
        onUnassign={staffId => handleMoveStaffToUnassigned(staffId)}
        onToggleBreak={handleToggleBreak}
        onUpdateShift={handleUpdateStaffShift}
        onSetStaffInfrequent={handleSetStaffInfrequent}
        onOpenLogin={() => setIsLoginModalOpen(true)}
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
        uniqueSchedules={boardState.uniqueSchedules || []}
        onSaveDepartments={handleSaveDepartments}
        onResetToPhotoDefault={handleResetToPhotoDefault}
        onRefreshData={() => fetchBoardState(false)}
      />

      <AuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
      />

      {/* Portal Sync Overwrite Warning Modal */}
      <ConfirmDeleteModal
        isOpen={isSyncWarningOpen}
        title="Sync Portal Warning"
        itemName="Manual Changes Detected"
        itemCategory="External Portal Sync"
        message="Manual modifications have been made to the whiteboard (assignments, departures, or call team) since the last sync. Synchronizing now will fetch the external portal schedule and may replace or reorder your manual adjustments. Do you want to proceed?"
        confirmButtonText="Overwrite & Sync Now"
        cancelButtonText="Cancel (Keep Changes)"
        onConfirm={async () => {
          setIsSyncWarningOpen(false);
          await executeTriggerSync();
        }}
        onClose={() => setIsSyncWarningOpen(false)}
      />

      {/* Clean Whiteboard Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isCleanBoardModalOpen}
        title="Clean Whiteboard for New Day"
        itemName="All Room & Runner Magnets"
        itemCategory="Whiteboard Reset"
        message="Are you sure you want to clean the whiteboard? All magnets will be cleared from rooms and runner slots into unassigned status so you can start fresh or run Auto-Assign."
        confirmButtonText="Clean Whiteboard"
        cancelButtonText="Cancel"
        onConfirm={handleCleanWhiteboard}
        onClose={() => setIsCleanBoardModalOpen(false)}
      />

      {/* Staff Unassign / Availability Routing Modal */}
      <StaffUnassignModal
        isOpen={!!unassignPromptTarget}
        staff={unassignPromptTarget?.staff || null}
        fromLocationName={unassignPromptTarget?.fromLocationName}
        onSendToBullpen={handleConfirmUnassignToBullpen}
        onMarkLeaving={handleConfirmUnassignLeaving}
        onClose={() => setUnassignPromptTarget(null)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 50,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: 'var(--surface-card)',
            color: 'var(--text-primary)',
            padding: '10px 20px',
            borderRadius: 8,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.28)',
            border: '1.5px solid var(--accent-primary)',
            fontWeight: 700,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 2,
              fontWeight: 800
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};
