'use client';

import React, { useState, useMemo } from 'react';
import { Staff, UserRole, ReliefAssignment } from '@/types/whiteboard';
import { X, Check, Trash2, ArrowRight, Shield, Sparkles, UserCheck, Search, CornerDownRight } from 'lucide-react';

interface ReliefModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: {
    type: 'room_slot' | 'runner_slot';
    id: string;
    roomName: string;
    departmentName: string;
    currentStaff: Staff | null;
    currentRelief?: ReliefAssignment | null;
  } | null;
  staff: Staff[];
  currentUserRole: UserRole;
  onSetRelief: (targetType: 'room_slot' | 'runner_slot', targetId: string, reliefStaffId: string, reliefTime?: string, notes?: string) => void;
  onRemoveRelief: (targetType: 'room_slot' | 'runner_slot', targetId: string) => void;
  onExecuteHandoff: (targetType: 'room_slot' | 'runner_slot', targetId: string) => void;
}

export const ReliefModal: React.FC<ReliefModalProps> = ({
  isOpen,
  onClose,
  target,
  staff,
  currentUserRole,
  onSetRelief,
  onRemoveRelief,
  onExecuteHandoff
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Sync state when modal opens
  React.useEffect(() => {
    if (target?.currentRelief) {
      setSelectedStaffId(target.currentRelief.staffId);
      setNotes(target.currentRelief.notes || '');
    } else {
      setSelectedStaffId('');
      setNotes('');
    }
    setSearch('');
  }, [target]);

  const isEditor = currentUserRole === 'board_runner' || currentUserRole === 'superuser';

  // Group staff into: Self, Lates/Call staff, and other staff
  const { selfStaff, lateStaff, otherStaff } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeStaff = staff.filter(s => s.active);

    const matchesSearch = (s: Staff) => {
      if (!q) return true;
      return (
        s.lastName.toLowerCase().includes(q) ||
        s.firstName.toLowerCase().includes(q) ||
        s.credentials.toLowerCase().includes(q) ||
        (s.shift && s.shift.toLowerCase().includes(q))
      );
    };

    const isLateOrCall = (s: Staff) => {
      const shift = (s.shift || '').toLowerCase();
      return /call|cv|ob|4p|5p|6p|7p|16:00|17:00|19:00|late/i.test(shift);
    };

    let self: Staff | null = null;
    const lates: Staff[] = [];
    const others: Staff[] = [];

    activeStaff.filter(matchesSearch).forEach(s => {
      if (target?.currentStaff && s.id === target.currentStaff.id) {
        self = s;
      } else if (isLateOrCall(s)) {
        lates.push(s);
      } else {
        others.push(s);
      }
    });

    lates.sort((a, b) => a.lastName.localeCompare(b.lastName));
    others.sort((a, b) => a.lastName.localeCompare(b.lastName));

    return { selfStaff: self as Staff | null, lateStaff: lates, otherStaff: others };
  }, [staff, target?.currentStaff, search]);

  if (!isOpen || !target) return null;

  const currentReliefStaff = target.currentRelief
    ? staff.find(s => s.id === target.currentRelief?.staffId)
    : null;

  const handleSave = () => {
    if (!selectedStaffId) return;
    onSetRelief(target.type, target.id, selectedStaffId, '', notes.trim());
    onClose();
  };

  const handleDesignateSelf = () => {
    if (!target.currentStaff) return;
    onSetRelief(target.type, target.id, target.currentStaff.id, '', notes.trim());
    onClose();
  };

  const handleRemove = () => {
    onRemoveRelief(target.type, target.id);
    onClose();
  };

  const handleHandoff = () => {
    onExecuteHandoff(target.type, target.id);
    onClose();
  };

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
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div 
        className="relief-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          background: 'var(--surface-card, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          borderRadius: 14,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1.5px solid var(--border-light, #cbd5e1)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--surface-header, #f8fafc)',
          borderBottom: '1px solid var(--border-light, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1.5px solid var(--marker-red, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--marker-red, #dc2626)'
            }}>
              <Shield size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Relief Assignment</h3>
                <span style={{
                  fontSize: 10,
                  fontWeight: 900,
                  background: 'var(--marker-red, #dc2626)',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: 4,
                  textTransform: 'uppercase'
                }}>
                  Red Box
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 2 }}>
                {target.departmentName} • {target.roomName}
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

        {/* Current Status Banner */}
        <div style={{
          padding: '10px 20px',
          background: 'rgba(0, 0, 0, 0.02)',
          borderBottom: '1px solid var(--border-light, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Current Provider:</span>
            {target.currentStaff ? (
              <span style={{ fontSize: 13, fontWeight: 800 }}>
                {target.currentStaff.lastName.toUpperCase()}, {target.currentStaff.firstName} ({target.currentStaff.credentials})
              </span>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
            )}
          </div>

          {currentReliefStaff && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 8px',
              borderRadius: 5,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--marker-red, #dc2626)'
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--marker-red)' }}>
                Relief: {currentReliefStaff.lastName}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* 1. Quick One-Tap Action: Designate Self */}
          {target.currentStaff && (
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={handleDesignateSelf}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1.5px solid var(--accent-primary, #0284c7)',
                  background: selectedStaffId === target.currentStaff.id ? 'rgba(2, 132, 199, 0.15)' : 'rgba(2, 132, 199, 0.06)',
                  color: 'var(--accent-primary, #0284c7)',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease'
                }}
              >
                <UserCheck size={16} />
                <span>Designate {target.currentStaff.lastName} to Relieve Themselves</span>
              </button>
            </div>
          )}

          {/* 2. Select Relief Staff Member */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)' }}>
                Select Incoming Relief Staff
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {lateStaff.length} Late/Call • {otherStaff.length} Available
              </span>
            </div>

            {/* Search Input */}
            <div style={{
              position: 'relative',
              marginBottom: 10
            }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by last name, first name, credential, shift..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  borderRadius: 7,
                  border: '1.5px solid var(--border-light, #cbd5e1)',
                  background: 'var(--surface-ground, #ffffff)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Staff List */}
            <div style={{
              maxHeight: 250,
              overflowY: 'auto',
              border: '1px solid var(--border-light, #e2e8f0)',
              borderRadius: 8,
              background: 'var(--surface-ground, #f8fafc)'
            }}>
              {/* Option: Current Staff (Self Relief) */}
              {selfStaff && (
                <div
                  onClick={() => setSelectedStaffId(selfStaff!.id)}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-light, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: selectedStaffId === selfStaff.id ? 'rgba(239, 68, 68, 0.12)' : 'rgba(2, 132, 199, 0.04)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: '1.5px solid var(--marker-red)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: selectedStaffId === selfStaff.id ? 'var(--marker-red)' : 'transparent'
                    }}>
                      {selectedStaffId === selfStaff.id && <Check size={11} color="#ffffff" />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 800 }}>
                          {selfStaff.lastName.toUpperCase()}, {selfStaff.firstName}
                        </span>
                        <span className={`magnet-cred cred-${selfStaff.credentials}`} style={{ fontSize: 9, padding: '0 4px' }}>
                          {selfStaff.credentials}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--accent-primary)', background: 'rgba(2, 132, 199, 0.1)', padding: '1px 5px', borderRadius: 3 }}>
                          RELIEVING SELF
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Currently in this room • Shift: {selfStaff.shift || 'Day'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lates & Call Staff */}
              {lateStaff.length > 0 && (
                <div>
                  <div style={{
                    padding: '4px 12px',
                    fontSize: 10,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    background: 'var(--surface-hover, #e2e8f0)',
                    color: 'var(--text-secondary)'
                  }}>
                    Late &amp; Call Staff ({lateStaff.length})
                  </div>
                  {lateStaff.map(s => {
                    const isSelected = selectedStaffId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedStaffId(s.id)}
                        style={{
                          padding: '7px 12px',
                          borderBottom: '1px solid var(--border-light, #f1f5f9)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(239, 68, 68, 0.12)' : 'transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: '1.5px solid var(--marker-red)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isSelected ? 'var(--marker-red)' : 'transparent'
                          }}>
                            {isSelected && <Check size={10} color="#ffffff" />}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                                {s.lastName.toUpperCase()}, {s.firstName}
                              </span>
                              <span className={`magnet-cred cred-${s.credentials}`} style={{ fontSize: 8.5, padding: '0 4px' }}>
                                {s.credentials}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              Shift: {s.shift || 'Late'} • Phone: {s.phone || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Other Available Staff */}
              {otherStaff.length > 0 && (
                <div>
                  <div style={{
                    padding: '4px 12px',
                    fontSize: 10,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    background: 'var(--surface-hover, #e2e8f0)',
                    color: 'var(--text-secondary)'
                  }}>
                    All Available Staff ({otherStaff.length})
                  </div>
                  {otherStaff.map(s => {
                    const isSelected = selectedStaffId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedStaffId(s.id)}
                        style={{
                          padding: '7px 12px',
                          borderBottom: '1px solid var(--border-light, #f1f5f9)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(239, 68, 68, 0.12)' : 'transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: '1.5px solid var(--marker-red)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isSelected ? 'var(--marker-red)' : 'transparent'
                          }}>
                            {isSelected && <Check size={10} color="#ffffff" />}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                                {s.lastName.toUpperCase()}, {s.firstName}
                              </span>
                              <span className={`magnet-cred cred-${s.credentials}`} style={{ fontSize: 8.5, padding: '0 4px' }}>
                                {s.credentials}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              Phone: {s.phone || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          background: 'var(--surface-header, #f8fafc)',
          borderTop: '1px solid var(--border-light, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10
        }}>
          <div>
            {target.currentRelief && isEditor && (
              <button
                type="button"
                onClick={handleRemove}
                style={{
                  background: 'transparent',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <Trash2 size={13} />
                <span>Remove Relief</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 14px',
                borderRadius: 6,
                border: '1px solid var(--border-light, #cbd5e1)',
                background: 'var(--surface-card, #ffffff)',
                color: 'var(--text-secondary)',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            {target.currentRelief && isEditor && (
              <button
                type="button"
                onClick={handleHandoff}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#10b981',
                  color: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                }}
                title="Execute Handoff: Swap relief into active slot"
              >
                <Check size={14} />
                <span>Complete Handoff</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedStaffId}
              style={{
                padding: '7px 16px',
                borderRadius: 6,
                border: 'none',
                background: selectedStaffId ? 'var(--marker-red, #dc2626)' : 'var(--text-muted, #94a3b8)',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 800,
                cursor: selectedStaffId ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: selectedStaffId ? '0 2px 6px rgba(220, 38, 38, 0.3)' : 'none'
              }}
            >
              <span>Set Relief</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
