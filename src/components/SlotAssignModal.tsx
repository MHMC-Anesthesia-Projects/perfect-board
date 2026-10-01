'use client';

import React, { useState, useMemo } from 'react';
import { Staff, UserRole } from '@/types/whiteboard';
import { Search, X, UserCheck, ShieldAlert, LogIn } from 'lucide-react';

interface SlotAssignModalProps {
  isOpen: boolean;
  targetSlot: {
    type: 'room_slot' | 'runner_slot';
    id: string;
    label: string;
  } | null;
  staff: Staff[];
  assignedStaffIds: Set<string>;
  currentUserRole: UserRole;
  onClose: () => void;
  onAssign: (targetType: 'room_slot' | 'runner_slot', targetId: string, staffId: string) => void;
  onOpenLogin: () => void;
}

export const SlotAssignModal: React.FC<SlotAssignModalProps> = ({
  isOpen,
  targetSlot,
  staff,
  assignedStaffIds,
  currentUserRole,
  onClose,
  onAssign,
  onOpenLogin
}) => {
  const [search, setSearch] = useState('');

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
