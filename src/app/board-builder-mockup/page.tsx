'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from './boardBuilder.module.css';
import {
  Building2, Layout, Layers, ShieldCheck, Clock, Users, Plus, Trash2,
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Monitor, Columns, LayoutGrid, Check, Sparkles, Eye, Download, Moon, Sun,
  CheckCircle2, RefreshCw, FileText, Smartphone, Laptop,
  Lock, Undo2, Mic, Calendar, Copy, ChevronDown, ChevronRight, Search, Key
} from 'lucide-react';

// --- Preset Templates ---
type PresetKey = 'mhmc' | 'asc' | 'ivf' | 'custom';

interface DeptConfig {
  id: string;
  name: string;
  rooms: string[];
  hasRunner: boolean;
  runnerLabel?: string;
  row?: number; // 1, 2, or 3
}

interface BoardConfigState {
  orgName: string;
  facilityName: string;
  slug: string;
  timezone: string;
  startTime: string;
  reliefCountTime: string;
  
  // Practice Archetype
  archetype: 'ACT' | 'SOLO' | 'POD';
  enableTraineeSlot: boolean;
  allowedCredentials: string[];

  // Layout & Depts
  layoutMode: 'AUTO' | 'SINGLE_ROW' | 'TWO_ROWS' | 'THREE_ROWS';
  displayOrientation: 'LANDSCAPE' | 'PORTRAIT';
  departments: DeptConfig[];

  // Sidebars & Modules
  enableBullpen?: boolean;
  enableDrawer?: boolean;
  enableDepartures: boolean;
  departureSections: string[];
  enableLates: boolean;
  lateBuckets: string[];
  enableCallTeam: boolean;
  callRoles: string[];
  enableRedBoxes: boolean;
  breakMode: 'BOTH' | 'LUNCH_ONLY' | 'NONE';

  // Hardware & Kiosk
  enableVirtualKeyboard: boolean;
  defaultTheme: 'DARK' | 'LIGHT';
  autoLockMinutes: number;
  maskPhoneNumbers: boolean;

  // Staff Roster
  sampleStaff: Array<{
    id: string;
    name: string;
    role: 'MD' | 'CRNA' | 'Resident' | 'SRNA';
    phone: string;
    pin: string;
    shift: string;
  }>;
}

const PRESETS: Record<PresetKey, BoardConfigState> = {
  mhmc: {
    orgName: 'USAP Houston',
    facilityName: 'Memorial Hermann Medical Center',
    slug: 'mhmc-main',
    timezone: 'Central Time (US & Canada)',
    startTime: '06:30 AM',
    reliefCountTime: '3:00 PM Count',
    archetype: 'ACT',
    enableTraineeSlot: true,
    allowedCredentials: ['MD', 'DO', 'CRNA', 'CAA', 'Resident', 'SRNA'],
    layoutMode: 'TWO_ROWS',
    displayOrientation: 'LANDSCAPE',
    departments: [
      { id: 'main_or', name: 'MAIN OR', rooms: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'], hasRunner: true, runnerLabel: 'Charge MD', row: 1 },
      { id: 'west_pav', name: 'WEST PAV', rooms: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '14'], hasRunner: true, runnerLabel: 'Charge CRNA', row: 1 },
      { id: 'ortho', name: 'ORTHO', rooms: ['1', '2', '3', '4', '5', '6', '7', '8'], hasRunner: true, runnerLabel: 'Ortho Runner', row: 1 },
      { id: 'village', name: 'VILLAGE', rooms: ['1', '2', '3', '4', '5', '6', '7', '8', 'P1', 'P2'], hasRunner: true, runnerLabel: 'Village Runner', row: 1 },
      { id: 'ninth_floor', name: '9TH FLOOR', rooms: ['EP1', 'EP2', 'CCL1', 'CCL2', 'CCL3', 'IR', 'NIR', 'TEE'], hasRunner: false, row: 2 },
      { id: 'endo', name: 'ENDO', rooms: ['1', '2', '3', '4', 'MRI'], hasRunner: true, runnerLabel: 'Endo Runner', row: 2 },
      { id: 'ob', name: 'OB', rooms: ['1', '2', '3', '4'], hasRunner: true, runnerLabel: 'OB Attending', row: 2 },
      { id: 'ivf', name: 'IVF', rooms: ['1'], hasRunner: false, row: 2 }
    ],
    enableBullpen: true,
    enableDrawer: true,
    enableDepartures: true,
    departureSections: ['POST-CALL', 'NON-CALL'],
    enableLates: true,
    lateBuckets: ['3p Late', '4p Late', '5p Late'],
    enableCallTeam: true,
    callRoles: ['CV', 'CALL 1', 'CALL 2', 'CALL 3', 'OB'],
    enableRedBoxes: true,
    breakMode: 'BOTH',
    enableVirtualKeyboard: true,
    defaultTheme: 'LIGHT',
    autoLockMinutes: 2,
    maskPhoneNumbers: true,
    sampleStaff: [
      { id: 's1', name: 'Cavanaugh', role: 'MD', phone: '(713) 555-0101', pin: '9999', shift: '7a-3p' },
      { id: 's2', name: 'Shenoy', role: 'CRNA', phone: '(713) 555-0102', pin: '1234', shift: '7a-3p' },
      { id: 's3', name: 'Chuan', role: 'MD', phone: '(713) 555-0103', pin: '4412', shift: '4p Late' },
      { id: 's4', name: 'Hirsch', role: 'MD', phone: '(713) 555-0104', pin: '8821', shift: '5p Late' },
      { id: 's5', name: 'Gunn', role: 'MD', phone: '(713) 555-0105', pin: '3311', shift: '3p Late' },
      { id: 's6', name: 'Tallackson', role: 'MD', phone: '(713) 555-0106', pin: '5566', shift: 'OB Call' },
      { id: 's7', name: 'Patel P', role: 'CRNA', phone: '(713) 555-0107', pin: '7744', shift: '7a-3p' },
      { id: 's8', name: 'Martinez R', role: 'MD', phone: '(713) 555-0108', pin: '2211', shift: '3p Late' },
      { id: 's9', name: 'Mankarious', role: 'CRNA', phone: '(713) 555-0109', pin: '9933', shift: '7a-3p' },
      { id: 's10', name: 'Kovac', role: 'MD', phone: '(713) 555-0110', pin: '4422', shift: '7a-3p' },
      { id: 's11', name: 'Mann', role: 'CRNA', phone: '(713) 555-0111', pin: '6611', shift: '7a-3p' },
      { id: 's12', name: 'Shirak', role: 'CRNA', phone: '(713) 555-0112', pin: '3344', shift: '7a-3p' },
      { id: 's13', name: 'Gashler', role: 'MD', phone: '(713) 555-0113', pin: '8899', shift: 'Post-CV' },
      { id: 's14', name: 'Andes', role: 'CRNA', phone: '(713) 555-0114', pin: '1122', shift: '5p Late' },
      { id: 's15', name: 'McGuire', role: 'CRNA', phone: '(713) 555-0115', pin: '5533', shift: '5p Late' },
      { id: 's16', name: 'Guye', role: 'CRNA', phone: '(713) 555-0116', pin: '7788', shift: '7p Late' }
    ]
  },
  asc: {
    orgName: 'USAP Houston',
    facilityName: 'Village Surgery Center',
    slug: 'village-sc',
    timezone: 'Central Time (US & Canada)',
    startTime: '07:00 AM',
    reliefCountTime: '2:00 PM Count',
    archetype: 'ACT',
    enableTraineeSlot: false,
    allowedCredentials: ['MD', 'CRNA'],
    layoutMode: 'SINGLE_ROW',
    displayOrientation: 'LANDSCAPE',
    departments: [
      { id: 'or_suites', name: 'OPERATING SUITES', rooms: ['OR 1', 'OR 2', 'OR 3', 'OR 4', 'OR 5', 'OR 6'], hasRunner: true, runnerLabel: 'Charge CRNA', row: 1 },
      { id: 'proc_rooms', name: 'PROCEDURE ROOMS', rooms: ['PROC 1', 'PROC 2'], hasRunner: false, row: 1 }
    ],
    enableBullpen: true,
    enableDrawer: true,
    enableDepartures: true,
    departureSections: ['Early Out', 'Standard Order'],
    enableLates: true,
    lateBuckets: ['Late 1 (4:00 PM)'],
    enableCallTeam: false,
    callRoles: [],
    enableRedBoxes: false,
    breakMode: 'LUNCH_ONLY',
    enableVirtualKeyboard: false,
    defaultTheme: 'LIGHT',
    autoLockMinutes: 5,
    maskPhoneNumbers: false,
    sampleStaff: [
      { id: 'v1', name: 'Dr. Johnson', role: 'MD', phone: '(713) 555-0201', pin: '1111', shift: '7a-3p' },
      { id: 'v2', name: 'Smith A', role: 'CRNA', phone: '(713) 555-0202', pin: '2222', shift: '7a-3p' },
      { id: 'v3', name: 'Davis K', role: 'CRNA', phone: '(713) 555-0203', pin: '3333', shift: 'Late 1' },
      { id: 'v4', name: 'Lee M', role: 'CRNA', phone: '(713) 555-0204', pin: '4444', shift: '7a-3p' }
    ]
  },
  ivf: {
    orgName: 'USAP Houston',
    facilityName: 'Houston IVF Center',
    slug: 'houston-ivf',
    timezone: 'Central Time (US & Canada)',
    startTime: '07:30 AM',
    reliefCountTime: '1:00 PM Count',
    archetype: 'SOLO',
    enableTraineeSlot: false,
    allowedCredentials: ['MD'],
    layoutMode: 'SINGLE_ROW',
    displayOrientation: 'LANDSCAPE',
    departments: [
      { id: 'retrieval', name: 'RETRIEVAL SUITES', rooms: ['SUITE A', 'SUITE B', 'PROC 1'], hasRunner: false, row: 1 }
    ],
    enableBullpen: false,
    enableDrawer: false,
    enableDepartures: false,
    departureSections: [],
    enableLates: false,
    lateBuckets: [],
    enableCallTeam: false,
    callRoles: [],
    enableRedBoxes: false,
    breakMode: 'NONE',
    enableVirtualKeyboard: false,
    defaultTheme: 'LIGHT',
    autoLockMinutes: 2,
    maskPhoneNumbers: false,
    sampleStaff: [
      { id: 'i1', name: 'Dr. Tallackson', role: 'MD', phone: '(713) 555-0301', pin: '9900', shift: '7:30a-1p' }
    ]
  },
  custom: {
    orgName: 'New Anesthesia Practice',
    facilityName: 'Metro Surgical Hospital',
    slug: 'metro-surgical',
    timezone: 'Central Time (US & Canada)',
    startTime: '06:45 AM',
    reliefCountTime: '3:00 PM Count',
    archetype: 'ACT',
    enableTraineeSlot: false,
    allowedCredentials: ['MD', 'CRNA'],
    layoutMode: 'AUTO',
    displayOrientation: 'LANDSCAPE',
    departments: [
      { id: 'main', name: 'MAIN OR', rooms: ['OR 1', 'OR 2', 'OR 3', 'OR 4'], hasRunner: true, runnerLabel: 'Runner', row: 1 }
    ],
    enableBullpen: true,
    enableDrawer: true,
    enableDepartures: true,
    departureSections: ['Post-Call', 'Standard'],
    enableLates: true,
    lateBuckets: ['3p', '5p'],
    enableCallTeam: true,
    callRoles: ['1st Call', 'Backup'],
    enableRedBoxes: true,
    breakMode: 'BOTH',
    enableVirtualKeyboard: true,
    defaultTheme: 'LIGHT',
    autoLockMinutes: 2,
    maskPhoneNumbers: true,
    sampleStaff: []
  }
};

// --- DYNAMIC LIVE WHITEBOARD SKELETON COMPONENT ---
function WhiteboardSkeleton({ config }: { config: BoardConfigState }) {
  const badgeText = useMemo(() => {
    if (!config.facilityName) return 'OR';
    const words = config.facilityName.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return config.facilityName.slice(0, 3).toUpperCase();
  }, [config.facilityName]);

  const showBullpen = config.enableBullpen !== false;
  const showDepartures = config.enableDepartures && config.departureSections && config.departureSections.length > 0;
  const showCallTeam = config.enableCallTeam && config.callRoles && config.callRoles.length > 0;
  const showLates = config.enableLates && config.lateBuckets && config.lateBuckets.length > 0;
  const hasRightSidebars = showDepartures || showCallTeam || showLates;
  const showDrawer = config.enableDrawer !== false;

  const deptCount = config.departments.length;

  // Multi-Row Tier Partitioning
  const deptRows = useMemo(() => {
    const mode = config.layoutMode || 'AUTO';
    const depts = config.departments;
    if (depts.length === 0) return [];
    if (mode === 'SINGLE_ROW') {
      return [depts];
    }
    if (mode === 'TWO_ROWS') {
      const hasExplicit = depts.some(d => d.row === 2);
      if (hasExplicit) {
        const r1 = depts.filter(d => (d.row || 1) === 1);
        const r2 = depts.filter(d => d.row === 2);
        return [r1, r2].filter(r => r.length > 0);
      }
      const mid = Math.ceil(depts.length / 2);
      return [depts.slice(0, mid), depts.slice(mid)].filter(r => r.length > 0);
    }
    if (mode === 'THREE_ROWS') {
      const hasExplicit = depts.some(d => d.row && d.row > 1);
      if (hasExplicit) {
        const r1 = depts.filter(d => (d.row || 1) === 1);
        const r2 = depts.filter(d => d.row === 2);
        const r3 = depts.filter(d => d.row === 3);
        return [r1, r2, r3].filter(r => r.length > 0);
      }
      const t1 = Math.ceil(depts.length / 3);
      const t2 = Math.ceil((depts.length - t1) / 2) + t1;
      return [depts.slice(0, t1), depts.slice(t1, t2), depts.slice(t2)].filter(r => r.length > 0);
    }
    // AUTO
    if (depts.length <= 4) return [depts];
    if (depts.length <= 8) {
      const mid = Math.ceil(depts.length / 2);
      return [depts.slice(0, mid), depts.slice(mid)].filter(r => r.length > 0);
    }
    const t1 = Math.ceil(depts.length / 3);
    const t2 = Math.ceil((depts.length - t1) / 2) + t1;
    return [depts.slice(0, t1), depts.slice(t1, t2), depts.slice(t2)].filter(r => r.length > 0);
  }, [config.departments, config.layoutMode]);

  const renderDeptCol = (dept: DeptConfig) => (
    <div key={dept.id} className={styles.exactDeptCol}>
      <div className={styles.exactDeptHead}>
        <span className={styles.exactDeptName}>{dept.name}</span>
        <span className={styles.exactOccupancyPill}>0/{dept.rooms.length}</span>
      </div>
      {dept.hasRunner && (
        <div className={styles.exactRunnerSlot}>
          <div className={styles.exactRunnerEmptyMagnet}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#0284c7' }}>
              {dept.runnerLabel ? dept.runnerLabel.toUpperCase() : 'RUNNER'}
            </span>
            <span style={{ fontSize: '9.5px', color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
            {config.breakMode !== 'NONE' && (
              <div className={styles.exactBreaks} style={{ opacity: 0.35 }}>
                {config.breakMode === 'BOTH' && <span className={styles.exactBreakBox}>B</span>}
                <span className={styles.exactBreakBox}>L</span>
              </div>
            )}
          </div>
        </div>
      )}
      <div className={styles.exactRoomList}>
        {dept.rooms.map((room, rIdx) => (
          <div key={`${dept.id}_${room}_${rIdx}`} className={styles.exactRoomRow}>
            <span className={styles.exactRoomNum}>{room}</span>
            <div className={styles.exactEmptyRoom}>
              <span className={styles.exactEmptyRoomText}>Ready for assignment</span>
              {config.breakMode !== 'NONE' && (
                <div className={styles.exactBreaks} style={{ opacity: 0.3 }}>
                  {config.breakMode === 'BOTH' && <span className={styles.exactBreakBox}>B</span>}
                  <span className={styles.exactBreakBox}>L</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {dept.rooms.length === 0 && (
          <div style={{ padding: '16px 8px', fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
            No rooms added
          </div>
        )}
      </div>
    </div>
  );

  // --- PORTRAIT DISPLAY VIEW (9:16 TV FRAME) ---
  if (config.displayOrientation === 'PORTRAIT') {
    return (
      <div className={styles.portraitFrame}>
        <div className={styles.portraitTVBezel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Smartphone size={13} color="#38bdf8" />
            <span>PORTRAIT DISPLAY (9:16) • 55" WALL MOUNT</span>
          </div>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>1080 × 1920 FHD</span>
        </div>

        <div className={styles.exactBoardPortrait}>
          {/* Header */}
          <div className={styles.exactHeader} style={{ padding: '8px 12px', flexWrap: 'wrap', gap: 8 }}>
            <div className={styles.exactLogoGroup}>
              <div className={styles.exactOrBadge} style={{ width: 28, height: 28, fontSize: 13 }}>{badgeText}</div>
              <div>
                <div className={styles.exactBrandText} style={{ fontSize: 13 }}>
                  {config.facilityName ? config.facilityName.toUpperCase() : 'PERFECT BOARD'}
                </div>
                <div className={styles.exactBrandSub} style={{ fontSize: 9 }}>
                  {config.orgName ? `${config.orgName} • Portrait View` : 'Portrait Display'}
                </div>
              </div>
            </div>

            <div className={styles.exactClockBadge} style={{ fontSize: 11 }}>
              <Clock size={13} color="#dc2626" />
              <span>14:23:37</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <div className={styles.exactViewOnlyPill} style={{ padding: '2px 8px', fontSize: 10 }}>
                <Lock size={10} color="#64748b" />
                <span>View Only</span>
              </div>
              <button type="button" className={styles.exactLoginBtn} style={{ padding: '4px 8px', fontSize: 11 }}>
                Login
              </button>
            </div>
          </div>

          {/* Top Bullpen Banner (if enabled) */}
          {showBullpen && (
            <div className={styles.portraitBullpenBanner}>
              <div className={styles.portraitBullpenTitle}>
                <Users size={13} color="#0284c7" />
                <span>BULLPEN (0)</span>
              </div>
              <div className={styles.portraitBullpenSlots}>
                {[1, 2, 3].map(rank => (
                  <div key={rank} className={styles.exactEmptySlot} style={{ height: 20, padding: '0 4px', fontSize: 9, minWidth: 90 }}>
                    <span style={{ color: '#0284c7', fontWeight: 800 }}>#{rank}</span>
                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Available</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2-Column Department Grid for Portrait */}
          <div className={config.departments.length === 1 ? styles.portraitDeptGridSingle : styles.portraitDeptGrid}>
            {config.departments.map(dept => renderDeptCol(dept))}
          </div>

          {/* Portrait Sidebars (Departures, Call Team, Lates) */}
          {hasRightSidebars && (
            <div className={styles.portraitSidebars}>
              {showDepartures && (
                <div className={styles.exactDepartureCol} style={{ width: '100%', borderRight: 'none' }}>
                  <div className={styles.exactSideHeader}>
                    <span>DEPARTURES (0)</span>
                  </div>
                  {config.departureSections.map((sec, idx) => (
                    <div key={sec} className={idx === 0 ? styles.exactPostCallBox : styles.exactNonCallBox} style={{ padding: 4 }}>
                      <div className={idx === 0 ? styles.exactPostCallHead : styles.exactNonCallHead} style={{ fontSize: 9 }}>
                        {sec.toUpperCase()} (0)
                      </div>
                      <div className={styles.exactSectionEmptyRow} style={{ fontSize: 9 }}>
                        <span>Queue empty</span>
                        <span>{idx === 0 ? '✓' : '○'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showCallTeam && (
                <div className={styles.exactCallTeamBox} style={{ width: '100%' }}>
                  <div className={styles.exactSideHeader}>
                    <span>CALL TEAM ({config.callRoles.length})</span>
                  </div>
                  {config.callRoles.slice(0, 4).map(role => (
                    <div key={role} className={styles.exactCallTeamItem} style={{ fontSize: 9.5 }}>
                      <span className={styles.exactCallBadge} style={{ minWidth: 28, fontSize: 8 }}>{role}</span>
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                    </div>
                  ))}
                </div>
              )}

              {showLates && (
                <div className={styles.exactLatesCol} style={{ width: '100%', gridColumn: 'span 2' }}>
                  <div className={styles.exactSideHeader}>
                    <span>LATES (&gt; 3 PM)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {config.lateBuckets.map(b => (
                      <div key={b} style={{ flex: 1, background: '#f1f5f9', padding: '4px 6px', borderRadius: 4, fontSize: 10 }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{b} (0)</span>
                        <div style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>None assigned</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Drawer */}
          {showDrawer && (
            <div className={styles.exactBottomDrawer}>
              <div className={styles.exactDrawerHead} style={{ padding: '6px 10px' }}>
                <div className={styles.exactDrawerTitle} style={{ fontSize: 11 }}>
                  <Users size={12} color="#0284c7" />
                  <span>AVAILABLE STAFF</span>
                  <span className={styles.exactDrawerCountPill} style={{ fontSize: 9 }}>0</span>
                </div>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>Tap to expand roster</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- STANDARD LANDSCAPE (16:9) VIEW ---
  return (
    <div className={styles.exactBoardWrapper}>
      {/* 1. Header */}
      <div className={styles.exactHeader}>
        <div className={styles.exactLogoGroup}>
          <div className={styles.exactOrBadge}>{badgeText}</div>
          <div>
            <div className={styles.exactBrandText}>
              {config.facilityName ? config.facilityName.toUpperCase() : 'PERFECT BOARD'}
            </div>
            <div className={styles.exactBrandSub}>
              {config.orgName ? `${config.orgName} • Surgical Suite Whiteboard` : 'Surgical Suite Whiteboard'}
            </div>
          </div>
        </div>

        <div className={styles.exactClockBadge}>
          <Clock size={15} color="#dc2626" />
          <span>14:23:37  Thu, Oct 8, 2026</span>
        </div>

        <div className={styles.exactViewOnlyPill}>
          <Lock size={12} color="#64748b" />
          <span>View Only • Tap to Authenticate</span>
        </div>

        <div className={styles.exactHeaderActions}>
          <button type="button" className={styles.exactHeaderBtn} style={{ opacity: 0.5 }}>
            <Undo2 size={13} /> Undo
          </button>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={14} color="#dc2626" />
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={14} color="#475569" />
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Moon size={14} color="#475569" />
          </div>
          <button type="button" className={styles.exactLoginBtn}>
            ➔ Login
          </button>
        </div>
      </div>

      {/* 2. Main Grid: Bullpen (left) + Depts (center) + Sidebars (right) */}
      <div className={styles.exactMainGrid}>
        {/* Left Bullpen Column */}
        {showBullpen && (
          <div className={styles.exactBullpen}>
            <div className={styles.exactBullpenHeader}>
              <div className={styles.exactBullpenTitle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={13} color="#0284c7" />
                  <span>BULLPEN</span>
                  <div className={styles.exactCountBadge}>0</div>
                </div>
                <Copy size={11} color="#64748b" />
              </div>
              <div className={styles.exactBullpenSub}>Top is up next for work</div>
            </div>

            <div className={styles.exactBullpenList}>
              {[1, 2, 3].map(rank => (
                <div key={rank} className={styles.exactBullpenItem}>
                  <span className={styles.exactBullpenRank}>#{rank}</span>
                  <div className={styles.exactEmptySlot}>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>Available Slot</span>
                    {config.breakMode !== 'NONE' && (
                      <div className={styles.exactBreaks} style={{ opacity: 0.35 }}>
                        {config.breakMode === 'BOTH' && <span className={styles.exactBreakBox}>B</span>}
                        <span className={styles.exactBreakBox}>L</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.exactBullpenFooter}>
              0 available • Drag to any department slot
            </div>
          </div>
        )}

        {/* Center Department Columns Grid */}
        <div
          className={styles.exactDeptWrapper}
          style={{ borderRight: hasRightSidebars ? '2px solid #cbd5e1' : 'none' }}
        >
          {deptCount === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
              No departments configured yet. Add department columns in Step 3.
            </div>
          ) : (
            deptRows.map((rowDepts, rIdx) => (
              <div
                key={rIdx}
                className={deptRows.length === 1 ? styles.exactDeptRowSingle : styles.exactDeptRowTier}
              >
                {rowDepts.map(dept => renderDeptCol(dept))}
              </div>
            ))
          )}
        </div>

        {/* Right Sidebars */}
        {hasRightSidebars && (
          <div className={styles.exactRightSidebars}>
            {/* Departures Column & Call Team */}
            {(showDepartures || showCallTeam) && (
              <div className={styles.exactDepartureCol}>
                {showDepartures && (
                  <>
                    <div className={styles.exactSideHeader}>
                      <span>DEPARTURE (0)</span>
                    </div>

                    {config.departureSections.map((sec, idx) => {
                      const isPostCall = sec.toLowerCase().includes('post') || idx === 0;
                      return (
                        <div key={sec} className={isPostCall ? styles.exactPostCallBox : styles.exactNonCallBox}>
                          <div className={isPostCall ? styles.exactPostCallHead : styles.exactNonCallHead}>
                            {sec.toUpperCase()} (0)
                          </div>
                          <div className={styles.exactSectionEmptyRow}>
                            <span>Queue empty</span>
                            <span>{isPostCall ? '✓' : '○'}</span>
                          </div>
                          <div className={styles.exactSectionEmptyRow}>
                            <span>Ready for sign-outs</span>
                            <span>{isPostCall ? '✓' : '○'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Call Team Box */}
                {showCallTeam && (
                  <div className={styles.exactCallTeamBox}>
                    <div className={styles.exactSideHeader}>
                      <span>CALL TEAM ({config.callRoles.length})</span>
                    </div>
                    {config.callRoles.map(role => (
                      <div key={role} className={styles.exactCallTeamItem}>
                        <span className={styles.exactCallBadge}>{role}</span>
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '10px' }}>Unassigned</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Lates Column */}
            {showLates && (
              <div className={styles.exactLatesCol}>
                <div className={styles.exactSideHeader}>
                  <span>LATES (&gt; 3 PM)</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Copy size={11} color="#64748b" />
                    <ChevronRight size={11} color="#64748b" />
                  </div>
                </div>

                {config.lateBuckets.map(bucket => (
                  <div key={bucket} className={styles.exactLatesTier}>
                    <div className={styles.exactTierHead}>{bucket} (0)</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', padding: '4px 6px' }}>
                      No late staff assigned
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Bottom Drawer: Available Unassigned Staff */}
      {showDrawer && (
        <div className={styles.exactBottomDrawer}>
          <div className={styles.exactDrawerHead}>
            <div className={styles.exactDrawerTitle}>
              <Users size={14} color="#0284c7" />
              <span>AVAILABLE UNASSIGNED STAFF</span>
              <span className={styles.exactDrawerCountPill}>0 AVAILABLE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={12} color="#94a3b8" style={{ position: 'absolute', left: 8 }} />
                <input
                  type="text"
                  placeholder="Filter staff by name or credential..."
                  className={styles.exactDrawerSearch}
                  style={{ paddingLeft: 24 }}
                  readOnly
                />
              </div>
              <button type="button" className={styles.presetBtn} style={{ padding: '3px 8px', fontSize: 11 }}>
                <ChevronDown size={12} /> Hide
              </button>
            </div>
          </div>

          <div className={styles.exactDrawerBins}>
            {config.allowedCredentials.map(cred => {
              const isMD = cred.toUpperCase().includes('MD') || cred.toUpperCase().includes('DO');
              const isCRNA = cred.toUpperCase().includes('CRNA') || cred.toUpperCase().includes('CAA') || cred.toUpperCase().includes('AA');
              const headClass = isMD ? styles.exactBinHeadMD : isCRNA ? styles.exactBinHeadCRNA : styles.exactBinHeadPRN;
              return (
                <div key={cred} className={styles.exactBinCol}>
                  <div className={headClass}>{cred.toUpperCase()} / POOL (0)</div>
                  <div className={styles.exactDrawerEmptyBin}>
                    No {cred} checked in • Ready for daily roster or feed
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const STEPS = [
  { id: 1, label: 'Facility Profile', icon: Building2 },
  { id: 2, label: 'Staffing Model', icon: ShieldCheck },
  { id: 3, label: 'Departments & Rooms', icon: Layout },
  { id: 4, label: 'Sidebars & Modules', icon: Layers },
  { id: 5, label: 'Staff Roster', icon: Users },
  { id: 6, label: 'Live Board Preview', icon: Eye }
];

export default function BoardBuilderMockup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [activePreset, setActivePreset] = useState<PresetKey>('mhmc');
  const [config, setConfig] = useState<BoardConfigState>(PRESETS.mhmc);
  const [previewTheme, setPreviewTheme] = useState<'DARK' | 'LIGHT'>('LIGHT');
  const [showJsonExport, setShowJsonExport] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  // User persona: Org Admin (locked org) vs Superuser (global tenant access)
  const [builderPersona, setBuilderPersona] = useState<'ORG_ADMIN' | 'SUPERUSER'>('ORG_ADMIN');

  // Switch preset
  const handleSelectPreset = (key: PresetKey) => {
    setActivePreset(key);
    setConfig(PRESETS[key]);
    setPreviewTheme(PRESETS[key].defaultTheme);
  };

  // Helper to update config fields
  const updateConfig = <K extends keyof BoardConfigState>(field: K, value: BoardConfigState[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  // Department management helpers
  const handleAddDept = () => {
    const newId = `dept_${Date.now()}`;
    const newDept: DeptConfig = {
      id: newId,
      name: `NEW DEPARTMENT ${config.departments.length + 1}`,
      rooms: ['OR 1', 'OR 2', 'OR 3'],
      hasRunner: false
    };
    updateConfig('departments', [...config.departments, newDept]);
  };

  const handleRemoveDept = (deptId: string) => {
    updateConfig('departments', config.departments.filter(d => d.id !== deptId));
  };

  const handleUpdateDept = (deptId: string, updates: Partial<DeptConfig>) => {
    updateConfig('departments', config.departments.map(d => d.id === deptId ? { ...d, ...updates } : d));
  };

  const handleMoveDept = (index: number, direction: 'UP' | 'DOWN') => {
    const newDepts = [...config.departments];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newDepts.length) return;
    const temp = newDepts[index];
    newDepts[index] = newDepts[targetIndex];
    newDepts[targetIndex] = temp;
    updateConfig('departments', newDepts);
  };

  // Add room to dept
  const handleAddRoomToDept = (deptId: string) => {
    const dept = config.departments.find(d => d.id === deptId);
    if (!dept) return;
    const nextRoomNum = dept.rooms.length + 1;
    handleUpdateDept(deptId, { rooms: [...dept.rooms, `OR ${nextRoomNum}`] });
  };

  const handleRemoveRoomFromDept = (deptId: string, roomIndex: number) => {
    const dept = config.departments.find(d => d.id === deptId);
    if (!dept) return;
    const nextRooms = dept.rooms.filter((_, idx) => idx !== roomIndex);
    handleUpdateDept(deptId, { rooms: nextRooms });
  };

  // Tag list managers
  const [newDeptInput, setNewDeptInput] = useState('');
  const [newDepartureSec, setNewDepartureSec] = useState('');
  const [newLateBucket, setNewLateBucket] = useState('');
  const [newCallRole, setNewCallRole] = useState('');

  // Total room count
  const totalRoomCount = useMemo(() => {
    return config.departments.reduce((acc, d) => acc + d.rooms.length, 0);
  }, [config.departments]);

  // JSON schema for export
  const exportPayload = useMemo(() => {
    return {
      version: '1.0-prototype',
      boardId: config.slug,
      organization: config.orgName,
      facilityName: config.facilityName,
      routeUrl: `https://perfectboard.io/${config.orgName.toLowerCase().replace(/\s+/g, '-')}/${config.slug}`,
      settings: {
        timezone: config.timezone,
        startTime: config.startTime,
        reliefCountTime: config.reliefCountTime,
        archetype: config.archetype,
        enableTraineeSlot: config.enableTraineeSlot,
        allowedCredentials: config.allowedCredentials,
        breakMode: config.breakMode,
        enableRedBoxes: config.enableRedBoxes,
        maskPhoneNumbers: config.maskPhoneNumbers,
        autoLockMinutes: config.autoLockMinutes,
        enableVirtualKeyboard: config.enableVirtualKeyboard,
        defaultTheme: config.defaultTheme
      },
      departments: config.departments,
      sidebars: {
        bullpen: {
          enabled: config.enableBullpen !== false
        },
        drawer: {
          enabled: config.enableDrawer !== false
        },
        departures: {
          enabled: config.enableDepartures,
          sections: config.departureSections
        },
        lates: {
          enabled: config.enableLates,
          buckets: config.lateBuckets
        },
        callTeam: {
          enabled: config.enableCallTeam,
          roles: config.callRoles
        }
      },
      staffRoster: config.sampleStaff
    };
  }, [config]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className={styles.container}>
      {/* Top App Header */}
      <header className={styles.topNav}>
        <div className={styles.brandGroup}>
          <div className={styles.brandBadge}>
            <Sparkles size={16} />
            PERFECT BOARD
          </div>
          <div>
            <div className={styles.brandTitle}>Board Builder Wizard</div>
          </div>
          <span className={styles.mockupTag}>Interactive Prototype (In-Memory)</span>
        </div>

        {/* Preset Selector */}
        <div className={styles.presetBar}>
          <span className={styles.presetLabel}>Load Preset:</span>
          <button
            className={`${styles.presetBtn} ${activePreset === 'mhmc' ? styles.presetBtnActive : ''}`}
            onClick={() => handleSelectPreset('mhmc')}
            title="Large Academic / Trauma Hospital (e.g. MHMC Main OR)"
          >
            🏥 MHMC Hospital
          </button>
          <button
            className={`${styles.presetBtn} ${activePreset === 'asc' ? styles.presetBtnActive : ''}`}
            onClick={() => handleSelectPreset('asc')}
            title="Outpatient Ambulatory Surgery Center (e.g. Village SC)"
          >
            🏢 Village ASC
          </button>
          <button
            className={`${styles.presetBtn} ${activePreset === 'ivf' ? styles.presetBtnActive : ''}`}
            onClick={() => handleSelectPreset('ivf')}
            title="Small Specialty Suite (e.g. IVF Center)"
          >
            🩺 Houston IVF
          </button>
          <button
            className={`${styles.presetBtn} ${activePreset === 'custom' ? styles.presetBtnActive : ''}`}
            onClick={() => handleSelectPreset('custom')}
            title="Start from clean slate"
          >
            🔄 Blank Slate
          </button>
        </div>

        {/* Persona Role Switcher & Superuser Console Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className={styles.personaToggle}>
            <button
              type="button"
              className={`${styles.personaBtn} ${builderPersona === 'ORG_ADMIN' ? styles.personaBtnActive : ''}`}
              onClick={() => {
                setBuilderPersona('ORG_ADMIN');
                updateConfig('orgName', 'Metro Health Anesthesia Partners');
              }}
              title="View as Org Admin (Org Name is locked)"
            >
              <Users size={13} /> Org Admin
            </button>
            <button
              type="button"
              className={`${styles.personaBtn} ${builderPersona === 'SUPERUSER' ? styles.personaBtnSuperuserActive : ''}`}
              onClick={() => setBuilderPersona('SUPERUSER')}
              title="View as Superuser (Can create & edit any Org or Facility)"
            >
              <Key size={13} /> Superuser
            </button>
          </div>

          <Link
            href="/board-builder-mockup/superuser"
            className={styles.superuserConsoleBtn}
            title="Open Multi-Tenant Superuser Admin Console"
          >
            <Key size={13} /> Superuser Console →
          </Link>
        </div>
      </header>

      {/* Stepper Navigation */}
      <div className={styles.stepperBar}>
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <React.Fragment key={step.id}>
              <button
                className={`${styles.stepNode} ${isActive ? styles.stepNodeActive : ''} ${isCompleted ? styles.stepNodeCompleted : ''}`}
                onClick={() => setCurrentStep(step.id)}
              >
                <div className={`${styles.stepCircle} ${isActive ? styles.stepCircleActive : ''} ${isCompleted ? styles.stepCircleCompleted : ''}`}>
                  {isCompleted ? <Check size={14} /> : step.id}
                </div>
                <span className={styles.stepTitle}>{step.label}</span>
              </button>
              {idx < STEPS.length - 1 && <div className={styles.stepDivider} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Main Form Body */}
      <main className={styles.mainLayout}>
        {/* ================= STEP 1: FACILITY PROFILE ================= */}
        {currentStep === 1 && (
          <div className={styles.stepCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderTop}>
                <div className={styles.cardTitle}>
                  <Building2 size={24} color="#60a5fa" />
                  Step 1: Facility Profile & Operational Rhythm
                </div>
                <span className={styles.mockupTag}>
                  {builderPersona === 'ORG_ADMIN' ? 'Org Admin Session' : 'Superuser Session'}
                </span>
              </div>
              <p className={styles.cardSubtitle}>
                Define the parent organization, facility name, and web address for your new whiteboard.
              </p>
            </div>

            {/* Persona Notice Banner */}
            {builderPersona === 'ORG_ADMIN' ? (
              <div className={styles.orgAdminBanner}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={18} color="#2563eb" />
                  <div>
                    <strong>Org Admin Mode:</strong> Your Organization is fixed to <strong>{config.orgName || 'Metro Health Anesthesia Partners'}</strong>. You can configure boards and rooms for any facility within your group.
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.presetBtn}
                  onClick={() => setBuilderPersona('SUPERUSER')}
                  style={{ background: '#ffffff', color: '#1e293b', borderColor: '#cbd5e1', fontSize: '11px', whiteSpace: 'nowrap' }}
                >
                  <Key size={12} /> Switch to Superuser
                </button>
              </div>
            ) : (
              <div className={styles.superuserBanner}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Key size={18} color="#d97706" />
                  <div>
                    <strong>Superuser Mode Active:</strong> You have global authorization across all tenant organizations. You can create, edit, or reassign boards to any Organization or Facility.
                  </div>
                </div>
                <Link
                  href="/board-builder-mockup/superuser"
                  className={styles.presetBtn}
                  style={{ background: '#f59e0b', color: '#ffffff', borderColor: '#d97706', fontSize: '11px', whiteSpace: 'nowrap' }}
                >
                  Open Superuser Console →
                </Link>
              </div>
            )}

            <div className={styles.gridTwo}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Organization Name (Tenant)</label>
                {builderPersona === 'ORG_ADMIN' ? (
                  <div className={styles.lockedInputWrapper}>
                    <Lock size={15} className={styles.lockedIcon} />
                    <input
                      type="text"
                      className={styles.lockedInput}
                      value={config.orgName}
                      disabled
                      readOnly
                    />
                    <span className={styles.lockedTag}>Locked to Org</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    className={styles.formInput}
                    value={config.orgName}
                    onChange={e => updateConfig('orgName', e.target.value)}
                    placeholder="e.g. USAP Houston, Memorial Health..."
                  />
                )}
                <span className={styles.formHint}>
                  {builderPersona === 'ORG_ADMIN'
                    ? 'Fixed by your Org Admin session. Superusers can modify or reassign tenant accounts.'
                    : 'The parent tenant group that owns the billing and master clinician roster.'}
                </span>
              </div>

              <div className={styles.formGroup}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className={styles.formLabel}>Facility / Suite Name</label>
                  {builderPersona === 'ORG_ADMIN' && (
                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                      Authorized Group Facilities
                    </span>
                  )}
                </div>
                {builderPersona === 'ORG_ADMIN' ? (
                  <select
                    className={styles.formInput}
                    value={config.facilityName}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__NEW__') {
                        updateConfig('facilityName', 'New Ambulatory Suite');
                      } else {
                        updateConfig('facilityName', val);
                        if (val.includes('West')) updateConfig('slug', 'west-pavilion');
                        else if (val.includes('Endo')) updateConfig('slug', 'endo-suite');
                        else updateConfig('slug', 'mhmc-main');
                      }
                    }}
                  >
                    <option value="Memorial Hermann Main Hospital">Memorial Hermann Main Hospital</option>
                    <option value="West Pavilion Surgery Center">West Pavilion Surgery Center</option>
                    <option value="Memorial Hermann Endoscopy Suite">Memorial Hermann Endoscopy Suite</option>
                    <option value="__NEW__">+ Add Another Facility for this Group...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    className={styles.formInput}
                    value={config.facilityName}
                    onChange={e => updateConfig('facilityName', e.target.value)}
                    placeholder="e.g. Memorial Hermann Main OR"
                  />
                )}
                <span className={styles.formHint}>Displayed prominently on top of the whiteboard and wall TVs.</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>URL Shortcode / Board Slug</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={config.slug}
                  onChange={e => updateConfig('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                  placeholder="e.g. mhmc-main, village-sc"
                />
                <div className={styles.slugPreview}>
                  <Laptop size={14} />
                  <span>Direct URL: <strong>https://perfectboard.io/</strong></span>
                  <span className={styles.slugHighlight}>{config.orgName.toLowerCase().replace(/\s+/g, '-') || 'org'}/{config.slug || 'board'}</span>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Facility Timezone</label>
                <select
                  className={styles.formInput}
                  value={config.timezone}
                  onChange={e => updateConfig('timezone', e.target.value)}
                >
                  <option>Central Time (US & Canada)</option>
                  <option>Eastern Time (US & Canada)</option>
                  <option>Mountain Time (US & Canada)</option>
                  <option>Pacific Time (US & Canada)</option>
                </select>
                <span className={styles.formHint}>Controls live header clock and automated daily reset schedule.</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Day Operating Start Time</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={config.startTime}
                  onChange={e => updateConfig('startTime', e.target.value)}
                  placeholder="e.g. 06:30 AM"
                />
                <span className={styles.formHint}>When the primary morning surgical cases kick off.</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Primary Relief Planning Cutoff</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={config.reliefCountTime}
                  onChange={e => updateConfig('reliefCountTime', e.target.value)}
                  placeholder="e.g. 3:00 PM Count"
                />
                <span className={styles.formHint}>The critical hour when Board Runners calculate staffing relief deficits.</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: STAFFING MODEL ================= */}
        {currentStep === 2 && (
          <div className={styles.stepCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderTop}>
                <div className={styles.cardTitle}>
                  <ShieldCheck size={24} color="#60a5fa" />
                  Step 2: Clinical Staffing Archetype & Credentials
                </div>
                <span className={styles.mockupTag}>Step 2 of 6</span>
              </div>
              <p className={styles.cardSubtitle}>
                Choose how rooms are staffed in your practice: Anesthesia Care Team, Solo MD, or Supervisory Pod.
              </p>
            </div>

            <div className={styles.archetypeGrid}>
              {/* Option 1: ACT */}
              <div
                className={`${styles.archetypeCard} ${config.archetype === 'ACT' ? styles.archetypeCardActive : ''}`}
                onClick={() => updateConfig('archetype', 'ACT')}
              >
                <div className={styles.archetypeHeader}>
                  <div className={styles.archetypeTitle}>Anesthesia Care Team (ACT)</div>
                  <span className={styles.archetypeBadge}>Most Common</span>
                </div>
                <p className={styles.archetypeDesc}>
                  1 Attending MD supervising 1 CRNA or Resident per room. Standard in large hospitals and high-acuity surgical suites.
                </p>
                <div className={styles.archetypeVisual}>
                  <div className={`${styles.miniRoomSlot} ${styles.slotAttending}`}>
                    <span>OR 1: Attending MD</span>
                    <span>MD</span>
                  </div>
                  <div className={`${styles.miniRoomSlot} ${styles.slotCRNA}`}>
                    <span>OR 1: Anesthetist</span>
                    <span>CRNA</span>
                  </div>
                </div>
              </div>

              {/* Option 2: Solo Practitioner */}
              <div
                className={`${styles.archetypeCard} ${config.archetype === 'SOLO' ? styles.archetypeCardActive : ''}`}
                onClick={() => updateConfig('archetype', 'SOLO')}
              >
                <div className={styles.archetypeHeader}>
                  <div className={styles.archetypeTitle}>Solo Practitioner (1:1)</div>
                  <span className={styles.archetypeBadge}>ASC / Outpatient</span>
                </div>
                <p className={styles.archetypeDesc}>
                  Single clinician (All-MD or Independent CRNA) per room. Common in cosmetic surgery, endoscopy, and private ASCs.
                </p>
                <div className={styles.archetypeVisual}>
                  <div className={`${styles.miniRoomSlot} ${styles.slotAttending}`}>
                    <span>OR 1: Solo Clinician</span>
                    <span>MD / CRNA</span>
                  </div>
                </div>
              </div>

              {/* Option 3: Supervisory Pod */}
              <div
                className={`${styles.archetypeCard} ${config.archetype === 'POD' ? styles.archetypeCardActive : ''}`}
                onClick={() => updateConfig('archetype', 'POD')}
              >
                <div className={styles.archetypeHeader}>
                  <div className={styles.archetypeTitle}>Supervisory Pod (1:4)</div>
                  <span className={styles.archetypeBadge}>Regional Pods</span>
                </div>
                <p className={styles.archetypeDesc}>
                  1 Attending MD assigned to supervise a cluster of 4 rooms, each staffed by a dedicated CRNA.
                </p>
                <div className={styles.archetypeVisual}>
                  <div className={`${styles.miniRoomSlot} ${styles.slotAttending}`}>
                    <span>POD SUPERVISOR: Dr. Tallackson</span>
                    <span>MD</span>
                  </div>
                  <div className={`${styles.miniRoomSlot} ${styles.slotCRNA}`}>
                    <span>OR 1 to OR 4 (4 CRNA Slots)</span>
                    <span>4x CRNA</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <div className={styles.toggleTitle}>
                    <Users size={18} color="#f59e0b" />
                    Allow SRNA / Resident Trainee Slot in Rooms
                  </div>
                  <div className={styles.toggleDesc}>
                    Adds a secondary trainee tile under the CRNA slot for teaching hospitals (e.g. SRNA or CA-1/CA-2 resident).
                  </div>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={config.enableTraineeSlot}
                    onChange={e => updateConfig('enableTraineeSlot', e.target.checked)}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Allowed Staff Credentials at this Facility</label>
                <div className={styles.tagPills}>
                  {['MD', 'DO', 'CRNA', 'CAA', 'Resident', 'SRNA', 'RN'].map(cred => {
                    const isChecked = config.allowedCredentials.includes(cred);
                    return (
                      <button
                        key={cred}
                        type="button"
                        className={styles.presetBtn}
                        style={{
                          background: isChecked ? '#dbeafe' : '#ffffff',
                          color: isChecked ? '#1e40af' : '#64748b',
                          borderColor: isChecked ? '#3b82f6' : '#cbd5e1'
                        }}
                        onClick={() => {
                          if (isChecked) {
                            updateConfig('allowedCredentials', config.allowedCredentials.filter(c => c !== cred));
                          } else {
                            updateConfig('allowedCredentials', [...config.allowedCredentials, cred]);
                          }
                        }}
                      >
                        {isChecked ? '✓ ' : '+ '} {cred}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: DEPARTMENTS & ROOMS ================= */}
        {currentStep === 3 && (
          <div className={styles.stepCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderTop}>
                <div className={styles.cardTitle}>
                  <Layout size={24} color="#60a5fa" />
                  Step 3: Surgical Departments, Rows & TV Orientation
                </div>
                <span className={styles.mockupTag}>Total: {totalRoomCount} Rooms Configured</span>
              </div>
              <p className={styles.cardSubtitle}>
                Choose display orientation, multi-row architecture, and arrange department order and row assignments.
              </p>
            </div>

            {/* Display Orientation & Row Architecture Controls */}
            <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Monitor size={18} color="#2563eb" /> Display Orientation (Wall TV Mount)
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Configure the board for traditional widescreen wall TVs or vertical hallway/kiosk displays.
                  </div>
                </div>
                <div className={styles.orientationToggle}>
                  <button
                    type="button"
                    className={`${styles.orientationBtn} ${config.displayOrientation === 'LANDSCAPE' ? styles.orientationBtnActive : ''}`}
                    onClick={() => updateConfig('displayOrientation', 'LANDSCAPE')}
                  >
                    <Monitor size={14} /> Landscape (16:9 Standard)
                  </button>
                  <button
                    type="button"
                    className={`${styles.orientationBtn} ${config.displayOrientation === 'PORTRAIT' ? styles.orientationBtnActive : ''}`}
                    onClick={() => updateConfig('displayOrientation', 'PORTRAIT')}
                  >
                    <Smartphone size={14} /> Portrait (9:16 Vertical TV)
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="#2563eb" /> Board Row Architecture
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                  Choose how departments and room columns are stacked across the whiteboard.
                </div>

                <div className={styles.layoutCardGrid}>
                  <div
                    className={`${styles.layoutCard} ${config.layoutMode === 'AUTO' ? styles.layoutCardActive : ''}`}
                    onClick={() => updateConfig('layoutMode', 'AUTO')}
                  >
                    <div className={styles.layoutCardTitle}>
                      <Columns size={16} color={config.layoutMode === 'AUTO' ? '#2563eb' : '#64748b'} />
                      Auto-Responsive
                    </div>
                    <div className={styles.layoutCardDesc}>
                      Automatic flow. Keeps 1 primary row and wraps responsively based on monitor width.
                    </div>
                  </div>

                  <div
                    className={`${styles.layoutCard} ${config.layoutMode === 'SINGLE_ROW' ? styles.layoutCardActive : ''}`}
                    onClick={() => updateConfig('layoutMode', 'SINGLE_ROW')}
                  >
                    <div className={styles.layoutCardTitle}>
                      <Monitor size={16} color={config.layoutMode === 'SINGLE_ROW' ? '#2563eb' : '#64748b'} />
                      Single Row
                    </div>
                    <div className={styles.layoutCardDesc}>
                      All departments side-by-side in one horizontal row across the top of the whiteboard.
                    </div>
                  </div>

                  <div
                    className={`${styles.layoutCard} ${config.layoutMode === 'TWO_ROWS' ? styles.layoutCardActive : ''}`}
                    onClick={() => updateConfig('layoutMode', 'TWO_ROWS')}
                  >
                    <div className={styles.layoutCardTitle}>
                      <LayoutGrid size={16} color={config.layoutMode === 'TWO_ROWS' ? '#2563eb' : '#64748b'} />
                      Two Rows (Split)
                    </div>
                    <div className={styles.layoutCardDesc}>
                      Upper & Lower tiers. Assign departments to Row 1 (Top) or Row 2 (Bottom) for dense surgical suites.
                    </div>
                  </div>

                  <div
                    className={`${styles.layoutCard} ${config.layoutMode === 'THREE_ROWS' ? styles.layoutCardActive : ''}`}
                    onClick={() => updateConfig('layoutMode', 'THREE_ROWS')}
                  >
                    <div className={styles.layoutCardTitle}>
                      <Layers size={16} color={config.layoutMode === 'THREE_ROWS' ? '#2563eb' : '#64748b'} />
                      Three Rows (Multi-Tier)
                    </div>
                    <div className={styles.layoutCardDesc}>
                      Three horizontal stacked tiers. Recommended for 40+ room health networks and tertiary medical centers.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Department Columns & Room Definitions ({config.departments.length})</span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>
                  Use ▲ and ▼ to reorder department position on the board
                </span>
              </div>

              {config.departments.map((dept, idx) => (
                <div key={dept.id} className={styles.deptCard}>
                  <div className={styles.deptHeader}>
                    <div className={styles.deptOrderControls}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '3px 7px' }}>
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        className={styles.orderBtn}
                        onClick={() => handleMoveDept(idx, 'UP')}
                        disabled={idx === 0}
                        title="Move department earlier/left"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        className={styles.orderBtn}
                        onClick={() => handleMoveDept(idx, 'DOWN')}
                        disabled={idx === config.departments.length - 1}
                        title="Move department later/right"
                      >
                        <ArrowDown size={13} />
                      </button>

                      {/* Row assignment dropdown */}
                      {(config.layoutMode === 'TWO_ROWS' || config.layoutMode === 'THREE_ROWS') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Row:</span>
                          <select
                            className={styles.rowSelector}
                            value={dept.row || (idx % (config.layoutMode === 'THREE_ROWS' ? 3 : 2) + 1)}
                            onChange={e => handleUpdateDept(dept.id, { row: parseInt(e.target.value, 10) })}
                            title="Select which horizontal row tier this department belongs to"
                          >
                            <option value={1}>Row 1 (Top)</option>
                            <option value={2}>Row 2 {config.layoutMode === 'THREE_ROWS' ? '(Middle)' : '(Bottom)'}</option>
                            {config.layoutMode === 'THREE_ROWS' && <option value={3}>Row 3 (Bottom)</option>}
                          </select>
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      className={styles.deptTitleInput}
                      value={dept.name}
                      onChange={e => handleUpdateDept(dept.id, { name: e.target.value })}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                        {dept.rooms.length} {dept.rooms.length === 1 ? 'Room' : 'Rooms'}
                      </span>
                      {config.departments.length > 1 && (
                        <button
                          type="button"
                          className={styles.tagRemoveBtn}
                          onClick={() => handleRemoveDept(dept.id)}
                          title="Delete this entire department"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Room Tags */}
                  <div>
                    <label className={styles.formLabel} style={{ marginBottom: '8px' }}>
                      Active Rooms in {dept.name}
                    </label>
                    <div className={styles.tagPills}>
                      {dept.rooms.map((roomName, rIdx) => (
                        <div key={rIdx} className={styles.tagPill}>
                          <span>{roomName}</span>
                          <button
                            type="button"
                            className={styles.tagRemoveBtn}
                            onClick={() => handleRemoveRoomFromDept(dept.id, rIdx)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={styles.presetBtn}
                        onClick={() => handleAddRoomToDept(dept.id)}
                        style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                      >
                        <Plus size={14} /> Add Room
                      </button>
                    </div>
                  </div>

                  {/* Runner Slot Checkbox */}
                  <div className={styles.toggleRow} style={{ padding: '12px 16px', background: '#f8fafc' }}>
                    <div className={styles.toggleInfo}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                        Add Dedicated Runner Slot for this Department
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Places a runner magnet box above the rooms (e.g. Main Runner, West Runner).
                      </span>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={dept.hasRunner}
                        onChange={e => handleUpdateDept(dept.id, { hasRunner: e.target.checked })}
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className={styles.presetBtn}
                onClick={handleAddDept}
                style={{ padding: '12px 20px', alignSelf: 'flex-start', background: '#2563eb', color: '#ffffff', borderColor: '#1d4ed8', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)' }}
              >
                <Plus size={16} /> Add Another Department Column
              </button>
            </div>

            {/* Real-time Whiteboard Layout Preview */}
            <div className={styles.stepPreviewSection}>
              <div className={styles.stepPreviewHead}>
                <div>
                  <div className={styles.stepPreviewTitle}>
                    <Eye size={18} color="#2563eb" />
                    Live Whiteboard Layout Preview
                  </div>
                  <div className={styles.stepPreviewSub}>
                    Visualizing {config.departments.length} departments across {config.layoutMode.replace('_', ' ')} layout ({config.displayOrientation.toLowerCase()}) in real-time.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Quick Orientation Switcher */}
                  <div className={styles.orientationToggle}>
                    <button
                      type="button"
                      className={`${styles.orientationBtn} ${config.displayOrientation === 'LANDSCAPE' ? styles.orientationBtnActive : ''}`}
                      onClick={() => updateConfig('displayOrientation', 'LANDSCAPE')}
                      title="16:9 Landscape Wall TV"
                    >
                      <Monitor size={13} /> Landscape
                    </button>
                    <button
                      type="button"
                      className={`${styles.orientationBtn} ${config.displayOrientation === 'PORTRAIT' ? styles.orientationBtnActive : ''}`}
                      onClick={() => updateConfig('displayOrientation', 'PORTRAIT')}
                      title="9:16 Portrait Vertical TV Kiosk"
                    >
                      <Smartphone size={13} /> Portrait
                    </button>
                  </div>

                  {/* Quick Layout Pill Switcher */}
                  <div className={styles.layoutPillToggle}>
                    <button
                      type="button"
                      className={`${styles.layoutPill} ${config.layoutMode === 'AUTO' ? styles.layoutPillActive : ''}`}
                      onClick={() => updateConfig('layoutMode', 'AUTO')}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      className={`${styles.layoutPill} ${config.layoutMode === 'SINGLE_ROW' ? styles.layoutPillActive : ''}`}
                      onClick={() => updateConfig('layoutMode', 'SINGLE_ROW')}
                    >
                      1 Row
                    </button>
                    <button
                      type="button"
                      className={`${styles.layoutPill} ${config.layoutMode === 'TWO_ROWS' ? styles.layoutPillActive : ''}`}
                      onClick={() => updateConfig('layoutMode', 'TWO_ROWS')}
                    >
                      2 Rows
                    </button>
                    <button
                      type="button"
                      className={`${styles.layoutPill} ${config.layoutMode === 'THREE_ROWS' ? styles.layoutPillActive : ''}`}
                      onClick={() => updateConfig('layoutMode', 'THREE_ROWS')}
                    >
                      3 Rows
                    </button>
                  </div>
                </div>
              </div>
              <WhiteboardSkeleton config={config} />
            </div>
          </div>
        )}

        {/* ================= STEP 4: SIDEBARS & MODULES ================= */}
        {currentStep === 4 && (
          <div className={styles.stepCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderTop}>
                <div className={styles.cardTitle}>
                  <Layers size={24} color="#60a5fa" />
                  Step 4: Sidebars, Departures, Lates & Break Tracking
                </div>
                <span className={styles.mockupTag}>Step 4 of 6</span>
              </div>
              <p className={styles.cardSubtitle}>
                Turn on the specific operational columns your hospital uses to run the daily schedule.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Module 1: Departure List */}
              <div className={styles.deptCard}>
                <div className={styles.toggleRow} style={{ border: 'none', padding: 0 }}>
                  <div className={styles.toggleInfo}>
                    <div className={styles.toggleTitle}>
                      <Users size={18} color="#60a5fa" />
                      Departure Column
                    </div>
                    <div className={styles.toggleDesc}>
                      Right-hand departure order showing providers who leave first as cases finish.
                    </div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={config.enableDepartures}
                      onChange={e => updateConfig('enableDepartures', e.target.checked)}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                {config.enableDepartures && (
                  <div style={{ marginTop: '12px' }}>
                    <label className={styles.formLabel} style={{ marginBottom: '8px' }}>
                      Departure Section Buckets
                    </label>
                    <div className={styles.tagPills}>
                      {config.departureSections.map((sec, idx) => (
                        <div key={idx} className={styles.tagPill}>
                          <span>{sec}</span>
                          <button
                            type="button"
                            className={styles.tagRemoveBtn}
                            onClick={() => updateConfig('departureSections', config.departureSections.filter((_, i) => i !== idx))}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          className={styles.formInput}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          value={newDepartureSec}
                          onChange={e => setNewDepartureSec(e.target.value)}
                          placeholder="Add custom bucket..."
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newDepartureSec.trim()) {
                              updateConfig('departureSections', [...config.departureSections, newDepartureSec.trim()]);
                              setNewDepartureSec('');
                            }
                          }}
                        />
                        <button
                          type="button"
                          className={styles.presetBtn}
                          onClick={() => {
                            if (newDepartureSec.trim()) {
                              updateConfig('departureSections', [...config.departureSections, newDepartureSec.trim()]);
                              setNewDepartureSec('');
                            }
                          }}
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Module 2: Late Shifts */}
              <div className={styles.deptCard}>
                <div className={styles.toggleRow} style={{ border: 'none', padding: 0 }}>
                  <div className={styles.toggleInfo}>
                    <div className={styles.toggleTitle}>
                      <Clock size={18} color="#34d399" />
                      Late Coverage Column
                    </div>
                    <div className={styles.toggleDesc}>
                      Buckets for staff scheduled for late coverage (3p, 4p, 5p, night float).
                    </div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={config.enableLates}
                      onChange={e => updateConfig('enableLates', e.target.checked)}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                {config.enableLates && (
                  <div style={{ marginTop: '12px' }}>
                    <label className={styles.formLabel} style={{ marginBottom: '8px' }}>
                      Active Late Shift Tiers
                    </label>
                    <div className={styles.tagPills}>
                      {config.lateBuckets.map((bucket, idx) => (
                        <div key={idx} className={styles.tagPill}>
                          <span>{bucket}</span>
                          <button
                            type="button"
                            className={styles.tagRemoveBtn}
                            onClick={() => updateConfig('lateBuckets', config.lateBuckets.filter((_, i) => i !== idx))}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          className={styles.formInput}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          value={newLateBucket}
                          onChange={e => setNewLateBucket(e.target.value)}
                          placeholder="e.g. 6p Late"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newLateBucket.trim()) {
                              updateConfig('lateBuckets', [...config.lateBuckets, newLateBucket.trim()]);
                              setNewLateBucket('');
                            }
                          }}
                        />
                        <button
                          type="button"
                          className={styles.presetBtn}
                          onClick={() => {
                            if (newLateBucket.trim()) {
                              updateConfig('lateBuckets', [...config.lateBuckets, newLateBucket.trim()]);
                              setNewLateBucket('');
                            }
                          }}
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Module 3: Call Teams & Red Boxes */}
              <div className={styles.gridTwo}>
                <div className={styles.deptCard}>
                  <div className={styles.toggleRow} style={{ border: 'none', padding: 0 }}>
                    <div className={styles.toggleInfo}>
                      <div className={styles.toggleTitle}>Call Team Tags</div>
                      <div className={styles.toggleDesc}>Badges for CV, OB, or Trauma on-call doctors.</div>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={config.enableCallTeam}
                        onChange={e => updateConfig('enableCallTeam', e.target.checked)}
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>
                </div>

                <div className={styles.deptCard}>
                  <div className={styles.toggleRow} style={{ border: 'none', padding: 0 }}>
                    <div className={styles.toggleInfo}>
                      <div className={styles.toggleTitle}>3 PM Red Boxes (Relief Deficits)</div>
                      <div className={styles.toggleDesc}>Calculates open room deficits vs available lates.</div>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={config.enableRedBoxes}
                        onChange={e => updateConfig('enableRedBoxes', e.target.checked)}
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Module 4: Bullpen & Staff Drawer */}
              <div className={styles.gridTwo}>
                <div className={styles.deptCard}>
                  <div className={styles.toggleRow} style={{ border: 'none', padding: 0 }}>
                    <div className={styles.toggleInfo}>
                      <div className={styles.toggleTitle}>Bullpen Waiting Queue (Left Column)</div>
                      <div className={styles.toggleDesc}>Ranked arrival queue on the left side of the whiteboard for free clinicians waiting for assignments.</div>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={config.enableBullpen !== false}
                        onChange={e => updateConfig('enableBullpen', e.target.checked)}
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>
                </div>

                <div className={styles.deptCard}>
                  <div className={styles.toggleRow} style={{ border: 'none', padding: 0 }}>
                    <div className={styles.toggleInfo}>
                      <div className={styles.toggleTitle}>Unassigned Staff Drawer (Bottom Tray)</div>
                      <div className={styles.toggleDesc}>Expandable bottom tray holding credentialed staff library categorized by credentials.</div>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={config.enableDrawer !== false}
                        onChange={e => updateConfig('enableDrawer', e.target.checked)}
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Break Tracking & Kiosk Controls */}
              <div className={styles.gridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Break Tracking Checkboxes</label>
                  <select
                    className={styles.formInput}
                    value={config.breakMode}
                    onChange={e => updateConfig('breakMode', e.target.value as any)}
                  >
                    <option value="BOTH">Breakfast [B] and Lunch [L] Checkboxes</option>
                    <option value="LUNCH_ONLY">Lunch [L] Only (ASC standard)</option>
                    <option value="NONE">Disabled (Do not track breaks)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Touchscreen On-Screen Virtual Keyboard</label>
                  <select
                    className={styles.formInput}
                    value={config.enableVirtualKeyboard ? 'YES' : 'NO'}
                    onChange={e => updateConfig('enableVirtualKeyboard', e.target.value === 'YES')}
                  >
                    <option value="YES">Enabled (Recommended for 65" TV Touchscreens)</option>
                    <option value="NO">Disabled (Recommended for Desktop Workstations)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Real-time Whiteboard Modules Preview */}
            <div className={styles.stepPreviewSection}>
              <div className={styles.stepPreviewHead}>
                <div>
                  <div className={styles.stepPreviewTitle}>
                    <Eye size={18} color="#2563eb" />
                    Live Whiteboard Modules Preview
                  </div>
                  <div className={styles.stepPreviewSub}>
                    Sidebars, bullpen, and queues appear or disappear dynamically in real-time as you toggle settings above.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Quick Orientation Switcher */}
                  <div className={styles.orientationToggle}>
                    <button
                      type="button"
                      className={`${styles.orientationBtn} ${config.displayOrientation === 'LANDSCAPE' ? styles.orientationBtnActive : ''}`}
                      onClick={() => updateConfig('displayOrientation', 'LANDSCAPE')}
                      title="16:9 Landscape Wall TV"
                    >
                      <Monitor size={13} /> Landscape
                    </button>
                    <button
                      type="button"
                      className={`${styles.orientationBtn} ${config.displayOrientation === 'PORTRAIT' ? styles.orientationBtnActive : ''}`}
                      onClick={() => updateConfig('displayOrientation', 'PORTRAIT')}
                      title="9:16 Portrait Vertical TV Kiosk"
                    >
                      <Smartphone size={13} /> Portrait
                    </button>
                  </div>

                  {/* Quick Layout Pill Switcher */}
                  <div className={styles.layoutPillToggle}>
                    <button
                      type="button"
                      className={`${styles.layoutPill} ${config.layoutMode === 'AUTO' ? styles.layoutPillActive : ''}`}
                      onClick={() => updateConfig('layoutMode', 'AUTO')}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      className={`${styles.layoutPill} ${config.layoutMode === 'SINGLE_ROW' ? styles.layoutPillActive : ''}`}
                      onClick={() => updateConfig('layoutMode', 'SINGLE_ROW')}
                    >
                      1 Row
                    </button>
                    <button
                      type="button"
                      className={`${styles.layoutPill} ${config.layoutMode === 'TWO_ROWS' ? styles.layoutPillActive : ''}`}
                      onClick={() => updateConfig('layoutMode', 'TWO_ROWS')}
                    >
                      2 Rows
                    </button>
                    <button
                      type="button"
                      className={`${styles.layoutPill} ${config.layoutMode === 'THREE_ROWS' ? styles.layoutPillActive : ''}`}
                      onClick={() => updateConfig('layoutMode', 'THREE_ROWS')}
                    >
                      3 Rows
                    </button>
                  </div>
                </div>
              </div>
              <WhiteboardSkeleton config={config} />
            </div>
          </div>
        )}

        {/* ================= STEP 5: STAFF ROSTER ================= */}
        {currentStep === 5 && (
          <div className={styles.stepCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderTop}>
                <div className={styles.cardTitle}>
                  <Users size={24} color="#60a5fa" />
                  Step 5: Master Clinician Bench & Roster
                </div>
                <span className={styles.mockupTag}>{config.sampleStaff.length} Clinicians In Bench</span>
              </div>
              <p className={styles.cardSubtitle}>
                The master library of credentialed doctors and anesthetists available to work at this facility.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button
                type="button"
                className={styles.presetBtn}
                onClick={() => updateConfig('sampleStaff', PRESETS.mhmc.sampleStaff)}
                style={{ background: '#2563eb', color: '#ffffff', borderColor: '#1d4ed8', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)' }}
              >
                <Sparkles size={16} /> Load 16 Sample Hospital Staff
              </button>
              <button
                type="button"
                className={styles.presetBtn}
                onClick={() => updateConfig('sampleStaff', [])}
                style={{ background: '#ffffff', color: '#dc2626', borderColor: '#fca5a5' }}
              >
                <Trash2 size={16} /> Clear Staff
              </button>
            </div>

            {config.sampleStaff.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <Users size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#475569', fontSize: '14px', fontWeight: 600 }}>No staff loaded yet.</p>
                <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                  Click "Load 16 Sample Hospital Staff" above to populate the bench with mock clinicians.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}>
                      <th style={{ padding: '12px 16px' }}>NAME</th>
                      <th style={{ padding: '12px 16px' }}>ROLE</th>
                      <th style={{ padding: '12px 16px' }}>PHONE</th>
                      <th style={{ padding: '12px 16px' }}>QUICK PIN</th>
                      <th style={{ padding: '12px 16px' }}>DEFAULT SHIFT</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.sampleStaff.map(staff => (
                      <tr key={staff.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0f172a' }}>
                          {staff.name}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: staff.role === 'MD' ? '#dbeafe' : '#d1fae5',
                              color: staff.role === 'MD' ? '#1e40af' : '#065f46'
                            }}
                          >
                            {staff.role}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#475569' }}>{staff.phone}</td>
                        <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#d97706', fontWeight: 700 }}>{staff.pin}</td>
                        <td style={{ padding: '10px 16px', color: '#64748b' }}>{staff.shift}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            className={styles.tagRemoveBtn}
                            onClick={() => updateConfig('sampleStaff', config.sampleStaff.filter(s => s.id !== staff.id))}
                            style={{ display: 'inline-flex' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 6: LIVE BOARD PREVIEW ================= */}
        {currentStep === 6 && (
          <div className={styles.previewWrapper}>
            {/* Toolbar */}
            <div className={styles.previewToolbar}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  Live Whiteboard Skeleton Preview
                </span>
                <span className={styles.mockupTag}>
                  Exact Visual Twin of Production Board
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Quick Orientation Switcher */}
                <div className={styles.orientationToggle}>
                  <button
                    type="button"
                    className={`${styles.orientationBtn} ${config.displayOrientation === 'LANDSCAPE' ? styles.orientationBtnActive : ''}`}
                    onClick={() => updateConfig('displayOrientation', 'LANDSCAPE')}
                    title="16:9 Landscape Wall TV"
                  >
                    <Monitor size={13} /> Landscape
                  </button>
                  <button
                    type="button"
                    className={`${styles.orientationBtn} ${config.displayOrientation === 'PORTRAIT' ? styles.orientationBtnActive : ''}`}
                    onClick={() => updateConfig('displayOrientation', 'PORTRAIT')}
                    title="9:16 Portrait Vertical TV Kiosk"
                  >
                    <Smartphone size={13} /> Portrait
                  </button>
                </div>

                {/* Quick Layout Pill Switcher */}
                <div className={styles.layoutPillToggle}>
                  <button
                    type="button"
                    className={`${styles.layoutPill} ${config.layoutMode === 'AUTO' ? styles.layoutPillActive : ''}`}
                    onClick={() => updateConfig('layoutMode', 'AUTO')}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    className={`${styles.layoutPill} ${config.layoutMode === 'SINGLE_ROW' ? styles.layoutPillActive : ''}`}
                    onClick={() => updateConfig('layoutMode', 'SINGLE_ROW')}
                  >
                    1 Row
                  </button>
                  <button
                    type="button"
                    className={`${styles.layoutPill} ${config.layoutMode === 'TWO_ROWS' ? styles.layoutPillActive : ''}`}
                    onClick={() => updateConfig('layoutMode', 'TWO_ROWS')}
                  >
                    2 Rows
                  </button>
                  <button
                    type="button"
                    className={`${styles.layoutPill} ${config.layoutMode === 'THREE_ROWS' ? styles.layoutPillActive : ''}`}
                    onClick={() => updateConfig('layoutMode', 'THREE_ROWS')}
                  >
                    3 Rows
                  </button>
                </div>

                <button
                  type="button"
                  className={styles.presetBtn}
                  onClick={() => setShowJsonExport(!showJsonExport)}
                  style={{ background: '#2563eb', color: '#fff', borderColor: '#1d4ed8' }}
                >
                  <FileText size={14} /> View Export JSON
                </button>
              </div>
            </div>

            {/* Dynamic Whiteboard Skeleton */}
            <WhiteboardSkeleton config={config} />

            {/* JSON Modal / Drawer */}
            {showJsonExport && (
              <div style={{ padding: '20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    Generated Board Configuration Schema (PostgreSQL / Supabase Ready)
                  </div>
                  <button
                    type="button"
                    className={styles.presetBtn}
                    onClick={handleCopyJson}
                    style={{ background: copiedJson ? '#059669' : '#1e3a8a', color: '#fff' }}
                  >
                    {copiedJson ? <Check size={14} /> : <Download size={14} />}
                    {copiedJson ? 'Copied to Clipboard!' : 'Copy JSON'}
                  </button>
                </div>
                <div className={styles.jsonBlock}>
                  {JSON.stringify(exportPayload, null, 2)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Stepper Navigation Controls */}
        <div className={styles.bottomNav}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            style={{ opacity: currentStep === 1 ? 0.4 : 1, cursor: currentStep === 1 ? 'not-allowed' : 'pointer' }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              Step {currentStep} of {STEPS.length}
            </span>

            {currentStep < STEPS.length ? (
              <button
                type="button"
                className={styles.nextBtn}
                onClick={() => setCurrentStep(prev => Math.min(STEPS.length, prev + 1))}
              >
                Next Step <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className={styles.nextBtn}
                onClick={() => setShowJsonExport(true)}
                style={{ background: '#059669', borderColor: '#10b981' }}
              >
                <CheckCircle2 size={16} /> Inspect Generated Configuration
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
