'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './org.module.css';
import { apiUrl } from '@/lib/api';
import { Staff } from '@/types/whiteboard';
import { BoardBuilderWizard } from '@/components/BoardBuilderWizard';
import {
  Building2, Hospital, Plus, ExternalLink, Shield, Users,
  CheckCircle2, Clock, MapPin, ChevronRight, X, Sparkles,
  ArrowRight, ArrowLeft, Sliders, Database, Layers, LogIn, LogOut, Search, RefreshCw
} from 'lucide-react';

interface FacilityBoard {
  id: string;
  name: string;
  code: string;
  slug: string;
  feedType: 'SCRAPER' | 'MANUAL';
  feedName: string;
  roomCount: number;
  deptCount: number;
  activeStaffToday: number;
  lastSync: string;
}

// Single real active live board at /usap/mhmc
const INITIAL_BOARDS: FacilityBoard[] = [
  {
    id: 'board-mhmc',
    name: 'Memorial Hermann Medical Center',
    code: 'MHMC',
    slug: 'mhmc',
    feedType: 'SCRAPER',
    feedName: 'OneUSAP Automated Scraper',
    roomCount: 48,
    deptCount: 8,
    activeStaffToday: 42,
    lastSync: '06:14 AM CST'
  }
];

export default function OrgDashboardPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<FacilityBoard[]>(INITIAL_BOARDS);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'BOARDS' | 'STAFF'>('BOARDS');

  // Wizard Modal State
  const [showWizard, setShowWizard] = useState(false);

  // Real Staff Roster State
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');

  // Fetch real staff from API
  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await fetch(apiUrl('/api/staff'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setStaffList(data);
        }
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchStaff();

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch (e) {
          // ignore
        }
      }

      const storedBoards = localStorage.getItem('usap_facility_boards');
      if (storedBoards) {
        try {
          const parsed = JSON.parse(storedBoards);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBoards(parsed);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, []);

  const handleNewBoardCreated = (newBoard: FacilityBoard) => {
    setBoards(prev => {
      const filtered = prev.filter(b => b.slug !== newBoard.slug);
      const updated = [...filtered, newBoard];
      if (typeof window !== 'undefined') {
        localStorage.setItem('usap_facility_boards', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Filtered staff
  const filteredStaff = useMemo(() => {
    const q = staffSearch.toLowerCase().trim();
    if (!q) return staffList;
    return staffList.filter(s => {
      const fullName = (s.displayName || `${s.firstName || ''} ${s.lastName || ''}`).toLowerCase();
      const cred = (s.credentials || '').toLowerCase();
      const phone = s.phone || '';
      return fullName.includes(q) || cred.includes(q) || phone.includes(q);
    });
  }, [staffList, staffSearch]);

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <header className={styles.topNav}>
        <div className={styles.brandGroup}>
          <div className={styles.orgBadge}>
            <Building2 size={14} />
            USAP HOUSTON
          </div>
          <div>
            <div className={styles.brandTitle}>United States Anesthesia Partners</div>
            <div className={styles.brandSubtitle}>Enterprise Clinical Whiteboard Portal</div>
          </div>
        </div>

        <div className={styles.headerActions}>
          {currentUser?.role === 'superuser' && (
            <Link href="/super" className={styles.navBtn} style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
              <Shield size={14} />
              Superuser Control Center
            </Link>
          )}

          <Link href="/usap/mhmc" className={styles.navBtn}>
            <Hospital size={14} />
            Live MHMC Board
          </Link>

          {currentUser ? (
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('currentUser');
                  localStorage.removeItem('currentUserRole');
                }
                router.push('/login');
              }}
            >
              <LogOut size={14} />
              Sign Out
            </button>
          ) : (
            <Link href="/login" className={styles.navBtn}>
              <LogIn size={14} />
              Sign In (/login)
            </Link>
          )}

          {/* Single primary button to launch Board Builder */}
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setShowWizard(true)}
          >
            <Plus size={15} />
            Build New Board
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Org Hero Card */}
        <div className={styles.orgHero}>
          <div className={styles.orgHeroLeft}>
            <div className={styles.orgLogoIcon}>
              <Building2 size={30} />
            </div>
            <div>
              <h1 className={styles.orgHeroTitle}>USAP Houston Division</h1>
              <p className={styles.orgHeroDesc}>
                Central management dashboard for hospital facility whiteboard instances, OR rosters, and shared staff credentials.
              </p>
            </div>
          </div>

          <div className={styles.orgStatsGroup}>
            <div className={styles.orgStatCard}>
              <div className={styles.orgStatNum}>{boards.length}</div>
              <div className={styles.orgStatLabel}>Hospital Facilities</div>
            </div>
            <div className={styles.orgStatCard}>
              <div className={styles.orgStatNum}>
                {boards.reduce((acc, b) => acc + b.roomCount, 0)}
              </div>
              <div className={styles.orgStatLabel}>Total Operating Rooms</div>
            </div>
            <div className={styles.orgStatCard}>
              <div className={styles.orgStatNum}>
                {staffList.length > 0 ? staffList.length : boards.reduce((acc, b) => acc + b.activeStaffToday, 0)}
              </div>
              <div className={styles.orgStatLabel}>Providers in Directory</div>
            </div>
          </div>
        </div>

        {/* Section Header with Tabs (NO duplicate action button here) */}
        <div className={styles.sectionHeader}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className={`${styles.navBtn} ${activeTab === 'BOARDS' ? styles.primaryBtn : ''}`}
              onClick={() => setActiveTab('BOARDS')}
            >
              <Hospital size={14} />
              Facility Boards ({boards.length})
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${activeTab === 'STAFF' ? styles.primaryBtn : ''}`}
              onClick={() => setActiveTab('STAFF')}
            >
              <Users size={14} />
              Shared Org Staff Directory ({staffList.length})
            </button>
          </div>
        </div>

        {/* TAB 1: FACILITY BOARDS GRID */}
        {activeTab === 'BOARDS' && (
          <div className={styles.boardsGrid}>
            {boards.map((board) => (
              <div key={board.id} className={styles.boardCard}>
                <div className={styles.boardCardHeader}>
                  <div>
                    <h2 className={styles.facilityName}>{board.name}</h2>
                    <span className={styles.facilityCode}>/{board.slug.toLowerCase()}</span>
                  </div>
                  <span className={`${styles.feedBadge} ${board.feedType === 'SCRAPER' ? styles.feedBadgeScraper : styles.feedBadgeManual}`}>
                    {board.feedType === 'SCRAPER' ? 'FEED ACTIVE' : 'MANUAL BOARD'}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: '#64748b' }}>
                  Architecture: <strong style={{ color: '#0f172a' }}>{board.feedName}</strong>
                </div>

                <div className={styles.boardMetricsRow}>
                  <div className={styles.boardMetricItem}>
                    <span className={styles.boardMetricVal}>{board.roomCount}</span>
                    <span className={styles.boardMetricLabel}>Rooms</span>
                  </div>
                  <div className={styles.boardMetricItem}>
                    <span className={styles.boardMetricVal}>{board.deptCount}</span>
                    <span className={styles.boardMetricLabel}>Departments</span>
                  </div>
                  <div className={styles.boardMetricItem}>
                    <span className={styles.boardMetricVal}>{board.activeStaffToday}</span>
                    <span className={styles.boardMetricLabel}>Active Staff</span>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                  Last Synchronization: <strong style={{ color: '#334155' }}>{board.lastSync}</strong>
                </div>

                <div className={styles.boardCardFooter}>
                  <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
                    PIN / Touchscreen Access
                  </span>
                  <Link href={`/usap/${board.slug}`} className={styles.openBoardBtn}>
                    Open Live Board
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: SHARED STAFF DIRECTORY */}
        {activeTab === 'STAFF' && (
          <div className={styles.directorySection}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 800 }}>
                  USAP Houston Shared Clinician Directory
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                  Master roster of providers credentialed across USAP facility boards.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search doctor or anesthetist..."
                    value={staffSearch}
                    onChange={e => setStaffSearch(e.target.value)}
                    style={{
                      padding: '7px 12px 7px 32px',
                      borderRadius: 6,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 13,
                      background: '#fff',
                      outline: 'none',
                      width: 220
                    }}
                  />
                </div>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={fetchStaff}
                  title="Reload Staff"
                >
                  <RefreshCw size={13} className={loadingStaff ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Provider Name</th>
                    <th>Credentials</th>
                    <th>Primary Facility</th>
                    <th>Phone / Contact</th>
                    <th>Scheduled Shift</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        {loadingStaff ? 'Loading clinician roster...' : 'No providers match your search filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map(staff => {
                      const name = staff.displayName || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || 'Clinician';
                      const isMD = staff.credentials === 'MD' || staff.credentials === 'Fellow';
                      return (
                        <tr key={staff.id}>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{name}</td>
                          <td>
                            <span style={{
                              background: isMD ? '#dbeafe' : '#dcfce7',
                              color: isMD ? '#1e40af' : '#166534',
                              padding: '3px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 800
                            }}>
                              {staff.credentials || 'MD'}
                            </span>
                          </td>
                          <td style={{ color: '#475569' }}>{staff.facility || 'MHMC (Memorial City)'}</td>
                          <td style={{ color: '#475569' }}>{staff.phone || '--'}</td>
                          <td style={{ fontFamily: 'monospace', color: '#64748b', fontWeight: 600 }}>
                            {staff.shift || '7a-3p'}
                          </td>
                          <td>
                            <span style={{ color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                              {staff.active ? 'Active' : 'Off'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* FULL BOARD BUILDER WIZARD (Admin Command Center Look & Feel) */}
      <BoardBuilderWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        orgSlug="usap"
        userRole={currentUser?.role || 'admin'}
        onBoardCreated={handleNewBoardCreated}
      />
    </div>
  );
}
