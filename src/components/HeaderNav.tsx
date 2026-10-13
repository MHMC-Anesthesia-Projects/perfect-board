'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UserRole } from '@/types/whiteboard';
import { 
  Sun, Moon, Shield, Lock, LogIn, LogOut, 
  RotateCw, FileSpreadsheet, Settings, 
  Keyboard, Clock, CheckCircle2, Mic, Sparkles,
  Smartphone, Eraser, MessageSquare, CheckCheck, Undo2, FileText,
  Maximize, Minimize, ChevronDown, Zap, Sticker
} from 'lucide-react';

interface HeaderNavProps {
  currentUser: { id: string; username: string; displayName: string; role: UserRole } | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  theme: 'whiteboard' | 'dark';
  onToggleTheme: () => void;
  onOpenAdmin: () => void;
  onOpenAudit: () => void;
  onToggleKeyboard: () => void;
  isKeyboardOpen: boolean;
  onTriggerSync: () => void;
  onOpenVoiceAi?: () => void;
  onAutoAssign?: () => void;
  isAutoAssigning?: boolean;
  onCleanWhiteboard?: () => void;
  onRemoveAllMagnets?: () => void;
  onClearAllTextNotes?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  undoCount?: number;
  lastUndoDescription?: string;
  isSyncing: boolean;
  lastSyncTime?: string | null;
  isRightSidebarOpen?: boolean;
  onToggleRightSidebar?: () => void;
  isBullpenOpen?: boolean;
  onToggleBullpen?: () => void;
  bullpenCount?: number;
  onSwitchToMobile?: () => void;
  onOpenReliefTextModal?: () => void;
  onCompleteAllReliefs?: () => void;
  reliefCount?: number;
  isCompletingRelief?: boolean;
  isManualMode?: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentUser,
  onOpenLogin,
  onLogout,
  theme,
  onToggleTheme,
  onOpenAdmin,
  onOpenAudit,
  onToggleKeyboard,
  isKeyboardOpen,
  onTriggerSync,
  onOpenVoiceAi,
  onAutoAssign,
  isAutoAssigning = false,
  onCleanWhiteboard,
  onRemoveAllMagnets,
  onClearAllTextNotes,
  onUndo,
  canUndo = false,
  undoCount = 0,
  lastUndoDescription,
  isSyncing,
  lastSyncTime,
  isRightSidebarOpen = true,
  onToggleRightSidebar,
  isBullpenOpen = true,
  onToggleBullpen,
  bullpenCount = 0,
  onSwitchToMobile,
  onOpenReliefTextModal,
  onCompleteAllReliefs,
  reliefCount = 0,
  isCompletingRelief = false,
  isManualMode = false
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Close Action dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setIsActionMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsActionMenuOpen(false);
      }
    };

    if (isActionMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActionMenuOpen]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setCurrentDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFull = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isDocFull);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    try {
      const doc = document as any;
      const isDocFull = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      if (!isDocFull) {
        const elem = document.documentElement as any;
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        }
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Error toggling fullscreen:', err);
    }
  };

  const isEditor = currentUser && (currentUser.role === 'board_runner' || currentUser.role === 'admin' || currentUser.role === 'superuser');

  const getRoleBadge = () => {
    if (!currentUser || currentUser.role === 'view_only') {
      return (
        <button
          type="button"
          onClick={onOpenLogin}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            background: 'var(--surface-hover)',
            border: '1px solid var(--border-light)',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
          title="View Only mode. Tap to log in with PIN."
        >
          <Lock size={13} style={{ color: 'var(--text-muted)' }} />
          <span>View Only &bull; Tap to Authenticate</span>
        </button>
      );
    }
    if (currentUser.role === 'basic_user') {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: 'rgba(34, 197, 94, 0.12)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-primary)'
        }}>
          <Lock size={13} style={{ color: 'var(--text-muted)' }} />
          <span>Staff: {currentUser.displayName}</span>
        </div>
      );
    }
    if (currentUser.role === 'board_runner') {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: 'rgba(9, 105, 218, 0.12)',
          border: '1px solid var(--accent-border)',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--accent-primary)'
        }}>
          <Shield size={14} />
          <span>Board Runner: {currentUser.displayName}</span>
        </div>
      );
    }
    if (currentUser.role === 'admin') {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: 'rgba(211, 47, 47, 0.12)',
          border: '1px solid var(--marker-red)',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 800,
          color: 'var(--marker-red)'
        }}>
          <CheckCircle2 size={14} />
          <span>Admin: {currentUser.displayName}</span>
        </div>
      );
    }
    return (
      <a
        href="/board/super"
        title="Open Superuser Control Center"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))',
          border: '1px solid #f59e0b',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 800,
          color: '#d97706',
          textDecoration: 'none',
          cursor: 'pointer'
        }}
      >
        <Shield size={14} />
        <span>Superuser Control Center &rarr;</span>
      </a>
    );
  };

  return (
    <header className="top-nav">
      {/* Brand & OR Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: 'var(--accent-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: 16,
            letterSpacing: 0.5
          }}>
            OR
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase', lineHeight: 1.1 }}>
              Perfect Board
            </h1>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              Surgical Suite Whiteboard
            </div>
          </div>
        </div>

        {/* Live Date & Time Clock */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px',
          background: 'var(--surface-hover)',
          borderRadius: 8,
          border: '1px solid var(--border-light)',
          fontFamily: 'var(--font-mono)'
        }}>
          <Clock size={15} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--marker-red)' }}>{currentTime}</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{currentDate}</span>
        </div>
      </div>

      {/* Center User Role Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {getRoleBadge()}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Unified "Action" Dropdown Menu (Board Runner, Admin & Superuser) */}
        {isEditor && (
          <div ref={actionMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsActionMenuOpen(prev => !prev)}
              title="Board Runner & Admin Action Menu"
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: isActionMenuOpen ? 'var(--surface-active, rgba(9, 105, 218, 0.12))' : 'var(--surface-hover)',
                border: isActionMenuOpen ? '1px solid var(--accent-border, #0969da)' : '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
                color: isActionMenuOpen ? 'var(--accent-primary, #0969da)' : 'var(--text-primary)',
                cursor: 'pointer',
                boxShadow: isActionMenuOpen ? '0 0 0 2px rgba(9, 105, 218, 0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Zap size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>Action</span>
              {((!isManualMode && (isSyncing || isAutoAssigning)) || isCompletingRelief) && (
                <RotateCw size={12} className="spin-animation" style={{ color: 'var(--accent-primary)' }} />
              )}
              {reliefCount > 0 && !isCompletingRelief && (
                <span
                  style={{
                    background: 'var(--marker-red, #dc2626)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 900,
                    padding: '1px 5px',
                    borderRadius: 10,
                    lineHeight: 1.1
                  }}
                  title={`${reliefCount} pending relief handoffs`}
                >
                  {reliefCount}
                </span>
              )}
              <ChevronDown
                size={13}
                style={{
                  transform: isActionMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  color: 'var(--text-secondary)'
                }}
              />
            </button>

            {isActionMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  zIndex: 1000,
                  width: 270,
                  background: 'var(--surface-card, #ffffff)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 10,
                  boxShadow: '0 14px 36px rgba(0, 0, 0, 0.25)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Portal & Automations (Hidden when board is in Manual Mode) */}
                {!isManualMode && (
                  <>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      color: 'var(--text-muted)',
                      padding: '6px 10px 4px 10px'
                    }}>
                      Portal & Automations
                    </div>

                    {/* 1. Sync */}
                    <button
                      type="button"
                      className="action-dropdown-item"
                      disabled={isSyncing}
                      onClick={() => {
                        onTriggerSync();
                        setIsActionMenuOpen(false);
                      }}
                      title={lastSyncTime ? `Last synced: ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Sync portal data'}
                    >
                      <div className="action-item-icon">
                        <RotateCw size={14} className={isSyncing ? 'spin-animation' : ''} style={{ color: 'var(--accent-primary)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                          {isSyncing ? 'Syncing...' : 'Sync'}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lastSyncTime ? `Last synced: ${new Date(lastSyncTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Refresh portal schedules'}
                        </div>
                      </div>
                    </button>

                    {/* 2. Auto-Assign */}
                    {onAutoAssign && (
                      <button
                        type="button"
                        className="action-dropdown-item"
                        disabled={isAutoAssigning}
                        onClick={() => {
                          onAutoAssign();
                          setIsActionMenuOpen(false);
                        }}
                        title="Auto-assign staff magnets to department rooms and runner slots based on portal schedule"
                      >
                        <div className="action-item-icon">
                          <Sparkles size={14} className={isAutoAssigning ? 'spin-animation' : ''} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                            {isAutoAssigning ? 'Assigning...' : 'Auto-Assign'}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                            Place magnets from portal roster
                          </div>
                        </div>
                      </button>
                    )}

                    <div className="action-dropdown-divider" />
                  </>
                )}

                <div style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  color: 'var(--text-muted)',
                  padding: '6px 10px 4px 10px'
                }}>
                  Relief Coordination
                </div>

                {/* 3. Relief Assignments */}
                {onOpenReliefTextModal && (
                  <button
                    type="button"
                    className="action-dropdown-item"
                    onClick={() => {
                      onOpenReliefTextModal();
                      setIsActionMenuOpen(false);
                    }}
                    title="Build text thread of everyone in a room, relieving, or running"
                  >
                    <div className="action-item-icon">
                      <MessageSquare size={14} style={{ color: 'var(--marker-red)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                        Relief Assignments
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                        Group text thread & handoffs
                      </div>
                    </div>
                  </button>
                )}

                {/* 4. Complete Relief */}
                {onCompleteAllReliefs && (
                  <button
                    type="button"
                    className="action-dropdown-item"
                    disabled={reliefCount === 0 || isCompletingRelief}
                    onClick={() => {
                      onCompleteAllReliefs();
                      setIsActionMenuOpen(false);
                    }}
                    title={reliefCount > 0 ? `Complete all ${reliefCount} relief handoffs and move relief staff into their active slots` : 'No active relief assignments scheduled'}
                  >
                    <div className="action-item-icon">
                      <CheckCheck size={14} className={isCompletingRelief ? 'spin-animation' : ''} style={{ color: reliefCount > 0 ? 'var(--marker-red)' : 'var(--text-muted)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>Complete Relief</span>
                        {reliefCount > 0 && (
                          <span style={{
                            background: 'var(--marker-red)',
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 10
                          }}>
                            {reliefCount}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                        {reliefCount > 0 ? `Move ${reliefCount} relief staff to active` : 'No pending reliefs'}
                      </div>
                    </div>
                  </button>
                )}

                <div className="action-dropdown-divider" />

                <div style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  color: 'var(--text-muted)',
                  padding: '6px 10px 4px 10px'
                }}>
                  Maintenance & History
                </div>

                {/* 5. Remove All Magnets */}
                {(onRemoveAllMagnets || onClearAllTextNotes) && (
                  <button
                    type="button"
                    className="action-dropdown-item"
                    onClick={() => {
                      if (onRemoveAllMagnets) onRemoveAllMagnets();
                      else if (onClearAllTextNotes) onClearAllTextNotes();
                      setIsActionMenuOpen(false);
                    }}
                    title="Remove all sticker magnets across the whiteboard"
                  >
                    <div className="action-item-icon">
                      <Sticker size={14} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                        Remove All Magnets
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                        Delete all sticker magnets
                      </div>
                    </div>
                  </button>
                )}

                {/* 6. Clean Board */}
                {onCleanWhiteboard && (
                  <button
                    type="button"
                    className="action-dropdown-item"
                    onClick={() => {
                      onCleanWhiteboard();
                      setIsActionMenuOpen(false);
                    }}
                    title="Clean Whiteboard: Clear all room and runner magnets to start a fresh day"
                  >
                    <div className="action-item-icon">
                      <Eraser size={14} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                        Clean Board
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                        Clear magnets for a fresh day
                      </div>
                    </div>
                  </button>
                )}

                {/* 7. Audit Log */}
                <button
                  type="button"
                  className="action-dropdown-item"
                  onClick={() => {
                    onOpenAudit();
                    setIsActionMenuOpen(false);
                  }}
                  title="Open audit ledger and activity history"
                >
                  <div className="action-item-icon">
                    <FileSpreadsheet size={14} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                      Audit Log
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                      Board action history & ledger
                    </div>
                  </div>
                </button>

                {/* 8. Admin Settings (Org Admin level only) */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'superuser') && (
                  <>
                    <div className="action-dropdown-divider" />
                    <div style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      color: 'var(--text-muted)',
                      padding: '6px 10px 4px 10px'
                    }}>
                      Org Admin
                    </div>
                    <button
                      type="button"
                      className="action-dropdown-item"
                      onClick={() => {
                        onOpenAdmin();
                        setIsActionMenuOpen(false);
                      }}
                      title="Facility Admin Settings & Command Center"
                    >
                      <div className="action-item-icon">
                        <Settings size={14} style={{ color: 'var(--marker-red)' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Admin Settings</span>
                          <span style={{
                            background: 'rgba(211, 47, 47, 0.12)',
                            color: 'var(--marker-red)',
                            border: '1px solid rgba(211, 47, 47, 0.3)',
                            borderRadius: 4,
                            fontSize: 9.5,
                            fontWeight: 800,
                            padding: '1px 5px'
                          }}>
                            Org Admin
                          </span>
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                          Facility setup & permissions
                        </div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* In-Session Undo Button */}
        {onUndo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onUndo();
            }}
            title={canUndo ? `Undo: ${lastUndoDescription || 'last action'} (Ctrl+Z / ⌘Z)` : 'Nothing to undo (Ctrl+Z / ⌘Z)'}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: canUndo ? 'var(--surface-hover)' : 'transparent',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: canUndo ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: canUndo ? 'pointer' : 'default',
              opacity: canUndo ? 1 : 0.45,
              transition: 'all 0.15s ease',
              userSelect: 'none'
            }}
          >
            <Undo2 size={14} />
            <span>Undo{undoCount && undoCount > 0 ? ` (${undoCount})` : ''}</span>
          </button>
        )}

        {/* Voice AI Transcription Button (to the left of the keyboard icon) */}
        {onOpenVoiceAi && (
          <button
            onClick={onOpenVoiceAi}
            title="Open Voice AI Clinical Notes & Dictation"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--marker-red)',
              cursor: 'pointer'
            }}
          >
            <Mic size={15} />
          </button>
        )}

        {/* On-screen Touch Keyboard Toggle */}
        <button
          onClick={onToggleKeyboard}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            background: isKeyboardOpen ? 'var(--accent-surface)' : 'var(--surface-hover)',
            border: isKeyboardOpen ? '1px solid var(--accent-border)' : '1px solid var(--border-light)',
            color: isKeyboardOpen ? 'var(--accent-primary)' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer'
          }}
          title="Toggle on-screen touch virtual keyboard"
        >
          <Keyboard size={15} />
        </button>

        {/* Theme Switcher Toggle (Sun / Moon icon only) */}
        <button
          onClick={onToggleTheme}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            background: 'var(--surface-hover)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer'
          }}
          title={theme === 'whiteboard' ? 'Switch to OR Dark Mode' : 'Switch to Whiteboard Mode'}
        >
          {theme === 'whiteboard' ? <Moon size={15} /> : <Sun size={15} />}
        </button>

        {/* Fullscreen Toggle (Maximize / Minimize icon) */}
        <button
          onClick={toggleFullscreen}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            background: 'var(--surface-hover)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer'
          }}
          title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
        >
          {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
        </button>

        {/* Mobile View Switcher (Hidden on Computer/TV view) */}
        {onSwitchToMobile && (
          <button
            onClick={onSwitchToMobile}
            className="mobile-only-btn"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Switch to Mobile / Small Screen View"
          >
            <Smartphone size={15} />
            <span>Mobile</span>
          </button>
        )}

        {/* Auth / Login Button */}
        {currentUser && currentUser.role !== 'view_only' ? (
          <button
            onClick={onLogout}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <LogOut size={14} />
            <span>Switch Role / Logout</span>
          </button>
        ) : (
          <button
            onClick={onOpenLogin}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              background: 'var(--accent-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <LogIn size={14} />
            <span>Login</span>
          </button>
        )}
      </div>

      <style jsx>{`
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .action-dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 10px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--text-primary);
          text-align: left;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
          font-family: inherit;
        }
        .action-dropdown-item:hover:not(:disabled) {
          background: var(--surface-hover);
        }
        .action-dropdown-item:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .action-item-icon {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: var(--surface-hover);
          border: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .action-dropdown-divider {
          height: 1px;
          background: var(--border-light);
          margin: 4px 6px;
        }
      `}</style>
    </header>
  );
};
