'use client';

import React, { useState, useEffect } from 'react';
import { BreakDisplayConfig, UserRole } from '@/types/whiteboard';
import { X, Coffee, Check, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

interface BreakManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig?: BreakDisplayConfig;
  onSave: (config: BreakDisplayConfig) => Promise<void> | void;
  currentUserRole?: UserRole;
}

export const BreakManagementModal: React.FC<BreakManagementModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSave,
  currentUserRole
}) => {
  const [config, setConfig] = useState<BreakDisplayConfig>({
    enabled: true,
    showBreakfast: true,
    showLunch: true,
    showDinner: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig({
        enabled: currentConfig?.enabled ?? true,
        showBreakfast: currentConfig?.showBreakfast ?? true,
        showLunch: currentConfig?.showLunch ?? true,
        showDinner: currentConfig?.showDinner ?? false
      });
      setIsSaving(false);
      setSaveSuccess(false);
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: 'all' | 'bl' | 'lunch_only' | 'hide') => {
    if (preset === 'all') {
      setConfig({ enabled: true, showBreakfast: true, showLunch: true, showDinner: true });
    } else if (preset === 'bl') {
      setConfig({ enabled: true, showBreakfast: true, showLunch: true, showDinner: false });
    } else if (preset === 'lunch_only') {
      setConfig({ enabled: true, showBreakfast: false, showLunch: true, showDinner: false });
    } else if (preset === 'hide') {
      setConfig({ enabled: false, showBreakfast: false, showLunch: false, showDinner: false });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(config);
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 350);
    } catch (err) {
      console.error('Failed to save break display settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const isEnabled = config.enabled;
  const showB = isEnabled && config.showBreakfast;
  const showL = isEnabled && config.showLunch;
  const showD = isEnabled && config.showDinner;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="pin-pad-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: '94vw',
          padding: '24px 26px',
          boxShadow: '0 24px 50px rgba(0, 0, 0, 0.45)',
          borderRadius: 14,
          background: 'var(--surface-card)',
          border: '1.5px solid var(--border-light)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1.5px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)'
            }}>
              <Coffee size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
                  Break Management
                </h3>
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: isEnabled ? 'rgba(46, 160, 67, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: isEnabled ? 'var(--marker-green)' : 'var(--marker-red)'
                }}>
                  {isEnabled ? 'LIVE ACTIVE' : 'HIDDEN'}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                Select which break buttons show on magnets across the live whiteboard.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Master Toggle Card */}
        <div style={{
          background: 'var(--surface-hover)',
          borderRadius: 10,
          padding: '14px 16px',
          border: '1px solid var(--border-light)',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)' }}>
              Enable Break Buttons on Live Board
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
              When toggled off, B, L, and D buttons are hidden on all room and runner magnets.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              color: isEnabled ? 'var(--marker-green)' : 'var(--text-muted)'
            }}
            title="Toggle break buttons on/off"
          >
            {isEnabled ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
          </button>
        </div>

        {/* Quick Presets */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Quick Presets
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            <button
              type="button"
              onClick={() => handleApplyPreset('all')}
              style={{
                padding: '7px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                background: isEnabled && config.showBreakfast && config.showLunch && config.showDinner ? 'var(--accent-primary)' : 'var(--surface-card)',
                color: isEnabled && config.showBreakfast && config.showLunch && config.showDinner ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer'
              }}
            >
              All (B, L, D)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('bl')}
              style={{
                padding: '7px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                background: isEnabled && config.showBreakfast && config.showLunch && !config.showDinner ? 'var(--accent-primary)' : 'var(--surface-card)',
                color: isEnabled && config.showBreakfast && config.showLunch && !config.showDinner ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer'
              }}
            >
              B &amp; L
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('lunch_only')}
              style={{
                padding: '7px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                background: isEnabled && !config.showBreakfast && config.showLunch && !config.showDinner ? 'var(--accent-primary)' : 'var(--surface-card)',
                color: isEnabled && !config.showBreakfast && config.showLunch && !config.showDinner ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer'
              }}
            >
              Lunch Only (L)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('hide')}
              style={{
                padding: '7px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                background: !isEnabled ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-card)',
                color: !isEnabled ? 'var(--marker-red)' : 'var(--marker-red)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer'
              }}
            >
              Hide All
            </button>
          </div>
        </div>

        {/* Individual Break Toggles */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: 18,
          opacity: isEnabled ? 1 : 0.45,
          pointerEvents: isEnabled ? 'auto' : 'none'
        }}>
          {/* Breakfast [B] */}
          <label style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 12,
            borderRadius: 8,
            background: 'var(--surface-card)',
            border: (isEnabled && config.showBreakfast) ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: config.showBreakfast ? 'rgba(56, 189, 248, 0.15)' : 'var(--break-empty-bg)',
                color: config.showBreakfast ? 'var(--accent-primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 13
              }}>
                B
              </div>
              <input
                type="checkbox"
                checked={config.showBreakfast}
                onChange={e => setConfig(prev => ({ ...prev, showBreakfast: e.target.checked }))}
                style={{ width: 17, height: 17, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Breakfast</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2 }}>Morning relief</div>
            </div>
          </label>

          {/* Lunch [L] */}
          <label style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 12,
            borderRadius: 8,
            background: 'var(--surface-card)',
            border: (isEnabled && config.showLunch) ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: config.showLunch ? 'rgba(56, 189, 248, 0.15)' : 'var(--break-empty-bg)',
                color: config.showLunch ? 'var(--accent-primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 13
              }}>
                L
              </div>
              <input
                type="checkbox"
                checked={config.showLunch}
                onChange={e => setConfig(prev => ({ ...prev, showLunch: e.target.checked }))}
                style={{ width: 17, height: 17, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Lunch</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2 }}>Midday break</div>
            </div>
          </label>

          {/* Dinner [D] */}
          <label style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 12,
            borderRadius: 8,
            background: 'var(--surface-card)',
            border: (isEnabled && config.showDinner) ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: config.showDinner ? 'rgba(56, 189, 248, 0.15)' : 'var(--break-empty-bg)',
                color: config.showDinner ? 'var(--accent-primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 13
              }}>
                D
              </div>
              <input
                type="checkbox"
                checked={config.showDinner}
                onChange={e => setConfig(prev => ({ ...prev, showDinner: e.target.checked }))}
                style={{ width: 17, height: 17, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Dinner</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2 }}>Evening / late shift</div>
            </div>
          </label>
        </div>

        {/* Live Preview Card */}
        <div style={{
          background: 'var(--surface-hover)',
          borderRadius: 10,
          padding: '12px 14px',
          border: '1px dashed var(--border-light)',
          marginBottom: 20
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={12} color="var(--accent-primary)" />
            <span>Magnet Tile Preview</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-card)',
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid var(--border-light)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>Dr. Sample</span>
              <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-primary)', padding: '1px 5px', borderRadius: 4 }}>
                MD
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {showB && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 900,
                  background: 'var(--break-empty-bg)',
                  color: 'var(--text-secondary)'
                }}>
                  B
                </span>
              )}
              {showL && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 900,
                  background: 'var(--break-empty-bg)',
                  color: 'var(--text-secondary)'
                }}>
                  L
                </span>
              )}
              {showD && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 900,
                  background: 'var(--break-empty-bg)',
                  color: 'var(--text-secondary)'
                }}>
                  D
                </span>
              )}
              {!showB && !showL && !showD && (
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No break buttons shown
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              borderRadius: 6,
              background: saveSuccess ? 'var(--marker-green)' : 'var(--accent-primary)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 13,
              border: 'none',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
            }}
          >
            {saveSuccess ? (
              <>
                <Check size={16} />
                <span>Applied!</span>
              </>
            ) : (
              <>
                <Coffee size={15} />
                <span>{isSaving ? 'Applying...' : 'Apply to Live Board'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
