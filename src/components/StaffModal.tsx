'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { apiUrl } from '@/lib/api';
import { Staff, Department, UserRole, ReliefAssignment, ChatMessage, BreakDisplayConfig } from '@/types/whiteboard';
import { Phone, Clock, MapPin, X, ArrowRight, CornerDownLeft, ShieldCheck, Sparkles, MessageSquare, Send, RefreshCw, Check, GraduationCap } from 'lucide-react';
import { getFutureTimePresets } from '@/lib/dateUtils';

export interface StaffPlacement {
  type: 'runner_slot' | 'room_slot' | 'bullpen';
  id: string;
  departmentId?: string;
  departmentName?: string;
  roomName?: string;
  roomId?: string;
  locationName: string;
  futureTime?: string | null;
  breakfastDone: boolean;
  lunchDone: boolean;
  dinnerDone?: boolean;
  relief?: ReliefAssignment | null;
}

interface StaffModalProps {
  staff: Staff | null;
  departments: Department[];
  allStaff?: Staff[];
  bullpenStaffIds?: string[];
  bullpenBreaks?: Record<string, { breakfastDone: boolean; lunchDone: boolean; dinnerDone?: boolean; breakfastTime?: string | null; lunchTime?: string | null; dinnerTime?: string | null }>;
  currentUserRole: UserRole;
  onClose: () => void;
  onAssignToSlot: (targetType: 'room_slot' | 'runner_slot', targetId: string, staffId: string) => void;
  onUnassign: (staffId: string) => void;
  onRemoveFromSlot?: (
    targetType: 'runner_slot' | 'room_slot' | 'bullpen',
    targetId: string,
    departmentId?: string,
    staffId?: string
  ) => Promise<void> | void;
  onMoveToBullpen?: (staffId: string) => void;
  onToggleBreak: (targetType: 'room_slot' | 'runner_slot' | 'bullpen', targetId: string, breakType: 'breakfast' | 'lunch' | 'dinner', value: boolean) => void;
  onUpdateShift?: (staffId: string, newShift: string, lastName?: string, credentials?: Staff['credentials'], isCallTeam?: boolean) => void;
  onUpdateDisplayName?: (staffId: string, displayName: string) => void;
  onSetStaffInfrequent?: (staffId: string, isInfrequent: boolean) => void;
  onOpenLogin?: () => void;
  onOpenReliefModal?: (target: {
    type: 'room_slot' | 'runner_slot';
    id: string;
    roomName: string;
    departmentName: string;
    currentStaff: Staff | null;
    currentRelief?: ReliefAssignment | null;
  }) => void;
  onSetRoomFutureTime?: (roomId: string, futureTime: string | null) => void;
  onChatRead?: (staffPhone: string) => void;
  onUpdateStudent?: (staffId: string, hasStudent: boolean, studentName?: string) => Promise<void> | void;
  onToggleRedBox?: (targetType: 'room_slot' | 'runner_slot', targetId: string, enable: boolean) => void;
  onRemoveRelief?: (targetType: 'room_slot' | 'runner_slot', targetId: string) => void;
  unreadCount?: number;
  magnetNotes?: Record<string, string>;
  onUpdateMagnetNote?: (staffId: string, note: string) => void;
  onUpdatePhone?: (staffId: string, phone: string) => void;
  breakDisplay?: BreakDisplayConfig;
}

export const StaffModal: React.FC<StaffModalProps> = ({
  staff,
  departments,
  allStaff = [],
  bullpenStaffIds = [],
  bullpenBreaks = {},
  currentUserRole,
  onClose,
  onAssignToSlot,
  onUnassign,
  onRemoveFromSlot,
  onMoveToBullpen,
  onToggleBreak,
  onUpdateShift,
  onUpdateDisplayName,
  onSetStaffInfrequent,
  onOpenLogin,
  onOpenReliefModal,
  onSetRoomFutureTime,
  onChatRead,
  onUpdateStudent,
  onToggleRedBox,
  onRemoveRelief,
  unreadCount = 0,
  magnetNotes,
  onUpdateMagnetNote,
  onUpdatePhone,
  breakDisplay
}) => {
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [isEditingShift, setIsEditingShift] = useState(false);
  const [customShift, setCustomShift] = useState(staff?.shift || 'Day');
  const [isCallTeamSelected, setIsCallTeamSelected] = useState(false);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(staff?.displayName || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  // Resolve effective phone: fallback to allStaff if missing or dummy (555) 000-0000
  const cleanPhone = (staff?.phone || '').trim();
  const isDummyPhone = !cleanPhone || cleanPhone.includes('000-0000') || cleanPhone === '(555) 000-0000';
  const matchedFromAllStaff = (isDummyPhone && allStaff && staff) ? allStaff.find(s => 
    (staff.qgendaAbbr && s.qgendaAbbr?.toUpperCase() === staff.qgendaAbbr.toUpperCase() && s.phone && !s.phone.includes('000-0000')) ||
    (s.lastName.toUpperCase() === staff.lastName.toUpperCase() && s.credentials === staff.credentials && s.phone && !s.phone.includes('000-0000'))
  ) : undefined;
  const effectivePhone = !isDummyPhone ? cleanPhone : (matchedFromAllStaff?.phone || '');
  const [phoneInput, setPhoneInput] = useState(effectivePhone);

  useEffect(() => {
    setIsEditingPhone(false);
    setPhoneInput(effectivePhone);
  }, [staff?.id, effectivePhone]);

  const currentMagnetNote = (staff?.id && magnetNotes && magnetNotes[staff.id] !== undefined)
    ? magnetNotes[staff.id]
    : (staff?.magnetNote || '');
  const [magnetNoteDraft, setMagnetNoteDraft] = useState(currentMagnetNote);
  const [isNoteSaved, setIsNoteSaved] = useState(false);

  useEffect(() => {
    const note = (staff?.id && magnetNotes && magnetNotes[staff.id] !== undefined)
      ? magnetNotes[staff.id]
      : (staff?.magnetNote || '');
    setMagnetNoteDraft(note);
    setIsNoteSaved(false);
  }, [staff, magnetNotes]);

  // --- Perfect Call Messaging State ---
  const [messagingEnabled, setMessagingEnabled] = useState(false);
  const [recipientProfile, setRecipientProfile] = useState<{
    id: string;
    fullName: string;
    phone?: string;
    isOnline: boolean;
    lastSeenAt?: string | null;
  } | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [quickSendSuccess, setQuickSendSuccess] = useState<string | null>(null);
  const [hasStudentInput, setHasStudentInput] = useState(Boolean(staff?.hasStudent));
  const [studentNameInput, setStudentNameInput] = useState(staff?.studentName || '');
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [studentSaveSuccess, setStudentSaveSuccess] = useState(false);
  const [isPagingExpanded, setIsPagingExpanded] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const pagingAccordionRef = useRef<HTMLDivElement>(null);

  // Auto-expand paging section ONLY if there are active unread incoming messages
  useEffect(() => {
    if (unreadCount > 0) {
      setIsPagingExpanded(true);
    }
  }, [unreadCount]);

  // Smooth scroll into view when paging section is expanded so all controls are exposed
  useEffect(() => {
    if (isPagingExpanded && pagingAccordionRef.current) {
      const timer = setTimeout(() => {
        pagingAccordionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isPagingExpanded]);

  const fetchMessagingStatus = async (phone?: string) => {
    setIsLoadingChat(true);
    setChatError(null);
    try {
      const phoneParam = phone ? `&phone=${encodeURIComponent(phone)}` : '';
      const res = await fetch(apiUrl(`/api/messages?action=check_status${phoneParam}`));
      const data = await res.json();
      setMessagingEnabled(Boolean(data.enabled));
      if (data.enabled && data.recipientProfile) {
        setRecipientProfile(data.recipientProfile);
        loadChatMessages(data.recipientProfile.id);
      } else {
        setRecipientProfile(null);
        setChatMessages([]);
      }
    } catch (err: any) {
      console.warn('Failed to load messaging status:', err);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const loadChatMessages = async (recipientId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/messages?action=get_chat&recipientId=${encodeURIComponent(recipientId)}`));
      const data = await res.json();
      if (res.ok && data.messages) {
        setChatId(data.chatId);
        setChatMessages(data.messages);
        if (staff?.phone && onChatRead) {
          onChatRead(staff.phone);
        }
      } else if (data.error) {
        setChatError(data.error);
      }
    } catch (err: any) {
      console.warn('Error loading chat messages:', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || messageInput).trim();
    if (!text || !recipientProfile || isSendingMessage) return;

    setIsSendingMessage(true);
    setChatError(null);
    try {
      const res = await fetch(apiUrl('/api/messages'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_MESSAGE',
          recipientId: recipientProfile.id,
          content: text
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.message) {
        setChatMessages((prev: ChatMessage[]) => [...prev, data.message]);
        setMessageInput('');
        setQuickSendSuccess(`Page sent: "${text}"`);
        setTimeout(() => setQuickSendSuccess(null), 4000);
      } else {
        setChatError(data.error || 'Failed to send message');
      }
    } catch (err: any) {
      setChatError(err.message || 'Network error while sending');
    } finally {
      setIsSendingMessage(false);
    }
  };

  useEffect(() => {
    if (staff) {
      setCustomShift(staff.shift || 'Day');
      setIsEditingShift(false);
      setDisplayNameInput(staff.displayName || '');
      setIsEditingDisplayName(false);
      setHasStudentInput(Boolean(staff.hasStudent));
      setStudentNameInput(staff.studentName || '');
      setStudentSaveSuccess(false);
      fetchMessagingStatus(staff.phone);
    }
  }, [staff?.id, staff?.shift, staff?.displayName, staff?.phone, staff?.hasStudent, staff?.studentName]);

  const handleSaveStudent = async (hasStudent: boolean, name?: string) => {
    if (!onUpdateStudent || !staff) return;
    setIsSavingStudent(true);
    try {
      await onUpdateStudent(staff.id, hasStudent, name);
      setStudentSaveSuccess(true);
      setTimeout(() => setStudentSaveSuccess(false), 2500);
    } catch {
      // error handled in parent
    } finally {
      setIsSavingStudent(false);
    }
  };

  // Auto-scroll chat thread to bottom so latest messages are immediately visible
  useEffect(() => {
    if (chatMessages.length > 0) {
      const scrollToBottom = () => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      };
      scrollToBottom();
      const t1 = setTimeout(scrollToBottom, 40);
      const t2 = setTimeout(scrollToBottom, 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [chatMessages, messagingEnabled]);

  // Room Future Case Time State
  const [futureTimeInput, setFutureTimeInput] = useState('');
  const [isFutureTimeSavedRecently, setIsFutureTimeSavedRecently] = useState(false);

  // Find room placement if staff is assigned to a room
  const staffRoomPlacement = staff
    ? departments.flatMap(d => d.rooms || []).find(r => (r.slots || []).some(s => s.staffId === staff.id))
    : null;
  const currentRoomFutureTime = staffRoomPlacement?.futureTime || '';

  useEffect(() => {
    setFutureTimeInput(currentRoomFutureTime);
    setIsFutureTimeSavedRecently(false);
  }, [staff?.id, staffRoomPlacement?.id, currentRoomFutureTime]);

  const futurePresets = useMemo(() => getFutureTimePresets(7), [staff?.id, staffRoomPlacement?.id]);

  if (!staff) return null;

  const isEditor = currentUserRole === 'board_runner' || currentUserRole === 'admin' || currentUserRole === 'superuser';
  const canEditStudent = currentUserRole !== 'view_only';

  // Find where this staff is currently assigned (supports multiple runner slots across departments)
  const allPlacements: StaffPlacement[] = [];

  for (const dept of departments) {
    for (const r of dept.runnerSlots || []) {
      if (r.staffId === staff.id) {
        allPlacements.push({
          type: 'runner_slot',
          id: r.id,
          departmentId: dept.id,
          departmentName: dept.name,
          roomName: r.title,
          locationName: `${dept.name} Runner (${r.title})`,
          breakfastDone: r.breakfastDone,
          lunchDone: r.lunchDone,
          dinnerDone: r.dinnerDone,
          relief: r.relief
        });
      }
    }

    for (const room of dept.rooms || []) {
      for (const slot of room.slots || []) {
        if (slot.staffId === staff.id) {
          allPlacements.push({
            type: 'room_slot',
            id: slot.id,
            departmentId: dept.id,
            departmentName: dept.name,
            roomId: room.id,
            roomName: `Room ${room.name}`,
            futureTime: room.futureTime,
            locationName: `${dept.name} Room ${room.name}`,
            breakfastDone: slot.breakfastDone,
            lunchDone: slot.lunchDone,
            dinnerDone: slot.dinnerDone,
            relief: slot.relief
          });
        }
      }
    }
  }

  if (allPlacements.length === 0 && bullpenStaffIds.includes(staff.id)) {
    const b = bullpenBreaks[staff.id];
    allPlacements.push({
      type: 'bullpen',
      id: staff.id,
      locationName: 'Bullpen (Available Staff)',
      breakfastDone: b?.breakfastDone ?? false,
      lunchDone: b?.lunchDone ?? false,
      dinnerDone: b?.dinnerDone ?? false
    });
  }

  const roomPlacement = allPlacements.find(p => p.type === 'room_slot' || p.type === 'runner_slot') || null;

  const isFutureTimeSaved = isFutureTimeSavedRecently || Boolean(currentRoomFutureTime && futureTimeInput.trim() === currentRoomFutureTime.trim());

  const handleSaveFutureTime = (timeToSet?: string) => {
    const roomId = (roomPlacement?.type === 'room_slot' ? roomPlacement?.roomId : undefined) || staffRoomPlacement?.id;
    if (!roomId || !onSetRoomFutureTime) return;
    const finalVal = (timeToSet !== undefined ? timeToSet : futureTimeInput).trim();
    const cleanTime = finalVal ? finalVal.replace(/[^0-9]/g, '').slice(0, 4) : null;
    onSetRoomFutureTime(roomId, cleanTime);
    setFutureTimeInput(cleanTime || '');
    setIsFutureTimeSavedRecently(true);
    setTimeout(() => setIsFutureTimeSavedRecently(false), 2000);
  };

  const handleClearFutureTime = () => {
    const roomId = (roomPlacement?.type === 'room_slot' ? roomPlacement?.roomId : undefined) || staffRoomPlacement?.id;
    if (!roomId || !onSetRoomFutureTime) return;
    onSetRoomFutureTime(roomId, null);
    setFutureTimeInput('');
    setIsFutureTimeSavedRecently(false);
  };

  // Synced break statuses across all active placements
  const isBreakfastDone = allPlacements.some(p => p.breakfastDone) || Boolean(bullpenBreaks[staff.id]?.breakfastDone);
  const isLunchDone = allPlacements.some(p => p.lunchDone) || Boolean(bullpenBreaks[staff.id]?.lunchDone);
  const isDinnerDone = allPlacements.some(p => p.dinnerDone) || Boolean(bullpenBreaks[staff.id]?.dinnerDone);

  // Available room & runner slots for quick reassignment
  const availableSlots: Array<{ id: string; type: 'room_slot' | 'runner_slot'; label: string }> = [];
  departments.forEach(dept => {
    dept.runnerSlots.forEach(r => {
      availableSlots.push({
        id: r.id,
        type: 'runner_slot',
        label: `${dept.name} Runner: ${r.title}`
      });
    });
    dept.rooms.forEach(room => {
      room.slots.forEach(slot => {
        availableSlots.push({
          id: slot.id,
          type: 'room_slot',
          label: `${dept.name} Room ${room.name}`
        });
      });
    });
  });

  const handleReassign = () => {
    if (!selectedDestination) return;
    const dest = availableSlots.find(s => s.id === selectedDestination);
    if (dest) {
      onAssignToSlot(dest.type, dest.id, staff.id);
      onClose();
    }
  };

  const handleRemovePlacement = async (placement: StaffPlacement) => {
    if (onRemoveFromSlot) {
      await onRemoveFromSlot(placement.type, placement.id, placement.departmentId, staff.id);
      if (allPlacements.length <= 1) {
        onClose();
      }
    }
  };

  const handleToggleBreakfast = () => {
    if (allPlacements.length > 0) {
      allPlacements.forEach(p => {
        onToggleBreak(p.type, p.id, 'breakfast', !isBreakfastDone);
      });
    } else {
      onToggleBreak('bullpen', staff.id, 'breakfast', !isBreakfastDone);
    }
  };

  const handleToggleLunch = () => {
    if (allPlacements.length > 0) {
      allPlacements.forEach(p => {
        onToggleBreak(p.type, p.id, 'lunch', !isLunchDone);
      });
    } else {
      onToggleBreak('bullpen', staff.id, 'lunch', !isLunchDone);
    }
  };

  const handleToggleDinner = () => {
    if (allPlacements.length > 0) {
      allPlacements.forEach(p => {
        onToggleBreak(p.type, p.id, 'dinner', !isDinnerDone);
      });
    } else {
      onToggleBreak('bullpen', staff.id, 'dinner', !isDinnerDone);
    }
  };

  const handleUnassignClick = () => {
    onUnassign(staff.id);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="pin-pad-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: 'min(92vh, calc(100dvh - 32px))',
          padding: 0,
          textAlign: 'left',
          alignItems: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 14,
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Sticky Header with Doctor Info & prominent Close button */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--surface-card)',
          borderBottom: '1px solid var(--border-light)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
                {staff.lastName}{staff.firstName ? `, ${staff.firstName}` : ''}
              </h2>
              <span className={`magnet-cred cred-${staff.credentials}`} style={{ fontSize: 11, padding: '2px 6px' }}>
                {staff.credentials}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>ID: {staff.id.split('_').slice(-1)[0]} • Anesthesia Care Team</span>
              {staff.orderNumber && (
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 3,
                    background: 'rgba(9, 105, 218, 0.1)',
                    color: 'var(--accent-primary)',
                    border: '1px solid rgba(9, 105, 218, 0.25)'
                  }}
                  title={`OneUSAP Departure Order #${staff.orderNumber}`}
                >
                  OneUSAP Order #{staff.orderNumber}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
              marginLeft: 8
            }}
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px 20px 32px 20px',
          display: 'block',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y'
        }}>

        {/* Contact & Shift Info */}
        <div style={{
          background: 'var(--surface-hover)',
          borderRadius: 8,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          border: '1px solid var(--border-light)',
          marginBottom: 16
        }}>
          {/* Magnet Display Name (View and Edit) */}
          {!isEditingDisplayName ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Sparkles size={15} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontWeight: 600 }}>Magnet Name:</span>
                <span style={{
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  background: 'var(--surface-card)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--border-light)'
                }}>
                  {staff.displayName || `${staff.lastName.toUpperCase()}${staff.firstName ? ` ${staff.firstName[0]}.` : ''}`}
                </span>
              </div>
              {isEditor && onUpdateDisplayName && (
                <button
                  type="button"
                  onClick={() => setIsEditingDisplayName(true)}
                  style={{
                    fontSize: 11,
                    color: 'var(--accent-primary)',
                    background: 'transparent',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Edit Name
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Custom Magnet Display Name:
                </label>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                <input
                  type="text"
                  placeholder="e.g. Dr. Dave, Johnny, or blank for default"
                  value={displayNameInput}
                  onChange={e => setDisplayNameInput(e.target.value)}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--border-light)',
                    fontSize: 12,
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateDisplayName) {
                        onUpdateDisplayName(staff.id, displayNameInput.trim());
                      }
                      setIsEditingDisplayName(false);
                    }}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--accent-primary)',
                      color: '#fff',
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      border: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayNameInput(staff.displayName || '');
                      setIsEditingDisplayName(false);
                    }}
                    style={{
                      padding: '6px 10px',
                      background: 'transparent',
                      border: '1px solid var(--border-light)',
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Phone (View and Edit) */}
          {!isEditingPhone ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Phone size={15} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontWeight: 600 }}>Cell Phone:</span>
                {effectivePhone ? (
                  <a
                    href={`tel:${effectivePhone}`}
                    style={{ fontWeight: 800, color: 'var(--accent-primary)', textDecoration: 'underline' }}
                  >
                    {effectivePhone}
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>
                    No cell phone on file
                  </span>
                )}
              </div>
              {isEditor && onUpdatePhone && (
                <button
                  type="button"
                  onClick={() => {
                    setPhoneInput(effectivePhone);
                    setIsEditingPhone(true);
                  }}
                  style={{
                    fontSize: 11,
                    color: 'var(--accent-primary)',
                    background: 'transparent',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {effectivePhone ? 'Edit Phone' : '+ Add Phone'}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={14} style={{ color: 'var(--accent-primary)' }} />
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Cell Phone Number:
                </label>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                <input
                  type="tel"
                  placeholder="e.g. (832) 555-1234"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--border-light)',
                    fontSize: 12,
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdatePhone && staff) {
                        onUpdatePhone(staff.id, phoneInput.trim());
                      }
                      setIsEditingPhone(false);
                    }}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--accent-primary)',
                      color: '#fff',
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      border: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneInput(effectivePhone);
                      setIsEditingPhone(false);
                    }}
                    style={{
                      padding: '6px 10px',
                      background: 'transparent',
                      border: '1px solid var(--border-light)',
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Shift (View and Edit) */}
          {!isEditingShift ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Clock size={15} style={{ color: 'var(--marker-red)' }} />
                <span style={{ fontWeight: 600 }}>Scheduled Shift:</span>
                <span style={{
                  fontWeight: 800,
                  color: /call|cv|ob/i.test(staff.shift || '') ? 'var(--marker-red)' : 'var(--text-primary)',
                  background: /call|cv|ob/i.test(staff.shift || '') ? 'rgba(211, 47, 47, 0.08)' : 'transparent',
                  padding: /call|cv|ob/i.test(staff.shift || '') ? '1px 6px' : '0',
                  borderRadius: 4
                }}>
                  {staff.shift || '07:00 - 15:30'}
                </span>
              </div>
              {isEditor && onUpdateShift && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomShift(staff.shift || 'Day');
                      setIsCallTeamSelected(false);
                      setIsEditingShift(true);
                    }}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer'
                    }}
                    title="Change scheduled shift or departure badge (e.g. postCV, pre1st, OBcall, 2p)"
                  >
                    Edit Shift / Badge
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '10px', background: 'var(--surface-card)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>Scheduled Shift & Departure Badge:</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tap a preset or type below</span>
              </div>

              {/* 1. Post-Call Badges */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#059669', marginBottom: 3 }}>
                  🟢 POST-CALL BADGES (Kept in Post-Call Section):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['postCV', 'postC1', 'postC2', 'postOB', 'post1st', 'Post-Call'].map(preset => {
                    const isSelected = !isCallTeamSelected && customShift.toLowerCase() === preset.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setCustomShift(preset);
                          setIsCallTeamSelected(false);
                        }}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          border: isSelected ? '1.5px solid #059669' : '1px solid rgba(5, 150, 105, 0.3)',
                          background: isSelected ? 'rgba(5, 150, 105, 0.22)' : 'rgba(5, 150, 105, 0.08)',
                          color: '#059669',
                          cursor: 'pointer'
                        }}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Pre-Call Badges */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#0d9488', marginBottom: 3 }}>
                  🔵 PRE-CALL BADGES (Kept in Non-Call Section):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['pre1st', 'preCV', 'preC3', 'preC1', 'preC2', 'preOB'].map(preset => {
                    const isSelected = !isCallTeamSelected && customShift.toLowerCase() === preset.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setCustomShift(preset);
                          setIsCallTeamSelected(false);
                        }}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          border: isSelected ? '1.5px solid #0d9488' : '1px solid rgba(13, 148, 136, 0.3)',
                          background: isSelected ? 'rgba(13, 148, 136, 0.22)' : 'rgba(13, 148, 136, 0.08)',
                          color: '#0d9488',
                          cursor: 'pointer'
                        }}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Outside / Backup Call Badges */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#d97706', marginBottom: 3 }}>
                  🟠 BACKUP / OUTSIDE CALL (Kept in Non-Call Section):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['C1', 'OBcall', 'CVcall'].map(preset => {
                    const isSelected = !isCallTeamSelected && customShift.toLowerCase() === preset.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setCustomShift(preset);
                          setIsCallTeamSelected(false);
                        }}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          border: isSelected ? '1.5px solid #d97706' : '1px solid rgba(217, 119, 6, 0.3)',
                          background: isSelected ? 'rgba(217, 119, 6, 0.22)' : 'rgba(217, 119, 6, 0.08)',
                          color: '#d97706',
                          cursor: 'pointer'
                        }}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Departure Times & Day */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#2563eb', marginBottom: 3 }}>
                  ⏱️ DEPARTURE TIMES & DAY:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['Day (No Badge)', '2p (Special)', '1p', '3p', '4p', '5p', '7p', '8p'].map(preset => {
                    const presetValue = preset === '2p (Special)' ? '2p' : preset === 'Day (No Badge)' ? 'Day' : preset;
                    const isSelected = !isCallTeamSelected && customShift.toLowerCase() === presetValue.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setCustomShift(presetValue);
                          setIsCallTeamSelected(false);
                        }}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          border: isSelected ? '1.5px solid #2563eb' : '1px solid var(--border-light)',
                          background: isSelected ? 'rgba(37, 99, 235, 0.18)' : 'var(--surface-hover)',
                          color: isSelected ? '#2563eb' : 'var(--text-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. In-House Call Shift Presets */}
              <div style={{ marginTop: 2, paddingTop: 6, borderTop: '1px dashed var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--marker-red)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={12} />
                    <span>In-House Call Team (Assigns to Tonight&apos;s Call Team, removes from Departure):</span>
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['Call 1', 'Call 2', 'Call 3', 'Call CV', 'Call OB', 'C1,OB'].map(callPreset => {
                    const isSelected = isCallTeamSelected && customShift.toLowerCase() === callPreset.toLowerCase();
                    return (
                      <button
                        key={callPreset}
                        type="button"
                        onClick={() => {
                          setCustomShift(callPreset);
                          setIsCallTeamSelected(true);
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 800,
                          border: isSelected ? '1.5px solid var(--marker-red)' : '1px solid var(--border-light)',
                          background: isSelected ? 'rgba(211, 47, 47, 0.22)' : 'rgba(211, 47, 47, 0.08)',
                          color: 'var(--marker-red)',
                          cursor: 'pointer'
                        }}
                      >
                        {callPreset}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, width: '100%', boxSizing: 'border-box' }}>
                <input
                  type="text"
                  value={customShift}
                  onChange={e => {
                    setCustomShift(e.target.value);
                    setIsCallTeamSelected(false);
                  }}
                  placeholder="e.g. postCV, pre1st, OBcall, 2p, or 4p"
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    padding: '5px 8px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-board)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateShift && customShift.trim()) {
                        onUpdateShift(staff.id, customShift.trim(), staff.lastName, staff.credentials, isCallTeamSelected);
                        setIsEditingShift(false);
                      }
                    }}
                    style={{
                      padding: '5px 12px',
                      background: 'var(--accent-primary)',
                      color: '#fff',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingShift(false)}
                    style={{
                      padding: '4px 8px',
                      background: 'var(--surface-hover)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Current Assignment(s) Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-secondary)' }}>
                <MapPin size={15} style={{ color: 'var(--marker-green)', flexShrink: 0 }} />
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {allPlacements.length > 1 ? `Current Assignments (${allPlacements.length}):` : 'Current Assignment:'}
                </span>
              </div>
              {allPlacements.length > 1 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'var(--accent-primary)',
                  background: 'rgba(9, 105, 218, 0.1)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  textTransform: 'uppercase'
                }}>
                  Multi-Dept Runner
                </span>
              )}
            </div>

            {allPlacements.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allPlacements.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      background: 'var(--surface-card)',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1.5px solid var(--border-light)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                      <span style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--marker-green)',
                        flexShrink: 0
                      }} />
                      <span style={{
                        fontWeight: 800,
                        fontSize: 13,
                        color: 'var(--text-primary)',
                        wordBreak: 'break-word'
                      }}>
                        {p.locationName}
                      </span>
                    </div>
                    {isEditor && onRemoveFromSlot && (
                      <button
                        type="button"
                        onClick={() => handleRemovePlacement(p)}
                        title={`Remove from ${p.locationName}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 9px',
                          borderRadius: 4,
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: 'var(--marker-red)',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          flexShrink: 0,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <X size={12} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: 'var(--surface-card)',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px dashed var(--border-light)'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--text-muted)',
                  flexShrink: 0
                }} />
                <span style={{
                  fontWeight: 700,
                  fontSize: 12.5,
                  color: 'var(--text-muted)'
                }}>
                  Credentialed Unassigned Staff
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Clinical Teaching / Student Precepting Card */}
        <div style={{
          background: 'var(--surface-hover)',
          borderRadius: 8,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          border: hasStudentInput ? '1.5px solid rgba(99, 102, 241, 0.45)' : '1px solid var(--border-light)',
          marginBottom: 16,
          transition: 'border 0.2s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <GraduationCap size={17} style={{ color: '#6366f1' }} />
              <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--text-primary)' }}>
                Student / Trainee Precepting
              </span>
              {staff.hasStudent && (
                <span style={{
                  background: 'rgba(99, 102, 241, 0.18)',
                  color: '#818cf8',
                  border: '1px solid rgba(129, 140, 248, 0.4)',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: 4
                }}>
                  ACTIVE
                </span>
              )}
            </div>
            {studentSaveSuccess && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--marker-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={13} />
                <span>Saved</span>
              </span>
            )}
          </div>

          {canEditStudent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={hasStudentInput}
                  onChange={e => {
                    const checked = e.target.checked;
                    setHasStudentInput(checked);
                    if (!checked) {
                      setStudentNameInput('');
                      handleSaveStudent(false, '');
                    }
                  }}
                  style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <span>Working with a student / trainee today</span>
              </label>

              {hasStudentInput && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 24 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Student Name &amp; Role (Reference):
                  </label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                    <input
                      type="text"
                      placeholder="e.g. Jessica Miller, SRNA or Mark Tan, MS4"
                      value={studentNameInput}
                      onChange={e => setStudentNameInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleSaveStudent(true, studentNameInput);
                        }
                      }}
                      style={{
                        flex: '1 1 0',
                        minWidth: 0,
                        padding: '6px 8px',
                        borderRadius: 4,
                        border: '1px solid var(--border-light)',
                        fontSize: 12,
                        fontWeight: 600,
                        background: 'var(--bg-board)',
                        color: 'var(--text-primary)',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleSaveStudent(true, studentNameInput)}
                        disabled={isSavingStudent}
                        style={{
                          padding: '6px 14px',
                          background: '#6366f1',
                          color: '#fff',
                          borderRadius: 4,
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Check size={13} />
                        <span>{isSavingStudent ? 'Saving...' : 'Save'}</span>
                      </button>
                      {staff.hasStudent && (
                        <button
                          type="button"
                          onClick={() => {
                            setHasStudentInput(false);
                            setStudentNameInput('');
                            handleSaveStudent(false, '');
                          }}
                          title="Remove student assignment"
                          style={{
                            padding: '6px 10px',
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: 4,
                            color: 'var(--marker-red)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    💡 Displays a 🎓 STU badge on this clinician&apos;s magnet across all rooms and runner slots.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div>
              {staff.hasStudent ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Assigned Student:</span>
                  <span style={{
                    fontWeight: 800,
                    color: '#818cf8',
                    background: 'rgba(99, 102, 241, 0.12)',
                    padding: '3px 10px',
                    borderRadius: 4,
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                  }}>
                    🎓 {staff.studentName || 'Student Trainee'}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  No student assigned today.
                </div>
              )}
            </div>
          )}
        </div>
        {/* Red Magnet Note (Travels with Magnet across rooms/runner/bullpen) */}
        <div style={{
          background: 'var(--surface-card)',
          borderRadius: 8,
          padding: '10px 14px',
          border: '1.5px solid var(--border-light)',
          marginBottom: 16
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: 'var(--text-secondary)',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#ef4444', fontSize: 13 }}>●</span> Magnet Note (Red Text • Travels with Magnet)
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{magnetNoteDraft.length}/15 chars</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                maxLength={15}
                placeholder="e.g. 10:30 start, Late, Ped..."
                value={magnetNoteDraft}
                onChange={(e) => {
                  setMagnetNoteDraft(e.target.value.slice(0, 15));
                  setIsNoteSaved(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (onUpdateMagnetNote && staff) {
                      onUpdateMagnetNote(staff.id, magnetNoteDraft.trim());
                      setIsNoteSaved(true);
                    }
                  }
                }}
                style={{
                  width: '100%',
                  padding: magnetNoteDraft ? '7px 32px 7px 10px' : '7px 10px',
                  borderRadius: 6,
                  border: '1.5px solid rgba(239, 68, 68, 0.45)',
                  background: 'var(--surface-hover)',
                  color: '#ef4444',
                  fontWeight: 800,
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {Boolean(magnetNoteDraft) && (
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setMagnetNoteDraft('');
                    setIsNoteSaved(false);
                    if (onUpdateMagnetNote && staff) {
                      onUpdateMagnetNote(staff.id, '');
                    }
                  }}
                  style={{
                    position: 'absolute',
                    right: 6,
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                  title="Delete note"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Save Note / Saved Dynamic Button */}
            {(() => {
              const isSaved = isNoteSaved || Boolean(currentMagnetNote && magnetNoteDraft.trim() === currentMagnetNote.trim());
              return isSaved ? (
                <button
                  type="button"
                  disabled
                  style={{
                    padding: '7px 14px',
                    borderRadius: 6,
                    background: '#10b981',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'default',
                    border: 'none',
                    boxShadow: '0 1px 4px rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Check size={14} />
                  <span>Saved</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateMagnetNote && staff) {
                      onUpdateMagnetNote(staff.id, magnetNoteDraft.trim());
                      setIsNoteSaved(true);
                    }
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 6,
                    background: '#ef4444',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                    border: 'none',
                    boxShadow: '0 1px 4px rgba(239, 68, 68, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  Save Note
                </button>
              );
            })()}

            {Boolean(magnetNoteDraft) && (
              <button
                type="button"
                onClick={() => {
                  setMagnetNoteDraft('');
                  setIsNoteSaved(false);
                  if (onUpdateMagnetNote && staff) {
                    onUpdateMagnetNote(staff.id, '');
                  }
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: 6,
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Break Management Status (Accessible to ALL users, including Basic User!) */}
        {allPlacements.length > 0 && (breakDisplay ? (breakDisplay.enabled ?? true) : true) && (() => {
          const isBreaksConfigEnabled = breakDisplay ? (breakDisplay.enabled ?? true) : true;
          if (!isBreaksConfigEnabled) return null;
          const showB = isBreaksConfigEnabled && (breakDisplay ? (breakDisplay.showBreakfast ?? true) : true);
          const showL = isBreaksConfigEnabled && (breakDisplay ? (breakDisplay.showLunch ?? true) : true);
          const showD = isBreaksConfigEnabled && (breakDisplay ? (breakDisplay.showDinner ?? false) : false);

          const visibleCount = (showB ? 1 : 0) + (showL ? 1 : 0) + (showD ? 1 : 0);
          if (visibleCount === 0) return null;

          const gridCols = visibleCount === 3 ? 'repeat(3, 1fr)' : visibleCount === 2 ? 'repeat(2, 1fr)' : '1fr';

          return (
            <div style={{
              background: 'var(--surface-card)',
              borderRadius: 8,
              padding: '12px 14px',
              border: '1.5px solid var(--border-light)',
              marginBottom: 16
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: 'var(--text-secondary)',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>Daily Meal & Rest Breaks</span>
                <span style={{ fontSize: 10, color: 'var(--marker-green)' }}>● Zero-Login Access</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10 }}>
                {/* Breakfast Break Toggle */}
                {showB && (
                  <button
                    type="button"
                    onClick={handleToggleBreakfast}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: isBreakfastDone ? '1.5px solid var(--break-done-border)' : '1px solid var(--border-light)',
                      background: isBreakfastDone ? 'rgba(46, 160, 67, 0.12)' : 'var(--surface-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      textAlign: 'left'
                    }}
                  >
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: isBreakfastDone ? 'var(--break-done-bg)' : 'var(--break-empty-bg)',
                      color: isBreakfastDone ? '#fff' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 12
                    }}>
                      {isBreakfastDone ? '✓' : 'B'}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>Breakfast</div>
                      <div style={{ fontSize: 10, color: isBreakfastDone ? 'var(--break-done-border)' : 'var(--text-muted)' }}>
                        {isBreakfastDone ? 'Completed [✓]' : 'Pending'}
                      </div>
                    </div>
                  </button>
                )}

                {/* Lunch Break Toggle */}
                {showL && (
                  <button
                    type="button"
                    onClick={handleToggleLunch}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: isLunchDone ? '1.5px solid var(--break-done-border)' : '1px solid var(--border-light)',
                      background: isLunchDone ? 'rgba(46, 160, 67, 0.12)' : 'var(--surface-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      textAlign: 'left'
                    }}
                  >
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: isLunchDone ? 'var(--break-done-bg)' : 'var(--break-empty-bg)',
                      color: isLunchDone ? '#fff' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 12
                    }}>
                      {isLunchDone ? '✓' : 'L'}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>Lunch</div>
                      <div style={{ fontSize: 10, color: isLunchDone ? 'var(--break-done-border)' : 'var(--text-muted)' }}>
                        {isLunchDone ? 'Completed [✓]' : 'Pending'}
                      </div>
                    </div>
                  </button>
                )}

                {/* Dinner Break Toggle */}
                {showD && (
                  <button
                    type="button"
                    onClick={handleToggleDinner}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: isDinnerDone ? '1.5px solid var(--break-done-border)' : '1px solid var(--border-light)',
                      background: isDinnerDone ? 'rgba(46, 160, 67, 0.12)' : 'var(--surface-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      textAlign: 'left'
                    }}
                  >
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: isDinnerDone ? 'var(--break-done-bg)' : 'var(--break-empty-bg)',
                      color: isDinnerDone ? '#fff' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 12
                    }}>
                      {isDinnerDone ? '✓' : 'D'}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>Dinner</div>
                      <div style={{ fontSize: 10, color: isDinnerDone ? 'var(--break-done-border)' : 'var(--text-muted)' }}>
                        {isDinnerDone ? 'Completed [✓]' : 'Pending'}
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Board Runner / Superuser Assignment Controls */}
        {isEditor ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Scheduled Relief Section (Red Box & 3 PM Count) */}
            {roomPlacement && (
              <div style={{
                background: roomPlacement.relief
                  ? (roomPlacement.relief.staffId ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.14)')
                  : 'var(--surface-hover)',
                border: roomPlacement.relief
                  ? (roomPlacement.relief.staffId ? '1.5px solid var(--marker-red)' : '1.5px dashed var(--marker-red)')
                  : '1px solid var(--border-light)',
                borderRadius: 8,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: 'var(--marker-red)', textTransform: 'uppercase' }}>
                    <Clock size={12} />
                    <span>
                      {roomPlacement.relief
                        ? (roomPlacement.relief.staffId ? 'Relief Assigned' : '3 PM Count (Red Box Active)')
                        : 'Relief Planning (3 PM Count)'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                    {roomPlacement.relief
                      ? (roomPlacement.relief.staffId
                          ? `Relief: ${allStaff.find(s => s.id === roomPlacement?.relief?.staffId)?.lastName || 'Assigned'}`
                          : 'Open Red Box on board • Awaiting coverage')
                      : 'No 3 PM relief scheduled yet.'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {onToggleRedBox && !roomPlacement.relief && (
                    <button
                      type="button"
                      onClick={() => onToggleRedBox((roomPlacement.type as 'room_slot' | 'runner_slot') || 'room_slot', roomPlacement.id, true)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1.5px dashed var(--marker-red)',
                        color: 'var(--marker-red)',
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                      title="Add an open red box to plan relief for this assignment"
                    >
                      🟥 Add Relief Box
                    </button>
                  )}

                  {onRemoveRelief && roomPlacement.relief && (
                    <button
                      type="button"
                      onClick={() => onRemoveRelief((roomPlacement.type as 'room_slot' | 'runner_slot') || 'room_slot', roomPlacement.id)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: 'none',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-muted)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Remove relief or red box"
                    >
                      {roomPlacement.relief.staffId ? 'Remove Relief' : 'Remove Red Box'}
                    </button>
                  )}

                  {onOpenReliefModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenReliefModal({
                          type: (roomPlacement.type as 'room_slot' | 'runner_slot') || 'room_slot',
                          id: roomPlacement.id,
                          roomName: roomPlacement.roomName || '',
                          departmentName: roomPlacement.departmentName || '',
                          currentStaff: staff,
                          currentRelief: roomPlacement.relief
                        });
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: roomPlacement.relief?.staffId ? 'var(--marker-red)' : 'var(--accent-primary)',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: 'none',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {roomPlacement.relief?.staffId ? 'Manage Relief' : 'Set Relief Clinician'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Future Case Time for this Room */}
            {roomPlacement && roomPlacement.type === 'room_slot' && roomPlacement.roomId && onSetRoomFutureTime && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.28)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  marginBottom: 14
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: 'var(--marker-red)', textTransform: 'uppercase' }}>
                    <Clock size={13} />
                    <span>Future Case Time (Military Format)</span>
                  </div>
                  <button
                    type="button"
                    disabled={!futureTimeInput && !roomPlacement.futureTime}
                    onClick={handleClearFutureTime}
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: (futureTimeInput || roomPlacement.futureTime) ? 'var(--marker-red)' : 'var(--text-muted)',
                      background: (futureTimeInput || roomPlacement.futureTime) ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                      border: (futureTimeInput || roomPlacement.futureTime) ? '1px solid rgba(239, 68, 68, 0.28)' : '1px solid var(--border-light)',
                      borderRadius: 4,
                      cursor: (futureTimeInput || roomPlacement.futureTime) ? 'pointer' : 'not-allowed',
                      padding: '2px 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      opacity: (futureTimeInput || roomPlacement.futureTime) ? 1 : 0.45
                    }}
                    title="Clear future time from this room"
                  >
                    <X size={11} />
                    <span>Clear Time</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="e.g. 1030"
                      maxLength={4}
                      value={futureTimeInput}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                        setFutureTimeInput(val);
                        setIsFutureTimeSavedRecently(false);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveFutureTime();
                        }
                      }}
                      style={{
                        width: 86,
                        padding: '6px 8px',
                        borderRadius: 5,
                        border: (isFutureTimeSaved && Boolean(futureTimeInput)) ? '1.5px solid #10b981' : '1.5px solid rgba(239, 68, 68, 0.45)',
                        background: 'var(--surface-card)',
                        color: 'var(--text-primary)',
                        fontSize: 16,
                        fontWeight: 800,
                        fontFamily: 'var(--font-main)',
                        textAlign: 'center',
                        letterSpacing: 1,
                        outline: 'none',
                        boxShadow: (isFutureTimeSaved && Boolean(futureTimeInput)) ? '0 0 6px rgba(16, 185, 129, 0.3)' : 'none'
                      }}
                    />
                    <button
                      type="button"
                      disabled={isFutureTimeSaved && Boolean(futureTimeInput)}
                      onClick={() => handleSaveFutureTime()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '6px 14px',
                        fontSize: 11,
                        fontWeight: 800,
                        borderRadius: 5,
                        background: (isFutureTimeSaved && Boolean(futureTimeInput)) ? '#10b981' : 'var(--marker-red)',
                        color: '#fff',
                        border: 'none',
                        cursor: (isFutureTimeSaved && Boolean(futureTimeInput)) ? 'default' : 'pointer',
                        boxShadow: (isFutureTimeSaved && Boolean(futureTimeInput)) ? '0 1px 4px rgba(16, 185, 129, 0.4)' : '0 1px 4px rgba(239, 68, 68, 0.4)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {(isFutureTimeSaved && Boolean(futureTimeInput)) ? <Check size={12} /> : null}
                      <span>{(isFutureTimeSaved && Boolean(futureTimeInput)) ? 'Saved' : 'Save Time'}</span>
                    </button>
                  </div>

                  {/* Preset military buttons (7 dynamic 30-min increments) */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    {futurePresets.map(preset => {
                      const isSelected = futureTimeInput === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleSaveFutureTime(preset)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: isSelected ? 800 : 700,
                            fontFamily: 'var(--font-mono)',
                            background: isSelected ? 'var(--marker-red, #ef4444)' : 'var(--surface-card)',
                            color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                            border: isSelected ? '1.5px solid var(--marker-red, #ef4444)' : '1px solid var(--border-light)',
                            boxShadow: isSelected ? '0 2px 8px rgba(239, 68, 68, 0.45)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                          title={`Set room future case time to ${preset}`}
                        >
                          {isSelected && <span style={{ fontSize: 8 }}>●</span>}
                          <span>{preset}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Visible confirmation status indicator */}
                <div style={{
                  marginTop: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  borderRadius: 4,
                  background: isFutureTimeSaved && futureTimeInput ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 0, 0, 0.03)',
                  border: isFutureTimeSaved && futureTimeInput ? '1px solid rgba(16, 185, 129, 0.3)' : '1px dashed var(--border-light)'
                }}>
                  {isFutureTimeSaved && futureTimeInput ? (
                    <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Check size={13} />
                      <span>Board Updated: Room scheduled for <strong>{futureTimeInput}</strong> (Military)</span>
                    </span>
                  ) : futureTimeInput ? (
                    <span style={{ color: 'var(--text-muted)' }}>
                      Unsaved time: Click &quot;Save Time&quot; or press Enter
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>
                      No future case time set on board
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Quick Reassign Dropdown */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                Move or Assign to Room / Runner:
              </label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                <select
                  value={selectedDestination}
                  onChange={e => setSelectedDestination(e.target.value)}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select Target Room...</option>
                  {availableSlots.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleReassign}
                  disabled={!selectedDestination}
                  style={{
                    padding: '8px 14px',
                    background: selectedDestination ? 'var(--accent-primary)' : 'var(--surface-hover)',
                    color: selectedDestination ? '#fff' : 'var(--text-muted)',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    cursor: selectedDestination ? 'pointer' : 'default',
                    border: 'none'
                  }}
                >
                  <span>Assign</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Infrequent Staff Grouping Toggle */}
            {onSetStaffInfrequent && (
              <div style={{ marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    onSetStaffInfrequent(staff.id, !staff.isInfrequent);
                    onClose();
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    background: staff.isInfrequent
                      ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(180, 83, 9, 0.22) 100%)'
                      : 'var(--surface-hover)',
                    border: staff.isInfrequent ? '1.5px solid #d97706' : '1px solid var(--border-light)',
                    color: staff.isInfrequent ? '#d97706' : 'var(--text-primary)',
                    fontWeight: 800,
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>
                    {staff.isInfrequent
                      ? '★ Infrequent / PRN Staff • Click to return to Regular Pool'
                      : 'Move to Infrequent / PRN Pool'}
                  </span>
                </button>
              </div>
            )}


            {/* Unassign or move to bullpen if placed */}
            {allPlacements.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {onMoveToBullpen && (
                  <button
                    type="button"
                    onClick={() => {
                      onMoveToBullpen(staff.id);
                      onClose();
                    }}
                    style={{
                      padding: '10px',
                      borderRadius: 6,
                      background: 'rgba(9, 105, 218, 0.08)',
                      border: '1.5px solid var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      fontWeight: 700,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer'
                    }}
                  >
                    <Sparkles size={16} />
                    <span>
                      {allPlacements.length > 1
                        ? 'Move to Bullpen (Remove from All Locations)'
                        : 'Move to Bullpen (Available for Breaks / Cases)'}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleUnassignClick}
                  style={{
                    padding: '10px',
                    borderRadius: 6,
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--marker-red)',
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  <CornerDownLeft size={16} />
                  <span>
                    {allPlacements.length > 1
                      ? 'Remove from All Locations (Return to Unassigned)'
                      : 'Return to Credentialed Unassigned Staff'}
                  </span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: 'var(--surface-hover)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>Login as Board Runner or Superuser to move staff.</span>
            </div>
            {onOpenLogin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Log In with PIN
              </button>
            )}
          </div>
        )}

        {/* ==========================================================================
            PERFECT CALL INTERNAL CLINICIAN PAGING & MESSAGING (Collapsible Accordion)
            ========================================================================== */}
        {messagingEnabled && (
          <div
            ref={pagingAccordionRef}
            style={{
              background: 'var(--surface-card)',
              borderRadius: 8,
              border: '1.5px solid rgba(16, 185, 129, 0.35)',
              marginTop: 14,
              marginBottom: 8,
              overflow: 'hidden'
            }}
          >
            {/* Header Accordion Bar */}
            <div
              onClick={() => setIsPagingExpanded(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                cursor: 'pointer',
                background: isPagingExpanded ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                userSelect: 'none',
                transition: 'background 0.2s ease',
                gap: 6,
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <MessageSquare size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                <span
                  className="staff-modal-messaging-title"
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: 0.3,
                    color: 'var(--text-primary)',
                    lineHeight: 1.15
                  }}
                >
                  <span>Perfect Call </span>
                  <span className="staff-modal-messaging-word">Messaging</span>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {recipientProfile ? (
                  recipientProfile.isOnline ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 7px',
                      borderRadius: 12,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#059669',
                      border: '1px solid #10b981',
                      fontSize: 10,
                      fontWeight: 800,
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                      ONLINE
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 7px',
                      borderRadius: 12,
                      background: 'var(--surface-hover)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-light)',
                      fontSize: 10,
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
                      OFFLINE
                    </span>
                  )
                ) : (
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: 12,
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#d97706',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontSize: 9.5,
                    fontWeight: 700,
                    whiteSpace: 'nowrap'
                  }}>
                    NOT REGISTERED
                  </span>
                )}
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border-light)',
                  whiteSpace: 'nowrap'
                }}>
                  {isPagingExpanded ? '▲ Hide' : '▼ Expand'}
                </span>
              </div>
            </div>

            {/* Collapsible Content */}
            {isPagingExpanded && (
              <div style={{ padding: '0 14px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border-light)' }}>
                {recipientProfile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10 }}>
                    {/* Feedback notices */}
                    {quickSendSuccess && (
                      <div style={{
                        padding: '6px 10px',
                        borderRadius: 5,
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid #10b981',
                        color: '#047857',
                        fontSize: 11.5,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <Check size={14} />
                        <span>{quickSendSuccess}</span>
                      </div>
                    )}

                    {chatError && (
                      <div style={{
                        padding: '6px 10px',
                        borderRadius: 5,
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        color: '#dc2626',
                        fontSize: 11.5,
                        fontWeight: 700
                      }}>
                        {chatError}
                      </div>
                    )}

                    {/* Quick Presets Row */}
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 5 }}>
                        Quick Preset Pages (Tap to instant-send):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {[
                          'Need a break?',
                          'Relief coming in 15m',
                          'Please call OR Board Runner',
                          'Case delayed / Add-on pending',
                          'What is your estimated finish time?'
                        ].map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleSendMessage(preset)}
                            disabled={isSendingMessage}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 5,
                              fontSize: 11,
                              fontWeight: 700,
                              background: 'rgba(16, 185, 129, 0.08)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              color: '#059669',
                              cursor: isSendingMessage ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <Send size={10} />
                            <span>{preset}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Message Field */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                      <input
                        type="text"
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={`Message ${staff.displayName || staff.lastName}...`}
                        disabled={isSendingMessage}
                        style={{
                          flex: '1 1 0',
                          minWidth: 0,
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border-light)',
                          background: 'var(--bg-board)',
                          color: 'var(--text-primary)',
                          fontSize: 12,
                          fontWeight: 600,
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSendMessage()}
                        disabled={isSendingMessage || !messageInput.trim()}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 6,
                          background: messageInput.trim() ? '#10b981' : 'var(--surface-hover)',
                          border: 'none',
                          color: messageInput.trim() ? '#fff' : 'var(--text-muted)',
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: isSendingMessage || !messageInput.trim() ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          flexShrink: 0,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Send size={12} />
                        <span>{isSendingMessage ? 'Sending...' : 'Send'}</span>
                      </button>
                    </div>

                    {/* Mini Chat Thread Stream */}
                    <div style={{
                      background: 'var(--bg-board)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 6,
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: 4 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Recent Conversation Thread ({chatMessages.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => recipientProfile && loadChatMessages(recipientProfile.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 10,
                            fontWeight: 700
                          }}
                        >
                          <RefreshCw size={10} className={isLoadingChat ? 'animate-spin' : ''} />
                          <span>Refresh</span>
                        </button>
                      </div>

                      <div
                        ref={chatScrollRef}
                        style={{
                          maxHeight: 140,
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          paddingRight: 2
                        }}
                      >
                        {chatMessages.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 11, color: 'var(--text-muted)' }}>
                            No messages yet. Send a page above to start communication.
                          </div>
                        ) : (
                          chatMessages.map((msg: ChatMessage) => (
                            <div
                              key={msg.id}
                              style={{
                                alignSelf: msg.is_outgoing ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                background: msg.is_outgoing ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-hover)',
                                border: `1px solid ${msg.is_outgoing ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-light)'}`,
                                borderRadius: 6,
                                padding: '5px 8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 9.5, fontWeight: 800, color: msg.is_outgoing ? '#059669' : 'var(--text-secondary)' }}>
                                <span>{msg.is_outgoing ? 'Board Runner' : (recipientProfile.fullName || staff.lastName)}</span>
                                <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </span>
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--text-primary)', wordBreak: 'break-word', fontWeight: 600 }}>
                                {msg.content}
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={chatBottomRef} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: 'var(--bg-board)',
                    padding: '10px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    marginTop: 10
                  }}>
                    No Perfect Call account found with phone: <strong>{staff.phone || 'None'}</strong>. 
                    Clinicians must register in <em>perfectcall.app</em> with their cell phone to receive internal pages directly from this whiteboard.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>

        {/* Sticky Footer with Clear/Close Button */}
        <div style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
          background: 'var(--surface-card)',
          borderTop: '1px solid var(--border-light)',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: 8,
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-primary)',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <X size={16} />
            <span>Close Details</span>
          </button>
        </div>
      </div>
    </div>
  );
};
