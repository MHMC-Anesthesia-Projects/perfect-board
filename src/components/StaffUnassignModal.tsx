'use client';

import React from 'react';
import { Staff } from '@/types/whiteboard';
import { Users, LogOut, X, Sparkles } from 'lucide-react';

interface StaffUnassignModalProps {
  isOpen: boolean;
  staff: Staff | null;
  fromLocationName?: string;
  onSendToBullpen: () => void;
  onMarkLeaving: () => void;
  onClose: () => void;
}

export const StaffUnassignModal: React.FC<StaffUnassignModalProps> = ({
  isOpen,
  staff,
  fromLocationName,
  onSendToBullpen,
  onMarkLeaving,
  onClose
}) => {
  if (!isOpen || !staff) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="pin-pad-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: 440,
          maxWidth: '92vw',
          padding: '24px 22px 20px',
          textAlign: 'center',
          alignItems: 'stretch',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
          gap: 0
        }}
      >
        {/* Header Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(9, 105, 218, 0.12)',
              border: '2px solid rgba(9, 105, 218, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)'
            }}
          >
            <Users size={26} />
          </div>
        </div>

        {/* Modal Title */}
        <h3
          style={{
            fontSize: 18,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            color: 'var(--text-primary)',
            margin: '0 0 6px'
          }}
        >
          Staff Availability Routing
        </h3>

        <p
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            margin: '0 0 14px',
            lineHeight: 1.4
          }}
        >
          {fromLocationName ? (
            <>Staff member dragged from <strong>{fromLocationName}</strong> to unassigned list.</>
          ) : (
            <>Please designate this staff member&apos;s current availability status.</>
          )}
        </p>

        {/* Staff Identifier Tile */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '8px 14px',
            background: 'var(--surface-hover)',
            border: '1.5px solid var(--border-light)',
            borderRadius: 8,
            marginBottom: 16
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>
            {staff.lastName.toUpperCase()}{staff.firstName ? ` ${staff.firstName[0]}.` : ''}
          </span>
          <span className={`magnet-cred cred-${staff.credentials}`}>
            {staff.credentials}
          </span>
        </div>

        {/* Question Prompt */}
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 12,
          textAlign: 'left'
        }}>
          Where would you like to place {staff.lastName}?
        </div>

        {/* Option 1: Bullpen (Recommended for available staff) */}
        <button
          type="button"
          onClick={onSendToBullpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: 'rgba(9, 105, 218, 0.08)',
            border: '1.5px solid var(--accent-primary)',
            borderRadius: 8,
            cursor: 'pointer',
            textAlign: 'left',
            marginBottom: 10,
            transition: 'all 0.15s ease'
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0
            }}
          >
            <Sparkles size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 2
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                Move to Bullpen
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                color: 'var(--accent-primary)',
                background: 'rgba(9, 105, 218, 0.14)',
                padding: '1px 6px',
                borderRadius: 4,
                textTransform: 'uppercase'
              }}>
                Available
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
              Ready in Bullpen to give breaks, run lunches, or start another case.
            </div>
          </div>
        </button>

        {/* Option 2: Leaving for the Day */}
        <button
          type="button"
          onClick={onMarkLeaving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: 'var(--surface-card)',
            border: '1.5px solid var(--border-light)',
            borderRadius: 8,
            cursor: 'pointer',
            textAlign: 'left',
            marginBottom: 14,
            transition: 'all 0.15s ease'
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'rgba(217, 119, 6, 0.14)',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--marker-red)',
              flexShrink: 0
            }}
          >
            <LogOut size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 2
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                Leaving for the Day
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                color: 'var(--text-muted)',
                background: 'var(--surface-hover)',
                padding: '1px 6px',
                borderRadius: 4,
                textTransform: 'uppercase'
              }}>
                Shift Complete
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
              Finished for the day — return to general unassigned roster.
            </div>
          </div>
        </button>

        {/* Option 3: Cancel (Keep on Whiteboard) */}
        <button
          type="button"
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '9px 14px',
            background: 'transparent',
            border: '1px solid var(--border-light)',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-muted)',
            transition: 'all 0.15s ease'
          }}
        >
          <X size={14} />
          <span>Cancel (Keep {staff.lastName} on Board)</span>
        </button>
      </div>
    </div>
  );
};
