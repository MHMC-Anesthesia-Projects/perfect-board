'use client';

import React from 'react';
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
  unreadMessageCount?: number;
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
  unreadMessageCount = 0
}) => {
  const isDraggable = propIsDraggable !== undefined 
    ? propIsDraggable 
    : (currentUserRole === 'board_runner' || currentUserRole === 'superuser');

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
    <div
      className={`magnet-tile ${isCompact ? 'compact' : ''} cred-tile-${staff.credentials} ${unreadMessageCount > 0 ? 'has-unread-message' : ''}`}
      draggable={isDraggable}
      onDragStart={handleDrag}
      onDragEnd={handleDragEnd}
      onClick={handleTileClick}
      title={currentUserRole === 'view_only'
        ? `${staff.displayName ? `[${staff.displayName}] ` : ''}${staff.firstName} ${staff.lastName} (${staff.credentials}) • Tap to login`
        : `${staff.displayName ? `[${staff.displayName}] ` : ''}${staff.firstName} ${staff.lastName} (${staff.credentials}) • Phone: ${staff.phone}${unreadMessageCount > 0 ? ` • ${unreadMessageCount} NEW MESSAGE(S)` : ''}`}
      style={{
        cursor: isDraggable ? 'grab' : 'pointer'
      }}
    >
      {/* Staff Name (credentials color-coded via left accent stripe) */}
      <div className="magnet-identity">
        <span className="magnet-name">
          {staff.displayName 
            ? staff.displayName.toUpperCase() 
            : `${staff.lastName.toUpperCase()}${staff.firstName ? ` ${staff.firstName[0]}.` : ''}`}
        </span>
        {unreadMessageCount > 0 && (
          <span
            className="magnet-unread-badge"
            title={`${unreadMessageCount} new message(s) from ${staff.lastName}`}
          >
            💬{unreadMessageCount > 1 ? unreadMessageCount : ''}
          </span>
        )}
      </div>

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
