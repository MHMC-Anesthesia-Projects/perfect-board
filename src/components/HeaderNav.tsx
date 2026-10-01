'use client';

import React, { useState, useEffect } from 'react';
import { UserRole } from '@/types/whiteboard';
import { 
  Sun, Moon, Shield, Lock, LogIn, LogOut, 
  RotateCw, FileSpreadsheet, Settings, 
  Keyboard, Clock, CheckCircle2, Mic,
  PanelRightClose, PanelRightOpen,
  PanelLeftClose, PanelLeftOpen 
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
  isSyncing: boolean;
  lastSyncTime?: string | null;
  isRightSidebarOpen?: boolean;
  onToggleRightSidebar?: () => void;
  isBullpenOpen?: boolean;
  onToggleBullpen?: () => void;
  bullpenCount?: number;
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
  isSyncing,
  lastSyncTime,
  isRightSidebarOpen = true,
  onToggleRightSidebar,
  isBullpenOpen = true,
  onToggleBullpen,
  bullpenCount = 0
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

  const getRoleBadge = () => {
    if (!currentUser || currentUser.role === 'basic_user') {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: 'var(--surface-hover)',
          border: '1px solid var(--border-light)',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-secondary)'
        }}>
          <Lock size={13} style={{ color: 'var(--text-muted)' }} />
          <span>Basic User (Breaks Only)</span>
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
              Surgical Suite Whiteboard
            </h1>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              Live Operational Board • 65&quot; Touch Station
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
        {/* Scraper Sync Button */}
        <button
          onClick={onTriggerSync}
          disabled={isSyncing}
          title={lastSyncTime ? `Last synced: ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Sync with Portal'}
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
          <span>{isSyncing ? 'Syncing...' : 'Sync Portal'}</span>
        </button>

        {/* Voice AI Transcription Button */}
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

        {/* Toggle Bullpen Button (Left Menu) */}
        {onToggleBullpen && (
          <button
            onClick={onToggleBullpen}
            title={isBullpenOpen ? 'Hide Bullpen (Expand Whiteboard)' : 'Show Bullpen (Available Staff)'}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              background: isBullpenOpen ? 'var(--surface-hover)' : 'rgba(9, 105, 218, 0.12)',
              border: isBullpenOpen ? '1px solid var(--border-light)' : '1.5px solid var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 700,
              color: isBullpenOpen ? 'var(--text-primary)' : 'var(--accent-primary)',
              cursor: 'pointer'
            }}
          >
            {isBullpenOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
            <span style={{ fontSize: 11 }}>
              Bullpen{bullpenCount > 0 ? ` (${bullpenCount})` : ''}
            </span>
          </button>
        )}

        {/* Toggle Right Sidebar Button (Departure & Lates) */}
        {onToggleRightSidebar && (
          <button
            onClick={onToggleRightSidebar}
            title={isRightSidebarOpen ? 'Hide Departure & Lates (Expand Whiteboard)' : 'Show Departure & Lates'}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              background: isRightSidebarOpen ? 'var(--surface-hover)' : 'rgba(9, 105, 218, 0.12)',
              border: isRightSidebarOpen ? '1px solid var(--border-light)' : '1.5px solid var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 700,
              color: isRightSidebarOpen ? 'var(--text-primary)' : 'var(--accent-primary)',
              cursor: 'pointer'
            }}
          >
            {isRightSidebarOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            <span style={{ fontSize: 11 }}>Departure</span>
          </button>
        )}

        {/* Audit Log / Historical Ledger Button */}
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
            color: 'var(--text-primary)'
          }}
        >
          <FileSpreadsheet size={14} />
          <span>Audit Log</span>
        </button>

        {/* Admin Dashboard (Visible to Superuser) */}
        {currentUser?.role === 'superuser' && (
          <button
            onClick={onOpenAdmin}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: 'rgba(211, 47, 47, 0.1)',
              border: '1px solid var(--marker-red)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--marker-red)'
            }}
          >
            <Settings size={14} />
            <span>Superuser Admin</span>
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
            gap: 4,
            fontSize: 12,
            fontWeight: 700
          }}
          title="Toggle on-screen touch virtual keyboard"
        >
          <Keyboard size={15} />
        </button>

        {/* Theme Switcher Toggle */}
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
            gap: 6,
            fontSize: 12,
            fontWeight: 700
          }}
          title="Toggle Physical Whiteboard / OR Dark Mode"
        >
          {theme === 'whiteboard' ? <Moon size={15} /> : <Sun size={15} />}
          <span>{theme === 'whiteboard' ? 'OR Dark' : 'Whiteboard'}</span>
        </button>

        {/* Auth / Login Button */}
        {currentUser && currentUser.role !== 'basic_user' ? (
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
              color: 'var(--text-secondary)'
            }}
          >
            <LogOut size={14} />
            <span>Switch Role</span>
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
              fontWeight: 800
            }}
          >
            <LogIn size={14} />
            <span>Runner / Admin Login</span>
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
