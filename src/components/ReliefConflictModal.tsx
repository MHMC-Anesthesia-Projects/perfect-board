'use client';

import React from 'react';
import { AlertTriangle, X, Check, ArrowRight, Trash2, Clock, ShieldAlert } from 'lucide-react';

interface ReliefConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName: string;
  sourceRoomName: string;
  reliefStaffName: string;
  reliefTime?: string;
  isRedBox?: boolean;
  canMoveReliefWithStaff?: boolean;
  onResolve: (action: 'keep_in_room' | 'move_with_staff' | 'remove') => void;
}

export const ReliefConflictModal: React.FC<ReliefConflictModalProps> = ({
  isOpen,
  onClose,
  staffName,
  sourceRoomName,
  reliefStaffName,
  reliefTime,
  isRedBox,
  canMoveReliefWithStaff = true,
  onResolve
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: 16
      }}
    >
      <div
        className="pin-pad-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 500,
          background: 'var(--surface-card, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          borderRadius: 14,
          border: '1.5px solid var(--border-light, #cbd5e1)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          animation: 'fade-in 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'rgba(245, 158, 11, 0.12)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1.5px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706'
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                Relief Assignment Conflict
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
                3 PM Count &amp; Relief Planning
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
              color: 'var(--text-muted, #94a3b8)',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary, #334155)' }}>
            <strong style={{ color: 'var(--text-primary, #0f172a)' }}>{staffName}</strong> has relief assigned in{' '}
            <strong style={{ color: 'var(--marker-red, #dc2626)' }}>{sourceRoomName}</strong>:
          </div>

          {/* Active Relief Summary Card */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: 'var(--surface-hover, #f8fafc)',
              border: '1.5px dashed var(--marker-red, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                background: 'rgba(220, 38, 38, 0.12)',
                color: 'var(--marker-red, #dc2626)',
                fontWeight: 900,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Clock size={13} />
              <span>{reliefTime || '3:00 PM'}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary, #0f172a)' }}>
                {reliefStaffName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)' }}>
                {isRedBox ? 'Open 3 PM Count Designation' : 'Assigned Relief Clinician'}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
            Is this relief intended for the <span style={{ color: 'var(--text-primary, #0f172a)' }}>Room</span> (late-running OR / 3 PM count) or for the <span style={{ color: 'var(--text-primary, #0f172a)' }}>Clinician</span>?
          </div>

          {/* Resolution Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Option 1: Relieve Room (Recommended) */}
            <button
              type="button"
              onClick={() => onResolve('keep_in_room')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.08)',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.16)';
                e.currentTarget.style.borderColor = '#10b981';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#059669' }}>
                  Relieve Room (Keep in {sourceRoomName})
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: '#10b981',
                    color: '#ffffff'
                  }}
                >
                  Recommended
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary, #475569)', lineHeight: 1.4 }}>
                Keeps the relief / 3 PM red box assigned to <strong>{sourceRoomName}</strong> so the late-running room stays covered even though {staffName} is leaving.
              </p>
            </button>

            {/* Option 2: Relieve Clinician */}
            {canMoveReliefWithStaff && (
              <button
                type="button"
                onClick={() => onResolve('move_with_staff')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'rgba(2, 132, 199, 0.08)',
                  border: '1.5px solid rgba(2, 132, 199, 0.35)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(2, 132, 199, 0.16)';
                  e.currentTarget.style.borderColor = '#0284c7';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(2, 132, 199, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(2, 132, 199, 0.35)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0284c7' }}>
                    Relieve Clinician (Move with {staffName})
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary, #475569)', lineHeight: 1.4 }}>
                  Transfers this relief assignment to follow {staffName} to their new location.
                </p>
              </button>
            )}

            {/* Option 3: Remove Relief */}
            <button
              type="button"
              onClick={() => onResolve('remove')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                borderRadius: 10,
                background: 'var(--surface-hover, #f1f5f9)',
                border: '1px solid var(--border-light, #cbd5e1)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--surface-hover, #f1f5f9)';
                e.currentTarget.style.borderColor = 'var(--border-light, #cbd5e1)';
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary, #475569)' }}>
                Remove Relief Assignment
              </span>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted, #64748b)' }}>
                Clears this relief assignment completely from the whiteboard.
              </p>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--surface-hover, #f8fafc)',
            borderTop: '1px solid var(--border-light, #e2e8f0)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              background: 'transparent',
              border: '1px solid var(--border-light, #cbd5e1)',
              color: 'var(--text-secondary, #64748b)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cancel Move
          </button>
        </div>
      </div>
    </div>
  );
};
