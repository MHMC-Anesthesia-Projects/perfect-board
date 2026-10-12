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
    const trimmed = (customText.trim() || 'NOTE').slice(0, 10).toUpperCase();
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
    const trimmed = (customText.trim() || 'NOTE').slice(0, 10).toUpperCase();
    const targetStickerId = `text:${trimmed}`;
    const isAlreadySelected = activeStampStickerId === targetStickerId;
    onSelectStampSticker?.(isAlreadySelected ? null : targetStickerId);
  };

  const isCustomStampActive = Boolean(activeStampStickerId?.startsWith('text:'));

  return (
    <div className="sticker-palette-bar">
      <div className="sticker-palette-header">
        <span className="sticker-palette-title">MAGNETS</span>
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
              title={`${sticker.label} — Drag to magnet or room, or tap to select`}
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

        {/* Unified Custom Free-Text Magnet (max 10 characters) */}
        <div
          className={`custom-text-magnet-pill ${isCustomStampActive ? 'stamp-active' : ''}`}
          draggable
          onDragStart={handleDragCustom}
          onDragEnd={handleDragEnd}
          onClick={handleSelectCustomStamp}
          title="Custom Magnet (max 10 chars) — Type text, then drag to any magnet/room or tap to select"
        >
          <span className="custom-magnet-icon" title="Drag magnet">⋮⋮</span>
          <input
            ref={customInputRef}
            type="text"
            className="custom-magnet-pill-input"
            maxLength={10}
            placeholder="CUSTOM"
            value={customText}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onChange={(e) => {
              const val = e.target.value.slice(0, 10);
              setCustomText(val);
              if (isCustomStampActive && onSelectStampSticker) {
                onSelectStampSticker(val.trim() ? `text:${val.trim().toUpperCase()}` : null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                customInputRef.current?.blur();
                handleSelectCustomStamp();
              }
            }}
          />
          {customText && (
            <button
              type="button"
              className="custom-magnet-clear-btn"
              onClick={(e) => {
                e.stopPropagation();
                setCustomText('');
                if (isCustomStampActive) {
                  onSelectStampSticker?.(null);
                }
                customInputRef.current?.focus();
              }}
              title="Clear text"
            >
              ×
            </button>
          )}
        </div>

        {hasAnyStickers && onClearAllStickers && (
          <button
            type="button"
            className="sticker-clear-all-btn"
            onClick={onClearAllStickers}
            title="Clear all magnets/stickers across the board"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};
