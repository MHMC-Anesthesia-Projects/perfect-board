'use client';

import React from 'react';
import Link from 'next/link';
import styles from './landing.module.css';
import {
  Sparkles, ArrowRight, Layout, Monitor, ShieldCheck, Zap,
  Coffee, Mic, Smartphone, ExternalLink, Key, Building2,
  CheckCircle2, Radio, Users
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className={styles.pageWrapper}>
      {/* Background Lighting Accents */}
      <div className={styles.bgGlowTop} />
      <div className={styles.bgGlowBottom} />

      {/* Top Navbar */}
      <nav className={styles.navbar}>
        <Link href="/" className={styles.brandLogo}>
          <div className={styles.logoBadge}>
            <Sparkles size={18} />
          </div>
          <div>
            <div className={styles.brandName}>PERFECT BOARD</div>
            <div className={styles.brandTagline}>Surgical Suite Digital Whiteboard</div>
          </div>
        </Link>

        <div className={styles.navLinks}>
          <Link href="/board-builder-mockup" className={styles.navLink}>
            Board Builder
          </Link>
          <Link href="/board-builder-mockup/superuser" className={styles.navLink}>
            Superuser Console
          </Link>
          <Link href="/usap/mhmc" className={styles.navBtnPrimary}>
            <Layout size={15} />
            <span>Launch Live Board</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className={styles.heroSection}>
        <div className={styles.hospitalPill}>
          <Building2 size={14} />
          <span>Live Deployment • Memorial Hermann Medical Center (MHMC)</span>
        </div>

        <h1 className={styles.heroHeading}>
          The Real-Time Digital <br />
          <span className={styles.heroGradientText}>Operating Room Whiteboard</span>
        </h1>

        <p className={styles.heroSubheading}>
          Purpose-built for surgical suites, 65" touchscreen wall displays, and anesthesia teams. Replace static magnetic dry-erase boards with instant multi-device synchronization, 1-tap break tracking, and AI medical notes.
        </p>

        {/* Action CTAs */}
        <div className={styles.ctaGroup}>
          <Link href="/usap/mhmc" className={styles.primaryCta}>
            <Layout size={18} />
            <span>Launch MHMC Live Board</span>
            <ArrowRight size={16} />
          </Link>

          <Link href="/board-builder-mockup" className={styles.secondaryCta}>
            <Sparkles size={16} color="#60a5fa" />
            <span>Open Board Builder Wizard</span>
          </Link>

          <Link href="/board-builder-mockup/superuser" className={styles.superuserCta}>
            <Key size={16} />
            <span>Superuser Console</span>
          </Link>
        </div>

        {/* Live Preview Frame */}
        <div className={styles.previewContainer}>
          <div className={styles.previewWindowBar}>
            <div className={styles.previewDots}>
              <div className={styles.dot} style={{ background: '#ef4444' }} />
              <div className={styles.dot} style={{ background: '#eab308' }} />
              <div className={styles.dot} style={{ background: '#22c55e' }} />
            </div>
            <div className={styles.previewUrl}>
              https://perfectboard.io/usap/mhmc
            </div>
            <Link
              href="/usap/mhmc"
              style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
            >
              <span>Full Screen</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          <div style={{ padding: '36px 24px', background: '#0f172a', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1e293b', padding: '8px 16px', borderRadius: 8, border: '1px solid #334155', color: '#93c5fd', fontSize: 13, marginBottom: 16 }}>
              <Radio size={14} color="#38bdf8" />
              <span>Real-Time SSE Sync Active • Memorial Hermann Surgical Suite</span>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', marginBottom: 8 }}>
              MEMORIAL HERMANN MEDICAL CENTER
            </h3>
            <p style={{ fontSize: 14, color: '#94a3b8', maxWidth: 640, margin: '0 auto 24px' }}>
              8 Surgical Departments • 24 Operating Rooms • Runners, Departures, Call Team & Bullpen Bench
            </p>
            <Link
              href="/usap/mhmc"
              className={styles.primaryCta}
              style={{ display: 'inline-flex', padding: '12px 24px', fontSize: 14 }}
            >
              <span>Click to Enter Interactive Board</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>

      {/* Feature Highlights Section */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionBadge}>Engineered for Clinical Care Teams</div>
          <h2 className={styles.sectionTitle}>Everything an OR Whiteboard Needs</h2>
          <p className={styles.sectionSubtitle}>
            Zero clinical friction on the floor. Maximum administrative precision in the cloud.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {/* Feature 1 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#38bdf8' }}>
              <Monitor size={22} />
            </div>
            <div className={styles.featureTitle}>65" Touchscreen Ergonomics</div>
            <div className={styles.featureDesc}>
              Tactile 3D magnetic tiles with realistic drop physics. Direct drag-and-drop or tap-to-assign, with a slide-up on-screen virtual keyboard with surgical shortcuts (TEE, PACU, STAT).
            </div>
          </div>

          {/* Feature 2 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: 'rgba(234, 88, 12, 0.15)', color: '#fb923c' }}>
              <Coffee size={22} />
            </div>
            <div className={styles.featureTitle}>1-Tap Break Tracking ([B] & [L])</div>
            <div className={styles.featureDesc}>
              Breakfast and Lunch relief checkboxes right on the magnet tiles. Scrubbed staff can check off breaks directly without logging in, broadcasting status updates to all screens instantly.
            </div>
          </div>

          {/* Feature 3 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <Mic size={22} />
            </div>
            <div className={styles.featureTitle}>Voice AI Medical Notes</div>
            <div className={styles.featureDesc}>
              Microphone dictation on room slots and departures. The integrated AI Polish engine translates conversational speech into concise hospital shorthand (e.g. "Patient needs TEE 1230").
            </div>
          </div>

          {/* Feature 4 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <Radio size={22} />
            </div>
            <div className={styles.featureTitle}>Automated Feeds (OneUSAP, Epic)</div>
            <div className={styles.featureDesc}>
              Zero double-entry. Connect scheduling feeds directly to automatically populate room assignments, departure queues, and call teams on the morning reset.
            </div>
          </div>

          {/* Feature 5 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <ShieldCheck size={22} />
            </div>
            <div className={styles.featureTitle}>Multi-Tier Access & Auth</div>
            <div className={styles.featureDesc}>
              Fast 4-digit PIN access for scrubbed floor runners on wall displays. Full Supabase email authentication and role-based permissions for Org Admins and Platform Superusers.
            </div>
          </div>

          {/* Feature 6 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <Smartphone size={22} />
            </div>
            <div className={styles.featureTitle}>Mobile & Tablet Companion</div>
            <div className={styles.featureDesc}>
              Clinicians on the move can pull up their live assignments, call schedules, and relief queues on their phones or iPads from anywhere in the hospital.
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className={styles.logoBadge} style={{ width: 24, height: 24, fontSize: 11 }}>PB</div>
          <span style={{ fontWeight: 700, color: '#f8fafc' }}>PERFECT BOARD</span>
          <span>• The Digital Operating Room Whiteboard</span>
        </div>
        <div>
          © {new Date().getFullYear()} Perfect Board. All rights reserved.
        </div>
        <div className={styles.footerLinks}>
          <Link href="/usap/mhmc" className={styles.footerLink}>MHMC Live Whiteboard</Link>
          <Link href="/board-builder-mockup" className={styles.footerLink}>Board Builder Wizard</Link>
          <Link href="/board-builder-mockup/superuser" className={styles.footerLink}>Superuser Admin Console</Link>
        </div>
      </footer>
    </div>
  );
}
