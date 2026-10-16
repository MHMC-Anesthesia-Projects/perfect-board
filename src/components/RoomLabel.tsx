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
  stickers?: string[];
  onToggleSticker?: (roomId: string, stickerId: string) => void;
  activeStampStickerId?: string | null;
}

export const RoomLabel: React.FC<RoomLabelProps> = ({
  room,
  deptName,
  roomNote,
  onUpdateRoomNote,
  currentUserRole,
  onOpenLogin,
  stickers,
  onToggleSticker,
  activeStampStickerId
}) => {
  const currentNote = (roomNote !== undefined ? roomNote : (room.note || '')) || '';

  const [noteDraft, setNoteDraft] = useState(currentNote);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom'>('top');
  const [popoverCoords, setPopoverCoords] = useState<{ left: number; top: number; arrowLeft: number }>({ left: 8, top: 0, arrowLeft: 20 });
  const [mounted, setMounted] = useState(false);
  const isClosingViaActionRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
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
    const targetEl = labelRef.current || containerRef.current;
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const isCloseToTop = rect.top < 65;
    const placement = isCloseToTop ? 'bottom' : 'top';
    setPopoverPlacement(placement);

    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
    const popoverWidth = popoverRef.current?.offsetWidth || Math.min(260, screenWidth - 16);
    const targetCenterX = rect.left + rect.width / 2;

    const desiredLeft = targetCenterX - popoverWidth / 2;
    const left = Math.max(8, Math.min(screenWidth - popoverWidth - 8, desiredLeft));
    const arrowLeft = Math.max(14, Math.min(popoverWidth - 14, targetCenterX - left));

    setPopoverCoords({
      left,
      top: placement === 'top' ? rect.top - 6 : rect.bottom + 6,
      arrowLeft
    });
  };

  useEffect(() => {
    if (!isEditingNote) return;

    updatePopoverPosition();
    const handleScrollOrResize = () => {
      updatePopoverPosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    const raf = requestAnimationFrame(() => {
      updatePopoverPosition();
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      cancelAnimationFrame(raf);
    };
  }, [isEditingNote]);

  const handleOpenEditor = () => {
    if (currentUserRole === 'view_only') {
      onOpenLogin?.();
      return;
    }
    setNoteDraft(currentNote);
    setIsEditingNote(true);
  };

  const handleSaveNote = (val: string) => {
    if (onUpdateRoomNote) {
      onUpdateRoomNote(room.id, val.trim().slice(0, 30));
    }
  };

  const handleClearNote = () => {
    setNoteDraft('');
    handleSaveNote('');
    setIsEditingNote(false);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="room-label-container"
        onDragOver={(e) => {
          if (typeof window !== 'undefined' && (window as any).__activeDraggedSticker) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={(e) => {
          let stickerId = '';
          try {
            const dataStr = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text');
            if (dataStr) {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'sticker') stickerId = parsed.stickerId;
            }
          } catch {}
          if (!stickerId && typeof window !== 'undefined' && (window as any).__activeDraggedSticker) {
            stickerId = (window as any).__activeDraggedSticker;
          }
          if (stickerId && onToggleSticker) {
            e.preventDefault();
            e.stopPropagation();
            onToggleSticker(room.id, stickerId);
          }
        }}
      >
        {/* Room Number / Identifier (Box Surround & Monospace Font) */}
        <div
          ref={labelRef}
          className={`room-label ${currentNote ? 'has-note' : ''}`}
          title={`Room ${room.name}${deptName ? ` (${deptName})` : ''}${currentNote ? ` • Note: "${currentNote}" (Click to edit)` : ' • Click to add note'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (activeStampStickerId && onToggleSticker) {
              onToggleSticker(room.id, activeStampStickerId);
              return;
            }
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

        {/* Room Stickers / Magnets */}
        {stickers && stickers.length > 0 && (
          <div className="room-stickers-container">
            {stickers.map((stId) => {
              if (stId === 'green_dot') {
                return (
                  <span
                    key={stId}
                    className="magnet-sticker-dot green"
                    title="Green dot (Click to remove)"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSticker?.(room.id, stId);
                    }}
                  />
                );
              }
              if (stId === 'blue_dot') {
                return (
                  <span
                    key={stId}
                    className="magnet-sticker-dot blue"
                    title="Blue dot (Click to remove)"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSticker?.(room.id, stId);
                    }}
                  />
                );
              }
              if (stId === 'vol') {
                return (
                  <span
                    key={stId}
                    className="magnet-sticker-badge vol"
                    title="VOLUNTEER badge (Click to remove)"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSticker?.(room.id, stId);
                    }}
                  >
                    VOLUNTEER
                  </span>
                );
              }
              if (stId === 'will_finish' || stId === 'yellow_dot') {
                return (
                  <span
                    key={stId}
                    className="magnet-sticker-badge will-finish"
                    title="WILL FINISH badge (Click to remove)"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSticker?.(room.id, stId);
                    }}
                  >
                    WILL FINISH
                  </span>
                );
              }
              if (stId.startsWith('text:') || stId.startsWith('custom:')) {
                const label = stId.replace(/^(text:|custom:)/, '');
                return (
                  <span
                    key={stId}
                    className="magnet-sticker-badge custom-text"
                    title={`"${label}" magnet (Click to remove)`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSticker?.(room.id, stId);
                    }}
                  >
                    {label}
                  </span>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>

      {/* Floating Popover: Appears when user clicks the room number box */}
      {mounted && isEditingNote && createPortal(
        <div
          ref={popoverRef}
          className="room-hover-note-popover"
          style={{
            position: 'fixed',
            left: popoverCoords.left,
            top: popoverCoords.top,
            transform: popoverPlacement === 'top' ? 'translateY(-100%)' : 'translateY(0)',
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
              autoFocus
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
            <span className="room-hover-note-count">
              {noteDraft.length}/30
            </span>
            <button
              type="button"
              className="room-hover-note-clear"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                isClosingViaActionRef.current = true;
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                isClosingViaActionRef.current = true;
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClearNote();
              }}
              title={noteDraft ? "Delete note" : "Close"}
            >
              ✕
            </button>
          </div>
          <div
            className={popoverPlacement === 'top' ? 'room-hover-note-arrow-down' : 'room-hover-note-arrow-up'}
            style={{ left: popoverCoords.arrowLeft }}
          />
        </div>,
        document.body
      )}
    </>
  );
};
