'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Staff, UserRole } from '@/types/whiteboard';
import { LogOut } from 'lucide-react';

interface MagnetTileProps {
  staff: Staff;
  slotId?: string;
  slotType?: 'room_slot' | 'runner_slot' | 'bullpen' | 'unassigned';
  breakfastDone?: boolean;
  lunchDone?: boolean;
  currentUserRole: UserRole;
  showBreaks?: boolean;
  onToggleBreak?: (breakType: 'breakfast' | 'lunch', currentValue: boolean) => void;
  onSelectStaff?: (staff: Staff) => void;
  onDragStart?: (e: React.DragEvent, staff: Staff, source: { type: string; id?: string }) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onUnassign?: () => void;
  isCompact?: boolean;
  isDraggable?: boolean;
  isAssignedRelief?: boolean;
  unreadMessageCount?: number;
  magnetNote?: string;
  onUpdateNote?: (note: string) => void;
}

export const MagnetTile: React.FC<MagnetTileProps> = ({
  staff,
  slotId,
  slotType = 'bullpen',
  breakfastDone = false,
  lunchDone = false,
  currentUserRole,
  showBreaks,
  onToggleBreak,
  onSelectStaff,
  onDragStart,
  onDragEnd,
  onUnassign,
  isCompact = false,
  isDraggable: propIsDraggable,
  isAssignedRelief = false,
  unreadMessageCount = 0,
  magnetNote,
  onUpdateNote
}) => {
  const currentNote = (magnetNote !== undefined ? magnetNote : (staff.magnetNote || '')) || '';

  const [noteDraft, setNoteDraft] = useState(currentNote);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom'>('top');
  const [popoverCoords, setPopoverCoords] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [mounted, setMounted] = useState(false);
  const isClosingViaActionRef = useRef(false);

  const canViewRedNote = currentUserRole === 'board_runner' || currentUserRole === 'admin' || currentUserRole === 'superuser';

  const tileRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isEditingNote) {
      setNoteDraft(currentNote);
    }
  }, [currentNote, isEditingNote]);

  const updatePopoverPosition = () => {
    if (!tileRef.current) return;
    const rect = tileRef.current.getBoundingClientRect();
    const isCloseToTop = rect.top < 65;
    const placement = isCloseToTop ? 'bottom' : 'top';
    setPopoverPlacement(placement);
    setPopoverCoords({
      left: rect.left + rect.width / 2,
      top: placement === 'top' ? rect.top - 6 : rect.bottom + 6
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Trigger popup ONLY when user starts typing while hovering over this magnet tile (board runner / admin only)
  useEffect(() => {
    if (!canViewRedNote) return;
    if (!isHovered && !isEditingNote) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      // If already focused inside note input, let native input handle it
      if (document.activeElement === inputRef.current) {
        return;
      }

      // If user is currently typing in an input or textarea elsewhere on page, ignore
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return;
      }

      // Ignore modifier keys and navigation
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

      // When hovering over this tile and user starts typing (printable character or Backspace/Delete)
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        updatePopoverPosition();
        setIsEditingNote(true);

        let initialVal = noteDraft;
        if (e.key === 'Backspace' || e.key === 'Delete') {
          initialVal = initialVal.slice(0, -1);
        } else if (e.key.length === 1) {
          if (initialVal.length < 15) {
            initialVal = initialVal + e.key;
          }
        }
        setNoteDraft(initialVal);

        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(initialVal.length, initialVal.length);
          }
        }, 30);
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [isHovered, isEditingNote, noteDraft, canViewRedNote]);

  const handleSaveNote = (newVal: string) => {
    const trimmed = (newVal || '').trim().slice(0, 15);
    setNoteDraft(trimmed);
    if (onUpdateNote) {
      onUpdateNote(trimmed);
    }
  };

  const isDraggable = !isAssignedRelief && (propIsDraggable !== undefined 
    ? propIsDraggable 
    : (currentUserRole === 'board_runner' || currentUserRole === 'admin' || currentUserRole === 'superuser'));

  const canShowBreaks = showBreaks !== undefined
    ? showBreaks
    : (slotType !== 'unassigned' && (Boolean(onToggleBreak) || breakfastDone || lunchDone));

  const handleTileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectStaff) {
      onSelectStaff(staff);
    }
  };

  const handleBreakClick = (e: React.MouseEvent, type: 'breakfast' | 'lunch', current: boolean) => {
    e.stopPropagation();
    if (onToggleBreak) {
      onToggleBreak(type, !current);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    if (!isDraggable) {
      e.preventDefault();
      return;
    }
    setIsHovered(false);
    setIsEditingNote(false);
    if (onDragStart) {
      onDragStart(e, staff, { type: slotType, id: slotId });
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (onDragEnd) {
      onDragEnd(e);
    }
  };

  return (
    <>
      <div
        ref={tileRef}
        className={`magnet-tile ${isCompact ? 'compact' : ''} cred-tile-${staff.credentials} ${unreadMessageCount > 0 ? 'has-unread-message' : ''} ${isAssignedRelief ? 'is-relief-assigned' : ''}`}
        draggable={isDraggable}
        onDragStart={handleDrag}
        onDragEnd={handleDragEnd}
        onClick={handleTileClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={isAssignedRelief
          ? `${staff.displayName ? `[${staff.displayName}] ` : ''}${staff.firstName} ${staff.lastName} (${staff.credentials}) • Currently assigned as relief. Cannot be assigned to another relief box.`
          : (currentUserRole === 'view_only'
            ? `${staff.displayName ? `[${staff.displayName}] ` : ''}${staff.firstName} ${staff.lastName} (${staff.credentials})${canViewRedNote && currentNote ? ` [Note: ${currentNote}]` : ''}${staff.hasStudent ? ` • 🎓 Student: ${staff.studentName || 'Assigned'}` : ''} • Tap to login`
            : `${staff.displayName ? `[${staff.displayName}] ` : ''}${staff.firstName} ${staff.lastName} (${staff.credentials})${canViewRedNote && currentNote ? ` [Note: ${currentNote}]` : ''}${staff.hasStudent ? ` • 🎓 Student: ${staff.studentName || 'Assigned'}` : ''} • Phone: ${staff.phone}${unreadMessageCount > 0 ? ` • ${unreadMessageCount} NEW MESSAGE(S)` : ''}`)}
        style={{
          cursor: isDraggable ? 'grab' : (isAssignedRelief ? 'not-allowed' : 'pointer')
        }}
      >
        {/* Breakfast & Lunch Checkboxes */}
        {canShowBreaks && (
          <div className="break-controls">
            {/* Breakfast Checkbox [B] */}
            <button
              type="button"
              className={`break-toggle-btn ${breakfastDone ? 'done' : ''}`}
              onClick={(e) => handleBreakClick(e, 'breakfast', breakfastDone)}
              disabled={!onToggleBreak}
              title={currentUserRole === 'view_only'
                ? 'Login required to toggle breakfast break'
                : `Breakfast Break: ${breakfastDone ? 'Completed (Tap to undo)' : 'Pending (Tap to mark done)'}`}
            >
              {breakfastDone ? '✓' : 'B'}
            </button>

            {/* Lunch Checkbox [L] */}
            <button
              type="button"
              className={`break-toggle-btn ${lunchDone ? 'done' : ''}`}
              onClick={(e) => handleBreakClick(e, 'lunch', lunchDone)}
              disabled={!onToggleBreak}
              title={currentUserRole === 'view_only'
                ? 'Login required to toggle lunch break'
                : `Lunch Break: ${lunchDone ? 'Completed (Tap to undo)' : 'Pending (Tap to mark done)'}`}
            >
              {lunchDone ? '✓' : 'L'}
            </button>
          </div>
        )}

        {/* Staff Name, Custom Red Note, and Badges */}
        <div className="magnet-identity">
          <span className="magnet-name">
            {staff.displayName 
              ? staff.displayName.toUpperCase() 
              : `${staff.lastName.toUpperCase()}${staff.firstName ? ` ${staff.firstName[0]}.` : ''}`}
          </span>

          {/* Quick Red Text Note (travels with magnet, max 15 chars) - only visible to board runner or admin */}
          {canViewRedNote && currentNote && (
            <span
              className="magnet-red-note"
              title={`Note: ${currentNote} (Click or type to edit)`}
              onClick={(e) => {
                e.stopPropagation();
                updatePopoverPosition();
                setIsEditingNote(true);
                setTimeout(() => {
                  if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                  }
                }, 40);
              }}
            >
              {currentNote}
            </span>
          )}

          {isAssignedRelief && (
            <span className="magnet-tile-relief-tag" title="Assigned as relief">
              RELIEF
            </span>
          )}
          {staff.hasStudent && (
            <span
              className="magnet-student-badge"
              title={staff.studentName ? `🎓 Student: ${staff.studentName}` : '🎓 Student with clinician'}
            >
              🎓 STU
            </span>
          )}
          {unreadMessageCount > 0 && (
            <span
              className="magnet-unread-badge"
              title={`${unreadMessageCount} new message(s) from ${staff.lastName}`}
            >
              💬{unreadMessageCount > 1 ? unreadMessageCount : ''}
            </span>
          )}
        </div>

        {/* Quick Unassign Button for Bullpen Magnets */}
        {slotType === 'bullpen' && onUnassign && isDraggable && (
          <button
            type="button"
            className="magnet-unassign-btn"
            onClick={(e) => {
              e.stopPropagation();
              onUnassign();
            }}
            title="Depart for Day / Return to Unassigned Roster"
          >
            <LogOut size={12} />
          </button>
        )}
      </div>

      {/* Floating Popover: Appears ONLY when typing starts or user clicks to edit (board runner / admin only) */}
      {canViewRedNote && mounted && isEditingNote && createPortal(
        <div
          className="magnet-hover-note-popover"
          style={{
            position: 'fixed',
            left: popoverCoords.left,
            top: popoverCoords.top,
            transform: popoverPlacement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            zIndex: 99999
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="magnet-hover-note-inner">
            <span className="magnet-hover-note-indicator" title="Red Marker Note">🔴</span>
            <input
              ref={inputRef}
              type="text"
              className="magnet-hover-note-input"
              value={noteDraft}
              maxLength={15}
              placeholder="Note (max 15)..."
              onChange={(e) => {
                const val = e.target.value.slice(0, 15);
                setNoteDraft(val);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  isClosingViaActionRef.current = true;
                  const finalVal = noteDraft.trim().slice(0, 15);
                  handleSaveNote(finalVal);
                  setIsEditingNote(false);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  isClosingViaActionRef.current = true;
                  setNoteDraft(currentNote);
                  setIsEditingNote(false);
                }
              }}
              onBlur={() => {
                if (isClosingViaActionRef.current) {
                  isClosingViaActionRef.current = false;
                  return;
                }
                setIsEditingNote(false);
                const finalVal = noteDraft.trim().slice(0, 15);
                if (finalVal !== currentNote) {
                  handleSaveNote(finalVal);
                }
              }}
            />
            {Boolean(noteDraft) && (
              <button
                type="button"
                className="magnet-hover-note-clear"
                onMouseDown={(e) => {
                  // Prevent input blur before onClick fires
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  isClosingViaActionRef.current = true;
                  handleSaveNote('');
                  setIsEditingNote(false);
                }}
                title="Clear note"
              >
                ✕
              </button>
            )}
            <span className="magnet-hover-note-count">
              {noteDraft.length}/15
            </span>
          </div>
          <div className={popoverPlacement === 'top' ? 'magnet-hover-note-arrow-down' : 'magnet-hover-note-arrow-up'} />
        </div>,
        document.body
      )}
    </>
  );
};
