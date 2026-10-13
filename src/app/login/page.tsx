'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './login.module.css';
import { apiUrl } from '@/lib/api';
import {
  Shield, Mail, Lock, Eye, EyeOff, ArrowRight,
  Sparkles, KeyRound, AlertCircle, CheckCircle2,
  HelpCircle, X, Check, Laptop, Hospital
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'password' | 'pin'>('password');
  
  // Password Mode States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // PIN Mode States
  const [pin, setPin] = useState('');
  
  // Status States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Fill default superuser credentials
  const handleFillSuperuser = () => {
    setAuthMode('password');
    setEmail('superuser@superuser.com');
    setPassword('superuser@superuser.com');
    setErrorMsg('');
  };

  // Submit Password or PIN
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const payload = authMode === 'password'
        ? { mode: 'password', email: email.trim(), password }
        : { mode: 'pin', pin: pin.trim() };

      const res = await fetch(apiUrl('/api/auth'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please check credentials.');
      }

      setSuccessMsg(`Welcome, ${data.user.displayName || 'User'}! Redirecting...`);

      // Store authenticated user in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('currentUserRole', data.user.role);
        localStorage.setItem('currentUserName', data.user.displayName);
      }

      // Determine redirect destination
      const target = data.redirectUrl || (data.user.role === 'superuser' ? '/super' : '/usap');
      
      setTimeout(() => {
        router.push(target);
      }, 500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  // PIN pad handler
  const handlePinDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  const handlePinBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    setPin('');
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.loginCard}>
        {/* Brand Header */}
        <div className={styles.brandHeader}>
          <div className={styles.logoBadge}>
            <Shield size={26} />
          </div>
          <h1 className={styles.brandTitle}>
            PERFECT <span>BOARD</span>
          </h1>
          <p className={styles.brandSubtitle}>
            Unified OR Suite & Enterprise Board System
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className={styles.tabContainer}>
          <button
            type="button"
            className={`${styles.tabBtn} ${authMode === 'password' ? styles.tabBtnActive : ''}`}
            onClick={() => { setAuthMode('password'); setErrorMsg(''); }}
          >
            <Mail size={15} />
            Email & Password
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${authMode === 'pin' ? styles.tabBtnActive : ''}`}
            onClick={() => { setAuthMode('pin'); setErrorMsg(''); }}
          >
            <KeyRound size={15} />
            Quick PIN
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className={styles.errorAlert} style={{ marginBottom: 16 }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className={styles.successAlert} style={{ marginBottom: 16 }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Container */}
        {authMode === 'password' ? (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Email Address or Username</label>
              <div className={styles.inputWrapper}>
                <Mail size={18} className={styles.inputIcon} />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="superuser@superuser.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label}>Password</label>
                <button
                  type="button"
                  className={styles.forgotLink}
                  onClick={() => setShowForgotModal(true)}
                >
                  Forgot Password?
                </button>
              </div>
              <div className={styles.inputWrapper}>
                <Lock size={18} className={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`${styles.input} ${styles.inputPassword}`}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !email.trim() || !password.trim()}
            >
              {loading ? (
                <>Authenticating...</>
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.pinWrapper}>
              <div className={styles.labelRow} style={{ width: '100%' }}>
                <span className={styles.label}>Operating Room PIN</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Touchscreen quick access
                </span>
              </div>
              <div className={styles.pinDisplay}>
                {pin ? '•'.repeat(pin.length) : <span style={{ color: '#475569', fontSize: 14, letterSpacing: 'normal' }}>Enter PIN</span>}
              </div>

              <div className={styles.pinPad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    className={styles.pinKey}
                    onClick={() => handlePinDigit(num)}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.pinKey}
                  style={{ fontSize: 13, color: '#f87171' }}
                  onClick={handlePinClear}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className={styles.pinKey}
                  onClick={() => handlePinDigit('0')}
                >
                  0
                </button>
                <button
                  type="button"
                  className={styles.pinKey}
                  style={{ fontSize: 13, color: '#94a3b8' }}
                  onClick={handlePinBackspace}
                >
                  ⌫
                </button>
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                style={{ width: '100%', marginTop: 8 }}
                disabled={loading || pin.length < 4}
              >
                {loading ? 'Verifying PIN...' : 'Verify & Unlock'}
              </button>
            </div>
          </form>
        )}

        {/* Footer Navigation */}
        <div className={styles.footerSection}>
          <div className={styles.directLinks}>
            <Link href="/" className={styles.directLink}>
              Live Whiteboard (/board)
            </Link>
            <span>•</span>
            <Link href="/usap" className={styles.directLink}>
              Org Portal (/usap)
            </Link>
          </div>
          <div>Secure Enterprise Clinical Whiteboard Portal</div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowForgotModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <HelpCircle size={20} color="#2563eb" />
                Password Recovery & Reset
              </h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowForgotModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, marginBottom: 20 }}>
              <p style={{ margin: '0 0 12px 0' }}>
                For security reasons, password resets are managed directly within the <strong>Superuser Dashboard</strong>.
              </p>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Default Credentials:</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#2563eb' }}>Email: superuser@superuser.com</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#2563eb' }}>Password: superuser@superuser.com</div>
              </div>
              <p style={{ margin: '12px 0 0 0', fontSize: 12, color: '#64748b' }}>
                Inside the Superuser Dashboard, any authorized superuser can create, edit, delete, or reset passwords for any account.
              </p>
            </div>
            <button
              type="button"
              className={styles.submitBtn}
              style={{ width: '100%' }}
              onClick={() => {
                handleFillSuperuser();
                setShowForgotModal(false);
              }}
            >
              Use Superuser Credentials Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
