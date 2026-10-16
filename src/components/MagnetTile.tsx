'use client';

import React, { useRef } from 'react';
import { Staff, UserRole, BreakDisplayConfig } from '@/types/whiteboard';
import { LogOut } from 'lucide-react';

interface MagnetTileProps {
  staff: Staff;
  slotId?: string;
  slotType?: 'room_slot' | 'runner_slot' | 'bullpen' | 'unassigned';
  breakfastDone?: boolean;
  lunchDone?: boolean;
  dinnerDone?: boolean;
  currentUserRole: UserRole;
  showBreaks?: boolean;
  breakDisplay?: BreakDisplayConfig;
  onToggleBreak?: (breakType: 'breakfast' | 'lunch' | 'dinner', currentValue: boolean) => void;
  onSelectStaff?: (staff: Staff) => void;
  onDragStart?: (e: React.DragEvent, staff: Staff, source: { type: string; id?: string }) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onUnassign?: () => void;
  isCompact?: boolean;
  isDraggable?: boolean;
  isAssignedRelief?: boolean;
  hasPendingRelief?: boolean;
  unreadMessageCount?: number;
  magnetNote?: string;
  onUpdateNote?: (note: string) => void;
  stickers?: string[];
  onToggleSticker?: (staffId: string, stickerId: string) => void;
  activeStampStickerId?: string | null;
}

export const MagnetTile: React.FC<MagnetTileProps> = ({
  staff,
  slotId,
  slotType = 'bullpen',
  breakfastDone = false,
  lunchDone = false,
  dinnerDone = false,
  currentUserRole,
  showBreaks,
  breakDisplay,
  onToggleBreak,
  onSelectStaff,
  onDragStart,
  onDragEnd,
  onUnassign,
  isCompact = false,
  isDraggable: propIsDraggable,
  isAssignedRelief = false,
  hasPendingRelief = false,
  unreadMessageCount = 0,
  magnetNote,
  stickers,
  onToggleSticker,
  activeStampStickerId
}) => {
  const currentNote = (magnetNote !== undefined ? magnetNote : (staff.magnetNote || '')) || '';
  const canViewRedNote = currentUserRole === 'board_runner' || currentUserRole === 'admin' || currentUserRole === 'superuser';
  const tileRef = useRef<HTMLDivElement>(null);

  const isDraggable = !isAssignedRelief && (propIsDraggable !== undefined 
    ? propIsDraggable 
    : (currentUserRole === 'board_runner' || currentUserRole === 'admin' || currentUserRole === 'superuser'));

  const isBreaksConfigEnabled = breakDisplay ? (breakDisplay.enabled ?? true) : true;
  const showB = breakDisplay ? (breakDisplay.showBreakfast ?? true) : true;
  const showL = breakDisplay ? (breakDisplay.showLunch ?? true) : true;
  const showD = breakDisplay ? (breakDisplay.showDinner ?? false) : false;
  const hasAnyBreakVisible = showB || showL || showD;

  const canShowBreaks = !hasPendingRelief && isBreaksConfigEnabled && hasAnyBreakVisible && (showBreaks !== undefined
    ? showBreaks
    : (slotType !== 'unassigned' && (Boolean(onToggleBreak) || breakfastDone || lunchDone || dinnerDone)));

  const handleTileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeStampStickerId && onToggleSticker) {
      onToggleSticker(staff.id, activeStampStickerId);
      return;
    }
    if (onSelectStaff) {
      onSelectStaff(staff);
    }
  };

  const handleBreakClick = (e: React.MouseEvent, type: 'breakfast' | 'lunch' | 'dinner', current: boolean) => {
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
    if (onDragStart) {
      onDragStart(e, staff, { type: slotType, id: slotId });
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (onDragEnd) {
      onDragEnd(e);
    }
  };

  const handleTileDragOver = (e: React.DragEvent) => {
    if (typeof window !== 'undefined' && (window as any).__activeDraggedSticker) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleTileDrop = (e: React.DragEvent) => {
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
      onToggleSticker(staff.id, stickerId);
    }
  };

  return (
    <div
      ref={tileRef}
      className={`magnet-tile ${isCompact ? 'compact' : ''} cred-tile-${staff.credentials} ${unreadMessageCount > 0 ? 'has-unread-message' : ''} ${isAssignedRelief ? 'is-relief-assigned' : ''}`}
      draggable={isDraggable}
      onDragStart={handleDrag}
      onDragEnd={handleDragEnd}
      onDragOver={handleTileDragOver}
      onDrop={handleTileDrop}
      onClick={handleTileClick}
      title={isAssignedRelief
        ? `${staff.displayName ? `[${staff.displayName}] ` : ''}${staff.firstName} ${staff.lastName} (${staff.credentials}) • Currently assigned as relief. Cannot be assigned to another relief box.`
        : (currentUserRole === 'view_only'
          ? `${staff.displayName ? `[${staff.displayName}] ` : ''}${staff.firstName} ${staff.lastName} (${staff.credentials})${canViewRedNote && currentNote ? ` [Note: ${currentNote}]` : ''}${staff.hasStudent ? ` • 🎓 Student: ${staff.studentName || 'Assigned'}` : ''} • Tap to login`
          : `${staff.displayName ? `[${staff.displayName}] ` : ''}${staff.firstName} ${staff.lastName} (${staff.credentials})${canViewRedNote && currentNote ? ` [Note: ${currentNote}]` : ''}${staff.hasStudent ? ` • 🎓 Student: ${staff.studentName || 'Assigned'}` : ''} • Phone: ${staff.phone}${unreadMessageCount > 0 ? ` • ${unreadMessageCount} NEW MESSAGE(S)` : ''}`)}
      style={{
        cursor: isDraggable ? 'grab' : (isAssignedRelief ? 'not-allowed' : 'pointer'),
        touchAction: isDraggable ? 'none' : 'pan-y',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      {/* Breakfast, Lunch & Dinner Checkboxes */}
      {canShowBreaks && (
        <div className="break-controls">
          {/* Breakfast Checkbox [B] */}
          {showB && (
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
          )}

          {/* Lunch Checkbox [L] */}
          {showL && (
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
          )}

          {/* Dinner Checkbox [D] */}
          {showD && (
            <button
              type="button"
              className={`break-toggle-btn ${dinnerDone ? 'done' : ''}`}
              onClick={(e) => handleBreakClick(e, 'dinner', dinnerDone)}
              disabled={!onToggleBreak}
              title={currentUserRole === 'view_only'
                ? 'Login required to toggle dinner break'
                : `Dinner Break: ${dinnerDone ? 'Completed (Tap to undo)' : 'Pending (Tap to mark done)'}`}
            >
              {dinnerDone ? '✓' : 'D'}
            </button>
          )}
        </div>
      )}

      {/* Staff Name, Custom Red Note, and Badges */}
      <div className="magnet-identity">
        <span className="magnet-name">
          {staff.displayName 
            ? staff.displayName.toUpperCase() 
            : `${staff.lastName.toUpperCase()}${staff.firstName ? ` ${staff.firstName[0]}.` : ''}`}
        </span>

        {/* Legacy Note Display (read-only if present) */}
        {canViewRedNote && currentNote && (
          <span className="magnet-red-note" title={`Note: ${currentNote}`}>
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

        {/* Visual Stickers & Magnets (green dot, blue dot, VOLUNTEER, WILL FINISH, custom text) */}
        {stickers && stickers.length > 0 && (
          <div className="magnet-stickers-container">
            {stickers.map((stId) => {
              if (stId === 'green_dot') {
                return (
                  <span
                    key={stId}
                    className="magnet-sticker-dot green"
                    title="Green dot (Click to remove)"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSticker?.(staff.id, stId);
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
                      onToggleSticker?.(staff.id, stId);
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
                      onToggleSticker?.(staff.id, stId);
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
                      onToggleSticker?.(staff.id, stId);
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
                      onToggleSticker?.(staff.id, stId);
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
  );
};
