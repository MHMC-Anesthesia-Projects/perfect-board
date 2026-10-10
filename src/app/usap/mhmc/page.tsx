'use client';

import { apiUrl } from '@/lib/api';
import { getBrowserSupabase, getPublicBrowserSupabase, PERFECT_BOARD_SCHEMA } from '@/lib/supabase';
import { getHoustonDateString } from '@/lib/dateUtils';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BoardState, Staff, Department, RoomSlot, UserRole, User, CallTeamItem, DepartureItem, LateShiftItem, StaffCredential, ReliefAssignment, AuditLogEntry, BoardLayoutConfig, DEFAULT_LAYOUT_CONFIG } from '@/types/whiteboard';
import { HeaderNav } from '@/components/HeaderNav';
import { DepartmentGrid } from '@/components/DepartmentGrid';
import { RightSidebar } from '@/components/RightSidebar';
import { Bullpen } from '@/components/Bullpen';
import { BullpenSidebar } from '@/components/BullpenSidebar';
import { StaffUnassignModal } from '@/components/StaffUnassignModal';
import { PinPadModal } from '@/components/PinPadModal';
import { StaffModal } from '@/components/StaffModal';
import { SlotAssignModal } from '@/components/SlotAssignModal';
import { ReliefModal } from '@/components/ReliefModal';
import { ReliefConflictModal } from '@/components/ReliefConflictModal';
import { ReliefTextModal } from '@/components/ReliefTextModal';
import { VoiceNoteModal } from '@/components/VoiceNoteModal';
import { VirtualKeyboard } from '@/components/VirtualKeyboard';
import { AdminModal } from '@/components/AdminModal';
import { AuditDrawer } from '@/components/AuditDrawer';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { MobileWhiteboardView } from '@/components/MobileWhiteboardView';
import { ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';

interface UndoItem {
  id: string;
  timestamp: number;
  description: string;
  collisionCheck?: (state: BoardState) => string | null;
  executeUndo: () => Promise<void>;
}

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
  // Deferred action when prompting auth for view_only users
  const [pendingAction, setPendingAction] = useState<
    | { type: 'select_staff'; staff: Staff }
    | { type: 'toggle_break'; targetType: 'room_slot' | 'runner_slot' | 'bullpen'; targetId: string; breakType: 'breakfast' | 'lunch'; value: boolean }
    | null
  >(null);
  const [slotAssignTarget, setSlotAssignTarget] = useState<{
    type: 'room_slot' | 'runner_slot';
    id: string;
    label: string;
    roomId?: string;
    currentFutureTime?: string | null;
    currentRelief?: ReliefAssignment | null;
  } | null>(null);
  const [pendingReliefMovePrompt, setPendingReliefMovePrompt] = useState<{
    fromData: { staffId: string; type: string; id?: string };
    toType: 'room_slot' | 'runner_slot' | 'runner_dept' | 'bullpen' | 'unassigned';
    toId?: string;
    targetGroup?: 'MD' | 'CRNA' | 'Infrequent';
    staffName: string;
    sourceRoomName: string;
    reliefStaffName: string;
    reliefTime?: string;
    isRedBox?: boolean;
  } | null>(null);
  const [reliefTarget, setReliefTarget] = useState<{
    type: 'room_slot' | 'runner_slot';
    id: string;
    roomName: string;
    departmentName: string;
    currentStaff: Staff | null;
    currentRelief?: ReliefAssignment | null;
  } | null>(null);
  const [isReliefTextModalOpen, setIsReliefTextModalOpen] = useState(false);
  const [isCompletingAllReliefs, setIsCompletingAllReliefs] = useState(false);
  const [isCompleteReliefConfirmOpen, setIsCompleteReliefConfirmOpen] = useState(false);
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
  const [isClearNotesModalOpen, setIsClearNotesModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Undo / Mistake Resolution System (Layers 1 & 2)
  const [undoStack, setUndoStack] = useState<UndoItem[]>([]);
  const [activeUndoToast, setActiveUndoToast] = useState<{ id: string; description: string } | null>(null);

  // Auto-dismiss floating toast notifications after 3.5 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Layer 1: Auto-dismiss quick undo toast banner after 8 seconds
  useEffect(() => {
    if (!activeUndoToast) return;
    const timer = setTimeout(() => {
      setActiveUndoToast(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [activeUndoToast]);

  // Lock body scroll on the whiteboard page to prevent touchscreen bouncing
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Guard to prevent undo operations from recording their inverse action as a new step
  const isExecutingUndoRef = useRef(false);

  // Push an undoable action to the in-session stack
  const pushUndoAction = useCallback((
    description: string,
    executeUndo: () => Promise<void>,
    collisionCheck?: (state: BoardState) => string | null
  ) => {
    // If an undo operation is currently executing, do NOT push this onto the undo stack!
    if (isExecutingUndoRef.current) {
      return;
    }

    const id = `undo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newItem: UndoItem = {
      id,
      timestamp: Date.now(),
      description,
      collisionCheck,
      executeUndo
    };

    setUndoStack(prev => [newItem, ...prev.slice(0, 9)]); // Max 10 in-session stack
    setActiveUndoToast({ id, description });
  }, []);

  // Execute undo action with collision detection
  const handleExecuteUndo = useCallback(async (targetId?: string | unknown) => {
    if (isExecutingUndoRef.current) {
      return;
    }

    // If called directly as an event listener or from a button click, targetId might be a React SyntheticEvent
    const validTargetId = typeof targetId === 'string' ? targetId : undefined;

    setUndoStack(prevStack => {
      if (prevStack.length === 0) {
        setToastMessage('Nothing to undo');
        return prevStack;
      }

      const itemToUndo = validTargetId ? prevStack.find(item => item.id === validTargetId) : prevStack[0];
      if (!itemToUndo) {
        setToastMessage('Nothing to undo');
        return prevStack;
      }

      // Collision check against latest boardState
      if (boardState && itemToUndo.collisionCheck) {
        const collisionError = itemToUndo.collisionCheck(boardState);
        if (collisionError) {
          setToastMessage(`⚠️ Cannot undo: ${collisionError}`);
          setActiveUndoToast(null);
          return prevStack.filter(item => item.id !== itemToUndo.id);
        }
      }

      // Lock pushUndoAction so this undo operation does NOT add a new item back onto the undo stack!
      isExecutingUndoRef.current = true;

      // Execute inverse operation asynchronously
      itemToUndo.executeUndo()
        .then(() => {
          setToastMessage(`✓ Undone: ${itemToUndo.description}`);
        })
        .catch(err => {
          console.error('Failed to execute undo:', err);
          setToastMessage(`Failed to undo: ${itemToUndo.description}`);
        })
        .finally(() => {
          setTimeout(() => {
            isExecutingUndoRef.current = false;
          }, 300);
        });

      const remainingStack = prevStack.filter(item => item.id !== itemToUndo.id);

      // If there are still items on the undo stack, update the quick undo toast to show the next item!
      if (remainingStack.length > 0) {
        setActiveUndoToast({
          id: remainingStack[0].id,
          description: remainingStack[0].description
        });
      } else {
        setActiveUndoToast(null);
      }

      return remainingStack;
    });
  }, [boardState]);

  // Layer 2: Keyboard shortcut for Undo (Cmd+Z / Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return; // Allow native text undo inside inputs
        }
        e.preventDefault();
        handleExecuteUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExecuteUndo]);

  // Layer 3: Audit Ledger Revert Handler
  const handleRevertAuditLog = async (log: AuditLogEntry) => {
    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REVERT_ACTION',
          payload: { logId: log.id, logEntry: log },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
        setToastMessage(`✓ Reverted: ${log.actionType.replace(/_/g, ' ')}`);
      } else if (data.error) {
        setToastMessage(`Cannot revert: ${data.error}`);
      }
    } catch (err) {
      console.error('Error reverting audit log entry:', err);
      setToastMessage('Error reverting action.');
    }
  };

  // Perfect Call Messaging & Unread Counts
  const [unreadCountsByPhone, setUnreadCountsByPhone] = useState<Record<string, number>>({});

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
              dragThresholdPixels: 5,
              contextMenuDelayMS: 3000
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

  // Global Drag Cleanup: Ensure body.dragging-staff and .drag-over are cleared if drag ends anywhere
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('dragging-staff');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      }
      if (typeof window !== 'undefined') {
        (window as any).__activeDraggedStaff = null;
      }
    };
    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('drop', handleGlobalDragEnd);
    window.addEventListener('mouseup', handleGlobalDragEnd);
    window.addEventListener('touchend', handleGlobalDragEnd);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('drop', handleGlobalDragEnd);
      window.removeEventListener('mouseup', handleGlobalDragEnd);
      window.removeEventListener('touchend', handleGlobalDragEnd);
    };
  }, []);

  // Set up real-time board updates via Supabase Realtime (with heartbeat and visibility sync)
  useEffect(() => {
    const supabase = getBrowserSupabase();
    let channel: any = null;

    // 1. If Supabase is configured in the environment, use Realtime WebSockets (<50ms sync)
    if (supabase) {
      channel = supabase
        .channel('perfect-board-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: PERFECT_BOARD_SCHEMA,
            table: 'board_state',
          },
          (payload) => {
            if ((payload.new as any)?.id === 'system_users') {
              return;
            }
            if (payload.new && (payload.new as any).state && (payload.new as any).state.departments) {
              setBoardState((payload.new as any).state);
              setLoadError(null);
            } else {
              fetchBoardState(false);
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[Realtime] WebSocket channel error:', err);
          }
        });
    }

    // 2. Active tab / phone unlock re-sync: refresh whenever user returns to screen
    const handleVisibilitySync = () => {
      if (document.visibilityState === 'visible') {
        fetchBoardState(false);
      }
    };
    window.addEventListener('visibilitychange', handleVisibilitySync);
    window.addEventListener('focus', handleVisibilitySync);

    // 3. Gentle 15-second background heartbeat to guarantee zero-drift sync
    const heartbeatInterval = setInterval(() => {
      fetchBoardState(false);
    }, 15000);

    // 4. Fallback to SSE listener when running locally without Supabase keys
    let eventSource: EventSource | null = null;
    if (!supabase) {
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
    }

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
      if (eventSource) {
        eventSource.close();
      }
      window.removeEventListener('visibilitychange', handleVisibilitySync);
      window.removeEventListener('focus', handleVisibilitySync);
      clearInterval(heartbeatInterval);
    };
  }, []);

  // Monitor unread incoming messages from clinical staff on Perfect Call
  const fetchUnreadMessages = useCallback(async () => {
    if (!boardState?.messagingConfig?.enabled) {
      setUnreadCountsByPhone({});
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/messages?action=get_unread_summary'));
      const data = await res.json();
      if (data?.unreadByPhone) {
        const counts: Record<string, number> = {};
        for (const [phone, info] of Object.entries<any>(data.unreadByPhone)) {
          if (info?.count > 0) {
            counts[phone] = info.count;
          }
        }
        setUnreadCountsByPhone(counts);
      }
    } catch (err) {
      console.warn('Error fetching unread messages summary:', err);
    }
  }, [boardState?.messagingConfig?.enabled]);

  useEffect(() => {
    if (!boardState?.messagingConfig?.enabled) {
      setUnreadCountsByPhone({});
      return;
    }

    fetchUnreadMessages();
    const interval = setInterval(fetchUnreadMessages, 10000);

    const pubSupabase = getPublicBrowserSupabase();
    let channel: any = null;

    if (pubSupabase) {
      channel = pubSupabase
        .channel('board-messages-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'board_messages'
          },
          () => {
            fetchUnreadMessages();
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (pubSupabase && channel) {
        pubSupabase.removeChannel(channel);
      }
    };
  }, [boardState?.messagingConfig?.enabled, fetchUnreadMessages]);

  const handleChatRead = (staffPhone: string) => {
    const clean = staffPhone.replace(/\D/g, '').slice(-10);
    setUnreadCountsByPhone(prev => {
      if (!prev[clean]) return prev;
      const next = { ...prev };
      delete next[clean];
      return next;
    });
  };

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
    setToastMessage(`Welcome, ${user.displayName} (${user.role.replace('_', ' ').toUpperCase()})`);

    // Execute any pending action deferred during view_only state
    if (pendingAction) {
      if (pendingAction.type === 'select_staff') {
        setSelectedStaff(pendingAction.staff);
      } else if (pendingAction.type === 'toggle_break') {
        executeToggleBreak(
          pendingAction.targetType,
          pendingAction.targetId,
          pendingAction.breakType,
          pendingAction.value,
          user
        );
      }
      setPendingAction(null);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('whiteboard_user');
    setToastMessage('Logged out to View Only mode.');
  };

  // User role helper - defaults to view_only access
  const currentUserRole: UserRole = currentUser?.role || 'view_only';
  const isEditor = currentUserRole === 'board_runner' || currentUserRole === 'admin' || currentUserRole === 'superuser';

  const handleSelectStaff = (staff: Staff) => {
    if (currentUserRole === 'view_only') {
      setPendingAction({ type: 'select_staff', staff });
      setIsLoginModalOpen(true);
      return;
    }
    setSelectedStaff(staff);
  };

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

  // Active runners across all departments (runners cannot be in the bullpen)
  const activeRunnerStaffIds = useMemo(() => {
    const set = new Set<string>();
    if (!boardState?.departments) return set;
    for (const dept of boardState.departments) {
      for (const r of dept.runnerSlots || []) {
        if (r.staffId) set.add(r.staffId);
      }
    }
    return set;
  }, [boardState?.departments]);

  // Active relief clinicians assigned to any room or runner slot
  const activeReliefStaffIds = useMemo(() => {
    const set = new Set<string>();
    if (!boardState?.departments) return set;
    for (const dept of boardState.departments) {
      for (const room of dept.rooms) {
        for (const slot of room.slots) {
          if (slot.relief?.staffId) set.add(slot.relief.staffId);
        }
      }
      for (const r of dept.runnerSlots || []) {
        if (r.relief?.staffId) set.add(r.relief.staffId);
      }
    }
    return set;
  }, [boardState?.departments]);

  // Bullpen staff strictly excluding any active runners
  const effectiveBullpenStaffIds = useMemo(() => {
    return (boardState?.bullpenStaffIds || []).filter(id => !activeRunnerStaffIds.has(id));
  }, [boardState?.bullpenStaffIds, activeRunnerStaffIds]);

  // Board state with filtered bullpen for child components
  const effectiveBoardState = useMemo(() => {
    if (!boardState) return boardState;
    return {
      ...boardState,
      bullpenStaffIds: effectiveBullpenStaffIds
    };
  }, [boardState, effectiveBullpenStaffIds]);

  // Count total scheduled reliefs across all department room slots
  const totalScheduledReliefsCount = useMemo(() => {
    if (!boardState) return 0;
    let count = 0;
    for (const dept of boardState.departments) {
      for (const room of dept.rooms) {
        for (const slot of room.slots) {
          if (slot.relief?.staffId) count++;
        }
      }
    }
    return count;
  }, [boardState]);

  // 1. Break toggle (Basic User Allowed!)
  const executeToggleBreak = async (
    targetType: 'room_slot' | 'runner_slot' | 'bullpen',
    targetId: string,
    breakType: 'breakfast' | 'lunch',
    value: boolean,
    actingUser = currentUser
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
          user: actingUser || { role: 'basic_user', displayName: 'Staff (Basic User)' }
        })
      });

      // Find staff name for undo description
      let targetStaffName = 'Staff';
      if (boardState) {
        if (targetType === 'bullpen') {
          const st = boardState.staff.find(s => s.id === targetId);
          if (st) targetStaffName = st.lastName;
        } else if (targetType === 'runner_slot') {
          for (const dept of boardState.departments) {
            const r = dept.runnerSlots?.find(slot => slot.id === targetId);
            if (r?.staffId) {
              const st = boardState.staff.find(s => s.id === r.staffId);
              if (st) { targetStaffName = st.lastName; break; }
            }
          }
        } else {
          for (const dept of boardState.departments) {
            for (const room of dept.rooms) {
              const s = room.slots.find(slot => slot.id === targetId);
              if (s?.staffId) {
                const st = boardState.staff.find(staff => staff.id === s.staffId);
                if (st) { targetStaffName = st.lastName; break; }
              }
            }
          }
        }
      }

      pushUndoAction(
        `Marked ${breakType} break as ${value ? 'Done' : 'Not Done'} for ${targetStaffName}`,
        async () => {
          await executeToggleBreak(targetType, targetId, breakType, !value, actingUser);
        }
      );
    } catch (err) {
      console.error('Error toggling break:', err);
      fetchBoardState(false);
    }
  };

  const handleToggleBreak = async (
    targetType: 'room_slot' | 'runner_slot' | 'bullpen',
    targetId: string,
    breakType: 'breakfast' | 'lunch',
    value: boolean
  ) => {
    if (currentUserRole === 'view_only') {
      setPendingAction({
        type: 'toggle_break',
        targetType,
        targetId,
        breakType,
        value
      });
      setIsLoginModalOpen(true);
      return;
    }
    await executeToggleBreak(targetType, targetId, breakType, value, currentUser);
  };

  const handleUpdateMagnetNote = async (staffId: string, note: string) => {
    const cleanNote = (note || '').trim().slice(0, 15);

    // Optimistic UI update
    setBoardState(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      const nextNotes = { ...(updated.magnetNotes || {}) };
      if (cleanNote) {
        nextNotes[staffId] = cleanNote;
      } else {
        delete nextNotes[staffId];
      }
      updated.magnetNotes = nextNotes;
      if (updated.staff) {
        updated.staff = updated.staff.map(st =>
          st.id === staffId ? { ...st, magnetNote: cleanNote } : st
        );
      }
      return updated;
    });

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_MAGNET_NOTE',
          payload: { staffId, note: cleanNote },
          user: currentUser || { role: 'basic_user', displayName: 'Staff (Basic User)' }
        })
      });
      const data = await res.json();
      if (data?.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Error updating magnet note:', err);
    }
  };

  const handleUpdateRoomNote = async (roomId: string, note: string) => {
    const cleanNote = (note || '').trim().slice(0, 30);

    // Optimistic UI update
    setBoardState(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      const nextNotes = { ...(updated.roomNotes || {}) };
      if (cleanNote) {
        nextNotes[roomId] = cleanNote;
      } else {
        delete nextNotes[roomId];
      }
      updated.roomNotes = nextNotes;
      if (updated.departments) {
        updated.departments = updated.departments.map(dept => ({
          ...dept,
          rooms: dept.rooms.map(rm => rm.id === roomId ? { ...rm, note: cleanNote } : rm)
        }));
      }
      return updated;
    });

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_ROOM_NOTE',
          payload: { roomId, note: cleanNote },
          user: currentUser || { role: 'basic_user', displayName: 'Staff (Basic User)' }
        })
      });
      const data = await res.json();
      if (data?.state) {
        setBoardState(data.state);
      }
    } catch (err) {
      console.error('Error updating room note:', err);
    }
  };

  // 2. Assign staff to slot
  const handleAssignStaff = async (
    targetType: 'room_slot' | 'runner_slot',
    targetId: string,
    staffId: string
  ) => {
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    // Optimistically clear room note when assigning staff to a room
    if (targetType === 'room_slot' && staffId && boardState) {
      let targetRoomId: string | null = null;
      for (const dept of boardState.departments || []) {
        for (const rm of dept.rooms || []) {
          if (rm.slots.some(slot => slot.id === targetId)) {
            targetRoomId = rm.id;
            break;
          }
        }
        if (targetRoomId) break;
      }
      if (targetRoomId) {
        setBoardState(prev => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (updated.roomNotes && updated.roomNotes[targetRoomId!]) {
            const nextNotes = { ...updated.roomNotes };
            delete nextNotes[targetRoomId!];
            updated.roomNotes = nextNotes;
          }
          if (updated.departments) {
            updated.departments = updated.departments.map(dept => ({
              ...dept,
              rooms: dept.rooms.map(rm => rm.id === targetRoomId ? { ...rm, note: '' } : rm)
            }));
          }
          return updated;
        });
      }
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

  // Find current relief assignment for any slot
  const findSlotRelief = (targetId: string, targetType: 'room_slot' | 'runner_slot' = 'room_slot'): ReliefAssignment | null => {
    if (!boardState) return null;
    if (targetType === 'runner_slot') {
      for (const d of boardState.departments) {
        const r = d.runnerSlots?.find(s => s.id === targetId);
        if (r && r.relief) return r.relief;
      }
    } else {
      for (const d of boardState.departments) {
        for (const rm of d.rooms) {
          const s = rm.slots.find(slot => slot.id === targetId);
          if (s && s.relief) return s.relief;
        }
      }
    }
    return null;
  };

  // Find if a staff member currently occupies a room slot that has relief / 3 PM count attached
  const findStaffRoomWithRelief = (
    staffId: string,
    fromSlotId?: string
  ): { slot: RoomSlot; roomName: string; departmentName: string } | null => {
    if (!boardState || !staffId) return null;
    for (const dept of boardState.departments) {
      for (const rm of dept.rooms) {
        for (const slot of rm.slots) {
          const isSlotMatch = fromSlotId ? slot.id === fromSlotId : slot.staffId === staffId;
          if (isSlotMatch && slot.relief) {
            return {
              slot,
              roomName: `Room ${rm.name}`,
              departmentName: dept.name
            };
          }
        }
      }
    }
    return null;
  };

  // 3. Move staff via drag & drop
  const executeDropStaff = async (
    fromData: { staffId: string; type: string; id?: string },
    toType: 'room_slot' | 'runner_slot' | 'runner_dept' | 'bullpen' | 'unassigned',
    toId?: string,
    reliefHandling: 'keep_in_room' | 'move_with_staff' | 'remove' = 'keep_in_room',
    targetGroup?: 'MD' | 'CRNA' | 'Infrequent'
  ) => {
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    const staff = boardState?.staff.find(s => s.id === fromData.staffId);
    const staffName = staff ? (staff.displayName || `${staff.firstName} ${staff.lastName}`).trim() : 'Staff';
    const previousFromType = fromData.type;
    const previousFromId = fromData.id;
    const targetStaffId = fromData.staffId;

    let destName = 'Slot';
    let previousOccupantId: string | null = null;
    let targetRoomId: string | null = null;
    if (toType === 'room_slot' && toId) {
      for (const dept of boardState?.departments || []) {
        for (const rm of dept.rooms || []) {
          const s = rm.slots.find(slot => slot.id === toId);
          if (s) {
            destName = `${dept.name} Rm ${rm.name}`;
            previousOccupantId = s.staffId;
            targetRoomId = rm.id;
            break;
          }
        }
        if (targetRoomId) break;
      }
    } else if (toType === 'runner_slot' && toId) {
      for (const dept of boardState?.departments || []) {
        const r = dept.runnerSlots?.find(s => s.id === toId);
        if (r) {
          destName = `${dept.name} ${r.title}`;
          break;
        }
      }
    } else if (toType === 'runner_dept' && toId) {
      const dept = boardState?.departments.find(d => d.id === toId);
      destName = `${dept?.name || ''} Runner`;
    } else if (toType === 'bullpen') {
      destName = 'Bullpen';
    } else if (toType === 'unassigned') {
      destName = targetGroup ? `${targetGroup} Holding Bin` : 'Unassigned';
    }

    // Optimistically update board state immediately (0ms) so magnet moves without lag
    setBoardState(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (targetRoomId && updated.roomNotes && updated.roomNotes[targetRoomId!]) {
        const nextNotes = { ...updated.roomNotes };
        delete nextNotes[targetRoomId!];
        updated.roomNotes = nextNotes;
      }
      const bullpenIds = (updated.bullpenStaffIds || []).filter(id => id !== targetStaffId);
      if (toType === 'bullpen') bullpenIds.push(targetStaffId);
      updated.bullpenStaffIds = bullpenIds;

      if (updated.departments) {
        updated.departments = updated.departments.map(dept => ({
          ...dept,
          runnerSlots: (dept.runnerSlots || []).map(r => {
            if (toType === 'runner_slot' && r.id === toId) return { ...r, staffId: targetStaffId };
            if (fromData.id ? r.id === fromData.id : r.staffId === targetStaffId) return { ...r, staffId: null };
            return r;
          }),
          rooms: dept.rooms.map(rm => ({
            ...rm,
            note: rm.id === targetRoomId ? '' : rm.note,
            slots: rm.slots.map(s => {
              if (toType === 'room_slot' && s.id === toId) return { ...s, staffId: targetStaffId };
              if (fromData.id ? s.id === fromData.id : s.staffId === targetStaffId) return { ...s, staffId: null };
              return s;
            })
          }))
        }));
      }
      return updated;
    });

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
            staffId: fromData.staffId,
            reliefHandling,
            targetGroup
          },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);

        // Register Quick Undo action
        pushUndoAction(
          `Moved ${staffName} to ${destName}`,
          async () => {
            const undoRes = await fetch(apiUrl('/api/board'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'MOVE_STAFF',
                payload: {
                  fromTargetType: toType,
                  fromId: toId,
                  toTargetType: previousFromType === 'bullpen' ? 'bullpen' : (previousFromType === 'room_slot' ? 'room_slot' : (previousFromType === 'runner_slot' ? 'runner_slot' : 'unassigned')),
                  toId: previousFromId,
                  staffId: targetStaffId
                },
                user: currentUser
              })
            });
            const d = await undoRes.json();
            if (d.state) {
              setBoardState(d.state);
              if (previousOccupantId && toType === 'room_slot' && toId) {
                const res2 = await fetch(apiUrl('/api/board'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'ASSIGN_STAFF',
                    payload: { targetType: 'room_slot', targetId: toId, staffId: previousOccupantId },
                    user: currentUser
                  })
                });
                const d2 = await res2.json();
                if (d2.state) setBoardState(d2.state);
              }
            }
          },
          (currentState: BoardState) => {
            if (toType === 'room_slot' && toId) {
              let stillThere = false;
              for (const d of currentState.departments) {
                for (const rm of d.rooms) {
                  const s = rm.slots.find(slot => slot.id === toId);
                  if (s && s.staffId === targetStaffId) stillThere = true;
                }
              }
              if (!stillThere) return `${staffName} was already moved from ${destName} by someone else.`;
            }
            return null;
          }
        );
      }
    } catch (err) {
      console.error('Error moving staff:', err);
    }
  };

  const handleDropStaff = async (
    fromData: { staffId: string; type: string; id?: string },
    toType: 'room_slot' | 'runner_slot' | 'runner_dept',
    toId: string
  ) => {
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    if (fromData.type === 'relief_slot') {
      const sourceSlotId = fromData.id || (fromData as any).sourceSlotId;
      await handleRemoveRelief('room_slot', sourceSlotId);
      await executeDropStaff({ staffId: fromData.staffId, type: 'unassigned' }, toType, toId);
      return;
    }

    // Check if moving from a room_slot that has relief attached
    const reliefRoom = findStaffRoomWithRelief(fromData.staffId, fromData.id);
    if (reliefRoom && reliefRoom.slot.id !== toId) {
      const staff = boardState?.staff.find(s => s.id === fromData.staffId);
      const staffName = staff ? (staff.displayName || `${staff.firstName} ${staff.lastName}`).trim() : 'Staff';
      let reliefStaffName = 'Open 3 PM Count (Red Box)';
      if (reliefRoom.slot.relief?.staffId) {
        const rStaff = boardState?.staff.find(s => s.id === reliefRoom.slot.relief!.staffId);
        if (rStaff) reliefStaffName = `${rStaff.firstName} ${rStaff.lastName}`;
      }

      setPendingReliefMovePrompt({
        fromData: { ...fromData, type: 'room_slot', id: reliefRoom.slot.id },
        toType,
        toId,
        staffName,
        sourceRoomName: `${reliefRoom.departmentName} ${reliefRoom.roomName}`,
        reliefStaffName,
        reliefTime: reliefRoom.slot.relief?.time,
        isRedBox: Boolean(reliefRoom.slot.relief?.isRedBox || !reliefRoom.slot.relief?.staffId)
      });
      return;
    }

    await executeDropStaff(fromData, toType, toId, 'keep_in_room');
  };

  // Relief Actions
  const handleSetRelief = async (
    targetType: 'room_slot' | 'runner_slot',
    targetId: string,
    reliefStaffId: string,
    reliefTime?: string,
    notes?: string,
    isRedBox?: boolean,
    fromSource?: { type?: string; id?: string }
  ) => {
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    let previousRelief: ReliefAssignment | null = null;
    let targetStaffName = 'Staff';
    let isSelfRelief = false;
    let previousSourceSlot: { type: 'room_slot' | 'runner_slot'; id: string } | null = null;

    if (boardState) {
      if (targetType === 'runner_slot') {
        for (const d of boardState.departments) {
          const r = d.runnerSlots?.find(s => s.id === targetId);
          if (r) {
            previousRelief = r.relief || null;
            const st = boardState.staff.find(s => s.id === r.staffId);
            if (st) targetStaffName = st.lastName;
            break;
          }
        }
      } else {
        for (const d of boardState.departments) {
          for (const rm of d.rooms) {
            const slot = rm.slots.find(s => s.id === targetId);
            if (slot) {
              previousRelief = slot.relief || null;
              if (slot.staffId === reliefStaffId) {
                isSelfRelief = true;
              }
              const st = boardState.staff.find(s => s.id === slot.staffId);
              if (st) targetStaffName = st.lastName;
              else targetStaffName = rm.name ? `Room ${rm.name}` : 'Room';
              break;
            }
          }
        }
      }

      // Check if clinician is currently in a room slot or runner slot
      if (reliefStaffId && !isSelfRelief) {
        for (const d of boardState.departments) {
          for (const rm of d.rooms) {
            const slot = rm.slots.find(s => fromSource?.id ? s.id === fromSource.id : (s.staffId === reliefStaffId && s.id !== targetId));
            if (slot && slot.staffId === reliefStaffId) {
              previousSourceSlot = { type: 'room_slot', id: slot.id };
              break;
            }
          }
          if (previousSourceSlot) break;
        }
      }
    }

    // Optimistic UI update: Remove from source room and show in bullpen
    setBoardState(prev => {
      if (!prev) return prev;
      const updated = { ...prev };

      updated.departments = updated.departments.map(dept => {
        const d = { ...dept };
        d.rooms = d.rooms.map(rm => {
          const r = { ...rm };
          r.slots = r.slots.map(sl => {
            const s = { ...sl };
            if (s.id === targetId) {
              s.relief = {
                staffId: reliefStaffId || null,
                time: reliefTime || s.relief?.time || '3:00 PM',
                notes: notes !== undefined ? notes : (s.relief?.notes || ''),
                isRedBox: Boolean(isRedBox || !reliefStaffId)
              };
            }
            if (reliefStaffId && !isSelfRelief) {
              const isSource = fromSource?.id ? s.id === fromSource.id : (s.staffId === reliefStaffId && s.id !== targetId);
              if (isSource && s.staffId === reliefStaffId) {
                s.staffId = null;
              }
            }
            return s;
          });
          return r;
        });

        if (reliefStaffId && !isSelfRelief) {
          const isRunnerSource = fromSource?.type === 'runner_slot' || (!fromSource && d.runnerSlots.some(r => r.staffId === reliefStaffId));
          if (isRunnerSource) {
            d.runnerSlots = d.runnerSlots.filter(r => fromSource?.id ? r.id !== fromSource.id : r.staffId !== reliefStaffId);
          }
        }
        return d;
      });

      if (reliefStaffId && !isSelfRelief) {
        const nextBullpen = [...(updated.bullpenStaffIds || [])];
        if (!nextBullpen.includes(reliefStaffId)) {
          nextBullpen.push(reliefStaffId);
        }
        updated.bullpenStaffIds = nextBullpen;
      }
      return updated;
    });

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_RELIEF',
          payload: { targetType, targetId, reliefStaffId, reliefTime: reliefTime || '', notes, isRedBox, fromSource },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
        const assignedStaff = data.state.staff?.find((s: Staff) => s.id === reliefStaffId);
        if (assignedStaff) {
          setToastMessage(`Relief assigned: ${assignedStaff.lastName}`);
        } else if (isRedBox) {
          setToastMessage(`Planned relief for ${targetStaffName}`);
        } else {
          setToastMessage('Relief assigned');
        }
        setTimeout(() => setToastMessage(null), 3000);

        const savedPrevRelief = previousRelief;
        pushUndoAction(
          assignedStaff
            ? `Assigned relief ${assignedStaff.lastName} to ${targetStaffName}`
            : (isRedBox ? `Planned relief for ${targetStaffName}` : `Relief assigned for ${targetStaffName}`),
          async () => {
            if (savedPrevRelief) {
              await handleSetRelief(targetType, targetId, savedPrevRelief.staffId || '', savedPrevRelief.time, savedPrevRelief.notes, savedPrevRelief.isRedBox);
            } else {
              await handleRemoveRelief(targetType, targetId);
            }
          }
        );
      }
    } catch (err) {
      console.error('Error setting relief:', err);
    }
  };

  const handleToggleRedBox = async (
    targetType: 'room_slot' | 'runner_slot',
    targetId: string,
    enable: boolean
  ) => {
    if (enable) {
      await handleSetRelief(targetType, targetId, '', '', '', true);
    } else {
      await handleRemoveRelief(targetType, targetId);
    }
  };

  const handleRemoveRelief = async (
    targetType: 'room_slot' | 'runner_slot',
    targetId: string,
    forceDelete = false
  ) => {
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    let previousRelief: ReliefAssignment | null = null;
    let targetStaffName = 'Staff';
    if (boardState) {
      if (targetType === 'runner_slot') {
        for (const d of boardState.departments) {
          const r = d.runnerSlots?.find(s => s.id === targetId);
          if (r) {
            previousRelief = r.relief || null;
            const st = boardState.staff.find(s => s.id === r.staffId);
            if (st) targetStaffName = st.lastName;
            break;
          }
        }
      } else {
        for (const d of boardState.departments) {
          for (const rm of d.rooms) {
            const slot = rm.slots.find(s => s.id === targetId);
            if (slot) {
              previousRelief = slot.relief || null;
              const st = boardState.staff.find(s => s.id === slot.staffId);
              if (st) targetStaffName = st.lastName;
              else targetStaffName = rm.name ? `Room ${rm.name}` : 'Room';
              break;
            }
          }
        }
      }
    }

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REMOVE_RELIEF',
          payload: { targetType, targetId, forceDelete },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
        if (previousRelief?.isRedBox && previousRelief?.staffId && !forceDelete) {
          setToastMessage(`Relief removed • Planned Red Box restored for ${targetStaffName}`);
        } else {
          setToastMessage('Relief assignment removed');
        }
        setTimeout(() => setToastMessage(null), 3000);

        if (previousRelief) {
          const savedRelief = previousRelief;
          pushUndoAction(
            `Removed relief for ${targetStaffName}`,
            async () => {
              await handleSetRelief(targetType, targetId, savedRelief.staffId || '', savedRelief.time, savedRelief.notes, savedRelief.isRedBox);
            }
          );
        }
      }
    } catch (err) {
      console.error('Error removing relief:', err);
    }
  };

  const handleExecuteHandoff = async (
    targetType: 'room_slot' | 'runner_slot',
    targetId: string
  ) => {
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EXECUTE_RELIEF_HANDOFF',
          payload: { targetType, targetId },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
        setToastMessage('Handoff completed successfully!');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error executing handoff:', err);
    }
  };

  const handleTriggerCompleteAllReliefs = () => {
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }
    if (totalScheduledReliefsCount === 0) {
      setToastMessage('No active relief assignments scheduled.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setIsCompleteReliefConfirmOpen(true);
  };

  const handleConfirmCompleteAllReliefs = async () => {
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }
    setIsCompleteReliefConfirmOpen(false);
    setIsCompletingAllReliefs(true);
    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COMPLETE_ALL_RELIEFS',
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
        setToastMessage(`✓ Successfully completed ${data.count || 0} relief handoffs! Staff moved into slots.`);
        setTimeout(() => setToastMessage(null), 4000);
      } else if (data.error) {
        setToastMessage(`Relief error: ${data.error}`);
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err) {
      console.error('Error completing all reliefs:', err);
      setToastMessage('Failed to complete relief handoffs.');
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsCompletingAllReliefs(false);
    }
  };

  // Dynamic Runner Slot actions
  const handleAddRunnerSlot = async (departmentId: string) => {
    if (!isEditor) {
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
    if (!isEditor) {
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

  // Remove staff from a specific placement (runner slot, room slot, or bullpen)
  const handleRemoveFromSlot = async (
    targetType: 'runner_slot' | 'room_slot' | 'bullpen',
    targetId: string,
    departmentId?: string,
    staffId?: string
  ) => {
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      if (targetType === 'runner_slot') {
        let deptId = departmentId;
        if (!deptId && boardState) {
          const dept = boardState.departments.find(d => d.runnerSlots?.some(r => r.id === targetId));
          if (dept) deptId = dept.id;
        }
        await handleRemoveRunnerSlot(deptId || '', targetId);
        setToastMessage('Runner assignment removed.');
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }

      if (targetType === 'room_slot') {
        await handleAssignStaff('room_slot', targetId, '');
        setToastMessage('Room assignment removed.');
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }

      if (targetType === 'bullpen' && staffId) {
        await handleMoveStaffToUnassigned(staffId, { type: 'bullpen', id: staffId });
        return;
      }
    } catch (err) {
      console.error('Error removing from slot:', err);
    }
  };

  // Set or clear estimated future case time for a room (e.g. "1030")
  const handleSetRoomFutureTime = async (roomId: string, futureTime: string | null) => {
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    let prevTime: string | null = null;
    let roomName = 'Room';
    if (boardState) {
      for (const dept of boardState.departments) {
        const rm = dept.rooms.find(r => r.id === roomId);
        if (rm) {
          prevTime = rm.futureTime || null;
          roomName = `${dept.name} Rm ${rm.name}`;
          break;
        }
      }
    }

    // Optimistic UI update
    setBoardState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        departments: prev.departments.map(d => ({
          ...d,
          rooms: d.rooms.map(rm => rm.id === roomId ? { ...rm, futureTime: futureTime || null } : rm)
        }))
      };
    });

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_ROOM_FUTURE_TIME',
          payload: { roomId, futureTime },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);

        const savedPrevTime = prevTime;
        pushUndoAction(
          futureTime ? `Set future time for ${roomName} to ${futureTime}` : `Cleared future time for ${roomName}`,
          async () => {
            await handleSetRoomFutureTime(roomId, savedPrevTime);
          }
        );
      }
    } catch (err) {
      console.error('Error setting room future time:', err);
    }
  };

  // Toggle Departure Strikethrough
  const handleToggleDepartureStruck = async (id: string) => {
    const item = boardState?.departureList.find(d => d.id === id);
    const itemName = item?.name || 'Staff';
    const isDeparted = item?.departed;

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

        pushUndoAction(
          isDeparted ? `Restored ${itemName} to departure list` : `Marked ${itemName} as departed`,
          async () => {
            await handleToggleDepartureStruck(id);
          }
        );
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
    credentials?: StaffCredential,
    restoreLists?: {
      departureList?: DepartureItem[];
      latesList?: LateShiftItem[];
      callTeamList?: CallTeamItem[];
    },
    isCallTeamAssignment?: boolean
  ) => {
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    const staff = boardState?.staff.find(s => s.id === staffId);
    const prevShift = staff?.shift || '';
    const prevDeparture = boardState?.departureList ? [...boardState.departureList] : [];
    const prevLates = boardState?.latesList ? [...boardState.latesList] : [];
    const prevCall = boardState?.callTeamList ? [...boardState.callTeamList] : [];

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STAFF_SHIFT',
          payload: { staffId, shift: newShift, lastName, credentials, restoreLists, isCallTeamAssignment },
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

        if (!restoreLists) {
          const savedPrevShift = prevShift;
          const savedDeparture = prevDeparture;
          const savedLates = prevLates;
          const savedCall = prevCall;
          const staffLabel = lastName ? `Dr. ${lastName}` : (staff ? `Dr. ${staff.lastName}` : 'Staff');
          pushUndoAction(
            `Update shift for ${staffLabel} to ${newShift || 'None'}`,
            async () => {
              await handleUpdateStaffShift(staffId, savedPrevShift, lastName, credentials, {
                departureList: savedDeparture,
                latesList: savedLates,
                callTeamList: savedCall
              });
            }
          );
        }
      }
    } catch (err) {
      console.error('Error updating staff shift:', err);
    }
  };

  // Update staff custom magnet display name
  const handleUpdateStaffDisplayName = async (
    staffId: string,
    displayName: string
  ) => {
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    const staff = boardState?.staff.find(s => s.id === staffId);
    const prevDisplayName = staff?.displayName || '';

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_STAFF_DISPLAY_NAME',
          payload: { staffId, displayName },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
        setSelectedStaff(prev => {
          if (!prev) return null;
          if (prev.id === staffId) {
            return { ...prev, displayName: displayName || undefined };
          }
          return prev;
        });
        setToastMessage(`✓ Updated magnet name to "${displayName || 'Default'}"`);
        setTimeout(() => setToastMessage(null), 3000);

        const savedPrevName = prevDisplayName;
        pushUndoAction(
          `Updated magnet name to "${displayName || 'Default'}"`,
          async () => {
            await handleUpdateStaffDisplayName(staffId, savedPrevName);
          }
        );
      }
    } catch (err) {
      console.error('Error updating staff display name:', err);
      setToastMessage('Error updating magnet name.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // 3c. Set staff student info
  const handleUpdateStaffStudent = async (
    staffId: string,
    hasStudent: boolean,
    studentName?: string
  ) => {
    if (currentUserRole === 'view_only') {
      setIsLoginModalOpen(true);
      return;
    }

    const staff = boardState?.staff.find(s => s.id === staffId);
    const staffName = staff ? staff.lastName : 'Staff';
    const prevHasStudent = staff?.hasStudent ?? false;
    const prevStudentName = staff?.studentName;

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_STAFF_STUDENT',
          payload: { staffId, hasStudent, studentName },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
        setSelectedStaff(prev => {
          if (!prev) return null;
          if (prev.id === staffId) {
            return {
              ...prev,
              hasStudent: Boolean(hasStudent),
              studentName: hasStudent && studentName ? studentName.trim() : undefined
            };
          }
          return prev;
        });
        setToastMessage(
          hasStudent
            ? `✓ Assigned student "${studentName || 'Student'}"`
            : '✓ Removed student assignment'
        );

        const savedHasStudent = prevHasStudent;
        const savedStudentName = prevStudentName;
        pushUndoAction(
          hasStudent ? `Assigned student "${studentName}" to ${staffName}` : `Removed student from ${staffName}`,
          async () => {
            await handleUpdateStaffStudent(staffId, savedHasStudent, savedStudentName);
          }
        );
      }
    } catch (err) {
      console.error('Error updating staff student info:', err);
      setToastMessage('Error updating student info.');
    }
  };

  // 4a. Move staff directly to Bullpen (available for breaks & cases)
  const handleDropToBullpen = async (fromData: { staffId: string; type: string; id?: string }) => {
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    if (fromData.type === 'relief_slot') {
      const sourceSlotId = fromData.id || (fromData as any).sourceSlotId;
      await handleRemoveRelief('room_slot', sourceSlotId);
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MOVE_STAFF',
          payload: {
            fromTargetType: 'unassigned',
            toTargetType: 'bullpen',
            staffId: fromData.staffId
          },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);
        const st = boardState?.staff.find(s => s.id === fromData.staffId);
        setToastMessage(`${st ? st.lastName : 'Relief clinician'} returned to Bullpen`);
        setTimeout(() => setToastMessage(null), 3000);
      }
      return;
    }

    const reliefRoom = findStaffRoomWithRelief(fromData.staffId, fromData.id);
    if (reliefRoom) {
      const staff = boardState?.staff.find(s => s.id === fromData.staffId);
      const staffName = staff ? (staff.displayName || `${staff.firstName} ${staff.lastName}`).trim() : 'Staff';
      let reliefStaffName = 'Open 3 PM Count (Red Box)';
      if (reliefRoom.slot.relief?.staffId) {
        const rStaff = boardState?.staff.find(s => s.id === reliefRoom.slot.relief!.staffId);
        if (rStaff) reliefStaffName = `${rStaff.firstName} ${rStaff.lastName}`;
      }

      setPendingReliefMovePrompt({
        fromData: { ...fromData, type: 'room_slot', id: reliefRoom.slot.id },
        toType: 'bullpen',
        staffName,
        sourceRoomName: `${reliefRoom.departmentName} ${reliefRoom.roomName}`,
        reliefStaffName,
        reliefTime: reliefRoom.slot.relief?.time,
        isRedBox: Boolean(reliefRoom.slot.relief?.isRedBox || !reliefRoom.slot.relief?.staffId)
      });
      return;
    }

    const staff = boardState?.staff.find(s => s.id === fromData.staffId);
    const staffName = staff ? (staff.displayName || `${staff.firstName} ${staff.lastName}`).trim() : 'Staff';
    const prevType = fromData.type;
    const prevId = fromData.id;
    const targetStaffId = fromData.staffId;

    // IMMEDIATE OPTIMISTIC UPDATE: Move to bullpen instantly in UI (0ms)
    setBoardState(prev => {
      if (!prev) return prev;
      const bullpenIds = (prev.bullpenStaffIds || []).filter(id => id !== targetStaffId);
      bullpenIds.push(targetStaffId);

      const nextDepts = prev.departments.map(dept => ({
        ...dept,
        runnerSlots: (dept.runnerSlots || []).filter(r => (fromData.id ? r.id !== fromData.id : r.staffId !== targetStaffId)),
        rooms: dept.rooms.map(rm => ({
          ...rm,
          slots: rm.slots.map(s => {
            if (fromData.id ? s.id === fromData.id : s.staffId === targetStaffId) {
              return { ...s, staffId: null };
            }
            return s;
          })
        }))
      }));

      return {
        ...prev,
        bullpenStaffIds: bullpenIds,
        departments: nextDepts
      };
    });

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

        pushUndoAction(
          `Moved ${staffName} to Bullpen`,
          async () => {
            const undoRes = await fetch(apiUrl('/api/board'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'MOVE_STAFF',
                payload: {
                  fromTargetType: 'bullpen',
                  toTargetType: prevType === 'room_slot' ? 'room_slot' : (prevType === 'runner_slot' ? 'runner_slot' : 'unassigned'),
                  toId: prevId,
                  staffId: targetStaffId
                },
                user: currentUser
              })
            });
            const d = await undoRes.json();
            if (d.state) setBoardState(d.state);
          },
          (currentState: BoardState) => {
            if (!currentState.bullpenStaffIds?.includes(targetStaffId)) {
              return `${staffName} is no longer in the Bullpen.`;
            }
            return null;
          }
        );
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
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    const staff = boardState?.staff.find(s => s.id === staffId);
    const staffName = staff ? (staff.displayName || `${staff.firstName} ${staff.lastName}`).trim() : 'Staff';
    const prevType = fromData?.type || 'bullpen';
    const prevId = fromData?.id;

    // IMMEDIATE OPTIMISTIC UPDATE: Clear staff from bullpen, rooms, and runner slots (0ms)
    setBoardState(prev => {
      if (!prev) return prev;
      const nextBullpenIds = (prev.bullpenStaffIds || []).filter(id => id !== staffId);

      const nextDepts = prev.departments.map(dept => ({
        ...dept,
        runnerSlots: (dept.runnerSlots || []).filter(r => (fromData?.id ? r.id !== fromData.id : r.staffId !== staffId)),
        rooms: dept.rooms.map(rm => ({
          ...rm,
          slots: rm.slots.map(s => {
            if (fromData?.id ? s.id === fromData.id : s.staffId === staffId) {
              return { ...s, staffId: null };
            }
            return s;
          })
        }))
      }));

      return {
        ...prev,
        bullpenStaffIds: nextBullpenIds,
        departments: nextDepts
      };
    });

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MOVE_STAFF',
          payload: {
            fromTargetType: fromData?.type || 'bullpen',
            fromId: fromData?.id,
            toTargetType: 'unassigned',
            staffId: staffId
          },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);

        pushUndoAction(
          `Moved ${staffName} to Unassigned Staff`,
          async () => {
            const undoRes = await fetch(apiUrl('/api/board'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'MOVE_STAFF',
                payload: {
                  fromTargetType: 'unassigned',
                  toTargetType: prevType === 'room_slot' ? 'room_slot' : (prevType === 'runner_slot' ? 'runner_slot' : 'bullpen'),
                  toId: prevId,
                  staffId: staffId
                },
                user: currentUser
              })
            });
            const d = await undoRes.json();
            if (d.state) setBoardState(d.state);
          }
        );
      }
    } catch (err) {
      console.error('Error moving staff to unassigned:', err);
    }
  };

  // 4c. Set staff infrequent status
  const handleSetStaffInfrequent = async (staffId: string, isInfrequent: boolean) => {
    if (!isEditor) {
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
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    if (fromData.type === 'relief_slot') {
      const sourceSlotId = fromData.id || (fromData as any).sourceSlotId;
      handleRemoveRelief('room_slot', sourceSlotId).then(async () => {
        const st = boardState?.staff.find(s => s.id === fromData.staffId);
        setToastMessage(`${st ? st.lastName : 'Relief clinician'} returned to Available Staff`);
        setTimeout(() => setToastMessage(null), 3000);
      });
      return;
    }

    // Check if moving from a room with relief
    const reliefRoom = findStaffRoomWithRelief(fromData.staffId, fromData.id);
    if (reliefRoom) {
      const staff = boardState?.staff.find(s => s.id === fromData.staffId);
      const staffName = staff ? (staff.displayName || `${staff.firstName} ${staff.lastName}`).trim() : 'Staff';
      let reliefStaffName = 'Open 3 PM Count (Red Box)';
      if (reliefRoom.slot.relief?.staffId) {
        const rStaff = boardState?.staff.find(s => s.id === reliefRoom.slot.relief!.staffId);
        if (rStaff) reliefStaffName = `${rStaff.firstName} ${rStaff.lastName}`;
      }

      setPendingReliefMovePrompt({
        fromData: { ...fromData, type: 'room_slot', id: reliefRoom.slot.id },
        toType: 'unassigned',
        staffName,
        sourceRoomName: `${reliefRoom.departmentName} ${reliefRoom.roomName}`,
        reliefStaffName,
        reliefTime: reliefRoom.slot.relief?.time,
        isRedBox: Boolean(reliefRoom.slot.relief?.isRedBox || !reliefRoom.slot.relief?.staffId)
      });
      return;
    }

    // Immediately unassign staff member - accepts drop into any bin or background and sorts them properly
    handleMoveStaffToUnassigned(fromData.staffId, fromData);
  };

  // Other active assignments if dragged staff has multiple locations
  const promptOtherAssignments = useMemo(() => {
    if (!unassignPromptTarget || !boardState) return [];
    const staffId = unassignPromptTarget.staff.id;
    const currentSlotId = unassignPromptTarget.fromData.id;
    const list: string[] = [];
    for (const dept of boardState.departments) {
      for (const r of dept.runnerSlots || []) {
        if (r.staffId === staffId && r.id !== currentSlotId) {
          list.push(`${dept.name} Runner (${r.title})`);
        }
      }
      for (const rm of dept.rooms || []) {
        for (const s of rm.slots || []) {
          if (s.staffId === staffId && s.id !== currentSlotId) {
            list.push(`${dept.name} Room ${rm.name}`);
          }
        }
      }
    }
    return list;
  }, [unassignPromptTarget, boardState]);

  const handleConfirmRemoveCurrentOnly = async () => {
    if (!unassignPromptTarget) return;
    const { fromData } = unassignPromptTarget;
    setUnassignPromptTarget(null);
    if (fromData.type === 'runner_slot' && fromData.id) {
      let deptId = '';
      if (boardState) {
        const dept = boardState.departments.find(d => d.runnerSlots?.some(r => r.id === fromData.id));
        if (dept) deptId = dept.id;
      }
      await handleRemoveRunnerSlot(deptId, fromData.id);
      setToastMessage('Removed from runner slot.');
      setTimeout(() => setToastMessage(null), 3000);
    } else if (fromData.type === 'room_slot' && fromData.id) {
      await handleAssignStaff('room_slot', fromData.id, '');
      setToastMessage('Removed from room.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleConfirmUnassignToBullpen = async () => {
    if (!unassignPromptTarget) return;
    const { fromData } = unassignPromptTarget;
    setUnassignPromptTarget(null);
    await handleDropToBullpen({ ...fromData, removeAllLocations: true } as any);
  };

  const handleConfirmUnassignLeaving = async () => {
    if (!unassignPromptTarget) return;
    const { staff, fromData } = unassignPromptTarget;
    setUnassignPromptTarget(null);
    await handleMoveStaffToUnassigned(staff.id, { ...fromData, removeAllLocations: true } as any);
  };

  // 5. Update Notes
  const handleSaveNotes = async (type: 'room' | 'departure' | 'lates' | 'general', id: string | undefined, notes: string) => {
    if (!isEditor) {
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
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    const prevDeparture = boardState?.departureList ? [...boardState.departureList] : [];
    const prevLates = boardState?.latesList ? [...boardState.latesList] : [];
    let reorderDesc: string | undefined;

    if (isReorder && prevDeparture.length > 0) {
      const moved = departureList.find(d => {
        const old = prevDeparture.find(p => p.id === d.id);
        return old && (old.orderIndex !== d.orderIndex || old.category !== d.category);
      });
      const doctorName = moved ? `Dr. ${moved.name}` : 'provider';
      reorderDesc = `Reorder ${doctorName} in departure list`;
    }

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_LISTS',
          payload: { departureList, latesList, isReorder, details: reorderDesc },
          user: currentUser
        })
      });
      const data = await res.json();
      if (data.state) {
        setBoardState(data.state);

        if (isReorder && prevDeparture.length > 0) {
          const savedPrevDeparture = prevDeparture;
          const savedPrevLates = prevLates;
          pushUndoAction(
            reorderDesc || 'Reorder departure list',
            async () => {
              await handleUpdateLists(savedPrevDeparture, savedPrevLates, true);
            }
          );
        }
      }
    } catch (err) {
      console.error('Error updating lists:', err);
    }
  };

  // 6b. Update Call Team list
  const handleUpdateCallTeam = async (callTeamList: CallTeamItem[]) => {
    if (!isEditor) {
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
  const executeTriggerSync = async (customDate?: string) => {
    setIsSyncing(true);
    try {
      const targetDate = customDate || getHoustonDateString();
      const res = await fetch(apiUrl('/api/scraper'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TRIGGER_SYNC',
          date: targetDate,
          currentUser: currentUser || { role: 'basic_user', displayName: 'Staff' }
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchBoardState(false);
        setToastMessage(`✓ Synchronized Departure, Lates, Call Team and Staff Roster for ${targetDate}!`);
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setToastMessage(`Portal sync error: ${data.error || 'Failed'}`);
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
    if (!isEditor) {
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
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    setIsAutoAssigning(true);
    try {
      const targetDate = getHoustonDateString();

      // If departure list is empty, trigger sync for today's accurate date first so auto-assign works seamlessly
      if (!boardState?.departureList || boardState.departureList.length === 0) {
        await executeTriggerSync(targetDate);
      }

      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'AUTO_ASSIGN_ROOMS',
          date: targetDate,
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
    if (!isEditor) {
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

  const handleClearAllTextNotes = async () => {
    if (!isEditor) {
      setIsLoginModalOpen(true);
      return;
    }

    const prevMagnetNotes = boardState?.magnetNotes ? { ...boardState.magnetNotes } : {};
    const prevRoomNotes = boardState?.roomNotes ? { ...boardState.roomNotes } : {};

    // Optimistic UI update
    setBoardState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        magnetNotes: {},
        roomNotes: {},
        staff: prev.staff.map(s => ({ ...s, magnetNote: '' })),
        departments: prev.departments.map(dept => ({
          ...dept,
          rooms: dept.rooms.map(rm => ({ ...rm, note: '' }))
        }))
      };
    });
    setIsClearNotesModalOpen(false);

    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLEAR_ALL_TEXT_NOTES',
          payload: {},
          user: currentUser || { role: 'admin', displayName: 'Admin' }
        })
      });
      const data = await res.json();
      if (data?.state) {
        setBoardState(data.state);
        setToastMessage('✓ All text notes cleared');
        setTimeout(() => setToastMessage(null), 3000);

        // Register Quick Undo action
        pushUndoAction(
          'Cleared all text notes',
          async () => {
            const restorePromises = [];
            for (const [staffId, note] of Object.entries(prevMagnetNotes)) {
              restorePromises.push(
                fetch(apiUrl('/api/board'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'UPDATE_MAGNET_NOTE',
                    payload: { staffId, note },
                    user: currentUser
                  })
                })
              );
            }
            for (const [roomId, note] of Object.entries(prevRoomNotes)) {
              restorePromises.push(
                fetch(apiUrl('/api/board'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'UPDATE_ROOM_NOTE',
                    payload: { roomId, note },
                    user: currentUser
                  })
                })
              );
            }
            await Promise.all(restorePromises);
            const refreshRes = await fetch(apiUrl('/api/board'));
            const refreshData = await refreshRes.json();
            if (refreshData?.state) {
              setBoardState(refreshData.state);
            }
          }
        );
      } else {
        setToastMessage(`Clear error: ${data.error || 'Failed'}`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error clearing text notes:', err);
      setToastMessage('Error clearing text notes.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // 8. Superuser Layout actions
  const handleSaveDepartments = async (departments: Department[], layoutConfig?: BoardLayoutConfig) => {
    try {
      const res = await fetch(apiUrl('/api/board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_LAYOUT',
          payload: { departments, layoutConfig },
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

  if (loading || !boardState || !effectiveBoardState) {
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
          boardState={effectiveBoardState}
          currentUser={currentUser}
          currentUserRole={currentUserRole}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          onToggleBreak={handleToggleBreak}
          onSelectStaff={handleSelectStaff}
          onSelectEmptySlot={(type, id, label, roomId, currentFutureTime) => {
            if (currentUserRole === 'view_only') {
              setIsLoginModalOpen(true);
              return;
            }
            setSlotAssignTarget({ type, id, label, roomId, currentFutureTime, currentRelief: findSlotRelief(id, type) });
          }}
          onSetRoomFutureTime={handleSetRoomFutureTime}
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
          onOpenReliefModal={target => {
            if (currentUserRole === 'view_only') {
              setIsLoginModalOpen(true);
              return;
            }
            setReliefTarget(target);
          }}
          onExecuteHandoff={handleExecuteHandoff}
          onRemoveRelief={handleRemoveRelief}
          onSetRelief={handleSetRelief}
          onOpenReliefTextModal={() => setIsReliefTextModalOpen(true)}
          onCompleteAllReliefs={handleTriggerCompleteAllReliefs}
          reliefCount={totalScheduledReliefsCount}
          isCompletingRelief={isCompletingAllReliefs}
          unreadCountsByPhone={unreadCountsByPhone}
          onUpdateMagnetNote={handleUpdateMagnetNote}
          onUpdateRoomNote={handleUpdateRoomNote}
          onUndo={handleExecuteUndo}
          canUndo={undoStack.length > 0}
          undoCount={undoStack.length}
          lastUndoDescription={undoStack[0]?.description}
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
            onClearAllTextNotes={() => setIsClearNotesModalOpen(true)}
            onUndo={handleExecuteUndo}
            canUndo={undoStack.length > 0}
            undoCount={undoStack.length}
            lastUndoDescription={undoStack[0]?.description}
            isSyncing={isSyncing}
            lastSyncTime={boardState.scraperConfig.lastSyncTime}
            isRightSidebarOpen={isRightSidebarOpen}
            onToggleRightSidebar={() => setIsRightSidebarOpen(prev => !prev)}
            isBullpenOpen={isBullpenOpen}
            onToggleBullpen={() => setIsBullpenOpen(prev => !prev)}
            bullpenCount={effectiveBullpenStaffIds.length}
            onSwitchToMobile={isMobileScreen && forcedDesktop ? () => setForcedDesktop(false) : undefined}
            onOpenReliefTextModal={() => setIsReliefTextModalOpen(true)}
            onCompleteAllReliefs={handleTriggerCompleteAllReliefs}
            reliefCount={totalScheduledReliefsCount}
            isCompletingRelief={isCompletingAllReliefs}
          />

      {/* Main Whiteboard Display Area */}
      <main className="board-main-area">
        {/* Left Bullpen (Expandable left-sided vertical menu for available staff) */}
        {((boardState?.layoutConfig?.enableBullpen ?? true)) && (
          isBullpenOpen ? (
            <BullpenSidebar
            bullpenStaffIds={effectiveBullpenStaffIds}
            bullpenBreaks={boardState.bullpenBreaks || {}}
            staff={boardState.staff}
            currentUserRole={currentUserRole}
            activeReliefStaffIds={activeReliefStaffIds}
            onSelectStaff={handleSelectStaff}
            onDropToBullpen={handleDropToBullpen}
            onMoveStaffToUnassigned={handleMoveStaffToUnassigned}
            onToggleCollapse={() => setIsBullpenOpen(false)}
            onToggleBreak={(breakType, staffId, currentValue) => handleToggleBreak('bullpen', staffId, breakType, currentValue)}
            unreadCountsByPhone={unreadCountsByPhone}
            magnetNotes={boardState.magnetNotes}
            onUpdateMagnetNote={handleUpdateMagnetNote}
          />
        ) : (
          /* Expand Tab on Left Edge to slide Bullpen back open */
          <button
            type="button"
            className="bullpen-expand-tab"
            onClick={() => setIsBullpenOpen(true)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              let raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
              let data: any = null;
              if (raw) {
                try { data = JSON.parse(raw); } catch {
                  if (raw.trim()) data = { staffId: raw.trim(), type: 'unassigned' };
                }
              }
              if (!data && typeof window !== 'undefined' && (window as any).__activeDraggedStaff) {
                data = (window as any).__activeDraggedStaff;
              }
              if (data) {
                handleDropToBullpen(data);
                setIsBullpenOpen(true);
              }
            }}
            title="Show Bullpen (Available Staff for Breaks / Cases)"
          >
            <ChevronRight size={16} />
            <span className="bullpen-expand-tab-text">
              BULLPEN {(boardState.bullpenStaffIds?.length ?? 0) > 0 ? `(${boardState.bullpenStaffIds?.length})` : ''}
            </span>
          </button>
        ))}

        {/* 8 Departments (Main OR, West Pav, Ortho, Village, 9th Floor, Endo, OB, IVF) */}
        <DepartmentGrid
          departments={boardState.departments}
          staff={boardState.staff}
          currentUserRole={currentUserRole}
          activeReliefStaffIds={activeReliefStaffIds}
          onToggleBreak={handleToggleBreak}
          onSelectStaff={handleSelectStaff}
          onSelectEmptySlot={(type, id, label, roomId, currentFutureTime) => {
            if (currentUserRole === 'view_only') {
              setIsLoginModalOpen(true);
              return;
            }
            setSlotAssignTarget({ type, id, label, roomId, currentFutureTime, currentRelief: findSlotRelief(id, type) });
          }}
          onSetRoomFutureTime={handleSetRoomFutureTime}
          onDropStaff={handleDropStaff}
          onOpenVoiceNotes={(type, id, currentNotes) => setVoiceNoteTarget({ type, id, currentNotes: currentNotes || '' })}
          onAddRunnerSlot={handleAddRunnerSlot}
          onRemoveRunnerSlot={handleRemoveRunnerSlot}
          onOpenReliefModal={target => {
            if (currentUserRole === 'view_only') {
              setIsLoginModalOpen(true);
              return;
            }
            setReliefTarget(target);
          }}
          onExecuteHandoff={handleExecuteHandoff}
          onSetRelief={handleSetRelief}
          onRemoveRelief={handleRemoveRelief}
          unreadCountsByPhone={unreadCountsByPhone}
          magnetNotes={boardState.magnetNotes}
          onUpdateMagnetNote={handleUpdateMagnetNote}
          roomNotes={boardState.roomNotes}
          onUpdateRoomNote={handleUpdateRoomNote}
          onOpenLogin={() => setIsLoginModalOpen(true)}
        />

        {/* Right 2 Columns: DEPARTURE & LATES (Can be hidden to the right) */}
        {((boardState?.layoutConfig?.enableDepartureList ?? true) || (boardState?.layoutConfig?.enableLateList ?? true)) && (
          isRightSidebarOpen ? (
            <RightSidebar
              departureList={boardState.departureList}
              callTeamList={boardState.callTeamList || []}
              departureNotes={boardState.departureNotes}
              latesList={boardState.latesList}
              latesNotes={boardState.latesNotes}
              currentUserRole={currentUserRole}
              staff={boardState.staff}
              departments={boardState.departments}
              showDepartureList={boardState?.layoutConfig?.enableDepartureList ?? true}
              showLateList={boardState?.layoutConfig?.enableLateList ?? true}
              onSelectStaff={handleSelectStaff}
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
          )
        )}
      </main>

      {/* Bottom Available Unassigned Staff (Alphabetical Staff Holding Bins - Collapsible to Bottom) */}
      {(boardState?.layoutConfig?.enableUnassignedStaff ?? true) && (
      <Bullpen
        staff={boardState.staff}
        departments={boardState.departments}
        bullpenStaffIds={effectiveBullpenStaffIds}
        bullpenBreaks={boardState.bullpenBreaks || {}}
        currentUserRole={currentUserRole}
        activeReliefStaffIds={activeReliefStaffIds}
        onSelectStaff={handleSelectStaff}
        onOpenAddStaff={() => setIsAdminModalOpen(true)}
        onDropToBullpen={handleDropToUnassignedDrawer}
        onToggleBreak={(breakType, staffId, currentValue) => handleToggleBreak('bullpen', staffId, breakType, currentValue)}
        onSetStaffInfrequent={handleSetStaffInfrequent}
        isCollapsed={isBullpenCollapsed}
        onToggleCollapse={() => setIsBullpenCollapsed(prev => !prev)}
        unreadCountsByPhone={unreadCountsByPhone}
        magnetNotes={boardState.magnetNotes}
        onUpdateMagnetNote={handleUpdateMagnetNote}
      />
      )}
        </div>
      )}

      {/* Modals & Slide-outs */}
      <PinPadModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setPendingAction(null);
        }}
        onLoginSuccess={handleLoginSuccess}
      />

      <StaffModal
        staff={boardState?.staff.find(s => s.id === selectedStaff?.id) || selectedStaff}
        departments={boardState.departments}
        allStaff={boardState.staff}
        bullpenStaffIds={effectiveBullpenStaffIds}
        bullpenBreaks={boardState.bullpenBreaks || {}}
        currentUserRole={currentUserRole}
        onClose={() => setSelectedStaff(null)}
        onAssignToSlot={handleAssignStaff}
        onRemoveFromSlot={handleRemoveFromSlot}
        onMoveToBullpen={staffId => handleDropToBullpen({ staffId, type: 'bullpen_transfer' })}
        onUnassign={staffId => handleMoveStaffToUnassigned(staffId)}
        onToggleBreak={handleToggleBreak}
        onUpdateShift={(staffId, newShift, lastName, credentials, isCallTeam) => {
          handleUpdateStaffShift(staffId, newShift, lastName, credentials, undefined, isCallTeam);
        }}
        onUpdateDisplayName={handleUpdateStaffDisplayName}
        onUpdateStudent={handleUpdateStaffStudent}
        onSetStaffInfrequent={handleSetStaffInfrequent}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenReliefModal={target => setReliefTarget(target)}
        onSetRoomFutureTime={handleSetRoomFutureTime}
        onChatRead={handleChatRead}
        onToggleRedBox={handleToggleRedBox}
        onRemoveRelief={handleRemoveRelief}
        unreadCount={selectedStaff?.phone ? (unreadCountsByPhone[selectedStaff.phone.replace(/\D/g, '').slice(-10)] || 0) : 0}
        magnetNotes={boardState?.magnetNotes}
        onUpdateMagnetNote={handleUpdateMagnetNote}
      />

      <SlotAssignModal
        isOpen={!!slotAssignTarget}
        targetSlot={slotAssignTarget ? {
          ...slotAssignTarget,
          currentRelief: findSlotRelief(slotAssignTarget.id, slotAssignTarget.type)
        } : null}
        staff={boardState.staff}
        assignedStaffIds={assignedStaffIds}
        currentUserRole={currentUserRole}
        onClose={() => setSlotAssignTarget(null)}
        onAssign={handleAssignStaff}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onSetFutureTime={handleSetRoomFutureTime}
        onToggleRedBox={handleToggleRedBox}
        onOpenReliefModal={target => {
          if (currentUserRole === 'view_only') {
            setIsLoginModalOpen(true);
            return;
          }
          setReliefTarget(target);
        }}
      />

      {/* Smart Relief Movement Resolution Dialog */}
      {pendingReliefMovePrompt && (
        <ReliefConflictModal
          isOpen={!!pendingReliefMovePrompt}
          onClose={() => setPendingReliefMovePrompt(null)}
          staffName={pendingReliefMovePrompt.staffName}
          sourceRoomName={pendingReliefMovePrompt.sourceRoomName}
          reliefStaffName={pendingReliefMovePrompt.reliefStaffName}
          reliefTime={pendingReliefMovePrompt.reliefTime}
          isRedBox={pendingReliefMovePrompt.isRedBox}
          canMoveReliefWithStaff={pendingReliefMovePrompt.toType === 'room_slot' || pendingReliefMovePrompt.toType === 'runner_slot'}
          onResolve={action => {
            const prompt = pendingReliefMovePrompt;
            setPendingReliefMovePrompt(null);
            executeDropStaff(prompt.fromData, prompt.toType, prompt.toId, action, prompt.targetGroup);
          }}
        />
      )}

      <ReliefModal
        isOpen={!!reliefTarget}
        target={reliefTarget}
        staff={boardState.staff}
        currentUserRole={currentUserRole}
        activeReliefStaffIds={activeReliefStaffIds}
        onClose={() => setReliefTarget(null)}
        onSetRelief={handleSetRelief}
        onRemoveRelief={handleRemoveRelief}
        onExecuteHandoff={handleExecuteHandoff}
      />

      <ReliefTextModal
        isOpen={isReliefTextModalOpen}
        onClose={() => setIsReliefTextModalOpen(false)}
        boardState={boardState}
        currentUser={currentUser}
        currentUserRole={currentUserRole}
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
        messagingConfig={boardState.messagingConfig}
        layoutConfig={boardState.layoutConfig}
        onSaveDepartments={handleSaveDepartments}
        onResetToPhotoDefault={handleResetToPhotoDefault}
        onClearAllTextNotes={handleClearAllTextNotes}
        onRefreshData={() => fetchBoardState(false)}
        onUpdateCurrentUser={(updated) => setCurrentUser(prev => prev ? { ...prev, ...updated } : updated)}
      />

      <AuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        currentUser={currentUser}
        onRevertAuditLog={handleRevertAuditLog}
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

      {/* Clear All Text Notes Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isClearNotesModalOpen}
        title="Clear All Text Notes"
        itemName="All Room & Magnet Text Notes"
        itemCategory="Text Notes Reset"
        message="Are you sure you want to clear all text notes across the whiteboard? This will remove all free-text notes from rooms and clinician magnets."
        confirmButtonText="Clear All Notes"
        cancelButtonText="Cancel"
        onConfirm={handleClearAllTextNotes}
        onClose={() => setIsClearNotesModalOpen(false)}
      />

      {/* Complete All Relief Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isCompleteReliefConfirmOpen}
        title="Complete All Relief Assignments"
        itemName={`${totalScheduledReliefsCount} Relief Assignment${totalScheduledReliefsCount === 1 ? '' : 's'}`}
        itemCategory="Suite-Wide Relief"
        message={`Are you sure you want to complete all ${totalScheduledReliefsCount} relief assignments? This will move each relief person directly into their assigned room or runner slot and clear the relief badges.`}
        confirmButtonText="Complete All Reliefs"
        cancelButtonText="Cancel"
        onConfirm={handleConfirmCompleteAllReliefs}
        onClose={() => setIsCompleteReliefConfirmOpen(false)}
      />

      {/* Staff Unassign / Availability Routing Modal */}
      <StaffUnassignModal
        isOpen={!!unassignPromptTarget}
        staff={unassignPromptTarget?.staff || null}
        fromLocationName={unassignPromptTarget?.fromLocationName}
        otherAssignments={promptOtherAssignments}
        onRemoveFromCurrentOnly={handleConfirmRemoveCurrentOnly}
        onSendToBullpen={handleConfirmUnassignToBullpen}
        onMarkLeaving={handleConfirmUnassignLeaving}
        onClose={() => setUnassignPromptTarget(null)}
      />

      {/* Floating Toast Notification & Layer 1 Quick Undo Banner */}
      {(activeUndoToast || toastMessage) && (
        <div
          style={{
            position: 'fixed',
            bottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: 'var(--surface-card)',
            color: 'var(--text-primary)',
            padding: '7px 12px 7px 16px',
            borderRadius: 10,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.28), 0 2px 8px rgba(0, 0, 0, 0.08)',
            border: '1.5px solid var(--accent-primary)',
            width: 'calc(100% - 24px)',
            maxWidth: 480,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            boxSizing: 'border-box'
          }}
        >
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              lineHeight: 1.3,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={activeUndoToast ? activeUndoToast.description : (toastMessage || '')}
          >
            {activeUndoToast ? activeUndoToast.description : toastMessage}
          </span>

          {activeUndoToast && (
            <button
              type="button"
              onClick={() => handleExecuteUndo(activeUndoToast.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'var(--accent-primary)',
                color: '#ffffff',
                border: 'none',
                padding: '5px 12px',
                borderRadius: 7,
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
              }}
              title="Quick Undo: Revert this action immediately"
            >
              <Undo2 size={13} />
              <span>Undo</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveUndoToast(null);
              setToastMessage(null);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px 6px',
              fontWeight: 800,
              fontSize: 14,
              flexShrink: 0,
              lineHeight: 1
            }}
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};
