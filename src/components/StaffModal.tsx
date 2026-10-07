'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiUrl } from '@/lib/api';
import { Staff, Department, UserRole, ReliefAssignment, ChatMessage } from '@/types/whiteboard';
import { Phone, Clock, MapPin, X, ArrowRight, CornerDownLeft, Coffee, Utensils, CheckCircle, ShieldCheck, Sparkles, UserCheck, MessageSquare, Send, RefreshCw, Radio, Check, GraduationCap } from 'lucide-react';

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
  relief?: ReliefAssignment | null;
}

interface StaffModalProps {
  staff: Staff | null;
  departments: Department[];
  allStaff?: Staff[];
  bullpenStaffIds?: string[];
  bullpenBreaks?: Record<string, { breakfastDone: boolean; lunchDone: boolean; breakfastTime?: string | null; lunchTime?: string | null }>;
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
  onToggleBreak: (targetType: 'room_slot' | 'runner_slot' | 'bullpen', targetId: string, breakType: 'breakfast' | 'lunch', value: boolean) => void;
  onUpdateShift?: (staffId: string, newShift: string, lastName?: string, credentials?: Staff['credentials']) => void;
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
  unreadCount = 0
}) => {
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [isEditingShift, setIsEditingShift] = useState(false);
  const [customShift, setCustomShift] = useState(staff?.shift || 'Day');
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(staff?.displayName || '');

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

  // Auto-expand paging section ONLY if there are active unread incoming messages
  useEffect(() => {
    if (unreadCount > 0) {
      setIsPagingExpanded(true);
    }
  }, [unreadCount]);

  const fetchMessagingStatus = async (phone?: string) => {
    if (!phone) {
      setMessagingEnabled(false);
      setRecipientProfile(null);
      return;
    }
    setIsLoadingChat(true);
    setChatError(null);
    try {
      const res = await fetch(apiUrl(`/api/messages?action=check_status&phone=${encodeURIComponent(phone)}`));
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

  if (!staff) return null;

  const isEditor = currentUserRole === 'board_runner' || currentUserRole === 'superuser';
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
      lunchDone: b?.lunchDone ?? false
    });
  }

  const currentPlacement = allPlacements[0] || null;
  const roomPlacement = allPlacements.find(p => p.type === 'room_slot') || null;

  // Synced break statuses across all active placements
  const isBreakfastDone = allPlacements.some(p => p.breakfastDone) || Boolean(bullpenBreaks[staff.id]?.breakfastDone);
  const isLunchDone = allPlacements.some(p => p.lunchDone) || Boolean(bullpenBreaks[staff.id]?.lunchDone);

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
          maxWidth: 460,
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
                {staff.lastName}, {staff.firstName || ''}
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
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          WebkitOverflowScrolling: 'touch'
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
                {staff.displayName && (
                  <span style={{ fontSize: 9, color: 'var(--accent-primary)', fontWeight: 800 }}>[CUSTOM]</span>
                )}
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
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="e.g. Dr. Dave, Johnny, or blank for default"
                  value={displayNameInput}
                  onChange={e => setDisplayNameInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--border-light)',
                    fontSize: 12,
                    fontWeight: 700
                  }}
                />
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
                    cursor: 'pointer'
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
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {/* Phone */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              <Phone size={15} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontWeight: 600 }}>Cell Phone:</span>
              <a
                href={`tel:${staff.phone}`}
                style={{ fontWeight: 800, color: 'var(--accent-primary)', textDecoration: 'underline' }}
              >
                {staff.phone}
              </a>
            </div>
          </div>

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
                    title="Change scheduled shift or late time (e.g. 4p instead of 3p)"
                  >
                    Edit Shift
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomShift('Call 1');
                      setIsEditingShift(true);
                    }}
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'rgba(211, 47, 47, 0.1)',
                      border: '1px solid var(--marker-red)',
                      color: 'var(--marker-red)',
                      cursor: 'pointer'
                    }}
                    title="Change doctor to a Call shift (Call 1, Call 2, Call 3, CV, OB)"
                  >
                    Change to Call
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px', background: 'var(--surface-card)', borderRadius: 6, border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Change Shift / Departure Time:</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Quick select or type below</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {['Day', '2p (Special)', '3p', '4p', '5p', '7p', '8p', '7p-7a', 'Post-Call'].map(preset => {
                  const presetValue = preset === '2p (Special)' ? '2p' : preset;
                  const isSelected = customShift.toLowerCase() === presetValue.toLowerCase();
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomShift(presetValue)}
                      style={{
                        padding: '2px 7px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        border: isSelected ? '1.5px solid #2563eb' : '1px solid var(--border-light)',
                        background: isSelected ? 'rgba(37, 99, 235, 0.15)' : 'var(--surface-hover)',
                        color: isSelected ? '#2563eb' : 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>

              {/* Call Shift Presets */}
              <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px dashed var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--marker-red)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={12} />
                    <span>On-Call Shifts (Assigns to Tonight&apos;s Call Team):</span>
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Kept off departure list</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['Call 1', 'Call 2', 'Call 3', 'CV', 'OB', 'C1,OB', 'Call'].map(callPreset => {
                    const isSelected = customShift.toLowerCase() === callPreset.toLowerCase();
                    const isOB = callPreset.includes('OB');
                    const isCV = callPreset === 'CV';
                    return (
                      <button
                        key={callPreset}
                        type="button"
                        onClick={() => setCustomShift(callPreset)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 800,
                          border: isSelected ? '1.5px solid var(--marker-red)' : '1px solid var(--border-light)',
                          background: isSelected ? 'rgba(211, 47, 47, 0.18)' : isOB ? 'rgba(236, 72, 153, 0.08)' : isCV ? 'rgba(234, 88, 12, 0.08)' : 'rgba(211, 47, 47, 0.06)',
                          color: isSelected ? 'var(--marker-red)' : isOB ? '#db2777' : isCV ? '#ea580c' : 'var(--marker-red)',
                          cursor: 'pointer'
                        }}
                      >
                        {callPreset}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input
                  type="text"
                  value={customShift}
                  onChange={e => setCustomShift(e.target.value)}
                  placeholder="e.g. 2p, 4p, or 13:30"
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-board)',
                    color: 'var(--text-primary)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateShift && customShift.trim()) {
                      onUpdateShift(staff.id, customShift.trim(), staff.lastName, staff.credentials);
                      setIsEditingShift(false);
                    }
                  }}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer'
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
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Current Assignment(s) Display */}
          {allPlacements.length <= 1 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <MapPin size={15} style={{ color: 'var(--marker-green)', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, flexShrink: 0 }}>Current Assignment:</span>
                <span style={{
                  fontWeight: 800,
                  color: currentPlacement ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: currentPlacement ? 'var(--surface-card)' : 'transparent',
                  padding: currentPlacement ? '2px 8px' : '0',
                  borderRadius: 4,
                  border: currentPlacement ? '1px solid var(--border-light)' : 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {currentPlacement ? currentPlacement.locationName : 'Available Unassigned Staff'}
                </span>
              </div>
              {isEditor && currentPlacement && onRemoveFromSlot && (
                <button
                  type="button"
                  onClick={() => handleRemovePlacement(currentPlacement)}
                  title={`Remove from ${currentPlacement.locationName}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: 'var(--marker-red)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <X size={12} />
                  <span>Remove</span>
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                  <MapPin size={15} style={{ color: 'var(--marker-green)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    Current Assignments ({allPlacements.length}):
                  </span>
                </div>
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
              </div>

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
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
                        fontSize: 12.5,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
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
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: 'var(--marker-red)',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <X size={12} />
                        <span>Remove from {p.departmentName || 'Slot'}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
                  <div style={{ display: 'flex', gap: 6 }}>
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
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: 4,
                        border: '1px solid var(--border-light)',
                        fontSize: 12,
                        fontWeight: 600,
                        background: 'var(--bg-board)',
                        color: 'var(--text-primary)'
                      }}
                    />
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
                        gap: 4
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
                          cursor: 'pointer'
                        }}
                      >
                        Clear
                      </button>
                    )}
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


        {/* Break Management Status (Accessible to ALL users, including Basic User!) */}
        {allPlacements.length > 0 && (
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Breakfast Break Toggle */}
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

              {/* Lunch Break Toggle */}
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
            </div>
          </div>
        )}

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
                      onClick={() => onToggleRedBox('room_slot', roomPlacement.id, true)}
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
                      title="Add an open red box to plan relief for this room"
                    >
                      🟥 Add Relief Box
                    </button>
                  )}

                  {onRemoveRelief && roomPlacement.relief && (
                    <button
                      type="button"
                      onClick={() => onRemoveRelief('room_slot', roomPlacement.id)}
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
                          type: 'room_slot',
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
            {roomPlacement && roomPlacement.roomId && onSetRoomFutureTime && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 8,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: 'var(--marker-red)', textTransform: 'uppercase' }}>
                    <Clock size={12} />
                    <span>Future Case Time</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                    {roomPlacement.futureTime
                      ? `Scheduled: ${roomPlacement.futureTime} (Military)`
                      : 'None set for this room'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {roomPlacement.futureTime ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSetRoomFutureTime(roomPlacement.roomId!, null);
                        onClose();
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: 'none',
                        border: '1px solid var(--marker-red)',
                        color: 'var(--marker-red)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Clear Time
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['1030', '1100', '1200', '1300'].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            onSetRoomFutureTime(roomPlacement.roomId!, preset);
                            onClose();
                          }}
                          style={{
                            padding: '4px 6px',
                            borderRadius: 4,
                            background: 'var(--surface-card)',
                            border: '1px solid var(--border-light)',
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Reassign Dropdown */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                Move or Assign to Room / Runner:
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  value={selectedDestination}
                  onChange={e => setSelectedDestination(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  <option value="">Select Target Room or Runner...</option>
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
                    gap: 4
                  }}
                >
                  <span>Assign</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Infrequent Staff Grouping Toggle */}
            {onSetStaffInfrequent && (
              <div style={{ marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => {
                    onSetStaffInfrequent(staff.id, !staff.isInfrequent);
                    onClose();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: staff.isInfrequent ? 'var(--surface-active, rgba(0,0,0,0.06))' : 'var(--surface-hover)',
                    border: staff.isInfrequent ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-light)',
                    color: staff.isInfrequent ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  <span>
                    {staff.isInfrequent
                      ? 'Infrequent Staff • Click to return to Regular MD/CRNA'
                      : 'Move to Infrequent Group (PRN / Occasional)'}
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
                      : 'Return to Available Unassigned Staff'}
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
          <div style={{
            background: 'var(--surface-card)',
            borderRadius: 8,
            border: '1.5px solid rgba(16, 185, 129, 0.35)',
            marginTop: 14,
            marginBottom: 8,
            overflow: 'hidden'
          }}>
            {/* Header Accordion Bar */}
            <div
              onClick={() => setIsPagingExpanded(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                cursor: 'pointer',
                background: isPagingExpanded ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                userSelect: 'none',
                transition: 'background 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <MessageSquare size={16} style={{ color: '#10b981' }} />
                <span style={{
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: 'var(--text-primary)'
                }}>
                  Perfect Call Clinician Paging
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {recipientProfile ? (
                  recipientProfile.isOnline ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#059669',
                      border: '1px solid #10b981',
                      fontSize: 10,
                      fontWeight: 800
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                      ONLINE ON APP
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: 'var(--surface-hover)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-light)',
                      fontSize: 10,
                      fontWeight: 700
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
                      OFFLINE (PUSH DELIVERED)
                    </span>
                  )
                ) : (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#d97706',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontSize: 10,
                    fontWeight: 700
                  }}>
                    NOT REGISTERED
                  </span>
                )}
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
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
                    <div style={{ display: 'flex', gap: 6 }}>
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
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border-light)',
                          background: 'var(--bg-board)',
                          color: 'var(--text-primary)',
                          fontSize: 12,
                          fontWeight: 600
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
                          gap: 5
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
