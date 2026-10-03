'use client';

import React, { useState, useMemo } from 'react';
import { BoardState, Staff, Department, Room, RoomSlot, RunnerSlot, UserRole } from '@/types/whiteboard';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  MessageSquare, 
  Users, 
  Phone, 
  AlertCircle, 
  ExternalLink, 
  FileText, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

export interface ReliefRecipient {
  staffId: string;
  name: string;
  lastName: string;
  firstName: string;
  credentials: string;
  phone: string;
  rawPhone: string;
  hasValidPhone: boolean;
  categories: Array<'in_room' | 'relief' | 'runner'>;
  locationDetails: string[];
}

interface ReliefTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardState: BoardState;
  currentUser: { id: string; username: string; displayName: string; role: UserRole } | null;
  currentUserRole: UserRole;
}

export const ReliefTextModal: React.FC<ReliefTextModalProps> = ({
  isOpen,
  onClose,
  boardState,
  currentUser,
  currentUserRole
}) => {
  const [message, setMessage] = useState<string>('Relief assignments ready please review');
  const [includeLink, setIncludeLink] = useState<boolean>(true);
  const [includeSummary, setIncludeSummary] = useState<boolean>(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<'all' | 'in_room' | 'relief' | 'runner'>('all');
  const [copyNumbersSuccess, setCopyNumbersSuccess] = useState<boolean>(false);
  const [copyMessageSuccess, setCopyMessageSuccess] = useState<boolean>(false);

  // Map of all staff by ID
  const staffMap = useMemo(() => {
    const map = new Map<string, Staff>();
    boardState.staff.forEach((s: Staff) => map.set(s.id, s));
    return map;
  }, [boardState.staff]);

  // Build the complete list of everyone in a room, relieving them, or working as a runner
  const { recipients, roomPairings } = useMemo(() => {
    const recipientMap = new Map<string, ReliefRecipient>();
    const pairings: Array<{ roomLabel: string; outgoingStaff?: string; reliefStaff?: string }> = [];

    const addRecipient = (
      staff: Staff, 
      category: 'in_room' | 'relief' | 'runner', 
      locationDesc: string
    ) => {
      const cleanPhone = (staff.phone || '').trim();
      const digitsOnly = cleanPhone.replace(/\D/g, '');
      const hasValid = cleanPhone.length > 0 && cleanPhone !== '(555) 000-0000' && digitsOnly.length >= 7;

      if (!recipientMap.has(staff.id)) {
        recipientMap.set(staff.id, {
          staffId: staff.id,
          name: `${staff.lastName}, ${staff.firstName || ''}`.trim(),
          lastName: staff.lastName,
          firstName: staff.firstName,
          credentials: staff.credentials,
          phone: staff.phone || 'No phone on file',
          rawPhone: digitsOnly,
          hasValidPhone: hasValid,
          categories: [category],
          locationDetails: [locationDesc]
        });
      } else {
        const existing = recipientMap.get(staff.id)!;
        if (!existing.categories.includes(category)) {
          existing.categories.push(category);
        }
        if (!existing.locationDetails.includes(locationDesc)) {
          existing.locationDetails.push(locationDesc);
        }
      }
    };

    boardState.departments.forEach((dept: Department) => {
      // 1. Runners
      dept.runnerSlots.forEach((r: RunnerSlot) => {
        if (r.staffId) {
          const runnerStaff = staffMap.get(r.staffId);
          if (runnerStaff) {
            addRecipient(runnerStaff, 'runner', `${dept.name} Runner (${r.title})`);
          }
        }
        if (r.relief?.staffId) {
          const reliefStaff = staffMap.get(r.relief.staffId);
          const currentStaff = r.staffId ? staffMap.get(r.staffId) : null;
          if (reliefStaff) {
            addRecipient(
              reliefStaff, 
              'relief', 
              `Relief for ${currentStaff?.lastName || 'Runner'} (${dept.name})`
            );
          }
        }
      });

      // 2. Room Slots (in room & relieving)
      dept.rooms.forEach((room: Room) => {
        room.slots.forEach((slot: RoomSlot) => {
          let outgoingName = '';
          let incomingReliefName = '';

          if (slot.staffId) {
            const roomStaff = staffMap.get(slot.staffId);
            if (roomStaff) {
              outgoingName = roomStaff.lastName;
              addRecipient(roomStaff, 'in_room', `${dept.name} Room ${room.name}`);
            }
          }

          if (slot.relief?.staffId) {
            const reliefStaff = staffMap.get(slot.relief.staffId);
            const currentStaff = slot.staffId ? staffMap.get(slot.staffId) : null;
            if (reliefStaff) {
              incomingReliefName = reliefStaff.lastName;
              addRecipient(
                reliefStaff, 
                'relief', 
                `Relief for ${currentStaff?.lastName || 'Staff'} (${dept.name} Rm ${room.name})`
              );
            }
          }

          if (incomingReliefName) {
            pairings.push({
              roomLabel: `${dept.name} Rm ${room.name}`,
              outgoingStaff: outgoingName,
              reliefStaff: incomingReliefName
            });
          }
        });
      });
    });

    const list = Array.from(recipientMap.values()).sort((a, b) => 
      a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' })
    );

    return { recipients: list, roomPairings: pairings };
  }, [boardState.departments, staffMap]);

  // Pre-select all recipients initially or when modal opens
  React.useEffect(() => {
    if (isOpen && recipients.length > 0) {
      setSelectedStaffIds(new Set(recipients.map(r => r.staffId)));
    }
  }, [isOpen, recipients.length]);

  if (!isOpen) return null;

  // Filtered recipients by category
  const filteredRecipients = recipients.filter(r => {
    if (filterCategory === 'all') return true;
    return r.categories.includes(filterCategory);
  });

  const selectedCount = selectedStaffIds.size;
  const isAllSelected = filteredRecipients.length > 0 && filteredRecipients.every(r => selectedStaffIds.has(r.staffId));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const next = new Set(selectedStaffIds);
      filteredRecipients.forEach(r => next.delete(r.staffId));
      setSelectedStaffIds(next);
    } else {
      const next = new Set(selectedStaffIds);
      filteredRecipients.forEach(r => next.add(r.staffId));
      setSelectedStaffIds(next);
    }
  };

  const toggleRecipient = (staffId: string) => {
    const next = new Set(selectedStaffIds);
    if (next.has(staffId)) {
      next.delete(staffId);
    } else {
      next.add(staffId);
    }
    setSelectedStaffIds(next);
  };

  // Compile final message content
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const finalMessage = (() => {
    let text = message.trim();
    if (includeLink && baseUrl) {
      text += `\n\nLive Board: ${baseUrl}`;
    }
    if (includeSummary && roomPairings.length > 0) {
      text += `\n\nReliefs:`;
      roomPairings.forEach(p => {
        text += `\n• ${p.roomLabel}: ${p.outgoingStaff || 'Open'} ➔ ${p.reliefStaff}`;
      });
    }
    return text;
  })();

  // Phone numbers of selected recipients
  const selectedRecipients = recipients.filter(r => selectedStaffIds.has(r.staffId));
  const validPhoneNumbers = selectedRecipients
    .filter(r => r.hasValidPhone && r.rawPhone.length >= 7)
    .map(r => r.rawPhone);

  // Group text SMS link construction
  const generateSmsLink = () => {
    if (validPhoneNumbers.length === 0) return '#';
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // For iOS group iMessage/SMS: sms:/open?addresses=num1,num2&body=... or sms:&addresses=num1,num2&body=...
    // For Android: sms:num1;num2?body=...
    if (isIOS) {
      return `sms:/open?addresses=${validPhoneNumbers.join(',')}&body=${encodeURIComponent(finalMessage)}`;
    }
    return `sms:${validPhoneNumbers.join(';')}?body=${encodeURIComponent(finalMessage)}`;
  };

  const handleCopyNumbers = () => {
    const numbers = selectedRecipients
      .filter(r => r.hasValidPhone)
      .map(r => r.phone);
    if (numbers.length > 0) {
      navigator.clipboard.writeText(numbers.join(', '));
      setCopyNumbersSuccess(true);
      setTimeout(() => setCopyNumbersSuccess(false), 2200);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(finalMessage);
    setCopyMessageSuccess(true);
    setTimeout(() => setCopyMessageSuccess(false), 2200);
  };

  const handleOpenSms = () => {
    const link = generateSmsLink();
    if (link !== '#') {
      window.location.href = link;
    }
  };

  const inRoomCount = recipients.filter(r => r.categories.includes('in_room')).length;
  const reliefCount = recipients.filter(r => r.categories.includes('relief')).length;
  const runnerCount = recipients.filter(r => r.categories.includes('runner')).length;

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12
      }}
    >
      <div 
        className="relief-text-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '92vh',
          background: 'var(--surface-card, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          borderRadius: 14,
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1.5px solid var(--border-light, #cbd5e1)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 18px',
          background: 'var(--surface-header, #f8fafc)',
          borderBottom: '1px solid var(--border-light, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1.5px solid var(--marker-red, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--marker-red, #dc2626)'
            }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Relief Assignments</h3>
                <span style={{
                  fontSize: 10,
                  fontWeight: 900,
                  background: 'var(--marker-red, #dc2626)',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: 4,
                  textTransform: 'uppercase'
                }}>
                  Group SMS
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 2 }}>
                Text thread for all providers in a room, relieving, or running
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted, #64748b)',
              padding: 4,
              borderRadius: 6,
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          {/* 1. Message Composer */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)' }}>
                Message Text
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copyMessageSuccess ? '#10b981' : 'var(--accent-primary, #0284c7)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                {copyMessageSuccess ? <Check size={13} /> : <Copy size={13} />}
                <span>{copyMessageSuccess ? 'Copied Message!' : 'Copy Text'}</span>
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Type your message..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1.5px solid var(--border-light, #cbd5e1)',
                background: 'var(--surface-ground, #ffffff)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: 14,
                fontFamily: 'inherit',
                fontWeight: 600,
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />

            {/* Quick Templates */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setMessage('3pm assignments ready please review')}
                style={{
                  background: message === '3pm assignments ready please review' ? 'rgba(239, 68, 68, 0.12)' : 'var(--surface-hover, #f1f5f9)',
                  border: message === '3pm assignments ready please review' ? '1px solid var(--marker-red, #dc2626)' : '1px solid var(--border-light, #cbd5e1)',
                  color: message === '3pm assignments ready please review' ? 'var(--marker-red, #dc2626)' : 'var(--text-secondary)',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                "3pm assignments ready please review"
              </button>
              <button
                type="button"
                onClick={() => setMessage('Relief assignments are posted on the whiteboard. Please review.')}
                style={{
                  background: message === 'Relief assignments are posted on the whiteboard. Please review.' ? 'rgba(239, 68, 68, 0.12)' : 'var(--surface-hover, #f1f5f9)',
                  border: message === 'Relief assignments are posted on the whiteboard. Please review.' ? '1px solid var(--marker-red, #dc2626)' : '1px solid var(--border-light, #cbd5e1)',
                  color: message === 'Relief assignments are posted on the whiteboard. Please review.' ? 'var(--marker-red, #dc2626)' : 'var(--text-secondary)',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                "Relief assignments are posted..."
              </button>
              <button
                type="button"
                onClick={() => setMessage('3:30pm relief assignments posted. Please check your room.')}
                style={{
                  background: message === '3:30pm relief assignments posted. Please check your room.' ? 'rgba(239, 68, 68, 0.12)' : 'var(--surface-hover, #f1f5f9)',
                  border: message === '3:30pm relief assignments posted. Please check your room.' ? '1px solid var(--marker-red, #dc2626)' : '1px solid var(--border-light, #cbd5e1)',
                  color: message === '3:30pm relief assignments posted. Please check your room.' ? 'var(--marker-red, #dc2626)' : 'var(--text-secondary)',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                "3:30pm relief assignments..."
              </button>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10, fontSize: 12, fontWeight: 600 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeLink}
                  onChange={(e) => setIncludeLink(e.target.checked)}
                />
                <span>Include Live Board Link</span>
              </label>

              {roomPairings.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(e) => setIncludeSummary(e.target.checked)}
                  />
                  <span>Include Relief Pairings ({roomPairings.length})</span>
                </label>
              )}
            </div>
          </div>

          {/* 2. Recipients Breakdown & Controls */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
              flexWrap: 'wrap',
              gap: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)' }}>
                  Thread Recipients
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  background: 'var(--surface-hover, #e2e8f0)',
                  padding: '1px 6px',
                  borderRadius: 10
                }}>
                  {selectedCount} / {recipients.length} Selected
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-light, #cbd5e1)',
                    padding: '3px 8px',
                    borderRadius: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </button>

                <button
                  type="button"
                  onClick={handleCopyNumbers}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-light, #cbd5e1)',
                    padding: '3px 8px',
                    borderRadius: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: copyNumbersSuccess ? '#10b981' : 'var(--text-primary)'
                  }}
                  title="Copy comma-separated phone numbers"
                >
                  {copyNumbersSuccess ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copyNumbersSuccess ? 'Copied #' : 'Copy #s'}</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                style={{
                  padding: '3px 9px',
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: filterCategory === 'all' ? 'var(--text-primary, #0f172a)' : 'var(--surface-hover, #f1f5f9)',
                  color: filterCategory === 'all' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                All ({recipients.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('in_room')}
                style={{
                  padding: '3px 9px',
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: filterCategory === 'in_room' ? '#0284c7' : 'var(--surface-hover, #f1f5f9)',
                  color: filterCategory === 'in_room' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                In Room ({inRoomCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('relief')}
                style={{
                  padding: '3px 9px',
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: filterCategory === 'relief' ? 'var(--marker-red, #dc2626)' : 'var(--surface-hover, #f1f5f9)',
                  color: filterCategory === 'relief' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Relief Badges ({reliefCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('runner')}
                style={{
                  padding: '3px 9px',
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: filterCategory === 'runner' ? '#d97706' : 'var(--surface-hover, #f1f5f9)',
                  color: filterCategory === 'runner' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Runners ({runnerCount})
              </button>
            </div>

            {/* List */}
            <div style={{
              maxHeight: 220,
              overflowY: 'auto',
              border: '1px solid var(--border-light, #e2e8f0)',
              borderRadius: 8,
              background: 'var(--surface-ground, #f8fafc)'
            }}>
              {filteredRecipients.length === 0 ? (
                <div style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No recipients found in this category.
                </div>
              ) : (
                filteredRecipients.map(r => {
                  const isSelected = selectedStaffIds.has(r.staffId);
                  return (
                    <div
                      key={r.staffId}
                      onClick={() => toggleRecipient(r.staffId)}
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        borderBottom: '1px solid var(--border-light, #f1f5f9)',
                        background: isSelected ? 'transparent' : 'rgba(0, 0, 0, 0.02)',
                        opacity: isSelected ? 1 : 0.55,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 800 }}>
                              {r.lastName.toUpperCase()}{r.firstName ? ` ${r.firstName[0]}.` : ''}
                            </span>
                            <span className={`magnet-cred cred-${r.credentials}`} style={{ fontSize: 8.5, padding: '0 4px' }}>
                              {r.credentials}
                            </span>
                            {r.categories.map(c => (
                              <span 
                                key={c}
                                style={{
                                  fontSize: 8.5,
                                  fontWeight: 800,
                                  padding: '1px 5px',
                                  borderRadius: 3,
                                  textTransform: 'uppercase',
                                  background: c === 'relief' ? 'rgba(239, 68, 68, 0.15)' : c === 'runner' ? 'rgba(217, 119, 6, 0.15)' : 'rgba(2, 132, 199, 0.15)',
                                  color: c === 'relief' ? 'var(--marker-red, #dc2626)' : c === 'runner' ? '#d97706' : '#0284c7'
                                }}
                              >
                                {c === 'relief' ? 'Relief' : c === 'runner' ? 'Runner' : 'In Room'}
                              </span>
                            ))}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.locationDetails.join(' • ')}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ 
                          fontSize: 11.5, 
                          fontWeight: 700, 
                          color: r.hasValidPhone ? 'var(--text-primary)' : 'var(--marker-red)' 
                        }}>
                          {r.phone}
                        </div>
                        {!r.hasValidPhone && (
                          <div style={{ fontSize: 9.5, color: 'var(--marker-red)', fontWeight: 700 }}>
                            Dummy / Missing #
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 18px',
          background: 'var(--surface-header, #f8fafc)',
          borderTop: '1px solid var(--border-light, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-light, #cbd5e1)',
              background: 'var(--surface-card, #ffffff)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handleCopyNumbers}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-light, #cbd5e1)',
                background: 'var(--surface-card, #ffffff)',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
              title="Copy all phone numbers for group text"
            >
              <Phone size={14} />
              <span>Copy Phone #s</span>
            </button>

            <button
              type="button"
              onClick={handleOpenSms}
              disabled={selectedCount === 0 || validPhoneNumbers.length === 0}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: 'none',
                background: validPhoneNumbers.length > 0 ? '#10b981' : 'var(--text-muted, #94a3b8)',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 800,
                cursor: validPhoneNumbers.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: validPhoneNumbers.length > 0 ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={15} />
              <span>Send Group Text ({validPhoneNumbers.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
