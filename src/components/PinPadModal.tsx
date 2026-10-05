'use client';

import { apiUrl } from '@/lib/api';
import React, { useState } from 'react';
import { UserRole } from '@/types/whiteboard';
import { Lock, Delete, KeyRound, UserCheck, ShieldAlert, X } from 'lucide-react';

interface PinPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { id: string; username: string; displayName: string; role: UserRole }) => void;
}

export const PinPadModal: React.FC<PinPadModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordMode, setShowPasswordMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setLoading(false);
      setShowPasswordMode(false);
      setUsername('');
      setPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError('');
      if (newPin.length >= 4) {
        // Auto-check PIN when 4 digits are reached
        trySubmitPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const trySubmitPin = async (inputPin: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/auth'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'pin', pin: inputPin })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid PIN');
        setLoading(false);
        return;
      }
      onLoginSuccess(data.user);
      onClose();
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/auth'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'password', username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        setLoading(false);
        return;
      }
      onLoginSuccess(data.user);
      onClose();
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="pin-pad-card" onClick={e => e.stopPropagation()}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: 'var(--accent-surface)', padding: 8, borderRadius: 8, color: 'var(--accent-primary)' }}>
              <Lock size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Role Authentication</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Login with PIN for Staff, Board Runner, or Admin</p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 6, color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            width: '100%',
            padding: '8px 12px',
            background: 'rgba(211, 47, 47, 0.1)',
            border: '1px solid var(--marker-red)',
            borderRadius: 6,
            color: 'var(--marker-red)',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {!showPasswordMode ? (
          <>
            <div style={{ textAlign: 'center', margin: '4px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>ENTER 4-DIGIT TOUCH PIN</span>
            </div>

            <div className="pin-display">
              {[0, 1, 2, 3].map(idx => (
                <div key={idx} className={`pin-dot ${pin.length > idx ? 'filled' : ''}`} />
              ))}
            </div>

            <div className="pin-grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button key={num} className="pin-key" onClick={() => handleKeyPress(num)} disabled={loading}>
                  {num}
                </button>
              ))}
              <button className="pin-key" onClick={handleClear} style={{ fontSize: 14, fontWeight: 700 }}>
                CLEAR
              </button>
              <button className="pin-key" onClick={() => handleKeyPress('0')} disabled={loading}>
                0
              </button>
              <button className="pin-key" onClick={handleBackspace} style={{ color: 'var(--marker-red)' }}>
                <Delete size={24} />
              </button>
            </div>

            {/* Dedicated Log In Button */}
            <button
              type="button"
              onClick={() => {
                if (pin.length >= 4) {
                  trySubmitPin(pin);
                }
              }}
              disabled={loading || pin.length < 4}
              style={{
                marginTop: 14,
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                background: 'var(--accent-primary)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 15,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: (loading || pin.length < 4) ? 'not-allowed' : 'pointer',
                opacity: (loading || pin.length < 4) ? 0.6 : 1,
                boxShadow: (loading || pin.length < 4) ? 'none' : '0 2px 8px rgba(9, 105, 218, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <Lock size={16} />
              <span>{loading ? 'Authenticating...' : 'Log In'}</span>
            </button>

            <button
              onClick={() => setShowPasswordMode(true)}
              style={{
                marginTop: 14,
                fontSize: 12,
                color: 'var(--accent-primary)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <KeyRound size={14} /> Or login with username & password
            </button>
          </>
        ) : (
          <form onSubmit={handlePasswordLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. admin or runner"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-light)',
                  background: 'var(--surface-hover)',
                  color: 'var(--text-primary)',
                  fontSize: 14
                }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-light)',
                  background: 'var(--surface-hover)',
                  color: 'var(--text-primary)',
                  fontSize: 14
                }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                padding: '12px',
                borderRadius: 6,
                background: 'var(--accent-primary)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => setShowPasswordMode(false)}
              style={{
                marginTop: 4,
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontWeight: 600,
                textAlign: 'center'
              }}
            >
              Back to Touch PIN Pad
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
