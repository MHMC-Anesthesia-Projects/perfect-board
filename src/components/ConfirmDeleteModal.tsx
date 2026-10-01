'use client';

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  itemCategory?: string;
  message?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  itemName,
  itemCategory,
  message,
  confirmButtonText = 'Remove',
  cancelButtonText = 'Cancel',
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="pin-pad-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: '92vw',
          padding: '24px 24px 20px',
          textAlign: 'center',
          alignItems: 'center',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Warning Icon Badge */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(211, 47, 47, 0.12)',
            border: '2px solid rgba(211, 47, 47, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--marker-red)',
            marginBottom: 16
          }}
        >
          <AlertTriangle size={28} />
        </div>

        {/* Modal Title */}
        <h3
          style={{
            fontSize: 18,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: 'var(--text-primary)',
            margin: 0,
            marginBottom: 8
          }}
        >
          {title}
        </h3>

        {/* Highlighted Item Name */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: 'var(--marker-red)',
            padding: '6px 14px',
            background: 'rgba(211, 47, 47, 0.08)',
            border: '1px dashed rgba(211, 47, 47, 0.3)',
            borderRadius: 6,
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {itemName}
        </div>

        {/* Descriptive Message */}
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.45,
            color: 'var(--text-secondary)',
            margin: 0,
            marginBottom: 22,
            padding: '0 8px'
          }}
        >
          {message || (
            <>
              Are you sure you want to remove this staff member
              {itemCategory ? <> from the <strong>{itemCategory}</strong> list</> : ''}?
            </>
          )}
        </p>

        {/* Action Buttons (Touchscreen Sized) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            width: '100%'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              border: '1.5px solid var(--border-light)',
              background: 'var(--surface-hover)',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'background 0.15s ease'
            }}
          >
            <X size={16} />
            {cancelButtonText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--marker-red)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(211, 47, 47, 0.35)',
              transition: 'transform 0.1s ease, filter 0.15s ease'
            }}
            autoFocus
          >
            <Trash2 size={16} />
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};
