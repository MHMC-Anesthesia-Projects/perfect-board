'use client';

import React from 'react';
import { PREDEFINED_STICKERS, StickerItem } from '@/types/whiteboard';

interface StickerPaletteProps {
  activeStampStickerId?: string | null;
  onSelectStampSticker?: (stickerId: string | null) => void;
  onClearAllStickers?: () => void;
  hasAnyStickers?: boolean;
}

export const StickerPalette: React.FC<StickerPaletteProps> = ({
  activeStampStickerId = null,
  onSelectStampSticker,
  onClearAllStickers,
  hasAnyStickers = false
}) => {
  const handleDragStart = (e: React.DragEvent, sticker: StickerItem) => {
    const payloadObj = {
      type: 'sticker',
      stickerId: sticker.id
    };
    const payload = JSON.stringify(payloadObj);
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.setData('text', payload);
    e.dataTransfer.effectAllowed = 'copy';

    if (typeof window !== 'undefined') {
      (window as any).__activeDraggedSticker = sticker.id;
      document.body.classList.add('dragging-sticker');
    }
  };

  const handleDragEnd = () => {
    if (typeof window !== 'undefined') {
      (window as any).__activeDraggedSticker = null;
      document.body.classList.remove('dragging-sticker');
    }
  };

  return (
    <div className="sticker-palette-bar">
      <div className="sticker-palette-header">
        <span className="sticker-palette-title">STICKERS</span>
        {activeStampStickerId && (
          <span className="sticker-palette-stamp-hint">
            Stamp Active: Tap any magnet or room!
            <button
              type="button"
              className="sticker-cancel-stamp-btn"
              onClick={() => onSelectStampSticker?.(null)}
              title="Cancel stamp mode"
            >
              Cancel
            </button>
          </span>
        )}
      </div>

      <div className="sticker-palette-items">
        {PREDEFINED_STICKERS.map((sticker) => {
          const isSelected = activeStampStickerId === sticker.id;

          return (
            <div
              key={sticker.id}
              className={`sticker-chip ${sticker.type === 'badge' ? 'badge-style' : 'dot-style'} ${isSelected ? 'stamp-active' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, sticker)}
              onDragEnd={handleDragEnd}
              onClick={() => {
                onSelectStampSticker?.(isSelected ? null : sticker.id);
              }}
              title={`${sticker.label} — Drag to magnet or room, or tap to stamp`}
            >
              {sticker.type === 'dot' ? (
                <>
                  <span
                    className="sticker-dot-visual"
                    style={{ backgroundColor: sticker.color }}
                  />
                  <span className="sticker-chip-label">{sticker.label.replace(' Dot', '')}</span>
                </>
              ) : (
                <span
                  className="sticker-badge-visual"
                  style={{ backgroundColor: sticker.color }}
                >
                  {sticker.label}
                </span>
              )}
            </div>
          );
        })}

        {hasAnyStickers && onClearAllStickers && (
          <button
            type="button"
            className="sticker-clear-all-btn"
            onClick={onClearAllStickers}
            title="Clear all stickers across the board"
          >
            Clear Stickers
          </button>
        )}
      </div>
    </div>
  );
};
