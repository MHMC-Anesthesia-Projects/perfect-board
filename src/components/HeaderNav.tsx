'use client';

import React, { useState, useEffect } from 'react';
import { UserRole } from '@/types/whiteboard';
import { 
  Sun, Moon, Shield, Lock, LogIn, LogOut, 
  RotateCw, FileSpreadsheet, Settings, 
  Keyboard, Clock, CheckCircle2, Mic, Sparkles,
  Smartphone, Eraser, MessageSquare, CheckCheck 
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
  isCompletingRelief = false
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

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

  const isEditor = currentUser && (currentUser.role === 'board_runner' || currentUser.role === 'superuser');

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
          <span>Basic User: {currentUser.displayName}</span>
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
        <span>Superuser: {currentUser.displayName}</span>
      </div>
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
        {/* Scraper Sync Button (Board Runner & Superuser only) */}
        {isEditor && (
          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            title={lastSyncTime ? `Last synced: ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Sync'}
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
              color: 'var(--text-primary)'
            }}
          >
            <RotateCw size={14} className={isSyncing ? 'spin-animation' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        )}

        {/* Auto-Assign Magnets Button (Board Runner & Superuser only) */}
        {onAutoAssign && isEditor && (
          <button
            onClick={onAutoAssign}
            disabled={isAutoAssigning}
            title="Auto-assign staff magnets to department rooms and runner slots based on portal schedule"
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
              color: 'var(--accent-primary)',
              cursor: isAutoAssigning ? 'not-allowed' : 'pointer'
            }}
          >
            <Sparkles size={14} className={isAutoAssigning ? 'spin-animation' : ''} />
            <span>{isAutoAssigning ? 'Assigning...' : 'Auto-Assign'}</span>
          </button>
        )}

        {/* Clean Whiteboard / Reset for Today Button (Board Runner & Superuser) */}
        {onCleanWhiteboard && isEditor && (
          <button
            onClick={onCleanWhiteboard}
            title="Clean Whiteboard: Clear all room and runner magnets to start a fresh day"
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
            <Eraser size={14} />
            <span>Clean Board</span>
          </button>
        )}


        {/* Complete All Reliefs Button */}
        {isEditor && onCompleteAllReliefs && (
          <button
            onClick={onCompleteAllReliefs}
            disabled={reliefCount === 0 || isCompletingRelief}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: reliefCount > 0 ? 'var(--marker-red, #dc2626)' : 'var(--surface-hover)',
              border: reliefCount > 0 ? '1.5px solid #b91c1c' : '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 800,
              color: reliefCount > 0 ? '#ffffff' : 'var(--text-muted)',
              cursor: reliefCount > 0 && !isCompletingRelief ? 'pointer' : 'not-allowed',
              boxShadow: reliefCount > 0 ? '0 2px 8px rgba(220, 38, 38, 0.35)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title={reliefCount > 0 ? `Complete all ${reliefCount} relief handoffs and move relief staff into their active slots` : 'No active relief assignments scheduled'}
          >
            <CheckCheck size={14} className={isCompletingRelief ? 'spin-animation' : ''} />
            <span>Complete Relief{reliefCount > 0 ? ` (${reliefCount})` : ''}</span>
          </button>
        )}

        {/* Relief Assignments Group SMS Button */}
        {isEditor && onOpenReliefTextModal && (
          <button
            onClick={onOpenReliefTextModal}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1.5px solid var(--marker-red, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--marker-red, #dc2626)',
              cursor: 'pointer'
            }}
            title="Build text thread of everyone in a room, relieving, or running"
          >
            <MessageSquare size={14} />
            <span>Relief Assignments</span>
          </button>
        )}

        {/* Audit Log / Historical Ledger Button (Board Runner & Superuser only) */}
        {isEditor && (
          <button
            onClick={onOpenAudit}
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
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={14} />
            <span>Audit Log</span>
          </button>
        )}

        {/* Admin Dashboard (Visible to Superuser - Gear icon only to save space) */}
        {currentUser?.role === 'superuser' && (
          <button
            onClick={onOpenAdmin}
            title="Superuser Admin Settings & Command Center"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              background: 'rgba(211, 47, 47, 0.1)',
              border: '1px solid var(--marker-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--marker-red)',
              cursor: 'pointer'
            }}
          >
            <Settings size={15} />
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
      `}</style>
    </header>
  );
};
