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

  const createStickerDragGhost = (stickerId: string): HTMLElement => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.padding = '12px 0 0 12px';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '999999';

    const badge = document.createElement('span');
    if (stickerId === 'green_dot') {
      badge.className = 'magnet-sticker-dot green';
      badge.style.width = '10px';
      badge.style.height = '10px';
      badge.style.borderRadius = '50%';
      badge.style.backgroundColor = '#10b981';
      badge.style.border = '1.5px solid white';
      badge.style.display = 'inline-block';
      badge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.45)';
    } else if (stickerId === 'blue_dot') {
      badge.className = 'magnet-sticker-dot blue';
      badge.style.width = '10px';
      badge.style.height = '10px';
      badge.style.borderRadius = '50%';
      badge.style.backgroundColor = '#0284c7';
      badge.style.border = '1.5px solid white';
      badge.style.display = 'inline-block';
      badge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.45)';
    } else if (stickerId === 'vol') {
      badge.className = 'magnet-sticker-badge vol';
      badge.textContent = 'VOLUNTEER';
      badge.style.backgroundColor = '#8b5cf6';
      badge.style.color = '#ffffff';
      badge.style.fontSize = '8.5px';
      badge.style.fontWeight = '900';
      badge.style.padding = '1.5px 5px';
      badge.style.borderRadius = '3px';
      badge.style.border = '1px solid rgba(255,255,255,0.85)';
      badge.style.display = 'inline-block';
      badge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.45)';
    } else if (stickerId === 'will_finish' || stickerId === 'yellow_dot') {
      badge.className = 'magnet-sticker-badge will-finish';
      badge.textContent = 'WILL FINISH';
      badge.style.backgroundColor = '#d97706';
      badge.style.color = '#ffffff';
      badge.style.fontSize = '8px';
      badge.style.fontWeight = '900';
      badge.style.padding = '1.5px 5px';
      badge.style.borderRadius = '3px';
      badge.style.border = '1px solid rgba(255,255,255,0.85)';
      badge.style.display = 'inline-block';
      badge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.45)';
    } else if (stickerId.startsWith('text:') || stickerId.startsWith('custom:')) {
      const text = stickerId.replace(/^(text:|custom:)/, '');
      badge.className = 'magnet-sticker-badge custom-text';
      badge.textContent = text;
      badge.style.backgroundColor = '#0f766e';
      badge.style.color = '#ffffff';
      badge.style.fontSize = '8.5px';
      badge.style.fontWeight = '900';
      badge.style.padding = '1.5px 5px';
      badge.style.borderRadius = '3px';
      badge.style.border = '1px solid rgba(255,255,255,0.85)';
      badge.style.display = 'inline-block';
      badge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.45)';
    }

    container.appendChild(badge);
    document.body.appendChild(container);
    return container;
  };

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

    if (e.dataTransfer && typeof e.dataTransfer.setDragImage === 'function') {
      const ghost = createStickerDragGhost(sticker.id);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => ghost.remove(), 0);
    }

    if (typeof window !== 'undefined') {
      (window as any).__activeDraggedSticker = sticker.id;
      document.body.classList.add('dragging-sticker');
    }
  };

  const displayCustomText = (customText.trim() || 'CUSTOM').slice(0, 10).toUpperCase();
  const currentCustomStickerId = `text:${displayCustomText}`;
  const isCustomStampActive = activeStampStickerId === currentCustomStickerId;

  const handleDragCustom = (e: React.DragEvent) => {
    const stickerId = currentCustomStickerId;
    const payloadObj = {
      type: 'sticker',
      stickerId
    };
    const payload = JSON.stringify(payloadObj);
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.setData('text', payload);
    e.dataTransfer.effectAllowed = 'copy';

    if (e.dataTransfer && typeof e.dataTransfer.setDragImage === 'function') {
      const ghost = createStickerDragGhost(stickerId);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => ghost.remove(), 0);
    }

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
    const isAlreadySelected = activeStampStickerId === currentCustomStickerId;
    onSelectStampSticker?.(isAlreadySelected ? null : currentCustomStickerId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 10);
    setCustomText(val);
    if (activeStampStickerId?.startsWith('text:') && onSelectStampSticker) {
      const nextText = (val.trim() || 'CUSTOM').toUpperCase();
      onSelectStampSticker(`text:${nextText}`);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      customInputRef.current?.blur();
      onSelectStampSticker?.(currentCustomStickerId);
    }
  };

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

        {/* Custom Free-Text Magnet: Type text, then single-click the badge to pick up & drop, or drag */}
        <div className="custom-magnet-group">
          <div className="custom-magnet-input-pill">
            <span className="custom-magnet-pencil-icon" title="Type custom text">✎</span>
            <input
              ref={customInputRef}
              type="text"
              className="custom-magnet-pill-input"
              maxLength={10}
              placeholder="CUSTOM"
              value={customText}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              title="Type custom text (e.g. STAT, PACU, NOTE). Press Enter or click the badge to pick up."
            />
            {customText && (
              <button
                type="button"
                className="custom-magnet-clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setCustomText('');
                  if (activeStampStickerId?.startsWith('text:')) {
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

          <div
            className={`sticker-chip badge-style custom-text-chip ${isCustomStampActive ? 'stamp-active' : ''}`}
            draggable
            onDragStart={handleDragCustom}
            onDragEnd={handleDragEnd}
            onClick={handleSelectCustomStamp}
            title={`Custom Magnet: "${displayCustomText}" — Single click to pick up and drop, or drag to magnet/room`}
          >
            <span
              className="sticker-badge-visual"
              style={{ backgroundColor: '#0f766e' }}
            >
              {displayCustomText}
            </span>
          </div>
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
