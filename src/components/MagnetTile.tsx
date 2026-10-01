'use client';

import React from 'react';
import { Staff, UserRole } from '@/types/whiteboard';

interface MagnetTileProps {
  staff: Staff;
  slotId?: string;
  slotType?: 'room_slot' | 'runner_slot' | 'bullpen';
  breakfastDone?: boolean;
  lunchDone?: boolean;
  currentUserRole: UserRole;
  onToggleBreak?: (breakType: 'breakfast' | 'lunch', currentValue: boolean) => void;
  onSelectStaff?: (staff: Staff) => void;
  onDragStart?: (e: React.DragEvent, staff: Staff, source: { type: string; id?: string }) => void;
  isCompact?: boolean;
}

export const MagnetTile: React.FC<MagnetTileProps> = ({
  staff,
  slotId,
  slotType = 'bullpen',
  breakfastDone = false,
  lunchDone = false,
  currentUserRole,
  onToggleBreak,
  onSelectStaff,
  onDragStart,
  isCompact = false
}) => {
  const isDraggable = currentUserRole !== 'basic_user';

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

  return (
    <div
      className={`magnet-tile ${isCompact ? 'compact' : ''}`}
      draggable={isDraggable}
      onDragStart={handleDrag}
      onClick={handleTileClick}
      title={`${staff.firstName} ${staff.lastName} (${staff.credentials}) • Phone: ${staff.phone}`}
      style={{
        cursor: isDraggable ? 'grab' : 'pointer',
        padding: isCompact ? '3px 6px' : '4px 8px',
        fontSize: isCompact ? '12px' : '13px'
      }}
    >
      {/* Staff Name */}
      <span className="magnet-name">
        {staff.lastName.toUpperCase()}
        {staff.firstName ? ` ${staff.firstName[0]}.` : ''}
      </span>

      {/* Credential Badge */}
      <span className={`magnet-cred cred-${staff.credentials}`}>
        {staff.credentials}
      </span>

      {/* Breakfast & Lunch Checkboxes (Only shown on assigned room or runner slots, not bullpen) */}
      {slotType !== 'bullpen' && onToggleBreak && (
        <div className="break-controls">
          {/* Breakfast Checkbox [B] */}
          <button
            type="button"
            className={`break-toggle-btn ${breakfastDone ? 'done' : ''}`}
            onClick={(e) => handleBreakClick(e, 'breakfast', breakfastDone)}
            title={`Breakfast Break: ${breakfastDone ? 'Completed (Tap to undo)' : 'Pending (Tap to mark done)'}`}
          >
            {breakfastDone ? '✓' : 'B'}
          </button>

          {/* Lunch Checkbox [L] */}
          <button
            type="button"
            className={`break-toggle-btn ${lunchDone ? 'done' : ''}`}
            onClick={(e) => handleBreakClick(e, 'lunch', lunchDone)}
            title={`Lunch Break: ${lunchDone ? 'Completed (Tap to undo)' : 'Pending (Tap to mark done)'}`}
          >
            {lunchDone ? '✓' : 'L'}
          </button>
        </div>
      )}
    </div>
  );
};
