'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './BoardBuilderWizard.module.css';
import {
  Building2, Layout, Layers, ShieldCheck, Clock, Users, Plus, Trash2,
  ArrowRight, ArrowLeft, Check, Eye, X, CheckCircle2, Sliders, Radio, Sparkles,
  Monitor, Smartphone, Columns, LayoutGrid, FileText, Download, Lock, Key, ChevronDown
} from 'lucide-react';

export interface DeptConfig {
  id: string;
  name: string;
  rooms: string[];
  hasRunner: boolean;
  runnerLabel?: string;
  row?: number; // 1, 2, or 3
}

export interface BoardConfigState {
  orgName: string;
  facilityName: string;
  slug: string;
  timezone: string;
  startTime: string;
  reliefCountTime: string;

  // Staffing
  archetype: 'ACT' | 'SOLO' | 'POD';
  enableTraineeSlot: boolean;
  allowedCredentials: string[];

  // Layout & Depts
  layoutMode: 'AUTO' | 'SINGLE_ROW' | 'TWO_ROWS' | 'THREE_ROWS';
  displayOrientation: 'LANDSCAPE' | 'PORTRAIT';
  departments: DeptConfig[];

  // Sidebars & Modules
  enableBullpen: boolean;
  enableDrawer: boolean;
  enableDepartures: boolean;
  departureSections: string[];
  enableLates: boolean;
  lateBuckets: string[];
  enableCallTeam: boolean;
  callRoles: string[];
  enableRedBoxes: boolean;
  breakMode: 'BOTH' | 'LUNCH_ONLY' | 'NONE';

  // Feeds & Staff
  feedMode: 'MANUAL' | 'MANAGED';
  sampleStaff: Array<{
    id: string;
    name: string;
    role: 'MD' | 'CRNA' | 'Resident' | 'SRNA';
    phone: string;
    pin: string;
    shift: string;
  }>;
}

type PresetKey = 'mhmc' | 'asc' | 'specialty' | 'custom';

const PRESETS: Record<PresetKey, BoardConfigState> = {
  mhmc: {
    orgName: 'USAP Houston',
    facilityName: 'Memorial Hermann Medical Center',
    slug: 'mhmc',
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
      { id: 'ninth_fl', name: '9TH FLOOR', rooms: ['EP1', 'EP2', 'CCL1', 'CCL2', 'CCL3', 'IR', 'NIR', 'TEE'], hasRunner: false, row: 2 },
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
    feedMode: 'MANAGED',
    sampleStaff: [
      { id: 's1', name: 'Cavanaugh', role: 'MD', phone: '(713) 555-0101', pin: '9999', shift: '7a-3p' },
      { id: 's2', name: 'Shenoy', role: 'CRNA', phone: '(713) 555-0102', pin: '1234', shift: '7a-3p' },
      { id: 's3', name: 'Chuan', role: 'MD', phone: '(713) 555-0103', pin: '4412', shift: '4p Late' },
      { id: 's4', name: 'Hirsch', role: 'MD', phone: '(713) 555-0104', pin: '8821', shift: '5p Late' },
      { id: 's5', name: 'Gunn', role: 'MD', phone: '(713) 555-0105', pin: '3311', shift: '3p Late' },
      { id: 's6', name: 'Tallackson', role: 'MD', phone: '(713) 555-0106', pin: '5566', shift: 'OB Call' },
      { id: 's7', name: 'Patel P', role: 'CRNA', phone: '(713) 555-0107', pin: '7744', shift: '7a-3p' },
      { id: 's8', name: 'Martinez R', role: 'MD', phone: '(713) 555-0108', pin: '2211', shift: '3p Late' }
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
    callRoles: ['1st Call'],
    enableRedBoxes: true,
    breakMode: 'LUNCH_ONLY',
    feedMode: 'MANUAL',
    sampleStaff: [
      { id: 'a1', name: 'Smith M', role: 'MD', phone: '(713) 555-0201', pin: '1111', shift: '7a-3p' },
      { id: 'a2', name: 'Davis K', role: 'CRNA', phone: '(713) 555-0202', pin: '2222', shift: '7a-3p' },
      { id: 'a3', name: 'Johnson T', role: 'CRNA', phone: '(713) 555-0203', pin: '3333', shift: '4p Late' }
    ]
  },
  specialty: {
    orgName: 'USAP Houston',
    facilityName: 'Katy Specialty Center',
    slug: 'ktc',
    timezone: 'Central Time (US & Canada)',
    startTime: '07:00 AM',
    reliefCountTime: '3:00 PM Count',
    archetype: 'SOLO',
    enableTraineeSlot: false,
    allowedCredentials: ['MD'],
    layoutMode: 'SINGLE_ROW',
    displayOrientation: 'LANDSCAPE',
    departments: [
      { id: 'proc_suites', name: 'PROCEDURE ROOMS', rooms: ['1', '2', '3', '4'], hasRunner: false, row: 1 },
      { id: 'pacu', name: 'RECOVERY', rooms: ['1', '2'], hasRunner: false, row: 1 }
    ],
    enableBullpen: false,
    enableDrawer: true,
    enableDepartures: true,
    departureSections: ['REGULAR SHIFT'],
    enableLates: false,
    lateBuckets: ['Late'],
    enableCallTeam: false,
    callRoles: ['Coverage MD'],
    enableRedBoxes: false,
    breakMode: 'NONE',
    feedMode: 'MANUAL',
    sampleStaff: [
      { id: 'k1', name: 'Miller B', role: 'MD', phone: '(713) 555-0301', pin: '4444', shift: '7a-3p' }
    ]
  },
  custom: {
    orgName: 'USAP Houston',
    facilityName: '',
    slug: '',
    timezone: 'Central Time (US & Canada)',
    startTime: '07:00 AM',
    reliefCountTime: '3:00 PM Count',
    archetype: 'ACT',
    enableTraineeSlot: true,
    allowedCredentials: ['MD', 'CRNA', 'Resident'],
    layoutMode: 'AUTO',
    displayOrientation: 'LANDSCAPE',
    departments: [
      { id: 'dept_1', name: 'MAIN OR', rooms: ['1', '2', '3', '4'], hasRunner: true, runnerLabel: 'Runner', row: 1 }
    ],
    enableBullpen: true,
    enableDrawer: true,
    enableDepartures: true,
    departureSections: ['POST-CALL', 'NON-CALL'],
    enableLates: true,
    lateBuckets: ['3p Late', '4p Late', '5p Late'],
    enableCallTeam: true,
    callRoles: ['1st Call', '2nd Call'],
    enableRedBoxes: true,
    breakMode: 'BOTH',
    feedMode: 'MANUAL',
    sampleStaff: []
  }
};

const WIZARD_STEPS = [
  { id: 1, label: 'Facility Profile', icon: Building2 },
  { id: 2, label: 'Staffing Model', icon: ShieldCheck },
  { id: 3, label: 'Departments & Rooms', icon: Layout },
  { id: 4, label: 'Sidebars & Modules', icon: Layers },
  { id: 5, label: 'Staff & Feeds', icon: Users },
  { id: 6, label: 'Review & Live Twin', icon: Eye }
];

interface BoardBuilderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onBoardCreated?: (newBoard: any) => void;
  orgSlug?: string;
  userRole?: 'superuser' | 'admin' | 'staff' | string;
}

export const BoardBuilderWizard: React.FC<BoardBuilderWizardProps> = ({
  isOpen,
  onClose,
  onBoardCreated,
  orgSlug = 'usap',
  userRole = 'admin'
}) => {
  const router = useRouter();
  const isSuperuser = userRole === 'superuser';

  const [currentStep, setCurrentStep] = useState(1);
  const [activePreset, setActivePreset] = useState<PresetKey>('asc');
  const [config, setConfig] = useState<BoardConfigState>(PRESETS.asc);
  const [newRoomName, setNewRoomName] = useState<Record<string, string>>({});
  const [showJsonExport, setShowJsonExport] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // New staff input state for step 5
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'MD' | 'CRNA' | 'Resident' | 'SRNA'>('MD');
  const [newStaffPhone, setNewStaffPhone] = useState('');

  const updateConfig = <K extends keyof BoardConfigState>(key: K, value: BoardConfigState[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSelectPreset = (key: PresetKey) => {
    setActivePreset(key);
    setConfig({
      ...PRESETS[key],
      orgName: config.orgName || PRESETS[key].orgName
    });
  };

  // Step 3 Department handlers
  const handleAddDepartment = () => {
    const id = `dept_${Date.now()}`;
    setConfig(prev => ({
      ...prev,
      departments: [
        ...prev.departments,
        {
          id,
          name: `NEW DEPARTMENT ${prev.departments.length + 1}`,
          rooms: ['1', '2', '3', '4'],
          hasRunner: true,
          runnerLabel: 'Runner',
          row: 1
        }
      ]
    }));
  };

  const handleRemoveDepartment = (deptId: string) => {
    if (config.departments.length <= 1) return;
    setConfig(prev => ({
      ...prev,
      departments: prev.departments.filter(d => d.id !== deptId)
    }));
  };

  const handleAddRoom = (deptId: string) => {
    const val = (newRoomName[deptId] || '').trim();
    const dept = config.departments.find(d => d.id === deptId);
    const roomNameToAdd = val || `${(dept?.rooms.length || 0) + 1}`;

    setConfig(prev => ({
      ...prev,
      departments: prev.departments.map(d => {
        if (d.id === deptId) {
          return { ...d, rooms: [...d.rooms, roomNameToAdd] };
        }
        return d;
      })
    }));

    setNewRoomName(prev => ({ ...prev, [deptId]: '' }));
  };

  const handleRemoveRoom = (deptId: string, roomIndex: number) => {
    setConfig(prev => ({
      ...prev,
      departments: prev.departments.map(d => {
        if (d.id === deptId) {
          return { ...d, rooms: d.rooms.filter((_, i) => i !== roomIndex) };
        }
        return d;
      })
    }));
  };

  // Launch live board
  const handleLaunch = () => {
    const targetOrg = orgSlug || 'usap';
    const slug = (config.slug || `facility-${Date.now()}`).toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const totalRooms = config.departments.reduce((acc, d) => acc + d.rooms.length, 0);

    const facilityBoardEntry = {
      id: `board-${slug}`,
      name: config.facilityName || 'New Clinical Facility',
      code: slug.toUpperCase(),
      slug: slug,
      feedType: config.feedMode === 'MANAGED' ? 'SCRAPER' : 'MANUAL',
      feedName: config.feedMode === 'MANAGED' ? 'OneUSAP Automated Scraper' : 'Manual Whiteboard Mode',
      roomCount: totalRooms,
      deptCount: config.departments.length,
      activeStaffToday: config.sampleStaff.length,
      lastSync: 'Newly Launched'
    };

    // Save to user's local facility list
    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem('usap_facility_boards');
      let list = existing ? JSON.parse(existing) : [];
      list = list.filter((b: any) => b.slug !== slug);
      list.push(facilityBoardEntry);
      localStorage.setItem('usap_facility_boards', JSON.stringify(list));
    }

    if (onBoardCreated) {
      onBoardCreated(facilityBoardEntry);
    }

    onClose();
    router.push(`/${targetOrg}/${slug}`);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const totalRooms = config.departments.reduce((acc, d) => acc + d.rooms.length, 0);

  // Partition departments by row for whiteboard twin
  const deptRows = useMemo(() => {
    const mode = config.layoutMode;
    const depts = config.departments;
    if (depts.length === 0) return [];
    if (mode === 'SINGLE_ROW') return [depts];
    if (mode === 'TWO_ROWS') {
      const r1 = depts.filter(d => (d.row || 1) === 1);
      const r2 = depts.filter(d => (d.row || 1) === 2);
      if (r1.length > 0 && r2.length > 0) return [r1, r2];
      const mid = Math.ceil(depts.length / 2);
      return [depts.slice(0, mid), depts.slice(mid)].filter(r => r.length > 0);
    }
    if (mode === 'THREE_ROWS') {
      const r1 = depts.filter(d => (d.row || 1) === 1);
      const r2 = depts.filter(d => (d.row || 1) === 2);
      const r3 = depts.filter(d => (d.row || 1) === 3);
      if (r1.length || r2.length || r3.length) return [r1, r2, r3].filter(r => r.length > 0);
    }
    // AUTO
    if (depts.length <= 4) return [depts];
    const mid = Math.ceil(depts.length / 2);
    return [depts.slice(0, mid), depts.slice(mid)].filter(r => r.length > 0);
  }, [config.departments, config.layoutMode]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.wizardCard} onClick={e => e.stopPropagation()}>
        {/* Top Header matching AdminModal Command Center */}
        <div className={styles.wizardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className={styles.headerIconBadge}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className={styles.headerTitle}>ADMIN COMMAND CENTER: BOARD BUILDER</h2>
              <p className={styles.headerSubtitle}>
                Facility configuration, clinical staffing archetype, room matrix & deployment wizard
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close Wizard">
            <X size={20} />
          </button>
        </div>

        {/* Stepper Navigation / Desktop Tabs */}
        <div className={styles.tabsRow}>
          {WIZARD_STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <button
                key={step.id}
                type="button"
                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : (isCompleted ? styles.tabBtnCompleted : styles.tabBtnInactive)}`}
                onClick={() => setCurrentStep(step.id)}
              >
                <Icon size={14} />
                <span>{step.id}. {step.label}</span>
                {isCompleted && <Check size={12} style={{ marginLeft: 2 }} />}
              </button>
            );
          })}
        </div>

        {/* Scrollable Form Body */}
        <div className={styles.wizardBody}>
          <div className={styles.stepContent}>
            {/* ================= STEP 1: FACILITY PROFILE ================= */}
            {currentStep === 1 && (
              <>
                <div className={styles.stepHeader}>
                  <h3 className={styles.stepTitle}>Facility Identity & Operational Baseline</h3>
                  <p className={styles.stepDesc}>
                    Define parent tenant organization, facility name, direct URL slug, and clinical operating rhythm.
                  </p>
                </div>

                {/* Persona Banner */}
                {!isSuperuser ? (
                  <div className={styles.orgAdminBanner}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={16} />
                      <span>
                        <strong>Org Admin Mode:</strong> Your Organization is fixed to <strong>{config.orgName}</strong>. You can configure boards and rooms for any facility in your group.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.superuserBanner}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Key size={16} />
                      <span>
                        <strong>Superuser Mode Active:</strong> You have global authorization across all tenant organizations and can deploy or reassign boards anywhere.
                      </span>
                    </div>
                  </div>
                )}

                {/* Preset Templates */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Clinical Practice Preset Template</label>
                  <div className={styles.presetGrid}>
                    <div
                      className={`${styles.presetCard} ${activePreset === 'mhmc' ? styles.presetCardActive : ''}`}
                      onClick={() => handleSelectPreset('mhmc')}
                    >
                      <span className={styles.presetTitle}>MHMC Trauma</span>
                      <span className={styles.presetMeta}>ACT Care Team &bull; 48 Rooms &bull; 8 Depts</span>
                    </div>

                    <div
                      className={`${styles.presetCard} ${activePreset === 'asc' ? styles.presetCardActive : ''}`}
                      onClick={() => handleSelectPreset('asc')}
                    >
                      <span className={styles.presetTitle}>Surgery Center</span>
                      <span className={styles.presetMeta}>ASC Pod Model &bull; 8 Rooms &bull; 2 Depts</span>
                    </div>

                    <div
                      className={`${styles.presetCard} ${activePreset === 'specialty' ? styles.presetCardActive : ''}`}
                      onClick={() => handleSelectPreset('specialty')}
                    >
                      <span className={styles.presetTitle}>Specialty Clinic</span>
                      <span className={styles.presetMeta}>Solo Attending &bull; 6 Rooms &bull; 2 Depts</span>
                    </div>

                    <div
                      className={`${styles.presetCard} ${activePreset === 'custom' ? styles.presetCardActive : ''}`}
                      onClick={() => handleSelectPreset('custom')}
                    >
                      <span className={styles.presetTitle}>Blank Canvas</span>
                      <span className={styles.presetMeta}>Clean Slate &bull; Fully Custom</span>
                    </div>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Organization Name (Tenant)</label>
                    {!isSuperuser ? (
                      <div className={styles.lockedInputWrapper}>
                        <Lock size={14} className={styles.lockedIcon} />
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
                        placeholder="e.g. USAP Houston"
                      />
                    )}
                    <span className={styles.formHint}>Parent healthcare group owning clinician bench & permissions.</span>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Hospital / Facility Name</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Memorial Hermann Memorial West"
                      value={config.facilityName}
                      onChange={e => updateConfig('facilityName', e.target.value)}
                    />
                    <span className={styles.formHint}>Displayed prominently on top of the whiteboard and wall TVs.</span>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>URL Shortcode / Board Slug</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. hmw, village-sc"
                      value={config.slug}
                      onChange={e => updateConfig('slug', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    />
                    <div className={styles.slugPreview}>
                      <Monitor size={14} />
                      <span>Direct URL: <strong>https://perfectboard.io/</strong></span>
                      <span className={styles.slugHighlight}>{orgSlug}/{config.slug || 'board'}</span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Facility Timezone</label>
                    <select
                      className={styles.formInput}
                      value={config.timezone}
                      onChange={e => updateConfig('timezone', e.target.value)}
                    >
                      <option value="Central Time (US & Canada)">Central Time (US & Canada)</option>
                      <option value="Eastern Time (US & Canada)">Eastern Time (US & Canada)</option>
                      <option value="Mountain Time (US & Canada)">Mountain Time (US & Canada)</option>
                      <option value="Pacific Time (US & Canada)">Pacific Time (US & Canada)</option>
                    </select>
                    <span className={styles.formHint}>Controls live header clock and automated daily reset schedule.</span>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Clinical Day Start Time</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={config.startTime}
                      onChange={e => updateConfig('startTime', e.target.value)}
                      placeholder="06:30 AM"
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
                      placeholder="3:00 PM Count"
                    />
                    <span className={styles.formHint}>Hour when Board Runners calculate staffing relief deficits.</span>
                  </div>
                </div>
              </>
            )}

            {/* ================= STEP 2: STAFFING MODEL ================= */}
            {currentStep === 2 && (
              <>
                <div className={styles.stepHeader}>
                  <h3 className={styles.stepTitle}>Clinical Staffing Archetype & Credentials</h3>
                  <p className={styles.stepDesc}>
                    Define how anesthesia providers are organized across rooms and what slot types are rendered.
                  </p>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Clinical Practice Archetype</label>
                  <div className={styles.archetypeGrid}>
                    <div
                      className={`${styles.archetypeCard} ${config.archetype === 'ACT' ? styles.archetypeCardActive : ''}`}
                      onClick={() => updateConfig('archetype', 'ACT')}
                    >
                      <div className={styles.archetypeHeader}>
                        <span className={styles.archetypeTitle}>Anesthesia Care Team (ACT)</span>
                        <span className={styles.archetypeBadge}>Standard Hospital</span>
                      </div>
                      <p className={styles.archetypeDesc}>
                        1 Attending MD supervising 1 CRNA or Resident per room. Dual slots rendered in each OR.
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

                    <div
                      className={`${styles.archetypeCard} ${config.archetype === 'SOLO' ? styles.archetypeCardActive : ''}`}
                      onClick={() => updateConfig('archetype', 'SOLO')}
                    >
                      <div className={styles.archetypeHeader}>
                        <span className={styles.archetypeTitle}>Solo Practitioner (1:1)</span>
                        <span className={styles.archetypeBadge}>Ambulatory / ASC</span>
                      </div>
                      <p className={styles.archetypeDesc}>
                        Single clinician (Solo MD or Independent CRNA) per room without supervisory tiers.
                      </p>
                      <div className={styles.archetypeVisual}>
                        <div className={`${styles.miniRoomSlot} ${styles.slotAttending}`}>
                          <span>OR 1: Solo Clinician</span>
                          <span>MD / CRNA</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`${styles.archetypeCard} ${config.archetype === 'POD' ? styles.archetypeCardActive : ''}`}
                      onClick={() => updateConfig('archetype', 'POD')}
                    >
                      <div className={styles.archetypeHeader}>
                        <span className={styles.archetypeTitle}>Supervisory Pod (1:4)</span>
                        <span className={styles.archetypeBadge}>Regional Pods</span>
                      </div>
                      <p className={styles.archetypeDesc}>
                        1 Attending MD assigned to supervise a cluster of 4 rooms, each staffed by a dedicated CRNA.
                      </p>
                      <div className={styles.archetypeVisual}>
                        <div className={`${styles.miniRoomSlot} ${styles.slotAttending}`}>
                          <span>POD LEAD: Dr. Tallackson</span>
                          <span>MD</span>
                        </div>
                        <div className={`${styles.miniRoomSlot} ${styles.slotCRNA}`}>
                          <span>OR 1 to OR 4 (4 CRNA Slots)</span>
                          <span>4x CRNA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.moduleCard}>
                  <div className={styles.moduleInfo}>
                    <span className={styles.moduleTitle}>Allow SRNA / Resident Trainee Slot in Rooms</span>
                    <span className={styles.moduleDesc}>
                      Renders a 3rd trainee assignment slot inside rooms for academic and residency teaching hospital boards.
                    </span>
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
                          className={styles.tagPill}
                          style={{
                            background: isChecked ? '#dbeafe' : '#ffffff',
                            color: isChecked ? '#1e40af' : '#64748b',
                            borderColor: isChecked ? '#3b82f6' : '#cbd5e1',
                            cursor: 'pointer'
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
              </>
            )}

            {/* ================= STEP 3: DEPARTMENTS & ROOMS ================= */}
            {currentStep === 3 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className={styles.stepHeader}>
                    <h3 className={styles.stepTitle}>Surgical Departments, Rows & TV Orientation</h3>
                    <p className={styles.stepDesc}>
                      Total: {totalRooms} Rooms configured. Arrange department order, assign rows, and configure runner slots.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.nextBtn}
                    onClick={handleAddDepartment}
                  >
                    <Plus size={14} />
                    Add Department
                  </button>
                </div>

                {/* Display Orientation & Row Architecture */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Monitor size={16} color="#2563eb" /> Display Orientation (Wall TV Mount)
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                        Standard widescreen 16:9 wall displays or vertical 9:16 portrait hallway kiosks.
                      </div>
                    </div>

                    <div className={styles.orientationToggle}>
                      <button
                        type="button"
                        className={`${styles.orientationBtn} ${config.displayOrientation === 'LANDSCAPE' ? styles.orientationBtnActive : ''}`}
                        onClick={() => updateConfig('displayOrientation', 'LANDSCAPE')}
                      >
                        <Monitor size={13} /> Landscape (16:9 Standard)
                      </button>
                      <button
                        type="button"
                        className={`${styles.orientationBtn} ${config.displayOrientation === 'PORTRAIT' ? styles.orientationBtnActive : ''}`}
                        onClick={() => updateConfig('displayOrientation', 'PORTRAIT')}
                      >
                        <Smartphone size={13} /> Portrait (9:16 Vertical TV)
                      </button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={16} color="#2563eb" /> Board Row Architecture
                    </div>
                    <div className={styles.layoutCardGrid}>
                      <div
                        className={`${styles.layoutCard} ${config.layoutMode === 'AUTO' ? styles.layoutCardActive : ''}`}
                        onClick={() => updateConfig('layoutMode', 'AUTO')}
                      >
                        <div className={styles.layoutCardTitle}>
                          <Columns size={14} color={config.layoutMode === 'AUTO' ? '#2563eb' : '#64748b'} />
                          Auto-Responsive
                        </div>
                        <div className={styles.layoutCardDesc}>
                          Wraps responsively based on monitor width.
                        </div>
                      </div>

                      <div
                        className={`${styles.layoutCard} ${config.layoutMode === 'SINGLE_ROW' ? styles.layoutCardActive : ''}`}
                        onClick={() => updateConfig('layoutMode', 'SINGLE_ROW')}
                      >
                        <div className={styles.layoutCardTitle}>
                          <Monitor size={14} color={config.layoutMode === 'SINGLE_ROW' ? '#2563eb' : '#64748b'} />
                          Single Row
                        </div>
                        <div className={styles.layoutCardDesc}>
                          All departments in 1 continuous row.
                        </div>
                      </div>

                      <div
                        className={`${styles.layoutCard} ${config.layoutMode === 'TWO_ROWS' ? styles.layoutCardActive : ''}`}
                        onClick={() => updateConfig('layoutMode', 'TWO_ROWS')}
                      >
                        <div className={styles.layoutCardTitle}>
                          <Layers size={14} color={config.layoutMode === 'TWO_ROWS' ? '#2563eb' : '#64748b'} />
                          Two Rows
                        </div>
                        <div className={styles.layoutCardDesc}>
                          Upper & lower department tiers (MHMC style).
                        </div>
                      </div>

                      <div
                        className={`${styles.layoutCard} ${config.layoutMode === 'THREE_ROWS' ? styles.layoutCardActive : ''}`}
                        onClick={() => updateConfig('layoutMode', 'THREE_ROWS')}
                      >
                        <div className={styles.layoutCardTitle}>
                          <LayoutGrid size={14} color={config.layoutMode === 'THREE_ROWS' ? '#2563eb' : '#64748b'} />
                          Three Rows
                        </div>
                        <div className={styles.layoutCardDesc}>
                          Triple-deck layout for 60+ room mega facilities.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Department Cards List */}
                <div className={styles.deptList}>
                  {config.departments.map((dept, deptIdx) => (
                    <div key={dept.id} className={styles.deptCard}>
                      <div className={styles.deptCardHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>
                            #{deptIdx + 1}
                          </span>
                          <input
                            type="text"
                            className={styles.deptNameInput}
                            value={dept.name}
                            onChange={e => {
                              const val = e.target.value;
                              setConfig(p => ({
                                ...p,
                                departments: p.departments.map(d => d.id === dept.id ? { ...d, name: val } : d)
                              }));
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          {/* Row Selector */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>ROW:</span>
                            <select
                              style={{ fontSize: 12, padding: '4px 6px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#fff' }}
                              value={dept.row || 1}
                              onChange={e => {
                                const rowVal = parseInt(e.target.value, 10);
                                setConfig(p => ({
                                  ...p,
                                  departments: p.departments.map(d => d.id === dept.id ? { ...d, row: rowVal } : d)
                                }));
                              }}
                            >
                              <option value={1}>Row 1</option>
                              <option value={2}>Row 2</option>
                              <option value={3}>Row 3</option>
                            </select>
                          </div>

                          {/* Runner Slot Checkbox */}
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={dept.hasRunner}
                              onChange={e => {
                                const checked = e.target.checked;
                                setConfig(p => ({
                                  ...p,
                                  departments: p.departments.map(d => d.id === dept.id ? { ...d, hasRunner: checked } : d)
                                }));
                              }}
                            />
                            <span>Runner Slot</span>
                          </label>

                          {dept.hasRunner && (
                            <input
                              type="text"
                              style={{ width: 100, fontSize: 12, padding: '4px 6px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#fff' }}
                              value={dept.runnerLabel || 'Charge'}
                              placeholder="Runner Label"
                              onChange={e => {
                                const val = e.target.value;
                                setConfig(p => ({
                                  ...p,
                                  departments: p.departments.map(d => d.id === dept.id ? { ...d, runnerLabel: val } : d)
                                }));
                              }}
                            />
                          )}

                          {config.departments.length > 1 && (
                            <button
                              type="button"
                              className={styles.closeBtn}
                              style={{ color: '#dc2626' }}
                              onClick={() => handleRemoveDepartment(dept.id)}
                              title="Delete Department"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Rooms Pills Row */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>
                          Operating Rooms ({dept.rooms.length}):
                        </div>
                        <div className={styles.roomPillContainer}>
                          {dept.rooms.map((room, roomIdx) => (
                            <div key={roomIdx} className={styles.roomPill}>
                              <span>Room {room}</span>
                              <span
                                className={styles.roomPillDelete}
                                onClick={() => handleRemoveRoom(dept.id, roomIdx)}
                                title="Remove Room"
                              >
                                &times;
                              </span>
                            </div>
                          ))}

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="text"
                              style={{ width: 64, fontSize: 12, padding: '3px 6px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#fff' }}
                              placeholder={`+${dept.rooms.length + 1}`}
                              value={newRoomName[dept.id] || ''}
                              onChange={e => setNewRoomName({ ...newRoomName, [dept.id]: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddRoom(dept.id);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className={styles.addRoomBtn}
                              onClick={() => handleAddRoom(dept.id)}
                            >
                              <Plus size={11} /> Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ================= STEP 4: SIDEBARS & MODULES ================= */}
            {currentStep === 4 && (
              <>
                <div className={styles.stepHeader}>
                  <h3 className={styles.stepTitle}>Clinical Sidebars & Operational Tiers</h3>
                  <p className={styles.stepDesc}>
                    Configure departure priorities, late relief buckets, in-house call roster, and bullpen holding zone.
                  </p>
                </div>

                {/* Module 1: Departure List */}
                <div className={styles.deptCard}>
                  <div className={styles.moduleCard} style={{ background: 'transparent', border: 'none', padding: 0 }}>
                    <div className={styles.moduleInfo}>
                      <span className={styles.moduleTitle}>Departure Column</span>
                      <span className={styles.moduleDesc}>
                        Right-hand departure order showing providers who leave first as cases finish.
                      </span>
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
                    <div style={{ marginTop: 8 }}>
                      <label className={styles.formLabel} style={{ marginBottom: 6 }}>Departure Section Buckets</label>
                      <div className={styles.tagPills}>
                        {config.departureSections.map((sec, idx) => (
                          <div key={idx} className={styles.tagPill}>
                            <span>{sec}</span>
                            <button
                              type="button"
                              className={styles.tagRemoveBtn}
                              onClick={() => updateConfig('departureSections', config.departureSections.filter((_, i) => i !== idx))}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className={styles.addRoomBtn}
                          onClick={() => {
                            const name = prompt('Enter new departure section:');
                            if (name && name.trim()) {
                              updateConfig('departureSections', [...config.departureSections, name.trim().toUpperCase()]);
                            }
                          }}
                        >
                          <Plus size={11} /> Add Section
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Module 2: Late Relief Buckets */}
                <div className={styles.deptCard}>
                  <div className={styles.moduleCard} style={{ background: 'transparent', border: 'none', padding: 0 }}>
                    <div className={styles.moduleInfo}>
                      <span className={styles.moduleTitle}>Late Shift Relief Buckets</span>
                      <span className={styles.moduleDesc}>
                        Categorizes late providers into afternoon OR coverage blocks (e.g. 3p Late, 4p Late, 5p Late).
                      </span>
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
                    <div style={{ marginTop: 8 }}>
                      <label className={styles.formLabel} style={{ marginBottom: 6 }}>Late Shift Relief Buckets</label>
                      <div className={styles.tagPills}>
                        {config.lateBuckets.map((bucket, idx) => (
                          <div key={idx} className={styles.tagPill}>
                            <span>{bucket}</span>
                            <button
                              type="button"
                              className={styles.tagRemoveBtn}
                              onClick={() => updateConfig('lateBuckets', config.lateBuckets.filter((_, i) => i !== idx))}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className={styles.addRoomBtn}
                          onClick={() => {
                            const name = prompt('Enter late relief bucket name (e.g. 6p Late):');
                            if (name && name.trim()) {
                              updateConfig('lateBuckets', [...config.lateBuckets, name.trim()]);
                            }
                          }}
                        >
                          <Plus size={11} /> Add Late Tier
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Module 3: Call Team */}
                <div className={styles.deptCard}>
                  <div className={styles.moduleCard} style={{ background: 'transparent', border: 'none', padding: 0 }}>
                    <div className={styles.moduleInfo}>
                      <span className={styles.moduleTitle}>In-House On-Call Team Roster</span>
                      <span className={styles.moduleDesc}>
                        Tracks clinicians assigned to overnight emergencies, OB coverage, and first/second call.
                      </span>
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

                  {config.enableCallTeam && (
                    <div style={{ marginTop: 8 }}>
                      <label className={styles.formLabel} style={{ marginBottom: 6 }}>On-Call Roles</label>
                      <div className={styles.tagPills}>
                        {config.callRoles.map((role, idx) => (
                          <div key={idx} className={styles.tagPill}>
                            <span>{role}</span>
                            <button
                              type="button"
                              className={styles.tagRemoveBtn}
                              onClick={() => updateConfig('callRoles', config.callRoles.filter((_, i) => i !== idx))}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className={styles.addRoomBtn}
                          onClick={() => {
                            const name = prompt('Enter call role name:');
                            if (name && name.trim()) {
                              updateConfig('callRoles', [...config.callRoles, name.trim()]);
                            }
                          }}
                        >
                          <Plus size={11} /> Add Call Role
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Module 4: Bullpen & Staging Drawer */}
                <div className={styles.formRow}>
                  <div className={styles.moduleCard}>
                    <div className={styles.moduleInfo}>
                      <span className={styles.moduleTitle}>Staff Bullpen</span>
                      <span className={styles.moduleDesc}>
                        Left-hand holding zone for unassigned or floating providers available for relief.
                      </span>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={config.enableBullpen}
                        onChange={e => updateConfig('enableBullpen', e.target.checked)}
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>

                  <div className={styles.moduleCard}>
                    <div className={styles.moduleInfo}>
                      <span className={styles.moduleTitle}>Collapsible Staging Drawer</span>
                      <span className={styles.moduleDesc}>
                        Bottom sliding tray to hold incoming relief and break coverage staff.
                      </span>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={config.enableDrawer}
                        onChange={e => updateConfig('enableDrawer', e.target.checked)}
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>
                </div>

                {/* Break Tracking Mode */}
                <div className={styles.deptCard}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Break Tracking Indicators on Magnet Slots</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {[
                        { id: 'BOTH', label: 'Morning 15m (B) + Lunch 30m (L)' },
                        { id: 'LUNCH_ONLY', label: 'Lunch 30m Only (L)' },
                        { id: 'NONE', label: 'No Break Indicators' }
                      ].map(b => (
                        <label
                          key={b.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: config.breakMode === b.id ? '#eff6ff' : '#ffffff',
                            border: `1.5px solid ${config.breakMode === b.id ? '#2563eb' : '#cbd5e1'}`,
                            padding: '8px 12px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: config.breakMode === b.id ? '#1e40af' : '#334155'
                          }}
                        >
                          <input
                            type="radio"
                            name="breakMode"
                            checked={config.breakMode === b.id}
                            onChange={() => updateConfig('breakMode', b.id as any)}
                          />
                          <span>{b.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ================= STEP 5: SCHEDULE & FEEDS ================= */}
            {currentStep === 5 && (
              <>
                <div className={styles.stepHeader}>
                  <h3 className={styles.stepTitle}>Schedule Architecture & Master Clinician Bench</h3>
                  <p className={styles.stepDesc}>
                    Choose between a fully standalone manual whiteboard or a managed schedule ingestion bridge.
                  </p>
                </div>

                <div className={styles.archetypeGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div
                    className={`${styles.archetypeCard} ${config.feedMode === 'MANUAL' ? styles.archetypeCardActive : ''}`}
                    onClick={() => updateConfig('feedMode', 'MANUAL')}
                  >
                    <span className={styles.archetypeTitle}>Manual Standalone Whiteboard</span>
                    <span className={styles.archetypeDesc}>
                      Charge nurses manually position staff magnets. Zero external scraper dependencies. Ideal for standalone ambulatory suites and flexible surgery centers.
                    </span>
                  </div>

                  <div
                    className={`${styles.archetypeCard} ${config.feedMode === 'MANAGED' ? styles.archetypeCardActive : ''}`}
                    onClick={() => updateConfig('feedMode', 'MANAGED')}
                  >
                    <span className={styles.archetypeTitle}>Managed Perfect Board Scraper</span>
                    <span className={styles.archetypeDesc}>
                      Automated ingestion pipeline configured and supervised by Perfect Board engineers. Syncs master scheduling rosters directly each morning at 06:00 AM.
                    </span>
                  </div>
                </div>

                {/* Master Clinician Bench */}
                <div className={styles.deptCard}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                        Master Clinician Bench ({config.sampleStaff.length} Clinicians)
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                        Active physicians and anesthetists credentialed at this facility.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className={styles.addRoomBtn}
                        onClick={() => updateConfig('sampleStaff', PRESETS.mhmc.sampleStaff)}
                      >
                        <Sparkles size={13} /> Load 8 Hospital Staff
                      </button>
                      {config.sampleStaff.length > 0 && (
                        <button
                          type="button"
                          className={styles.addRoomBtn}
                          style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                          onClick={() => updateConfig('sampleStaff', [])}
                        >
                          <Trash2 size={13} /> Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Add Provider Inline Row */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Doctor / CRNA Name"
                      style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', flex: 1, minWidth: 140 }}
                      value={newStaffName}
                      onChange={e => setNewStaffName(e.target.value)}
                    />
                    <select
                      style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                      value={newStaffRole}
                      onChange={e => setNewStaffRole(e.target.value as any)}
                    >
                      <option value="MD">MD</option>
                      <option value="CRNA">CRNA</option>
                      <option value="Resident">Resident</option>
                      <option value="SRNA">SRNA</option>
                    </select>
                    <input
                      type="text"
                      placeholder="(713) 555-0100"
                      style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', width: 130 }}
                      value={newStaffPhone}
                      onChange={e => setNewStaffPhone(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.nextBtn}
                      style={{ padding: '6px 14px', fontSize: 12 }}
                      onClick={() => {
                        if (!newStaffName.trim()) return;
                        const newEntry = {
                          id: `staff_${Date.now()}`,
                          name: newStaffName.trim(),
                          role: newStaffRole,
                          phone: newStaffPhone.trim() || '(713) 555-0100',
                          pin: '1234',
                          shift: '7a-3p'
                        };
                        updateConfig('sampleStaff', [...config.sampleStaff, newEntry]);
                        setNewStaffName('');
                        setNewStaffPhone('');
                      }}
                    >
                      <Plus size={13} /> Add Provider
                    </button>
                  </div>

                  {/* Staff Table */}
                  {config.sampleStaff.length > 0 && (
                    <div style={{ overflowX: 'auto', marginTop: 10, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '8px 12px' }}>Name</th>
                            <th style={{ padding: '8px 12px' }}>Role</th>
                            <th style={{ padding: '8px 12px' }}>Phone</th>
                            <th style={{ padding: '8px 12px' }}>Shift</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {config.sampleStaff.map(s => (
                            <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>{s.name}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{
                                  background: s.role === 'MD' ? '#dbeafe' : '#dcfce7',
                                  color: s.role === 'MD' ? '#1e40af' : '#166534',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  fontSize: 10.5,
                                  fontWeight: 800
                                }}>
                                  {s.role}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', color: '#475569' }}>{s.phone}</td>
                              <td style={{ padding: '8px 12px', color: '#64748b' }}>{s.shift}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className={styles.closeBtn}
                                  style={{ color: '#dc2626', display: 'inline-flex' }}
                                  onClick={() => updateConfig('sampleStaff', config.sampleStaff.filter(x => x.id !== s.id))}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ================= STEP 6: LIVE BOARD PREVIEW TWIN & LAUNCH ================= */}
            {currentStep === 6 && (
              <>
                <div className={styles.stepHeader}>
                  <h3 className={styles.stepTitle}>Review Board Architecture & Live Whiteboard Twin</h3>
                  <p className={styles.stepDesc}>
                    Exact visual twin of your production whiteboard layout. Test display mode and inspect generated schema.
                  </p>
                </div>

                {/* Summary Metrics Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 10, borderRadius: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Facility</span>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{config.facilityName || 'Clinical Board'}</div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#2563eb' }}>/{orgSlug}/{config.slug || 'live'}</div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 10, borderRadius: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Operating Rooms</span>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{totalRooms} Rooms</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{config.departments.length} Departments</div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 10, borderRadius: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Staffing Model</span>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{config.archetype} Archetype</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{config.allowedCredentials.join(', ')}</div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 10, borderRadius: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Operating Mode</span>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>{config.feedMode === 'MANAGED' ? 'Managed Scraper' : 'Manual Whiteboard'}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{config.startTime} Start</div>
                  </div>
                </div>

                {/* Live Board Preview Twin Card */}
                <div className={styles.previewWrapper}>
                  {/* Toolbar */}
                  <div className={styles.previewToolbar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                        Live Whiteboard Skeleton Twin
                      </span>
                      <span className={styles.lockedTag} style={{ position: 'static' }}>
                        1:1 Twin of Production Whiteboard
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div className={styles.orientationToggle}>
                        <button
                          type="button"
                          className={`${styles.orientationBtn} ${config.displayOrientation === 'LANDSCAPE' ? styles.orientationBtnActive : ''}`}
                          onClick={() => updateConfig('displayOrientation', 'LANDSCAPE')}
                        >
                          <Monitor size={12} /> Landscape
                        </button>
                        <button
                          type="button"
                          className={`${styles.orientationBtn} ${config.displayOrientation === 'PORTRAIT' ? styles.orientationBtnActive : ''}`}
                          onClick={() => updateConfig('displayOrientation', 'PORTRAIT')}
                        >
                          <Smartphone size={12} /> Portrait
                        </button>
                      </div>

                      <button
                        type="button"
                        className={styles.addRoomBtn}
                        onClick={() => setShowJsonExport(!showJsonExport)}
                      >
                        <FileText size={12} /> View Export JSON
                      </button>
                    </div>
                  </div>

                  {/* Whiteboard Twin View */}
                  {config.displayOrientation === 'PORTRAIT' ? (
                    <div className={styles.portraitFrame} style={{ margin: '16px auto' }}>
                      <div className={styles.portraitTVBezel}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Smartphone size={12} />
                          <span>PORTRAIT (9:16) &bull; WALL MOUNT</span>
                        </div>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>1080 &times; 1920</span>
                      </div>

                      <div className={styles.exactBoardPortrait}>
                        <div className={styles.exactHeader}>
                          <div className={styles.exactLogoGroup}>
                            <div className={styles.exactOrBadge}>OR</div>
                            <div>
                              <div className={styles.exactBrandText}>{config.facilityName || 'PERFECT BOARD'}</div>
                              <div className={styles.exactBrandSub}>{config.orgName} &bull; Portrait View</div>
                            </div>
                          </div>
                          <div className={styles.exactClockBadge}>
                            <Clock size={12} />
                            <span>14:30:00</span>
                          </div>
                        </div>

                        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {config.departments.map(dept => (
                            <div key={dept.id} style={{ border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
                              <div style={{ background: '#f8fafc', padding: '6px 8px', fontWeight: 800, fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                                <span>{dept.name}</span>
                                <span>{dept.rooms.length} Rooms</span>
                              </div>
                              <div style={{ padding: 6, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                                {dept.rooms.map((r, i) => (
                                  <div key={i} className={styles.exactEmptyRoom} style={{ fontSize: 10 }}>
                                    <span>OR {r}</span>
                                    <span style={{ fontSize: 9, color: '#94a3b8' }}>Ready</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.exactBoardWrapper}>
                      {/* Live Board Header */}
                      <div className={styles.exactHeader}>
                        <div className={styles.exactLogoGroup}>
                          <div className={styles.exactOrBadge}>
                            {config.facilityName ? config.facilityName.slice(0, 2).toUpperCase() : 'PB'}
                          </div>
                          <div>
                            <div className={styles.exactBrandText}>
                              {config.facilityName ? config.facilityName.toUpperCase() : 'PERFECT BOARD'}
                            </div>
                            <div className={styles.exactBrandSub}>
                              {config.orgName} &bull; {config.timezone}
                            </div>
                          </div>
                        </div>

                        <div className={styles.exactClockBadge}>
                          <Clock size={14} />
                          <span>14:30:15</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className={styles.exactViewOnlyPill}>
                            <Lock size={11} />
                            <span>View Only</span>
                          </div>
                          <button type="button" className={styles.exactLoginBtn}>
                            Login
                          </button>
                        </div>
                      </div>

                      {/* Main Board Grid */}
                      <div className={styles.exactMainGrid}>
                        {/* Bullpen Sidebar */}
                        {config.enableBullpen && (
                          <div className={styles.exactBullpen}>
                            <div className={styles.exactBullpenHeader}>
                              <div className={styles.exactBullpenTitle}>
                                <span>BULLPEN</span>
                                <span className={styles.exactCountBadge}>0</span>
                              </div>
                              <div style={{ fontSize: 9, color: '#64748b' }}>Unassigned Staff</div>
                            </div>
                            <div className={styles.exactBullpenList}>
                              <div style={{ padding: '20px 8px', fontSize: 10, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                                Bullpen Ready
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Department Matrix */}
                        <div className={styles.exactDeptWrapper}>
                          {deptRows.map((rowDepts, rIdx) => (
                            <div key={rIdx} className={deptRows.length === 1 ? styles.exactDeptRowSingle : (rIdx === 0 ? styles.exactDeptRowTop : styles.exactDeptRowBottom)}>
                              {rowDepts.map(dept => (
                                <div key={dept.id} className={styles.exactDeptCol}>
                                  <div className={styles.exactDeptHead}>
                                    <span className={styles.exactDeptName}>{dept.name}</span>
                                    <span className={styles.exactOccupancyPill}>0/{dept.rooms.length}</span>
                                  </div>

                                  {dept.hasRunner && (
                                    <div className={styles.exactRunnerSlot}>
                                      <div className={styles.exactRunnerEmptyMagnet}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: '#0284c7' }}>
                                          {dept.runnerLabel ? dept.runnerLabel.toUpperCase() : 'RUNNER'}
                                        </span>
                                        <span style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                                      </div>
                                    </div>
                                  )}

                                  <div className={styles.exactRoomList}>
                                    {dept.rooms.map((room, idx) => (
                                      <div key={idx} className={styles.exactRoomRow}>
                                        <span className={styles.exactRoomNum}>{room}</span>
                                        <div className={styles.exactEmptyRoom}>
                                          <span className={styles.exactEmptyRoomText}>Ready for assignment</span>
                                          {config.breakMode !== 'NONE' && (
                                            <div style={{ display: 'flex', gap: 2, opacity: 0.35 }}>
                                              {config.breakMode === 'BOTH' && (
                                                <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 3px', background: '#e2e8f0', borderRadius: 2 }}>B</span>
                                              )}
                                              <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 3px', background: '#e2e8f0', borderRadius: 2 }}>L</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>

                        {/* Right Sidebars */}
                        {(config.enableDepartures || config.enableCallTeam || config.enableLates) && (
                          <div className={styles.exactRightSidebars}>
                            {/* Departures */}
                            {config.enableDepartures && (
                              <div className={styles.exactDepartureCol}>
                                <div className={styles.exactSideHeader}>
                                  <span>DEPARTURES</span>
                                  <span style={{ fontSize: 9.5, color: '#64748b' }}>ORDER</span>
                                </div>
                                {config.departureSections.map((sec, sIdx) => (
                                  <div key={sIdx} className={sIdx === 0 ? styles.exactPostCallBox : styles.exactNonCallBox}>
                                    <span style={{ fontSize: 9.5, fontWeight: 800, color: sIdx === 0 ? '#e11d48' : '#2563eb' }}>
                                      {sec}
                                    </span>
                                    <div className={styles.exactSectionEmptyRow}>
                                      <span>Ready for departure order</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Call Team & Lates */}
                            {(config.enableCallTeam || config.enableLates) && (
                              <div className={styles.exactDepartureCol} style={{ width: 145 }}>
                                {config.enableCallTeam && (
                                  <div className={styles.exactCallTeamBox}>
                                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#0f172a' }}>
                                      CALL TEAM
                                    </span>
                                    {config.callRoles.map((role, cIdx) => (
                                      <div key={cIdx} style={{ fontSize: 9.5, color: '#475569', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                        <strong>{role}</strong>
                                        <span style={{ color: '#94a3b8' }}>--</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {config.enableLates && (
                                  <div className={styles.exactCallTeamBox} style={{ marginTop: 8 }}>
                                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#0f172a' }}>
                                      LATE RELIEF
                                    </span>
                                    {config.lateBuckets.map((bucket, lIdx) => (
                                      <div key={lIdx} style={{ fontSize: 9.5, color: '#475569', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                        <span>{bucket}</span>
                                        <span style={{ color: '#94a3b8' }}>0</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* JSON Export Drawer */}
                  {showJsonExport && (
                    <div style={{ padding: '16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          Generated Board Configuration Schema (PostgreSQL / Supabase Ready)
                        </span>
                        <button
                          type="button"
                          className={styles.addRoomBtn}
                          style={{ background: copiedJson ? '#16a34a' : '#2563eb', color: '#fff', borderColor: 'transparent' }}
                          onClick={handleCopyJson}
                        >
                          {copiedJson ? <Check size={12} /> : <Download size={12} />}
                          {copiedJson ? 'Copied!' : 'Copy Schema'}
                        </button>
                      </div>
                      <div className={styles.jsonBlock}>
                        {JSON.stringify(config, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className={styles.wizardFooter}>
          <div className={styles.footerLeft}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setCurrentStep(prev => prev - 1)}
              disabled={currentStep === 1}
            >
              <ArrowLeft size={14} />
              Back
            </button>
          </div>

          <div className={styles.stepIndicatorText}>
            Step {currentStep} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep - 1].label}
          </div>

          <div className={styles.footerRight}>
            {currentStep < WIZARD_STEPS.length ? (
              <button
                type="button"
                className={styles.nextBtn}
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={currentStep === 1 && (!config.facilityName.trim() || !config.slug.trim())}
              >
                Next Step
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                className={styles.launchBtn}
                onClick={handleLaunch}
              >
                <CheckCircle2 size={16} />
                🚀 Launch Facility Board
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
