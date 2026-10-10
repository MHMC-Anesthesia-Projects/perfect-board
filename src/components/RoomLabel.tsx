'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Room, UserRole } from '@/types/whiteboard';

interface RoomLabelProps {
  room: Room;
  deptName?: string;
  roomNote?: string;
  onUpdateRoomNote?: (roomId: string, note: string) => void;
  currentUserRole?: UserRole;
  onOpenLogin?: () => void;
}

export const RoomLabel: React.FC<RoomLabelProps> = ({
  room,
  deptName,
  roomNote,
  onUpdateRoomNote,
  currentUserRole,
  onOpenLogin
}) => {
  const currentNote = (roomNote !== undefined ? roomNote : (room.note || '')) || '';

  const [noteDraft, setNoteDraft] = useState(currentNote);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom'>('top');
  const [popoverCoords, setPopoverCoords] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [mounted, setMounted] = useState(false);
  const isClosingViaActionRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
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
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const isCloseToTop = rect.top < 65;
    const placement = isCloseToTop ? 'bottom' : 'top';
    setPopoverPlacement(placement);
    setPopoverCoords({
      left: Math.max(120, Math.min(window.innerWidth - 120, rect.left + rect.width / 2)),
      top: placement === 'top' ? rect.top - 6 : rect.bottom + 6
    });
  };

  // Expand hover area to the ENTIRE box of the room (.room-row)
  useEffect(() => {
    const rowEl = containerRef.current?.closest('.room-row') as HTMLElement | null;
    if (!rowEl) return;

    const handleMouseEnter = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const isOverMagnet = Boolean(el?.closest('.magnet-tile'));
      setIsHovered(!isOverMagnet);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const isOverMagnet = Boolean(target?.closest('.magnet-tile'));
      setIsHovered(!isOverMagnet);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
    };

    rowEl.addEventListener('mouseenter', handleMouseEnter);
    rowEl.addEventListener('mousemove', handleMouseMove);
    rowEl.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      rowEl.removeEventListener('mouseenter', handleMouseEnter);
      rowEl.removeEventListener('mousemove', handleMouseMove);
      rowEl.removeEventListener('mouseleave', handleMouseLeave);
      rowEl.classList.remove('room-hovered');
    };
  }, []);

  // Visually highlight the whole room box when hovered
  useEffect(() => {
    const rowEl = containerRef.current?.closest('.room-row') as HTMLElement | null;
    if (!rowEl) return;
    if (isHovered) {
      rowEl.classList.add('room-hovered');
    } else {
      rowEl.classList.remove('room-hovered');
    }
    return () => {
      rowEl.classList.remove('room-hovered');
    };
  }, [isHovered]);

  // Trigger popup ONLY when user starts typing while hovering over this room label/badge
  useEffect(() => {
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

      if (currentUserRole === 'view_only') {
        return;
      }

      // Ignore modifier keys and navigation
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

      // When hovering over this room and user starts typing (printable character or Backspace/Delete)
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        updatePopoverPosition();
        setIsEditingNote(true);

        let initialVal = noteDraft;
        if (e.key === 'Backspace' || e.key === 'Delete') {
          initialVal = initialVal.slice(0, -1);
        } else if (e.key.length === 1) {
          if (initialVal.length < 30) {
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
  }, [isHovered, isEditingNote, noteDraft, currentUserRole]);

  const handleSaveNote = (newVal: string) => {
    const trimmed = (newVal || '').trim().slice(0, 30);
    setNoteDraft(trimmed);
    if (onUpdateRoomNote) {
      onUpdateRoomNote(room.id, trimmed);
    }
  };

  const handleOpenEditor = () => {
    if (currentUserRole === 'view_only') {
      onOpenLogin?.();
      return;
    }
    updatePopoverPosition();
    setIsEditingNote(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 40);
  };

  const handleClearNote = () => {
    isClosingViaActionRef.current = true;
    handleSaveNote('');
    setIsEditingNote(false);
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`room-label-container ${isHovered ? 'hovered' : ''}`}
      >
        {/* Room Number / Identifier */}
        <div
          className={`room-label ${currentNote ? 'has-note' : ''}`}
          title={`Room ${room.name}${deptName ? ` (${deptName})` : ''}${currentNote ? ` • Note: "${currentNote}" (Click to edit)` : ' • Hover & type to add note'}`}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEditor();
          }}
        >
          {room.name}
        </div>

        {/* Small Font Room Note Badge (max 30 characters) */}
        {currentNote && (
          <span
            className="room-note-badge"
            title={`Room note: "${currentNote}" (Click to edit or clear)`}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditor();
            }}
          >
            {currentNote}
          </span>
        )}
      </div>

      {/* Floating Popover: Appears ONLY when typing starts or user clicks to edit */}
      {mounted && isEditingNote && createPortal(
        <div
          className="room-hover-note-popover"
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
          <div className="room-hover-note-inner">
            <span className="room-hover-note-indicator" title={`Room ${room.name} Note`}>
              {room.name}
            </span>
            <input
              ref={inputRef}
              type="text"
              className="room-hover-note-input"
              value={noteDraft}
              maxLength={30}
              placeholder={`Room ${room.name} note (max 30)...`}
              onChange={(e) => {
                const val = e.target.value.slice(0, 30);
                setNoteDraft(val);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  isClosingViaActionRef.current = true;
                  const finalVal = noteDraft.trim().slice(0, 30);
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
                const finalVal = noteDraft.trim().slice(0, 30);
                if (finalVal !== currentNote) {
                  handleSaveNote(finalVal);
                }
              }}
            />
            {Boolean(noteDraft) && (
              <button
                type="button"
                className="room-hover-note-clear"
                onMouseDown={(e) => {
                  // Prevent input blur before onClick fires
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClearNote();
                }}
                title="Clear note"
              >
                ✕
              </button>
            )}
            <span className="room-hover-note-count">
              {noteDraft.length}/30
            </span>
          </div>
          <div className={popoverPlacement === 'top' ? 'room-hover-note-arrow-down' : 'room-hover-note-arrow-up'} />
        </div>,
        document.body
      )}
    </>
  );
};
