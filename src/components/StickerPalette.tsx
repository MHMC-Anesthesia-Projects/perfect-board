'use client';

import React, { useState, useRef } from 'react';
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
  const [customText, setCustomText] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

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

  const handleDragCustom = (e: React.DragEvent) => {
    const trimmed = (customText.trim() || 'TEXT').slice(0, 10).toUpperCase();
    const stickerId = `text:${trimmed}`;
    const payloadObj = {
      type: 'sticker',
      stickerId
    };
    const payload = JSON.stringify(payloadObj);
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.setData('text', payload);
    e.dataTransfer.effectAllowed = 'copy';

    if (typeof window !== 'undefined') {
      (window as any).__activeDraggedSticker = stickerId;
      document.body.classList.add('dragging-sticker');
    }
  };

  const handleDragEnd = () => {
    if (typeof window !== 'undefined') {
      (window as any).__activeDraggedSticker = null;
      document.body.classList.remove('dragging-sticker');
    }
  };

  const handleSelectCustomStamp = () => {
    const trimmed = (customText.trim() || 'TEXT').slice(0, 10).toUpperCase();
    const targetStickerId = `text:${trimmed}`;
    const isAlreadySelected = activeStampStickerId === targetStickerId;
    onSelectStampSticker?.(isAlreadySelected ? null : targetStickerId);
  };

  const isCustomStampActive = Boolean(activeStampStickerId?.startsWith('text:'));

  return (
    <div className="sticker-palette-bar">
      <div className="sticker-palette-header">
        <span className="sticker-palette-title">MAGNETS</span>
        {activeStampStickerId && (
          <span className="sticker-palette-stamp-hint">
            Stamp: {activeStampStickerId.startsWith('text:')
              ? `"${activeStampStickerId.replace(/^text:/, '')}"`
              : (PREDEFINED_STICKERS.find(s => s.id === activeStampStickerId)?.label || 'Active')}
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
                <span
                  className="sticker-dot-visual"
                  style={{ backgroundColor: sticker.color }}
                />
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

        {/* Custom Text Magnet with Free Text Box (max 10 characters) */}
        <div
          className={`custom-magnet-chip ${isCustomStampActive ? 'stamp-active' : ''}`}
          title="Custom free-text magnet (max 10 chars) — Type text, then drag to any magnet/room or tap badge to stamp"
        >
          <input
            ref={customInputRef}
            type="text"
            className="custom-magnet-input"
            maxLength={10}
            placeholder="Max 10 ch..."
            value={customText}
            onChange={(e) => {
              const val = e.target.value.slice(0, 10);
              setCustomText(val);
              if (isCustomStampActive && onSelectStampSticker) {
                onSelectStampSticker(val.trim() ? `text:${val.trim().toUpperCase()}` : null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSelectCustomStamp();
              }
            }}
          />
          <div
            className="custom-magnet-badge"
            draggable
            onDragStart={handleDragCustom}
            onDragEnd={handleDragEnd}
            onClick={handleSelectCustomStamp}
            title="Drag to magnet or room, or tap to stamp"
          >
            {customText.trim() ? customText.trim().toUpperCase() : '+ Text'}
          </div>
        </div>

        {hasAnyStickers && onClearAllStickers && (
          <button
            type="button"
            className="sticker-clear-all-btn"
            onClick={onClearAllStickers}
            title="Clear all magnets/stickers across the board"
          >
            Clear Stickers
          </button>
        )}
      </div>
    </div>
  );
};
