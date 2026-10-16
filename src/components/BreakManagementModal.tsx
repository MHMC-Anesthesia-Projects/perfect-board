'use client';

import React, { useState, useEffect } from 'react';
import { BreakDisplayConfig, UserRole } from '@/types/whiteboard';
import { X, Coffee, Check, ToggleLeft, ToggleRight, Sparkles, Clock, CalendarClock } from 'lucide-react';
import { getAutomatedBreakDisplay } from '@/lib/dateUtils';

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
    showDinner: false,
    autoBreakSchedule: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig({
        enabled: currentConfig?.enabled ?? true,
        showBreakfast: currentConfig?.showBreakfast ?? true,
        showLunch: currentConfig?.showLunch ?? true,
        showDinner: currentConfig?.showDinner ?? false,
        autoBreakSchedule: currentConfig?.autoBreakSchedule ?? false
      });
      setIsSaving(false);
      setSaveSuccess(false);
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const autoSchedule = getAutomatedBreakDisplay();
  const isEnabled = config.enabled;
  const isAuto = Boolean(config.autoBreakSchedule);
  const showB = isEnabled && (isAuto ? autoSchedule.showBreakfast : config.showBreakfast);
  const showL = isEnabled && (isAuto ? autoSchedule.showLunch : config.showLunch);
  const showD = isEnabled && (isAuto ? autoSchedule.showDinner : config.showDinner);

  const handleApplyPreset = (preset: 'auto' | 'all' | 'bl' | 'lunch_only' | 'hide') => {
    if (preset === 'auto') {
      const auto = getAutomatedBreakDisplay();
      setConfig({
        enabled: true,
        showBreakfast: auto.showBreakfast,
        showLunch: auto.showLunch,
        showDinner: auto.showDinner,
        autoBreakSchedule: true
      });
    } else if (preset === 'all') {
      setConfig({ enabled: true, showBreakfast: true, showLunch: true, showDinner: true, autoBreakSchedule: false });
    } else if (preset === 'bl') {
      setConfig({ enabled: true, showBreakfast: true, showLunch: true, showDinner: false, autoBreakSchedule: false });
    } else if (preset === 'lunch_only') {
      setConfig({ enabled: true, showBreakfast: false, showLunch: true, showDinner: false, autoBreakSchedule: false });
    } else if (preset === 'hide') {
      setConfig({ enabled: false, showBreakfast: false, showLunch: false, showDinner: false, autoBreakSchedule: false });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const toSave: BreakDisplayConfig = {
        ...config,
        ...(isAuto ? {
          showBreakfast: autoSchedule.showBreakfast,
          showLunch: autoSchedule.showLunch,
          showDinner: autoSchedule.showDinner
        } : {})
      };
      await onSave(toSave);
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
          padding: '12px 16px',
          border: '1px solid var(--border-light)',
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)' }}>
              Enable Break Buttons on Live Board
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
              Master switch: When toggled off, B, L, and D buttons are hidden on all room and runner magnets.
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

        {/* Automated Break Labels Card */}
        <div style={{
          background: isAuto ? 'rgba(56, 189, 248, 0.08)' : 'var(--surface-hover)',
          borderRadius: 10,
          padding: '12px 16px',
          border: isAuto ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-light)',
          marginBottom: 14,
          transition: 'all 0.2s ease',
          opacity: isEnabled ? 1 : 0.45,
          pointerEvents: isEnabled ? 'auto' : 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: isAuto ? 'rgba(56, 189, 248, 0.2)' : 'var(--surface-card)',
                color: isAuto ? 'var(--accent-primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={19} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-primary)' }}>
                    Automated Break Labels
                  </span>
                  <span style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: isAuto ? 'rgba(46, 160, 67, 0.15)' : 'var(--surface-card)',
                    color: isAuto ? 'var(--marker-green)' : 'var(--text-muted)',
                    border: '1px solid var(--border-light)'
                  }}>
                    {isAuto ? 'SCHEDULE ACTIVE' : 'MANUAL MODE'}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Automatically displays and hides B, L, and D based on Houston hospital site time.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextAuto = !config.autoBreakSchedule;
                setConfig(prev => ({
                  ...prev,
                  autoBreakSchedule: nextAuto,
                  ...(nextAuto ? {
                    showBreakfast: autoSchedule.showBreakfast,
                    showLunch: autoSchedule.showLunch,
                    showDinner: autoSchedule.showDinner
                  } : {})
                }));
              }}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                color: isAuto ? 'var(--marker-green)' : 'var(--text-muted)'
              }}
              title="Toggle Automated Break Labels"
            >
              {isAuto ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
            </button>
          </div>

          {/* Current Live Window Status */}
          <div style={{
            marginTop: 10,
            padding: '7px 12px',
            borderRadius: 6,
            background: 'var(--surface-card)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11.5,
            flexWrap: 'wrap',
            gap: 6
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isAuto ? 'var(--marker-green)' : 'var(--text-muted)'
              }} />
              <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                Site Time: {autoSchedule.siteTimeText}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>•</span>
              <span style={{ color: isAuto ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: isAuto ? 800 : 600 }}>
                {autoSchedule.currentWindowLabel}: {autoSchedule.activeButtonsText}
              </span>
            </div>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {autoSchedule.nextWindowText}
            </span>
          </div>

          {/* Schedule Breakdown */}
          <div style={{
            marginTop: 8,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
            fontSize: 10.5,
            color: 'var(--text-secondary)'
          }}>
            <div style={{ padding: '4px 6px', borderRadius: 4, background: 'var(--surface-card)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
              <strong style={{ display: 'block', color: 'var(--text-primary)' }}>7 AM – 10 AM</strong>
              Breakfast [B]
            </div>
            <div style={{ padding: '4px 6px', borderRadius: 4, background: 'var(--surface-card)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
              <strong style={{ display: 'block', color: 'var(--text-primary)' }}>10 AM – 11 AM</strong>
              Both [B, L]
            </div>
            <div style={{ padding: '4px 6px', borderRadius: 4, background: 'var(--surface-card)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
              <strong style={{ display: 'block', color: 'var(--text-primary)' }}>11 AM – 3 PM</strong>
              Lunch [L]
            </div>
            <div style={{ padding: '4px 6px', borderRadius: 4, background: 'var(--surface-card)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
              <strong style={{ display: 'block', color: 'var(--text-primary)' }}>3 PM – 8 PM</strong>
              Dinner [D]
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
            * After 8:00 PM break buttons hide until 7:00 AM or next board clean.
          </div>
        </div>

        {/* Quick Presets */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Quick Presets
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            <button
              type="button"
              onClick={() => handleApplyPreset('auto')}
              style={{
                padding: '7px 6px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                background: isEnabled && isAuto ? 'var(--accent-primary)' : 'var(--surface-card)',
                color: isEnabled && isAuto ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer'
              }}
            >
              ⚡ Auto Sched
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('all')}
              style={{
                padding: '7px 6px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                background: isEnabled && !isAuto && config.showBreakfast && config.showLunch && config.showDinner ? 'var(--accent-primary)' : 'var(--surface-card)',
                color: isEnabled && !isAuto && config.showBreakfast && config.showLunch && config.showDinner ? '#fff' : 'var(--text-primary)',
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
                padding: '7px 6px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                background: isEnabled && !isAuto && config.showBreakfast && config.showLunch && !config.showDinner ? 'var(--accent-primary)' : 'var(--surface-card)',
                color: isEnabled && !isAuto && config.showBreakfast && config.showLunch && !config.showDinner ? '#fff' : 'var(--text-primary)',
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
                padding: '7px 6px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                background: isEnabled && !isAuto && !config.showBreakfast && config.showLunch && !config.showDinner ? 'var(--accent-primary)' : 'var(--surface-card)',
                color: isEnabled && !isAuto && !config.showBreakfast && config.showLunch && !config.showDinner ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--border-light)',
                cursor: 'pointer'
              }}
            >
              Lunch (L)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('hide')}
              style={{
                padding: '7px 6px',
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
          marginBottom: 16,
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
            border: (isEnabled && showB) ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: showB ? 'rgba(56, 189, 248, 0.15)' : 'var(--break-empty-bg)',
                color: showB ? 'var(--accent-primary)' : 'var(--text-secondary)',
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
                checked={showB}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  autoBreakSchedule: false,
                  showBreakfast: e.target.checked
                }))}
                style={{ width: 17, height: 17, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Breakfast</div>
              <div style={{ fontSize: 10.5, color: isAuto ? (showB ? 'var(--accent-primary)' : 'var(--text-muted)') : 'var(--text-secondary)', marginTop: 2, fontWeight: isAuto && showB ? 700 : 400 }}>
                {isAuto ? (showB ? '7a-11a (Active now)' : '7a-11a (Scheduled)') : 'Morning relief'}
              </div>
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
            border: (isEnabled && showL) ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: showL ? 'rgba(56, 189, 248, 0.15)' : 'var(--break-empty-bg)',
                color: showL ? 'var(--accent-primary)' : 'var(--text-secondary)',
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
                checked={showL}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  autoBreakSchedule: false,
                  showLunch: e.target.checked
                }))}
                style={{ width: 17, height: 17, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Lunch</div>
              <div style={{ fontSize: 10.5, color: isAuto ? (showL ? 'var(--accent-primary)' : 'var(--text-muted)') : 'var(--text-secondary)', marginTop: 2, fontWeight: isAuto && showL ? 700 : 400 }}>
                {isAuto ? (showL ? '10a-3p (Active now)' : '10a-3p (Scheduled)') : 'Midday break'}
              </div>
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
            border: (isEnabled && showD) ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: showD ? 'rgba(56, 189, 248, 0.15)' : 'var(--break-empty-bg)',
                color: showD ? 'var(--accent-primary)' : 'var(--text-secondary)',
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
                checked={showD}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  autoBreakSchedule: false,
                  showDinner: e.target.checked
                }))}
                style={{ width: 17, height: 17, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Dinner</div>
              <div style={{ fontSize: 10.5, color: isAuto ? (showD ? 'var(--accent-primary)' : 'var(--text-muted)') : 'var(--text-secondary)', marginTop: 2, fontWeight: isAuto && showD ? 700 : 400 }}>
                {isAuto ? (showD ? '3p-8p (Active now)' : '3p-8p (Scheduled)') : 'Evening / late shift'}
              </div>
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
