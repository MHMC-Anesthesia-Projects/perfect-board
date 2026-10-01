'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Check, X, Keyboard } from 'lucide-react';

interface VoiceNoteModalProps {
  isOpen: boolean;
  target: {
    type: 'room' | 'departure' | 'lates' | 'general';
    id?: string;
    currentNotes: string;
  } | null;
  onClose: () => void;
  onSaveNotes: (type: 'room' | 'departure' | 'lates' | 'general', id: string | undefined, notes: string) => void;
  onOpenVirtualKeyboard?: () => void;
}

export const VoiceNoteModal: React.FC<VoiceNoteModalProps> = ({
  isOpen,
  target,
  onClose,
  onSaveNotes,
  onOpenVirtualKeyboard
}) => {
  const [text, setText] = useState(target?.currentNotes || '');
  const [isRecording, setIsRecording] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const recognitionRef = useRef<unknown>(null);

  // Sync initial note when target opens
  const lastTargetIdRef = useRef<string | undefined>(undefined);
  if (target && target.id !== lastTargetIdRef.current) {
    lastTargetIdRef.current = target.id;
    setText(target.currentNotes || '');
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const WindowWithSpeech = window as unknown as {
        SpeechRecognition?: new () => any;
        webkitSpeechRecognition?: new () => any;
      };
      const SpeechRecognitionClass = WindowWithSpeech.SpeechRecognition || WindowWithSpeech.webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: { resultIndex: number; results: Array<Array<{ transcript: string }> & { isFinal?: boolean }> }) => {
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            setText(prev => (prev ? `${prev} ${finalTranscript}` : finalTranscript).trim());
          }
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      const rec = recognitionRef.current as { stop?: () => void } | null;
      if (rec && typeof rec.stop === 'function') {
        try {
          rec.stop();
        } catch {}
      }
    };
  }, []);

  if (!isOpen || !target) return null;

  const toggleRecording = () => {
    const rec = recognitionRef.current as { start?: () => void; stop?: () => void } | null;
    if (!rec || typeof rec.start !== 'function') {
      alert('Speech recognition is not supported in this browser. You can type notes using the on-screen keyboard.');
      return;
    }

    if (isRecording) {
      try {
        rec.stop?.();
      } catch {}
      setIsRecording(false);
    } else {
      try {
        rec.start?.();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handlePolishWithAI = async () => {
    if (!text.trim()) return;
    setIsPolishing(true);
    try {
      const res = await fetch('/api/voice-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text })
      });
      const data = await res.json();
      if (data.polished) {
        setText(data.polished);
      }
    } catch (err) {
      console.error('AI polishing failed:', err);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleSave = () => {
    onSaveNotes(target.type, target.id, text.trim());
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="pin-pad-card"
        onClick={e => e.stopPropagation()}
        style={{ width: 480, padding: 24, textAlign: 'left', alignItems: 'stretch' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: isRecording ? 'rgba(211, 47, 47, 0.15)' : 'var(--surface-hover)',
              color: isRecording ? 'var(--marker-red)' : 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mic size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase' }}>
                Voice Activated Clinical Notes
              </h3>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Target: {target.type.toUpperCase()} {target.id ? `(${target.id})` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Text Area */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Tap mic to speak notes (e.g. 'PACU delay 20 mins', 'TEE at 1230')..."
            style={{
              width: '100%',
              minHeight: 120,
              padding: '12px',
              borderRadius: 8,
              border: isRecording ? '2px solid var(--marker-red)' : '1px solid var(--border-light)',
              background: 'var(--surface-hover)',
              color: 'var(--text-primary)',
              fontSize: 15,
              fontFamily: 'var(--font-main)',
              lineHeight: 1.4,
              resize: 'vertical',
              outline: 'none'
            }}
          />

          {isRecording && (
            <div style={{
              position: 'absolute',
              top: 10,
              right: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--marker-red)',
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '2px 8px',
              borderRadius: 12
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--marker-red)',
                display: 'inline-block',
                animation: 'pulse 1s infinite'
              }} />
              <span>RECORDING</span>
            </div>
          )}
        </div>

        {/* Voice AI Action Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Mic Toggle Button */}
            <button
              onClick={toggleRecording}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 6,
                background: isRecording ? 'var(--marker-red)' : 'var(--surface-hover)',
                color: isRecording ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--border-light)',
                fontWeight: 700,
                fontSize: 13
              }}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              <span>{isRecording ? 'Stop Mic' : 'Start Mic'}</span>
            </button>

            {/* AI Polish Button */}
            <button
              onClick={handlePolishWithAI}
              disabled={isPolishing || !text.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 6,
                background: 'var(--accent-surface)',
                color: 'var(--accent-primary)',
                border: '1px solid var(--accent-border)',
                fontWeight: 700,
                fontSize: 13,
                opacity: isPolishing || !text.trim() ? 0.6 : 1
              }}
            >
              <Sparkles size={16} />
              <span>{isPolishing ? 'Polishing...' : 'AI Medical Polish'}</span>
            </button>
          </div>

          {onOpenVirtualKeyboard && (
            <button
              onClick={() => {
                onClose();
                onOpenVirtualKeyboard();
              }}
              title="Open touch keyboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontWeight: 600
              }}
            >
              <Keyboard size={14} />
              <span>Keyboard</span>
            </button>
          )}
        </div>

        {/* Modal Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 6,
              background: 'var(--accent-primary)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <Check size={16} />
            <span>Save Note to Board</span>
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 18px',
              borderRadius: 6,
              background: 'var(--surface-hover)',
              color: 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 14
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
