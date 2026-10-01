'use client';

import React, { useState } from 'react';
import { X, Delete, CornerDownLeft, ArrowUp } from 'lucide-react';

interface VirtualKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertChar: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onEnter: () => void;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  isOpen,
  onClose,
  onInsertChar,
  onBackspace,
  onClear,
  onEnter
}) => {
  const [isCaps, setIsCaps] = useState(true);

  if (!isOpen) return null;

  const numberRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '/'];
  const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ':'];
  const row3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '#'];

  const handleKey = (char: string) => {
    onInsertChar(isCaps ? char.toUpperCase() : char.toLowerCase());
  };

  return (
    <div className="virtual-keyboard-dock">
      {/* Keyboard Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)' }}>
          Touchscreen Virtual Keyboard
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClear}
            style={{
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 700,
              background: 'var(--surface-hover)',
              borderRadius: 4,
              color: 'var(--marker-red)'
            }}
          >
            Clear Text
          </button>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Row 0: Numbers */}
      <div className="vk-row">
        {numberRow.map(key => (
          <button key={key} className="vk-key" onClick={() => handleKey(key)}>
            {key}
          </button>
        ))}
        <button className="vk-key special" onClick={onBackspace} title="Backspace" style={{ color: 'var(--marker-red)' }}>
          <Delete size={18} />
        </button>
      </div>

      {/* Row 1: QWERTY */}
      <div className="vk-row">
        {row1.map(key => (
          <button key={key} className="vk-key" onClick={() => handleKey(key)}>
            {isCaps ? key : key.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Row 2: ASDF */}
      <div className="vk-row">
        {row2.map(key => (
          <button key={key} className="vk-key" onClick={() => handleKey(key)}>
            {isCaps ? key : key.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Row 3: ZXCV */}
      <div className="vk-row">
        <button
          className="vk-key special"
          onClick={() => setIsCaps(prev => !prev)}
          style={{ background: isCaps ? 'var(--accent-primary)' : 'var(--surface-active)', color: isCaps ? '#fff' : 'inherit' }}
        >
          <ArrowUp size={16} />
          <span style={{ fontSize: 11, marginLeft: 2 }}>CAPS</span>
        </button>
        {row3.map(key => (
          <button key={key} className="vk-key" onClick={() => handleKey(key)}>
            {isCaps ? key : key.toLowerCase()}
          </button>
        ))}
        <button
          className="vk-key special"
          onClick={onEnter}
          style={{ background: 'var(--accent-primary)', color: '#fff', minWidth: 80 }}
        >
          <CornerDownLeft size={16} />
          <span style={{ fontSize: 11, marginLeft: 2 }}>ENTER</span>
        </button>
      </div>

      {/* Row 4: Spacebar */}
      <div className="vk-row">
        <button className="vk-key special" onClick={() => handleKey('TEE ')}>
          TEE
        </button>
        <button className="vk-key special" onClick={() => handleKey('PACU ')}>
          PACU
        </button>
        <button className="vk-key space" onClick={() => onInsertChar(' ')}>
          SPACEBAR
        </button>
        <button className="vk-key special" onClick={() => handleKey('DELAY ')}>
          DELAY
        </button>
        <button
          className="vk-key special"
          onClick={onClose}
          style={{ background: 'var(--break-done-bg)', color: '#fff', minWidth: 70 }}
        >
          DONE
        </button>
      </div>
    </div>
  );
};
