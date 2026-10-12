'use client';

import React from 'react';
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
  stickers,
  onToggleSticker,
  activeStampStickerId
}) => {
  return (
    <div
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
      onClick={(e) => {
        if (activeStampStickerId && onToggleSticker) {
          e.stopPropagation();
          onToggleSticker(room.id, activeStampStickerId);
        }
      }}
      title={`Room ${room.name}`}
    >
      <div className="room-label-number">
        {room.name}
      </div>

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
  );
};
