'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Staff, UserRole } from '@/types/whiteboard';
import { Search, X, UserCheck, ShieldAlert, LogIn, Clock, Check } from 'lucide-react';

interface SlotAssignModalProps {
  isOpen: boolean;
  targetSlot: {
    type: 'room_slot' | 'runner_slot';
    id: string;
    label: string;
    roomId?: string;
    currentFutureTime?: string | null;
  } | null;
  staff: Staff[];
  assignedStaffIds: Set<string>;
  currentUserRole: UserRole;
  onClose: () => void;
  onAssign: (targetType: 'room_slot' | 'runner_slot', targetId: string, staffId: string) => void;
  onOpenLogin: () => void;
  onSetFutureTime?: (roomId: string, time: string | null) => void;
}

export const SlotAssignModal: React.FC<SlotAssignModalProps> = ({
  isOpen,
  targetSlot,
  staff,
  assignedStaffIds,
  currentUserRole,
  onClose,
  onAssign,
  onOpenLogin,
  onSetFutureTime
}) => {
  const [search, setSearch] = useState('');
  const [futureTimeInput, setFutureTimeInput] = useState('');
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  useEffect(() => {
    if (targetSlot?.currentFutureTime) {
      setFutureTimeInput(targetSlot.currentFutureTime);
    } else {
      setFutureTimeInput('');
    }
    setIsSavedRecently(false);
  }, [targetSlot]);

  if (!isOpen || !targetSlot) return null;

  const isEditor = currentUserRole !== 'basic_user';

  // Get available unassigned staff
  const availableStaff = staff.filter(s => s.active && !assignedStaffIds.has(s.id));

  const filtered = availableStaff.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      s.lastName.toLowerCase().includes(q) ||
      s.firstName.toLowerCase().includes(q) ||
      s.credentials.toLowerCase().includes(q) ||
      s.phone.includes(q)
    );
  });

  const handleSelect = (staffId: string) => {
    onAssign(targetSlot.type, targetSlot.id, staffId);
    onClose();
  };

  const handleSaveFutureTime = (timeToSet?: string) => {
    if (!targetSlot?.roomId || !onSetFutureTime) return;
    const finalVal = (timeToSet !== undefined ? timeToSet : futureTimeInput).trim();
    const cleanTime = finalVal ? finalVal.replace(/[^0-9]/g, '').slice(0, 4) : null;
    onSetFutureTime(targetSlot.roomId, cleanTime);
    setFutureTimeInput(cleanTime || '');
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  const handleClearFutureTime = () => {
    if (!targetSlot?.roomId || !onSetFutureTime) return;
    onSetFutureTime(targetSlot.roomId, null);
    setFutureTimeInput('');
    setIsSavedRecently(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="pin-pad-card"
        onClick={e => e.stopPropagation()}
        style={{ width: 440, padding: 20, textAlign: 'left', alignItems: 'stretch' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase' }}>
              Assign Staff: {targetSlot.label}
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Tap any available staff member to place them in this slot.
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {!isEditor ? (
          <div style={{
            background: 'var(--surface-hover)',
            borderRadius: 8,
            padding: 16,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}>
            <ShieldAlert size={32} style={{ color: 'var(--marker-red)' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Authentication Required</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                Basic users can view the board and toggle breaks. To assign or move staff, please log in as a Board Runner or Superuser.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                background: 'var(--accent-primary)',
                color: '#fff',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13
              }}
            >
              <LogIn size={15} />
              <span>Login to Assign Staff</span>
            </button>
          </div>
        ) : (
          <>
            {/* Future Case Time Section (Option A: Estimated start time in red box) */}
            {targetSlot.type === 'room_slot' && targetSlot.roomId && onSetFutureTime && (
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
                  {futureTimeInput && (
                    <button
                      type="button"
                      onClick={handleClearFutureTime}
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--marker-red)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title="Clear future time"
                    >
                      Clear Time
                    </button>
                  )}
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
                        borderRadius: 4,
                        border: '1.5px solid var(--border-light)',
                        background: 'var(--surface-card)',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        textAlign: 'center',
                        letterSpacing: 1
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveFutureTime()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '6px 12px',
                        fontSize: 11,
                        fontWeight: 800,
                        borderRadius: 4,
                        background: isSavedRecently ? '#16a34a' : 'var(--marker-red)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      {isSavedRecently ? <Check size={12} /> : null}
                      <span>{isSavedRecently ? 'Saved' : 'Save Time'}</span>
                    </button>
                  </div>

                  {/* Preset military buttons */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    {['0900', '1000', '1030', '1100', '1200', '1300', '1400'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSaveFutureTime(preset)}
                        style={{
                          padding: '3px 6px',
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          background: futureTimeInput === preset ? 'rgba(239, 68, 68, 0.2)' : 'var(--surface-card)',
                          color: futureTimeInput === preset ? 'var(--marker-red)' : 'var(--text-secondary)',
                          border: futureTimeInput === preset ? '1px solid var(--marker-red)' : '1px solid var(--border-light)',
                          cursor: 'pointer'
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Search Filter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-light)',
              borderRadius: 6,
              padding: '8px 10px',
              marginBottom: 12
            }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by last name, initial, or credential..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  width: '100%'
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)' }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Staff Pick List */}
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSelect(s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--accent-surface)';
                    e.currentTarget.style.borderColor = 'var(--accent-border)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--surface-hover)';
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: 14,
                      textTransform: 'uppercase'
                    }}>
                      {s.lastName}, {s.firstName || ''}
                    </div>
                    <span className={`magnet-cred cred-${s.credentials}`} style={{ fontSize: 10, padding: '1px 5px' }}>
                      {s.credentials}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {s.phone}
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
                  No available staff match &quot;{search}&quot;
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
