'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './landing.module.css';
import {
  Sparkles, ArrowRight, Layout, Monitor, ShieldCheck, Zap,
  Coffee, Mic, Smartphone, ExternalLink, Building2,
  CheckCircle2, Radio, Users, Search, Lock, X,
  Clock, Check, AlertCircle, Calendar, Layers, ChevronRight
} from 'lucide-react';

export default function LandingPage() {
  const [isFindBoardOpen, setIsFindBoardOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState<string | null>(null);

  // Hospital directory for "Find Your Board"
  const facilities = [
    {
      name: 'Memorial Hermann Memorial City Medical Center',
      group: 'USAP • Houston, TX',
      slug: '/usap/mhmc',
      active: true,
      rooms: '32 ORs & Procedure Suites'
    },
    {
      name: 'Baylor St. Luke’s Medical Center',
      group: 'Texas Medical Center • Houston, TX',
      slug: null,
      active: false,
      rooms: 'Deployment in Progress'
    },
    {
      name: 'Houston Methodist Hospital',
      group: 'Texas Medical Center • Houston, TX',
      slug: null,
      active: false,
      rooms: 'Deployment in Progress'
    },
    {
      name: 'Texas Children’s Hospital',
      group: 'Pediatric Surgical Center • Houston, TX',
      slug: null,
      active: false,
      rooms: 'Deployment in Progress'
    }
  ];

  const filteredFacilities = facilities.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMessage('Superuser authentication is currently restricted to active pilot facilities. Please contact your organization administrator for access credentials.');
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Subtle Light Mesh Background Gradient */}
      <div className={styles.bgMesh} />

      {/* Top Navbar */}
      <nav className={styles.navbar}>
        <Link href="/" className={styles.brandLogo}>
          <div className={styles.logoBadge}>
            <Layout size={20} />
          </div>
          <div>
            <div className={styles.brandName}>PERFECT BOARD</div>
            <div className={styles.brandTagline}>Operating Room Intelligence & Digital Whiteboard</div>
          </div>
        </Link>

        {/* Center Nav Links */}
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Features</a>
          <a href="#comparison" className={styles.navLink}>Why Perfect Board</a>
          <a href="#roles" className={styles.navLink}>Clinical Roles</a>
          <a href="#faq" className={styles.navLink}>FAQ</a>
        </div>

        {/* Top Right Action Buttons */}
        <div className={styles.navActions}>
          <button
            type="button"
            onClick={() => setIsFindBoardOpen(true)}
            className={styles.findBoardBtn}
          >
            <Search size={15} />
            <span>Find Your Board</span>
          </button>

          <button
            type="button"
            onClick={() => setIsLoginOpen(true)}
            className={styles.loginBtn}
          >
            <Lock size={14} />
            <span>Log In</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className={styles.heroSection}>
        <div className={styles.eyebrowBadge}>
          <Sparkles size={14} color="#0284c7" />
          <span>Next-Generation Surgical Suite Orchestration</span>
        </div>

        <h1 className={styles.heroHeading}>
          The Intelligent Digital Whiteboard for <br />
          <span className={styles.heroHeadingHighlight}>Modern Operating Rooms</span>
        </h1>

        <p className={styles.heroSubheading}>
          Eliminate smeared dry-erase boards and disconnected spreadsheets. Perfect Board unifies surgical schedules, staff assignments, 1-tap meal reliefs, and emergency on-call coverage across 65" touchscreen displays and clinician smartphones in real time.
        </p>

        {/* Hero CTAs */}
        <div className={styles.heroCtaGroup}>
          <Link href="/usap/mhmc" className={styles.heroPrimaryCta}>
            <Layout size={18} />
            <span>Launch Live Board (MHMC)</span>
            <ArrowRight size={16} />
          </Link>

          <button
            type="button"
            onClick={() => setIsFindBoardOpen(true)}
            className={styles.heroSecondaryCta}
          >
            <Building2 size={16} color="#0284c7" />
            <span>Find Hospital Board</span>
          </button>
        </div>

        {/* Key Metrics Strip */}
        <div className={styles.statsStrip}>
          <div className={styles.statItem}>
            <div className={styles.statValue}>&lt; 200ms</div>
            <div className={styles.statLabel}>Multi-Screen Realtime Sync</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>1-Tap</div>
            <div className={styles.statLabel}>Breakfast & Lunch Relief Tracking</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>Zero</div>
            <div className={styles.statLabel}>Morning Double-Entry Schedule Feeds</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>65"+</div>
            <div className={styles.statLabel}>Touchscreen & Mobile Native</div>
          </div>
        </div>

        {/* Interactive Board Showcase Preview Widget */}
        <div className={styles.previewWrapper}>
          <div className={styles.previewTopBar}>
            <div className={styles.previewDots}>
              <div className={styles.dot} style={{ background: '#ef4444' }} />
              <div className={styles.dot} style={{ background: '#eab308' }} />
              <div className={styles.dot} style={{ background: '#22c55e' }} />
            </div>
            <div className={styles.previewUrlBar}>
              https://perfectboard.io/usap/mhmc • Memorial Hermann Memorial City
            </div>
            <Link href="/usap/mhmc" className={styles.previewActionLink}>
              <span>Open Full Screen</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          <div className={styles.previewMockupBoard}>
            {/* Mockup Header */}
            <div className={styles.previewMockupHeader}>
              <div className={styles.mockupHospitalName}>
                <Building2 size={16} color="#0284c7" />
                <span>MEMORIAL CITY SURGICAL SUITE • MAIN WHITEBOARD</span>
              </div>
              <div className={styles.mockupLivePulse}>
                <span className={styles.pulseDot} />
                <span>LIVE REALTIME SYNC (SUB-SECOND)</span>
              </div>
            </div>

            {/* Mockup Rooms and Sidebar Layout */}
            <div className={styles.mockupColumnsGrid}>
              <div className={styles.mockupRoomsArea}>
                {/* Room 1 */}
                <div className={styles.mockupRoomCard}>
                  <div className={styles.mockupRoomTitle}>
                    <span>OR 01 • CARDIOVASCULAR</span>
                    <span style={{ color: '#059669', fontSize: 10 }}>IN PROGRESS</span>
                  </div>
                  <div className={styles.mockupTile}>
                    <span>Dr. Patel, MD (Anesthesiologist)</span>
                    <div className={styles.breakBadges}>
                      <span className={styles.badgeB} title="Breakfast Relief Completed">B ✓</span>
                      <span className={styles.badgeL} title="Lunch Relief Completed">L ✓</span>
                    </div>
                  </div>
                  <div className={styles.mockupTile} style={{ borderLeftColor: '#059669' }}>
                    <span>Adams, CRNA (First Assistant)</span>
                    <div className={styles.breakBadges}>
                      <span className={styles.badgeB} title="Breakfast Relief Completed">B ✓</span>
                    </div>
                  </div>
                </div>

                {/* Room 2 */}
                <div className={styles.mockupRoomCard}>
                  <div className={styles.mockupRoomTitle}>
                    <span>OR 02 • ORTHOPEDIC / SPINE</span>
                    <span style={{ color: '#0284c7', fontSize: 10 }}>CLOSING</span>
                  </div>
                  <div className={styles.mockupTile}>
                    <span>Dr. Vance, MD (Anesthesiologist)</span>
                    <div className={styles.breakBadges}>
                      <span className={styles.badgeB}>B ✓</span>
                    </div>
                  </div>
                  <div className={styles.mockupTile} style={{ borderLeftColor: '#059669' }}>
                    <span>Rivera, CRNA (Lead Case)</span>
                    <div className={styles.breakBadges}>
                      <span className={styles.badgeL}>L ✓</span>
                    </div>
                  </div>
                </div>

                {/* Room 3 */}
                <div className={styles.mockupRoomCard}>
                  <div className={styles.mockupRoomTitle}>
                    <span>OR 03 • ROBOTIC GENERAL</span>
                    <span style={{ color: '#d97706', fontSize: 10 }}>DELAYED START</span>
                  </div>
                  <div className={styles.mockupTile}>
                    <span>Dr. Chen, MD (Anesthesiologist)</span>
                  </div>
                  <div className={styles.mockupTile} style={{ borderLeftColor: '#059669' }}>
                    <span>Taylor, CRNA (Robot Tech)</span>
                  </div>
                </div>

                {/* Room 4 */}
                <div className={styles.mockupRoomCard}>
                  <div className={styles.mockupRoomTitle}>
                    <span>CATH LAB 01 • INTERVENTIONAL</span>
                    <span style={{ color: '#059669', fontSize: 10 }}>ACTIVE</span>
                  </div>
                  <div className={styles.mockupTile}>
                    <span>Dr. Rodriguez, MD (Anesthesiologist)</span>
                    <div className={styles.breakBadges}>
                      <span className={styles.badgeB}>B ✓</span>
                    </div>
                  </div>
                  <div className={styles.mockupTile} style={{ borderLeftColor: '#059669' }}>
                    <span>Morris, CRNA (Floor Float)</span>
                  </div>
                </div>
              </div>

              {/* Mockup Sidebar */}
              <div className={styles.mockupSidebarArea}>
                <div className={styles.mockupSidebarCard}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                    FIRST-OUT DEPARTURE QUEUE
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
                    <div style={{ padding: '4px 6px', background: '#f8fafc', borderRadius: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>1. Mitchell, CRNA</span>
                      <span style={{ color: '#059669', fontWeight: 700 }}>15:00 Out</span>
                    </div>
                    <div style={{ padding: '4px 6px', background: '#f8fafc', borderRadius: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>2. Collins, CRNA</span>
                      <span style={{ color: '#0284c7', fontWeight: 700 }}>15:30 Out</span>
                    </div>
                    <div style={{ padding: '4px 6px', background: '#f8fafc', borderRadius: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>3. Harris, CRNA</span>
                      <span style={{ color: '#64748b' }}>16:00 Out</span>
                    </div>
                  </div>
                </div>

                <div className={styles.mockupSidebarCard}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                    TONIGHT'S ON-CALL TEAM
                  </div>
                  <div style={{ fontSize: 11, color: '#334155', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>1st Call Attending:</span>
                      <strong style={{ color: '#0284c7' }}>Dr. Davis, MD</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Overnight CRNA:</span>
                      <strong style={{ color: '#059669' }}>Simmons, CRNA</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.previewOverlayBanner}>
            <div className={styles.previewBannerText}>
              <Monitor size={16} />
              <span>Interactive digital twin running live at Memorial Hermann Memorial City.</span>
            </div>
            <Link href="/usap/mhmc" className={styles.previewBannerBtn}>
              <span>Launch Live Interactive Experience</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>

      {/* Comparison Section: Why Perfect Board vs Dry Erase */}
      <section id="comparison" className={styles.comparisonSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionEyebrow}>Surgical Operations Modernization</div>
          <h2 className={styles.sectionTitle}>Why Top Hospitals Are Replacing Dry-Erase Boards</h2>
          <p className={styles.sectionSubtitle}>
            Traditional whiteboards haven’t changed in 40 years. Here is how Perfect Board transforms surgical workflow efficiency from day one.
          </p>
        </div>

        <div className={styles.comparisonGrid}>
          {/* Old Way */}
          <div className={styles.comparisonCardOld}>
            <div className={styles.cardHeaderOld}>
              <AlertCircle size={22} />
              <span>Traditional Dry-Erase Whiteboards</span>
            </div>
            <ul className={styles.comparisonList}>
              <li className={styles.comparisonItem}>
                <X size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Smeared ink & illegible handwriting:</strong> Magnets fall off, names get erased accidentally, and critical changes are missed.</span>
              </li>
              <li className={styles.comparisonItem}>
                <X size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Zero mobile visibility:</strong> Surgeons and anesthesiologists must physically leave their rooms to walk down the hall to check their next assignment.</span>
              </li>
              <li className={styles.comparisonItem}>
                <X size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Manual 5:00 AM write-up:</strong> Charge nurses spend over an hour every morning transcribing EHR printouts onto the wall by hand.</span>
              </li>
              <li className={styles.comparisonItem}>
                <X size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>No audit trail or historical record:</strong> When a dispute or scheduling conflict occurs, there is zero timestamped record of who was in what room.</span>
              </li>
              <li className={styles.comparisonItem}>
                <X size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Disorganized meal reliefs:</strong> Endless phone calls and radio checks just to verify who has had breakfast or lunch relief.</span>
              </li>
            </ul>
          </div>

          {/* New Way */}
          <div className={styles.comparisonCardNew}>
            <div className={styles.cardHeaderNew}>
              <CheckCircle2 size={22} color="#0284c7" />
              <span>The Perfect Board Advantage</span>
            </div>
            <ul className={styles.comparisonList}>
              <li className={styles.comparisonItem}>
                <Check size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Tactile magnetic digital cards:</strong> Crisp, color-coded clinician tiles with tactile 3D drag-and-drop designed for 65" touchscreen walls.</span>
              </li>
              <li className={styles.comparisonItem}>
                <Check size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Instant mobile & tablet companion:</strong> Physicians check upcoming cases, relief queues, and call rosters directly from their smartphones.</span>
              </li>
              <li className={styles.comparisonItem}>
                <Check size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Automated schedule ingestion:</strong> Direct integration with hospital scheduling feeds (OneUSAP, Epic, Cerner) auto-populates the board in seconds.</span>
              </li>
              <li className={styles.comparisonItem}>
                <Check size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Immutable audit trail:</strong> Every slot assignment, room departure, and relief handoff is automatically timestamped for compliance and QA.</span>
              </li>
              <li className={styles.comparisonItem}>
                <Check size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>1-Tap [B] & [L] relief tracking:</strong> Scrubbed staff check off breakfast and lunch relief directly without breaking sterile technique.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionEyebrow}>Clinical Capabilities</div>
          <h2 className={styles.sectionTitle}>Engineered for the Fast-Paced Operating Suite</h2>
          <p className={styles.sectionSubtitle}>
            Every feature in Perfect Board has been co-designed with frontline anesthesiologists, charge nurses, and surgical leaders.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {/* Feature 1 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <Monitor size={24} />
            </div>
            <div className={styles.featureTitle}>65" Commercial Touchscreen Ergonomics</div>
            <div className={styles.featureDesc}>
              Tactile 3D magnetic tiles with realistic drop physics. Tap-to-assign or drag-and-drop, paired with a specialized on-screen keyboard featuring one-tap clinical shortcuts (TEE, PACU, STAT, PRE-OP).
            </div>
          </div>

          {/* Feature 2 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
              <Coffee size={24} />
            </div>
            <div className={styles.featureTitle}>1-Tap Meal & Break Tracking ([B] & [L])</div>
            <div className={styles.featureDesc}>
              Breakfast and Lunch relief checkboxes right on the clinician tiles. Scrubbed personnel check off breaks directly without entering passwords, instantly broadcasting relief status across all screens.
            </div>
          </div>

          {/* Feature 3 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: '#f3e8ff', color: '#9333ea' }}>
              <Mic size={24} />
            </div>
            <div className={styles.featureTitle}>Hands-Free Voice AI Medical Dictation</div>
            <div className={styles.featureDesc}>
              Fast microphone dictation on room slots and departure notes. The built-in clinical AI filters ambient OR noise and formats conversational speech into concise medical shorthand.
            </div>
          </div>

          {/* Feature 4 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>
              <Radio size={24} />
            </div>
            <div className={styles.featureTitle}>Automated Scheduling Feeds</div>
            <div className={styles.featureDesc}>
              Zero double-entry. Connect your organization’s feeds (OneUSAP, Epic OpTime, Cerner) to automatically populate daily room assignments, departures, and on-call teams during morning reset.
            </div>
          </div>

          {/* Feature 5 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: '#e0e7ff', color: '#4f46e5' }}>
              <Smartphone size={24} />
            </div>
            <div className={styles.featureTitle}>Mobile & Tablet Clinician Companion</div>
            <div className={styles.featureDesc}>
              Anesthesiologists and CRNAs on the move pull up their live assignments, call schedules, and relief queues on their iPhones, iPads, or Android devices from anywhere in the medical center.
            </div>
          </div>

          {/* Feature 6 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: '#fee2e2', color: '#dc2626' }}>
              <ShieldCheck size={24} />
            </div>
            <div className={styles.featureTitle}>HIPAA-Compliant Enterprise Security</div>
            <div className={styles.featureDesc}>
              High-speed 4-digit PIN system for scrubbed floor runners on wall displays, coupled with enterprise authentication and role-based permissions for practice administrators and directors.
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Benefits Section */}
      <section id="roles" className={styles.rolesSection}>
        <div className={styles.rolesContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionEyebrow}>Impact Across Your Organization</div>
            <h2 className={styles.sectionTitle}>Built for Every Stakeholder in the OR</h2>
            <p className={styles.sectionSubtitle}>
              From scrubbed clinicians to administrative leadership, Perfect Board brings harmony to high-volume surgical suites.
            </p>
          </div>

          <div className={styles.rolesGrid}>
            {/* Persona 1 */}
            <div className={styles.roleCard}>
              <div className={styles.roleHeader}>
                <Users size={20} color="#0284c7" />
                <span>Anesthesiologists & CRNAs</span>
              </div>
              <ul className={styles.roleList}>
                <li className={styles.roleItem}>
                  <Check size={16} color="#0284c7" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>View your room assignment and next case directly on your mobile device.</span>
                </li>
                <li className={styles.roleItem}>
                  <Check size={16} color="#0284c7" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Track your exact position in the first-out departure queue.</span>
                </li>
                <li className={styles.roleItem}>
                  <Check size={16} color="#0284c7" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Receive timely breakfast and lunch relief with one-tap confirmation.</span>
                </li>
              </ul>
            </div>

            {/* Persona 2 */}
            <div className={styles.roleCard}>
              <div className={styles.roleHeader}>
                <Layout size={20} color="#059669" />
                <span>Floor Runners & Charge Nurses</span>
              </div>
              <ul className={styles.roleList}>
                <li className={styles.roleItem}>
                  <Check size={16} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Total situational awareness across all 30+ operating suites at a glance.</span>
                </li>
                <li className={styles.roleItem}>
                  <Check size={16} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Fast drag-and-drop reassignments during unexpected case delays or add-ons.</span>
                </li>
                <li className={styles.roleItem}>
                  <Check size={16} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Automated morning reset saves over 60 minutes of manual transcription daily.</span>
                </li>
              </ul>
            </div>

            {/* Persona 3 */}
            <div className={styles.roleCard}>
              <div className={styles.roleHeader}>
                <ShieldCheck size={20} color="#4f46e5" />
                <span>Surgical Directors & Practice Executives</span>
              </div>
              <ul className={styles.roleList}>
                <li className={styles.roleItem}>
                  <Check size={16} color="#4f46e5" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Reduce room turnover delays through synchronized relief handoffs.</span>
                </li>
                <li className={styles.roleItem}>
                  <Check size={16} color="#4f46e5" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Complete timestamped audit logging of all assignments and coverage changes.</span>
                </li>
                <li className={styles.roleItem}>
                  <Check size={16} color="#4f46e5" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Eliminate clinician burnout with transparent, fair departure prioritization.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionEyebrow}>Frequently Asked Questions</div>
          <h2 className={styles.sectionTitle}>Everything You Need to Know</h2>
        </div>

        <div className={styles.faqList}>
          <div className={styles.faqItem}>
            <div className={styles.faqQuestion}>What wall display hardware does Perfect Board support?</div>
            <div className={styles.faqAnswer}>
              Perfect Board is hardware-agnostic. It runs seamlessly on any standard commercial 4K touchscreen (such as Samsung Flip, LG CreateBoard, or ViewSonic ViewBoard) connected to a mini PC or Chromebox, as well as on iPads, Android tablets, and clinical desktop workstations.
            </div>
          </div>

          <div className={styles.faqItem}>
            <div className={styles.faqQuestion}>How does Perfect Board handle morning schedule synchronization?</div>
            <div className={styles.faqAnswer}>
              Our autonomous scheduling bridge ingests daily surgeon rosters, room reservations, and staff assignments from hospital EHRs or scheduling tools (like OneUSAP, Epic OpTime, or Cerner), eliminating morning transcription entirely.
            </div>
          </div>

          <div className={styles.faqItem}>
            <div className={styles.faqQuestion}>Can clinicians access the board on their personal phones?</div>
            <div className={styles.faqAnswer}>
              Yes! Clinicians can access their hospital's designated board link from any mobile browser with zero app installation required. Mobile views are optimized for responsive, one-thumb navigation.
            </div>
          </div>

          <div className={styles.faqItem}>
            <div className={styles.faqQuestion}>Is clinical staff training required?</div>
            <div className={styles.faqAnswer}>
              Perfect Board is specifically designed to mirror the physical magnets and dry-erase layouts staff have used for decades. New staff members are fully proficient within 60 seconds of interacting with the board.
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className={styles.bottomCtaSection}>
        <div className={styles.bottomCtaBox}>
          <h2 className={styles.bottomCtaTitle}>Experience the Future of Surgical Operations</h2>
          <p className={styles.bottomCtaSubtitle}>
            See how Memorial Hermann Memorial City modernized their surgical suite with sub-second synchronization and automated daily feeds.
          </p>
          <div className={styles.bottomCtaActions}>
            <Link href="/usap/mhmc" className={styles.bottomPrimaryBtn}>
              <span>Launch Live MHMC Digital Twin</span>
              <ArrowRight size={16} style={{ display: 'inline', marginLeft: 8 }} />
            </Link>
            <button
              type="button"
              onClick={() => setIsFindBoardOpen(true)}
              className={styles.bottomSecondaryBtn}
            >
              <span>Find Your Hospital Board</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <div className={styles.logoBadge} style={{ width: 26, height: 26, borderRadius: 6 }}>
            <Layout size={14} />
          </div>
          <span>PERFECT BOARD • High-Performance Surgical Orchestration</span>
        </div>

        <div>
          © {new Date().getFullYear()} Perfect Board Inc. All rights reserved.
        </div>

        <div className={styles.footerLinks}>
          <Link href="/usap/mhmc" className={styles.footerLink}>MHMC Live Board</Link>
          <button
            type="button"
            onClick={() => setIsFindBoardOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            className={styles.footerLink}
          >
            Find Your Board
          </button>
          <button
            type="button"
            onClick={() => setIsLoginOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            className={styles.footerLink}
          >
            Administrator Log In
          </button>
        </div>
      </footer>

      {/* "Find Your Board" Modal */}
      {isFindBoardOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsFindBoardOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Building2 size={18} color="#0284c7" />
                <span>Find Your Hospital Board</span>
              </div>
              <button
                type="button"
                onClick={() => setIsFindBoardOpen(false)}
                className={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.searchInputWrapper}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search hospital name or anesthesia group..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                  autoFocus
                />
              </div>

              <div className={styles.facilityList}>
                {filteredFacilities.map((facility, idx) => (
                  facility.slug ? (
                    <Link
                      key={idx}
                      href={facility.slug}
                      className={styles.facilityItem}
                      onClick={() => setIsFindBoardOpen(false)}
                    >
                      <div>
                        <div className={styles.facilityName}>{facility.name}</div>
                        <div className={styles.facilityGroup}>{facility.group} • {facility.rooms}</div>
                      </div>
                      <div className={styles.activeTag}>
                        <span>Launch Board</span>
                        <ChevronRight size={13} style={{ display: 'inline', marginLeft: 2 }} />
                      </div>
                    </Link>
                  ) : (
                    <div key={idx} className={styles.facilityItem} style={{ opacity: 0.65, cursor: 'not-allowed' }}>
                      <div>
                        <div className={styles.facilityName}>{facility.name}</div>
                        <div className={styles.facilityGroup}>{facility.group}</div>
                      </div>
                      <div className={styles.comingSoonTag}>
                        <span>Deploying</span>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* "Log In" Modal (Supabase Auth Ready) */}
      {isLoginOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsLoginOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Lock size={18} color="#0f172a" />
                <span>Administrator & Superuser Portal</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLoginOpen(false)}
                className={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {loginMessage && (
                <div style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  color: '#0369a1',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16,
                  lineHeight: 1.4
                }}>
                  {loginMessage}
                </div>
              )}

              <form onSubmit={handleLoginSubmit}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Organization Email</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@usap.com or leadership@hospital.org"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={styles.formInput}
                  />
                </div>

                <button type="submit" className={styles.formSubmitBtn}>
                  Authenticate via Supabase
                </button>
              </form>

              <div className={styles.loginDisclaimer}>
                Floor staff & runners do not require an email login. Use your 4-digit PIN directly on the surgical suite wall display.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
