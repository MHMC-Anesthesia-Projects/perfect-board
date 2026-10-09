'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from './superuser.module.css';
import {
  Building2, Hospital, Layout, Layers, ShieldCheck, Key, RefreshCw,
  Search, Filter, Plus, Trash2, Edit3, ExternalLink, ArrowRight,
  ArrowLeft, CheckCircle2, AlertCircle, Monitor, Smartphone, Users,
  Sparkles, Radio, Check, X, Database, Globe, Sliders, ChevronRight,
  Cpu, Zap, FileCode
} from 'lucide-react';

// --- DATA TYPES ---
interface OrgAccount {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  tier: 'Enterprise' | 'Professional' | 'Pilot';
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
  feedType: string;
  rovingStaffEnabled: boolean;
  createdDate: string;
}

interface FacilityAccount {
  id: string;
  orgId: string;
  name: string;
  code: string;
  timezone: string;
  city: string;
  scraperFacilityId: string;
  roomCount: number;
}

interface BoardAccount {
  id: string;
  facilityId: string;
  orgId: string;
  title: string;
  slug: string;
  displayOrientation: 'LANDSCAPE' | 'PORTRAIT';
  layoutMode: 'AUTO' | 'SINGLE_ROW' | 'TWO_ROWS' | 'THREE_ROWS';
  departmentsCount: number;
  roomCount: number;
  activeRunners: number;
  updatedAt: string;
}

interface DataFeedConfig {
  id: string;
  name: string;
  type: string;
  orgId: string;
  endpoint: string;
  status: 'HEALTHY' | 'SYNCING' | 'ERROR';
  lastSync: string;
  schedule: string;
  roomsMapped: number;
}

// --- INITIAL MOCK DATA ---
const INITIAL_ORGS: OrgAccount[] = [
  {
    id: 'org-mhmc',
    name: 'Metro Health Anesthesia Partners',
    slug: 'mhmc-anesthesia',
    contactEmail: 'admin@metroanesthesia.org',
    tier: 'Enterprise',
    status: 'ACTIVE',
    feedType: 'OneUSAP Automated Feed',
    rovingStaffEnabled: true,
    createdDate: '2025-01-15'
  },
  {
    id: 'org-summit',
    name: 'Summit Surgical Alliance',
    slug: 'summit-surgery',
    contactEmail: 'operations@summitsurgery.com',
    tier: 'Enterprise',
    status: 'ACTIVE',
    feedType: 'Epic HL7 SIU Direct',
    rovingStaffEnabled: true,
    createdDate: '2025-03-22'
  },
  {
    id: 'org-valley',
    name: 'Valley Regional Health',
    slug: 'valley-health',
    contactEmail: 'director@valleyhealth.net',
    tier: 'Professional',
    status: 'ACTIVE',
    feedType: 'Cerner SurgiNet Interface',
    rovingStaffEnabled: false,
    createdDate: '2025-06-10'
  },
  {
    id: 'org-pacific',
    name: 'Pacific Anesthesia Group',
    slug: 'pacific-anes',
    contactEmail: 'contact@pacificanesthesia.org',
    tier: 'Pilot',
    status: 'TRIAL',
    feedType: 'Manual / CSV Scraper',
    rovingStaffEnabled: true,
    createdDate: '2026-08-01'
  }
];

const INITIAL_FACILITIES: FacilityAccount[] = [
  {
    id: 'fac-mhmc-main',
    orgId: 'org-mhmc',
    name: 'Memorial Hermann Main Hospital',
    code: 'MHMC-MAIN',
    timezone: 'Central Time (US & Canada)',
    city: 'Houston, TX',
    scraperFacilityId: 'USAP-TX-1049',
    roomCount: 24
  },
  {
    id: 'fac-mhmc-west',
    orgId: 'org-mhmc',
    name: 'West Pavilion Surgery Center',
    code: 'MHMC-WEST',
    timezone: 'Central Time (US & Canada)',
    city: 'Houston, TX',
    scraperFacilityId: 'USAP-TX-1050',
    roomCount: 12
  },
  {
    id: 'fac-mhmc-endo',
    orgId: 'org-mhmc',
    name: 'Memorial Hermann Endoscopy Suite',
    code: 'MHMC-ENDO',
    timezone: 'Central Time (US & Canada)',
    city: 'Houston, TX',
    scraperFacilityId: 'USAP-TX-1051',
    roomCount: 6
  },
  {
    id: 'fac-summit-main',
    orgId: 'org-summit',
    name: 'Summit Regional Medical Center',
    code: 'SUMMIT-MED',
    timezone: 'Eastern Time (US & Canada)',
    city: 'Atlanta, GA',
    scraperFacilityId: 'EPIC-GA-002',
    roomCount: 18
  },
  {
    id: 'fac-summit-asc',
    orgId: 'org-summit',
    name: 'Summit Ambulatory Surgery Center',
    code: 'SUMMIT-ASC',
    timezone: 'Eastern Time (US & Canada)',
    city: 'Alpharetta, GA',
    scraperFacilityId: 'EPIC-GA-005',
    roomCount: 8
  },
  {
    id: 'fac-valley-main',
    orgId: 'org-valley',
    name: 'Valley Regional Hospital',
    code: 'VALLEY-HOSP',
    timezone: 'Central Time (US & Canada)',
    city: 'McAllen, TX',
    scraperFacilityId: 'CERN-TX-881',
    roomCount: 14
  }
];

const INITIAL_BOARDS: BoardAccount[] = [
  {
    id: 'brd-1',
    facilityId: 'fac-mhmc-main',
    orgId: 'org-mhmc',
    title: 'Main OR Master Whiteboard',
    slug: 'main-or',
    displayOrientation: 'LANDSCAPE',
    layoutMode: 'AUTO',
    departmentsCount: 8,
    roomCount: 24,
    activeRunners: 3,
    updatedAt: 'Today at 14:45'
  },
  {
    id: 'brd-2',
    facilityId: 'fac-mhmc-west',
    orgId: 'org-mhmc',
    title: 'West Pavilion Hallway Display (Portrait)',
    slug: 'west-hallway-tv',
    displayOrientation: 'PORTRAIT',
    layoutMode: 'TWO_ROWS',
    departmentsCount: 3,
    roomCount: 12,
    activeRunners: 1,
    updatedAt: 'Today at 13:12'
  },
  {
    id: 'brd-3',
    facilityId: 'fac-mhmc-endo',
    orgId: 'org-mhmc',
    title: 'Endoscopy Procedure Board',
    slug: 'endo-suite',
    displayOrientation: 'LANDSCAPE',
    layoutMode: 'SINGLE_ROW',
    departmentsCount: 1,
    roomCount: 6,
    activeRunners: 0,
    updatedAt: 'Yesterday'
  },
  {
    id: 'brd-4',
    facilityId: 'fac-summit-main',
    orgId: 'org-summit',
    title: 'Summit OR Master Board (Two Rows)',
    slug: 'summit-master',
    displayOrientation: 'LANDSCAPE',
    layoutMode: 'TWO_ROWS',
    departmentsCount: 4,
    roomCount: 18,
    activeRunners: 2,
    updatedAt: 'Today at 11:20'
  },
  {
    id: 'brd-5',
    facilityId: 'fac-summit-asc',
    orgId: 'org-summit',
    title: 'Summit Ambulatory Kiosk (Portrait)',
    slug: 'summit-asc-tv',
    displayOrientation: 'PORTRAIT',
    layoutMode: 'AUTO',
    departmentsCount: 2,
    roomCount: 8,
    activeRunners: 1,
    updatedAt: 'Oct 06, 2026'
  }
];

const INITIAL_FEEDS: DataFeedConfig[] = [
  {
    id: 'feed-1',
    name: 'OneUSAP Automated Scraper Feed (Texas ORs)',
    type: 'Automated Headless Scraper',
    orgId: 'org-mhmc',
    endpoint: 'https://feed.perfectboard.io/scrapers/oneusap-live',
    status: 'HEALTHY',
    lastSync: '2 minutes ago',
    schedule: 'Every 5 mins (05:00 - 19:00)',
    roomsMapped: 42
  },
  {
    id: 'feed-2',
    name: 'Epic HL7 SIU Direct Integration',
    type: 'HL7 v2.5 / FHIR Inbound Feed',
    orgId: 'org-summit',
    endpoint: 'https://feed.perfectboard.io/hl7/summit-webhook',
    status: 'HEALTHY',
    lastSync: 'Just now',
    schedule: 'Real-time Event Push',
    roomsMapped: 26
  },
  {
    id: 'feed-3',
    name: 'Cerner SurgiNet Daily Schedule Importer',
    type: 'REST API Sync',
    orgId: 'org-valley',
    endpoint: 'https://feed.perfectboard.io/cerner/valley-sync',
    status: 'HEALTHY',
    lastSync: '25 minutes ago',
    schedule: 'Hourly',
    roomsMapped: 14
  }
];

// --- SAMPLE DATA FOR AI FEED NORMALIZER SANDBOX ---
const AI_FEED_SAMPLES = {
  oneusap: {
    name: 'OneUSAP QGenda Portal (HTML Dump)',
    sourceType: 'Headless Web Scraper',
    rawPayload: `<!-- Raw Scraped HTML from OneUSAP Live Portal (Truncated Row Segment) -->
<tr class="sch-row" data-fac="W: MHMC">
  <td class="prov">CavanaughMar [P]</td>
  <td class="shift">8h_MHMC (7a-3p)</td>
  <td class="task">OR 4</td>
  <td class="phone">(713) 555-0192</td>
</tr>
<tr class="sch-row" data-fac="W: MHMC">
  <td class="prov">SmithJac [C]</td>
  <td class="shift">13h_MHMC (7a-8p) L1</td>
  <td class="task">OR 4</td>
  <td class="phone">(713) 555-0144</td>
</tr>
<tr class="sch-row" data-fac="W: MHMC">
  <td class="prov">BrodyMar [C]</td>
  <td class="shift">10h_MHMC (7a-5p) 5p LATE</td>
  <td class="task">5p Late Relief</td>
  <td class="phone">(713) 555-0188</td>
</tr>
<tr class="sch-row" data-fac="W: MHMC">
  <td class="prov">PatelPur [P]</td>
  <td class="shift">8h_MHMC (7a-3p)</td>
  <td class="task">OB CALL TEAM</td>
  <td class="phone">(713) 555-0131</td>
</tr>`,
    canonicalJson: [
      {
        provider: { rawId: "cavanaughmar", name: "CAVANAUGH M.", credential: "MD", role: "ATTENDING", phone: "(713) 555-0192" },
        shift: { start: "07:00", end: "15:00", durationHours: 8, lateTier: null, isCall: false },
        target: { facilityCode: "MHMC", roomName: "OR 4", isRunner: false, callRole: null }
      },
      {
        provider: { rawId: "smithjac", name: "SMITH J.", credential: "CRNA", role: "CRNA", phone: "(713) 555-0144" },
        shift: { start: "07:00", end: "20:00", durationHours: 13, lateTier: "7p Late (L1)", isCall: false },
        target: { facilityCode: "MHMC", roomName: "OR 4", isRunner: false, callRole: null }
      },
      {
        provider: { rawId: "brodymar", name: "BRODY M.", credential: "CRNA", role: "CRNA", phone: "(713) 555-0188" },
        shift: { start: "07:00", end: "17:00", durationHours: 10, lateTier: "5p Late", isCall: false },
        target: { facilityCode: "MHMC", roomName: null, isRunner: false, callRole: null }
      },
      {
        provider: { rawId: "patelpur", name: "PATEL P.", credential: "MD", role: "ATTENDING", phone: "(713) 555-0131" },
        shift: { start: "07:00", end: "15:00", durationHours: 8, lateTier: null, isCall: true },
        target: { facilityCode: "MHMC", roomName: null, isRunner: false, callRole: "OB" }
      }
    ],
    boardPlacements: [
      { target: "Main OR 4 Room Slot", detail: "Assigned Dr. Cavanaugh (Attending MD) + Jacqueline Smith (CRNA)" },
      { target: "7p Late Sidebar Queue", detail: "Added Jacqueline Smith (CRNA) • L1 7p Tier" },
      { target: "5p Late Sidebar Queue", detail: "Added Marcus Brody (CRNA) • 5p Tier" },
      { target: "Call Team Sidebar", detail: "Purvi Patel (MD) assigned to OB On-Call Badge" }
    ]
  },
  epic: {
    name: 'Epic Cadence / OpTime (HL7 SIU v2.5)',
    sourceType: 'Inbound Webhook Push',
    rawPayload: `MSH|^~\\&|EPIC_OPTIME|SUMMIT_HEALTH|PERFECTBOARD|202610080615||SIU^S12|MSG-99201|P|2.5
PID|||MRN-449102||DOE^JOHN
SCH|104081|||||OR-12^WEST_PAV|0700^1500|Dr. Chen, Sarah MD^ATTENDING
RGS|1|A
AIG|1|A|CHEN^SARAH^MD|ATTN|||202610080700|202610081500
AIG|2|A|RODRIGUEZ^CARLOS^CRNA|STAFF|||202610080700|202610081900|LATE_7P`,
    canonicalJson: [
      {
        provider: { rawId: "CHEN_SARAH_MD", name: "CHEN S.", credential: "MD", role: "ATTENDING", phone: "(404) 555-0182" },
        shift: { start: "07:00", end: "15:00", durationHours: 8, lateTier: null, isCall: false },
        target: { facilityCode: "SUMMIT-MED", roomName: "OR-12", isRunner: false, callRole: null }
      },
      {
        provider: { rawId: "RODRIGUEZ_CARLOS_CRNA", name: "RODRIGUEZ C.", credential: "CRNA", role: "CRNA", phone: "(404) 555-0199" },
        shift: { start: "07:00", end: "19:00", durationHours: 12, lateTier: "7p Late", isCall: false },
        target: { facilityCode: "SUMMIT-MED", roomName: "OR-12", isRunner: false, callRole: null }
      }
    ],
    boardPlacements: [
      { target: "West Pavilion OR 12", detail: "Assigned Dr. Sarah Chen (MD) + Carlos Rodriguez (CRNA)" },
      { target: "7p Late Queue", detail: "Carlos Rodriguez (CRNA) tagged for 19:00 departure" }
    ]
  },
  cerner: {
    name: 'Cerner SurgiNet Schedule (REST / CSV)',
    sourceType: 'Scheduled REST API Pull',
    rawPayload: `"ProviderName","Credential","ShiftCode","StartTime","EndTime","AssignedSuite","CallTag"
"Hiller, Kenneth","MD","8H-DAY","06:30","15:00","VALLEY-OR-1","CV_FIRST"
"Schroedter, Timothy","CRNA","12H-LATE","06:30","18:30","VALLEY-OR-1",""
"Gunn, Clinton","MD","8H-RUNNER","07:00","15:00","RUNNER_MAIN",""`,
    canonicalJson: [
      {
        provider: { rawId: "HILLER_K", name: "HILLER K.", credential: "MD", role: "ATTENDING", phone: "(956) 555-0104" },
        shift: { start: "06:30", end: "15:00", durationHours: 8.5, lateTier: null, isCall: true },
        target: { facilityCode: "VALLEY-HOSP", roomName: "VALLEY-OR-1", isRunner: false, callRole: "CV" }
      },
      {
        provider: { rawId: "SCHROEDTER_T", name: "SCHROEDTER T.", credential: "CRNA", role: "CRNA", phone: "(956) 555-0177" },
        shift: { start: "06:30", end: "18:30", durationHours: 12, lateTier: "6p Late", isCall: false },
        target: { facilityCode: "VALLEY-HOSP", roomName: "VALLEY-OR-1", isRunner: false, callRole: null }
      },
      {
        provider: { rawId: "GUNN_C", name: "GUNN C.", credential: "MD", role: "ATTENDING", phone: "(956) 555-0122" },
        shift: { start: "07:00", end: "15:00", durationHours: 8, lateTier: null, isCall: false },
        target: { facilityCode: "VALLEY-HOSP", roomName: null, isRunner: true, callRole: null }
      }
    ],
    boardPlacements: [
      { target: "Valley OR 1", detail: "Assigned Dr. Kenneth Hiller (MD) + Timothy Schroedter (CRNA)" },
      { target: "Main Runner Magnet Slot", detail: "Dr. Clinton Gunn assigned to Main Floor Runner" },
      { target: "CV Call Badge", detail: "Dr. Kenneth Hiller assigned to Cardiovascular Call" }
    ]
  }
};

export default function SuperuserAdminPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'ORGS' | 'FACILITIES' | 'BOARDS' | 'FEEDS' | 'POLICIES'>('ORGS');

  // Interactive Feed Sandbox state
  const [sandboxFeedKey, setSandboxFeedKey] = useState<'oneusap' | 'epic' | 'cerner'>('oneusap');
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateNormalize = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      showToast(`AI Pipeline: Normalized & validated ${AI_FEED_SAMPLES[sandboxFeedKey].canonicalJson.length} provider assignments for ${AI_FEED_SAMPLES[sandboxFeedKey].name}.`);
    }, 400);
  };

  // Master In-Memory State
  const [orgs, setOrgs] = useState<OrgAccount[]>(INITIAL_ORGS);
  const [facilities, setFacilities] = useState<FacilityAccount[]>(INITIAL_FACILITIES);
  const [boards, setBoards] = useState<BoardAccount[]>(INITIAL_BOARDS);
  const [feeds, setFeeds] = useState<DataFeedConfig[]>(INITIAL_FEEDS);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOrgId, setFilterOrgId] = useState<string>('ALL');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Modals state
  const [isAddOrgOpen, setIsAddOrgOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrgAccount | null>(null);

  const [isAddFacilityOpen, setIsAddFacilityOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<FacilityAccount | null>(null);

  const [isAddBoardOpen, setIsAddBoardOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<BoardAccount | null>(null);

  // Delete Confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'ORG' | 'FACILITY' | 'BOARD';
    id: string;
    name: string;
    warningText?: string;
  } | null>(null);

  const [orgForm, setOrgForm] = useState<{
    name: string;
    slug: string;
    contactEmail: string;
    tier: 'Enterprise' | 'Professional' | 'Pilot';
    feedType: string;
    rovingStaffEnabled: boolean;
  }>({
    name: '',
    slug: '',
    contactEmail: '',
    tier: 'Enterprise',
    feedType: 'OneUSAP Automated Feed',
    rovingStaffEnabled: true
  });

  const [facilityForm, setFacilityForm] = useState({
    orgId: '',
    name: '',
    code: '',
    timezone: 'Central Time (US & Canada)',
    city: '',
    scraperFacilityId: '',
    roomCount: 12
  });

  const [boardForm, setBoardForm] = useState({
    orgId: '',
    facilityId: '',
    title: '',
    slug: '',
    displayOrientation: 'LANDSCAPE' as 'LANDSCAPE' | 'PORTRAIT',
    layoutMode: 'AUTO' as 'AUTO' | 'SINGLE_ROW' | 'TWO_ROWS' | 'THREE_ROWS',
    departmentsCount: 4,
    roomCount: 16
  });

  // --- DERIVED METRICS ---
  const totalOrgs = orgs.length;
  const totalFacilities = facilities.length;
  const totalBoards = boards.length;
  const portraitBoardsCount = boards.filter(b => b.displayOrientation === 'PORTRAIT').length;
  const landscapeBoardsCount = boards.filter(b => b.displayOrientation === 'LANDSCAPE').length;
  const totalRoomsConfigured = facilities.reduce((sum, f) => sum + f.roomCount, 0);

  // Filtered Lists
  const filteredOrgs = useMemo(() => {
    return orgs.filter(o => {
      const matchSearch = o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.contactEmail.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [orgs, searchQuery]);

  const filteredFacilities = useMemo(() => {
    return facilities.filter(f => {
      const matchOrg = filterOrgId === 'ALL' || f.orgId === filterOrgId;
      const matchSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.city.toLowerCase().includes(searchQuery.toLowerCase());
      return matchOrg && matchSearch;
    });
  }, [facilities, filterOrgId, searchQuery]);

  const filteredBoards = useMemo(() => {
    return boards.filter(b => {
      const matchOrg = filterOrgId === 'ALL' || b.orgId === filterOrgId;
      const matchSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.slug.toLowerCase().includes(searchQuery.toLowerCase());
      return matchOrg && matchSearch;
    });
  }, [boards, filterOrgId, searchQuery]);

  // --- ORG ACTIONS ---
  const handleOpenAddOrg = () => {
    setOrgForm({
      name: '',
      slug: '',
      contactEmail: '',
      tier: 'Enterprise',
      feedType: 'OneUSAP Automated Feed',
      rovingStaffEnabled: true
    });
    setIsAddOrgOpen(true);
  };

  const handleSaveOrg = () => {
    if (!orgForm.name.trim()) return;
    const slug = orgForm.slug.trim() || orgForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (editingOrg) {
      setOrgs(prev => prev.map(o => o.id === editingOrg.id ? {
        ...o,
        ...orgForm,
        slug
      } : o));
      showToast(`Updated organization "${orgForm.name}"`);
      setEditingOrg(null);
    } else {
      const newOrg: OrgAccount = {
        id: `org-${Date.now()}`,
        name: orgForm.name,
        slug,
        contactEmail: orgForm.contactEmail || 'admin@' + slug + '.com',
        tier: orgForm.tier,
        status: 'ACTIVE',
        feedType: orgForm.feedType,
        rovingStaffEnabled: orgForm.rovingStaffEnabled,
        createdDate: new Date().toISOString().split('T')[0]
      };
      setOrgs(prev => [...prev, newOrg]);
      showToast(`Created organization "${newOrg.name}"`);
      setIsAddOrgOpen(false);
    }
  };

  const handleOpenEditOrg = (org: OrgAccount) => {
    setEditingOrg(org);
    setOrgForm({
      name: org.name,
      slug: org.slug,
      contactEmail: org.contactEmail,
      tier: org.tier,
      feedType: org.feedType,
      rovingStaffEnabled: org.rovingStaffEnabled
    });
  };

  const handleDeleteOrg = (org: OrgAccount) => {
    const childFacs = facilities.filter(f => f.orgId === org.id);
    const childBoards = boards.filter(b => b.orgId === org.id);
    setDeleteConfirm({
      type: 'ORG',
      id: org.id,
      name: org.name,
      warningText: childFacs.length > 0 || childBoards.length > 0
        ? `Warning: Deleting this organization will also delete ${childFacs.length} facility/facilities and ${childBoards.length} board(s)!`
        : undefined
    });
  };

  // --- FACILITY ACTIONS ---
  const handleOpenAddFacility = (prefillOrgId?: string) => {
    setFacilityForm({
      orgId: prefillOrgId || (orgs[0]?.id || ''),
      name: '',
      code: '',
      timezone: 'Central Time (US & Canada)',
      city: '',
      scraperFacilityId: '',
      roomCount: 12
    });
    setIsAddFacilityOpen(true);
  };

  const handleSaveFacility = () => {
    if (!facilityForm.name.trim()) return;
    const code = facilityForm.code.trim() || facilityForm.name.slice(0, 4).toUpperCase();
    if (editingFacility) {
      setFacilities(prev => prev.map(f => f.id === editingFacility.id ? {
        ...f,
        ...facilityForm,
        code
      } : f));
      showToast(`Updated facility "${facilityForm.name}"`);
      setEditingFacility(null);
    } else {
      const newFacility: FacilityAccount = {
        id: `fac-${Date.now()}`,
        orgId: facilityForm.orgId || orgs[0]?.id,
        name: facilityForm.name,
        code,
        timezone: facilityForm.timezone,
        city: facilityForm.city || 'Hospital Campus',
        scraperFacilityId: facilityForm.scraperFacilityId || `FEED-${Date.now().toString().slice(-4)}`,
        roomCount: Number(facilityForm.roomCount) || 12
      };
      setFacilities(prev => [...prev, newFacility]);
      showToast(`Added facility "${newFacility.name}"`);
      setIsAddFacilityOpen(false);
    }
  };

  const handleOpenEditFacility = (fac: FacilityAccount) => {
    setEditingFacility(fac);
    setFacilityForm({
      orgId: fac.orgId,
      name: fac.name,
      code: fac.code,
      timezone: fac.timezone,
      city: fac.city,
      scraperFacilityId: fac.scraperFacilityId,
      roomCount: fac.roomCount
    });
  };

  const handleDeleteFacility = (fac: FacilityAccount) => {
    const childBoards = boards.filter(b => b.facilityId === fac.id);
    setDeleteConfirm({
      type: 'FACILITY',
      id: fac.id,
      name: fac.name,
      warningText: childBoards.length > 0
        ? `Warning: Deleting this facility will also delete ${childBoards.length} live whiteboard(s)!`
        : undefined
    });
  };

  // --- BOARD ACTIONS ---
  const handleOpenAddBoard = (prefillFacId?: string) => {
    const targetFac = facilities.find(f => f.id === prefillFacId) || facilities[0];
    setBoardForm({
      orgId: targetFac?.orgId || orgs[0]?.id || '',
      facilityId: targetFac?.id || '',
      title: '',
      slug: '',
      displayOrientation: 'LANDSCAPE',
      layoutMode: 'AUTO',
      departmentsCount: 4,
      roomCount: targetFac?.roomCount || 16
    });
    setIsAddBoardOpen(true);
  };

  const handleSaveBoard = () => {
    if (!boardForm.title.trim()) return;
    const slug = boardForm.slug.trim() || boardForm.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (editingBoard) {
      setBoards(prev => prev.map(b => b.id === editingBoard.id ? {
        ...b,
        ...boardForm,
        slug
      } : b));
      showToast(`Updated board "${boardForm.title}"`);
      setEditingBoard(null);
    } else {
      const newBoard: BoardAccount = {
        id: `brd-${Date.now()}`,
        orgId: boardForm.orgId || orgs[0]?.id,
        facilityId: boardForm.facilityId || facilities[0]?.id,
        title: boardForm.title,
        slug,
        displayOrientation: boardForm.displayOrientation,
        layoutMode: boardForm.layoutMode,
        departmentsCount: Number(boardForm.departmentsCount) || 4,
        roomCount: Number(boardForm.roomCount) || 16,
        activeRunners: 1,
        updatedAt: 'Just now'
      };
      setBoards(prev => [...prev, newBoard]);
      showToast(`Created board "${newBoard.title}"`);
      setIsAddBoardOpen(false);
    }
  };

  const handleDuplicateBoard = (board: BoardAccount) => {
    const clone: BoardAccount = {
      ...board,
      id: `brd-${Date.now()}`,
      title: `${board.title} (Copy)`,
      slug: `${board.slug}-copy`,
      updatedAt: 'Just now'
    };
    setBoards(prev => [...prev, clone]);
    showToast(`Duplicated "${board.title}"`);
  };

  const handleDeleteBoard = (board: BoardAccount) => {
    setDeleteConfirm({
      type: 'BOARD',
      id: board.id,
      name: board.title
    });
  };

  // --- CONFIRM DELETE EXECUTION ---
  const handleExecuteDelete = () => {
    if (!deleteConfirm) return;
    const { type, id, name } = deleteConfirm;
    if (type === 'ORG') {
      setOrgs(prev => prev.filter(o => o.id !== id));
      setFacilities(prev => prev.filter(f => f.orgId !== id));
      setBoards(prev => prev.filter(b => b.orgId !== id));
      showToast(`Deleted organization "${name}" and all associated facilities & boards.`);
    } else if (type === 'FACILITY') {
      setFacilities(prev => prev.filter(f => f.id !== id));
      setBoards(prev => prev.filter(b => b.facilityId !== id));
      showToast(`Deleted facility "${name}" and its boards.`);
    } else if (type === 'BOARD') {
      setBoards(prev => prev.filter(b => b.id !== id));
      showToast(`Deleted board "${name}".`);
    }
    setDeleteConfirm(null);
  };

  // Test feed connection
  const handleTestFeed = (feed: DataFeedConfig) => {
    showToast(`Syncing feed "${feed.name}"... Connected! 24 rooms updated.`);
  };

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <header className={styles.topNav}>
        <div className={styles.brandGroup}>
          <div className={styles.superuserBadge}>
            <Key size={13} />
            Root Superuser
          </div>
          <div>
            <div className={styles.brandTitle}>Multi-Tenant Superuser Admin Console</div>
            <div className={styles.brandSubtitle}>Manage Organization Accounts, Facilities, Whiteboard Displays & Data Feeds</div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Link href="/board-builder-mockup" className={styles.backBtn}>
            <ArrowLeft size={14} /> Back to Board Builder Wizard
          </Link>
          <button type="button" className={styles.primaryBtn} onClick={handleOpenAddOrg}>
            <Plus size={15} /> Add New Organization
          </button>
        </div>
      </header>

      {/* Environment Sandbox Banner */}
      <div className={styles.mockupBanner}>
        <div className={styles.mockupBannerLeft}>
          <span className={styles.mockupBannerBadge}>Mockup Sandbox</span>
          <span>
            This console operates entirely in-memory within <code>src/app/board-builder-mockup/superuser/</code>. Add, edit, and delete operations simulate the enterprise multi-tenant PostgreSQL schema with zero database persistence.
          </span>
        </div>
        <Link href="/board-builder-mockup" style={{ color: '#1e40af', fontWeight: 600, textDecoration: 'underline' }}>
          Open Board Builder Preview
        </Link>
      </div>

      <div className={styles.mainContent}>
        {/* Metric Overview Cards */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Organizations</span>
              <div className={styles.metricIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Building2 size={18} />
              </div>
            </div>
            <div className={styles.metricValue}>{totalOrgs}</div>
            <div className={styles.metricSubtext}>Client tenants active</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Operating Facilities</span>
              <div className={styles.metricIcon} style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <Hospital size={18} />
              </div>
            </div>
            <div className={styles.metricValue}>{totalFacilities}</div>
            <div className={styles.metricSubtext}>Across {totalOrgs} health networks</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Live Whiteboards</span>
              <div className={styles.metricIcon} style={{ background: '#faf5ff', color: '#9333ea' }}>
                <Layout size={18} />
              </div>
            </div>
            <div className={styles.metricValue}>{totalBoards}</div>
            <div className={styles.metricSubtext}>{landscapeBoardsCount} Landscape • {portraitBoardsCount} Portrait</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Configured OR Rooms</span>
              <div className={styles.metricIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
                <Layers size={18} />
              </div>
            </div>
            <div className={styles.metricValue}>{totalRoomsConfigured}</div>
            <div className={styles.metricSubtext}>Active surgical suites</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Active Data Feeds</span>
              <div className={styles.metricIcon} style={{ background: '#ecfeff', color: '#0891b2' }}>
                <Radio size={18} />
              </div>
            </div>
            <div className={styles.metricValue}>{feeds.length}</div>
            <div className={styles.metricSubtext}>100% Healthy Sync</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabsList}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'ORGS' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('ORGS')}
            >
              <Building2 size={16} />
              <span>Organizations</span>
              <span className={styles.tabBadge}>{orgs.length}</span>
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'FACILITIES' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('FACILITIES')}
            >
              <Hospital size={16} />
              <span>Facilities & Locations</span>
              <span className={styles.tabBadge}>{facilities.length}</span>
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'BOARDS' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('BOARDS')}
            >
              <Layout size={16} />
              <span>Whiteboards & Displays</span>
              <span className={styles.tabBadge}>{boards.length}</span>
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'FEEDS' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('FEEDS')}
            >
              <Radio size={16} />
              <span>Scraper & Data Feeds</span>
              <span className={styles.tabBadge}>{feeds.length}</span>
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'POLICIES' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('POLICIES')}
            >
              <ShieldCheck size={16} />
              <span>Roving Staff & Policies</span>
            </button>
          </div>

          {/* Quick Context Action */}
          {activeTab === 'ORGS' && (
            <button type="button" className={styles.textBtnPrimary} onClick={handleOpenAddOrg}>
              <Plus size={14} /> Add Organization
            </button>
          )}
          {activeTab === 'FACILITIES' && (
            <button type="button" className={styles.textBtnPrimary} onClick={() => handleOpenAddFacility()}>
              <Plus size={14} /> Add Facility
            </button>
          )}
          {activeTab === 'BOARDS' && (
            <button type="button" className={styles.textBtnPrimary} onClick={() => handleOpenAddBoard()}>
              <Plus size={14} /> Create Board
            </button>
          )}
        </div>

        {/* Tab Content Box */}
        <div className={styles.tabContentCard}>
          {/* Universal Toolbar (Search & Filter) */}
          <div className={styles.toolbar}>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder={
                  activeTab === 'ORGS' ? 'Search organizations by name or slug...' :
                  activeTab === 'FACILITIES' ? 'Search facilities by hospital name or code...' :
                  'Search whiteboards...'
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {activeTab !== 'ORGS' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Filter by Org:</span>
                <select
                  className={styles.filterSelect}
                  value={filterOrgId}
                  onChange={e => setFilterOrgId(e.target.value)}
                >
                  <option value="ALL">All Organizations ({orgs.length})</option>
                  {orgs.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ================= TAB 1: ORGANIZATIONS ================= */}
          {activeTab === 'ORGS' && (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Organization / Tenant</th>
                    <th>Slug / Route</th>
                    <th>Facilities</th>
                    <th>Live Boards</th>
                    <th>Subscription Tier</th>
                    <th>Data Feed Source</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.map(org => {
                    const orgFacs = facilities.filter(f => f.orgId === org.id);
                    const orgBoards = boards.filter(b => b.orgId === org.id);
                    return (
                      <tr key={org.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{org.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{org.contactEmail}</div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                            /{org.slug}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.textBtn}
                            onClick={() => {
                              setFilterOrgId(org.id);
                              setActiveTab('FACILITIES');
                            }}
                            title="View facilities for this org"
                          >
                            <Hospital size={13} color="#2563eb" />
                            <strong>{orgFacs.length}</strong> Facilities
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.textBtn}
                            onClick={() => {
                              setFilterOrgId(org.id);
                              setActiveTab('BOARDS');
                            }}
                            title="View boards for this org"
                          >
                            <Layout size={13} color="#9333ea" />
                            <strong>{orgBoards.length}</strong> Boards
                          </button>
                        </td>
                        <td>
                          <span className={`${styles.tierBadge} ${org.tier === 'Enterprise' ? styles.tierEnterprise : ''}`}>
                            {org.tier}
                          </span>
                        </td>
                        <td>
                          <span className={styles.feedBadge}>
                            <Radio size={12} />
                            {org.feedType}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${
                            org.status === 'ACTIVE' ? styles.statusActive :
                            org.status === 'TRIAL' ? styles.statusTrial : styles.statusSuspended
                          }`}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                            {org.status}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionBtns} style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              onClick={() => handleOpenEditOrg(org)}
                              title="Edit Organization Details"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                              onClick={() => handleDeleteOrg(org)}
                              title="Delete Organization"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrgs.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        No organizations found matching "{searchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ================= TAB 2: FACILITIES ================= */}
          {activeTab === 'FACILITIES' && (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Facility Name</th>
                    <th>Code</th>
                    <th>Parent Organization</th>
                    <th>Timezone & City</th>
                    <th>Rooms</th>
                    <th>Feed Facility ID</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFacilities.map(fac => {
                    const parentOrg = orgs.find(o => o.id === fac.orgId);
                    const facBoards = boards.filter(b => b.facilityId === fac.id);
                    return (
                      <tr key={fac.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{fac.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {facBoards.length} {facBoards.length === 1 ? 'board' : 'boards'} assigned
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                            {fac.code}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#1e40af' }}>{parentOrg?.name || 'Unknown'}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', color: '#1e293b' }}>{fac.city}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{fac.timezone}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{fac.roomCount} ORs</span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: 4 }}>
                            {fac.scraperFacilityId}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionBtns} style={{ justifyContent: 'flex-end' }}>
                            <Link
                              href="/board-builder-mockup"
                              className={styles.textBtnPrimary}
                              title="Launch Board Builder with this facility"
                            >
                              <Sparkles size={13} />
                              Build Board
                            </Link>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              onClick={() => handleOpenEditFacility(fac)}
                              title="Edit Facility"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                              onClick={() => handleDeleteFacility(fac)}
                              title="Delete Facility"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredFacilities.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        No facilities found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ================= TAB 3: BOARDS & DISPLAYS ================= */}
          {activeTab === 'BOARDS' && (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Board Name & URL</th>
                    <th>Facility & Org</th>
                    <th>Display Orientation</th>
                    <th>Row Architecture</th>
                    <th>Depts / Rooms</th>
                    <th>Last Active</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBoards.map(board => {
                    const parentOrg = orgs.find(o => o.id === board.orgId);
                    const parentFac = facilities.find(f => f.id === board.facilityId);
                    return (
                      <tr key={board.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{board.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>https://perfectboard.io/{parentOrg?.slug || 'org'}/{board.slug}</span>
                            <ExternalLink size={10} color="#94a3b8" />
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{parentFac?.name || 'Main Facility'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{parentOrg?.name || 'Group'}</div>
                        </td>
                        <td>
                          {board.displayOrientation === 'PORTRAIT' ? (
                            <span className={`${styles.orientationBadge} ${styles.orientationPortrait}`}>
                              <Smartphone size={12} />
                              Portrait (9:16 TV)
                            </span>
                          ) : (
                            <span className={`${styles.orientationBadge} ${styles.orientationLandscape}`}>
                              <Monitor size={12} />
                              Landscape (16:9)
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, fontSize: 12, color: '#334155' }}>
                            {board.layoutMode === 'AUTO' ? 'Auto-Responsive' :
                             board.layoutMode === 'SINGLE_ROW' ? 'Single Row' :
                             board.layoutMode === 'TWO_ROWS' ? 'Two Rows (Split)' : 'Three Rows'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                            {board.roomCount} Rooms
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            {board.departmentsCount} Depts • {board.activeRunners} Runners
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{board.updatedAt}</span>
                        </td>
                        <td>
                          <div className={styles.actionBtns} style={{ justifyContent: 'flex-end' }}>
                            <Link
                              href="/board-builder-mockup"
                              className={styles.textBtnPrimary}
                              title="Edit in Board Builder"
                            >
                              <Sliders size={13} />
                              Open Builder
                            </Link>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              onClick={() => handleDuplicateBoard(board)}
                              title="Duplicate Board for another floor"
                            >
                              <Sparkles size={14} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                              onClick={() => handleDeleteBoard(board)}
                              title="Delete Board"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBoards.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        No whiteboards found. Click "+ Create Board" to start the board builder.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ================= TAB 4: DATA FEEDS & SCRAPERS ================= */}
          {activeTab === 'FEEDS' && (
            <div>
              <div style={{ marginBottom: 16, padding: '14px 18px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>
                <strong>Superuser Feed Configuration:</strong> Hospital electronic scheduling systems (e.g. OneUSAP, Epic, Cerner) are integrated by Superusers through custom scraper and API feeds. Individual facility boards pull room rosters and assignments securely from these registered endpoints.
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Feed Name & Interface</th>
                      <th>Target Organization</th>
                      <th>Endpoint URL</th>
                      <th>Sync Cadence</th>
                      <th>Status</th>
                      <th>Last Successful Sync</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeds.map(feed => {
                      const org = orgs.find(o => o.id === feed.orgId);
                      return (
                        <tr key={feed.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{feed.name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{feed.type} • {feed.roomsMapped} rooms mapped</div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: '#1e40af' }}>{org?.name || 'All Orgs'}</span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                              {feed.endpoint}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: '#334155' }}>{feed.schedule}</span>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                              {feed.status}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: '#64748b' }}>{feed.lastSync}</span>
                          </td>
                          <td>
                            <div className={styles.actionBtns} style={{ justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className={styles.textBtnPrimary}
                                onClick={() => handleTestFeed(feed)}
                              >
                                <RefreshCw size={13} />
                                Test Sync
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ================= 4-PHASE ARCHITECTURE ROADMAP ================= */}
              <div className={styles.phaseRoadmapCard} style={{ marginTop: 24 }}>
                <div className={styles.phaseRoadmapHeader}>
                  <div className={styles.phaseRoadmapTitle}>
                    <Cpu size={18} color="#2563eb" />
                    <span>Universal Data Scaling Strategy: Moving Away From Custom Scraper Files</span>
                  </div>
                  <span className={styles.statusBadge} style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                    4-Phase Scale Plan
                  </span>
                </div>
                <div className={styles.phaseRoadmapSubtitle}>
                  How Perfect Board shifts from single-hospital custom scraper code (like the 1,771-line MHMC file) to an enterprise-wide, multi-tenant AI pipeline that ingests any clinical source and maps it to any whiteboard.
                </div>

                <div className={styles.phaseGrid}>
                  {/* Phase 1 */}
                  <div className={styles.phaseCard}>
                    <span className={`${styles.phaseBadge} ${styles.phaseBadge1}`}>Phase 1 • Contract</span>
                    <div className={styles.phaseTitle}>Canonical Data Schema</div>
                    <div className={styles.phaseObjective}>
                      Define a single unified JSON contract (<code>CanonicalScheduleItem</code>) for provider, credential, shift, room, and role. Eliminates maintaining separate 1,700-line code files for each hospital system.
                    </div>
                    <ul className={styles.phaseDeliverablesList}>
                      <li className={styles.phaseDeliverableItem}>
                        <Check size={11} color="#2563eb" /> Unified TypeScript schema contract
                      </li>
                      <li className={styles.phaseDeliverableItem}>
                        <Check size={11} color="#2563eb" /> Multi-tenant PostgreSQL schedule tables
                      </li>
                      <li className={styles.phaseDeliverableItem}>
                        <Check size={11} color="#2563eb" /> Zero custom code files per client
                      </li>
                    </ul>
                  </div>

                  {/* Phase 2 */}
                  <div className={styles.phaseCard}>
                    <span className={`${styles.phaseBadge} ${styles.phaseBadge2}`}>Phase 2 • AI Engine</span>
                    <div className={styles.phaseTitle}>AI Normalization Pipeline</div>
                    <div className={styles.phaseObjective}>
                      Deploy an LLM semantic extraction engine (Gemini) that ingests raw HTML dumps, HL7 SIU strings, or CSV rows. Auto-deconstructs compound shifts (<code>3p, L1</code>) and irregular name tags (<code>cavanaughmar</code> ➔ Dr. Cavanaugh).
                    </div>
                    <ul className={styles.phaseDeliverablesList}>
                      <li className={styles.phaseDeliverableItem}>
                        <Check size={11} color="#a21caf" /> Self-healing on hospital portal changes
                      </li>
                      <li className={styles.phaseDeliverableItem}>
                        <Check size={11} color="#a21caf" /> Intelligent role & shift deconstruction
                      </li>
                      <li className={styles.phaseDeliverableItem}>
                        <Check size={11} color="#a21caf" /> Automated doctor/CRNA credential tagging
                      </li>
                    </ul>
                  </div>

                  {/* Phase 3 */}
                  <div className={styles.phaseCard}>
                    <span className={`${styles.phaseBadge} ${styles.phaseBadge3}`}>Phase 3 • Superuser</span>
                    <div className={styles.phaseTitle}>Feed Calibration & Sandbox</div>
                    <div className={styles.phaseObjective}>
                      Provide Superuser Console tooling to paste raw schedule snapshots, inspect extracted entities, test live feeds, calibrate prompt parameters, and map external facility codes in minutes.
                    </div>
                    <ul className={styles.phaseDeliverablesList}>
                      <li className={styles.phaseDeliverableItem}>
                        <Check size={11} color="#b45309" /> Interactive live feed testing sandbox
                      </li>
                      <li className={styles.phaseDeliverableItem}>
                        <Check size={11} color="#b45309" /> Under 15-min new hospital onboarding
                      </li>
                      <li className={styles.phaseDeliverableItem}>
                        <Check size={11} color="#b45309" /> Sync error logging & anomaly alerts
                      </li>
                    </ul>
                  </div>

                  {/* Phase 4 */}
                  <div className={styles.phaseCard}>
                    <span className={`${styles.phaseBadge} ${styles.phaseBadge4}`}>Phase 4 • Floor Level</span>
                    <div className={styles.phaseTitle}>Board Resolver & Auto-Fill</div>
                    <div className={styles.phaseObjective}>
                      Facility board runners visually alias feed rooms to display columns, toggle MD/CRNA auto-fill rules, and claim roving group clinicians directly on the floor without superuser intervention.
                    </div>
                    <ul className={styles.phaseDeliverablesList}>
                      <li className={styles.phaseDeliverableItem}>
                        <Check size={11} color="#15803d" /> Visual drag-and-drop room matching table
                      </li>
                      <li className={styles.phaseDeliverableItem}>
                        <Check size={11} color="#15803d" /> Automated daily morning whiteboard fill
                      </li>
                      <li className={styles.phaseDeliverableItem}>
                        <Check size={11} color="#15803d" /> Cross-facility roving staff pool claiming
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* ================= INTERACTIVE AI FEED NORMALIZER SANDBOX ================= */}
              <div className={styles.sandboxCard}>
                <div className={styles.sandboxHeader}>
                  <div className={styles.sandboxTitleGroup}>
                    <Zap size={20} color="#fbbf24" />
                    <div>
                      <div className={styles.sandboxTitle}>Live AI Feed Ingestion & Normalizer Sandbox</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        Simulate how raw hospital inputs transform into the Canonical Schema and auto-place magnets on the board.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div className={styles.sandboxPills}>
                      <button
                        type="button"
                        className={`${styles.samplePillBtn} ${sandboxFeedKey === 'oneusap' ? styles.samplePillBtnActive : ''}`}
                        onClick={() => setSandboxFeedKey('oneusap')}
                      >
                        OneUSAP (HTML Dump)
                      </button>
                      <button
                        type="button"
                        className={`${styles.samplePillBtn} ${sandboxFeedKey === 'epic' ? styles.samplePillBtnActive : ''}`}
                        onClick={() => setSandboxFeedKey('epic')}
                      >
                        Epic OpTime (HL7 SIU)
                      </button>
                      <button
                        type="button"
                        className={`${styles.samplePillBtn} ${sandboxFeedKey === 'cerner' ? styles.samplePillBtnActive : ''}`}
                        onClick={() => setSandboxFeedKey('cerner')}
                      >
                        Cerner SurgiNet (CSV)
                      </button>
                    </div>

                    <button
                      type="button"
                      className={styles.simulateBtn}
                      onClick={handleSimulateNormalize}
                      disabled={isSimulating}
                    >
                      <RefreshCw size={13} className={isSimulating ? 'animate-spin' : ''} />
                      {isSimulating ? 'Processing...' : 'Run AI Normalization'}
                    </button>
                  </div>
                </div>

                <div className={styles.sandboxGrid}>
                  {/* Column 1: Raw External Input */}
                  <div className={styles.sandboxCol}>
                    <div className={styles.sandboxColHead}>
                      <span>1. Raw Hospital Ingestion</span>
                      <span style={{ fontSize: 10, color: '#38bdf8' }}>{AI_FEED_SAMPLES[sandboxFeedKey].sourceType}</span>
                    </div>
                    <div className={styles.sandboxCodeBox}>
                      {AI_FEED_SAMPLES[sandboxFeedKey].rawPayload}
                    </div>
                  </div>

                  {/* Column 2: AI Canonical Schema Output */}
                  <div className={styles.sandboxCol}>
                    <div className={styles.sandboxColHead}>
                      <span>2. AI Canonical Schema (Standard JSON)</span>
                      <span style={{ fontSize: 10, color: '#4ade80' }}>Gemini Structured Output</span>
                    </div>
                    <div className={styles.sandboxCodeBox}>
                      {JSON.stringify(AI_FEED_SAMPLES[sandboxFeedKey].canonicalJson, null, 2)}
                    </div>
                  </div>

                  {/* Column 3: Whiteboard Auto-Fill Placement */}
                  <div className={styles.sandboxCol}>
                    <div className={styles.sandboxColHead}>
                      <span>3. Whiteboard Auto-Fill Placement</span>
                      <span style={{ fontSize: 10, color: '#f59e0b' }}>Live Board Resolution</span>
                    </div>
                    <div className={styles.boardMappingList} style={{ overflowY: 'auto', maxHeight: 250 }}>
                      {AI_FEED_SAMPLES[sandboxFeedKey].boardPlacements.map((item, idx) => (
                        <div key={idx} className={styles.boardMappingItem}>
                          <div className={styles.boardMappingTarget}>
                            <Layout size={12} />
                            <span>{item.target}</span>
                          </div>
                          <div className={styles.boardMappingDetail}>
                            {item.detail}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 5: ROVING STAFF & POLICIES ================= */}
          {activeTab === 'POLICIES' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  Cross-Facility Roving Staff Policies (Enterprise Group Sharing)
                </div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 16 }}>
                  When enabled, clinicians credentialed under an Organization can have their magnet visible in the unassigned staff bench across multiple facilities in the group. Board runners at any facility can claim and assign roaming doctors/CRNAs seamlessly.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {orgs.map(org => (
                    <div key={org.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{org.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          {facilities.filter(f => f.orgId === org.id).length} facilities in roving pool
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: org.rovingStaffEnabled ? '#15803d' : '#64748b' }}>
                          {org.rovingStaffEnabled ? 'Roving Staff Enabled' : 'Facility Siloed'}
                        </span>
                        <input
                          type="checkbox"
                          checked={org.rovingStaffEnabled}
                          onChange={e => {
                            const val = e.target.checked;
                            setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, rovingStaffEnabled: val } : o));
                            showToast(`${org.name}: Roving staff pool ${val ? 'enabled' : 'disabled'}`);
                          }}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  Superuser Security & Access Hierarchy
                </div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                  <ul style={{ paddingLeft: 20, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <li><strong>Root Superuser:</strong> Full cross-tenant access to create, edit, or delete any organization account, facility location, TV board, or data scraper feed.</li>
                    <li><strong>Org Admin:</strong> Can build and customize boards for their assigned organization only. The organization name is locked to prevent tenant pollution.</li>
                    <li><strong>Facility Board Runner:</strong> Operates daily assignments, drags magnets, manages relief schedules, and runs the live whiteboard.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: ADD / EDIT ORGANIZATION ================= */}
      {(isAddOrgOpen || editingOrg) && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Building2 size={18} color="#2563eb" />
                <span>{editingOrg ? 'Edit Organization' : 'Create New Organization (Tenant)'}</span>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => {
                  setIsAddOrgOpen(false);
                  setEditingOrg(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Organization Name *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={orgForm.name}
                  onChange={e => setOrgForm({ ...orgForm, name: e.target.value })}
                  placeholder="e.g. Memorial Hermann Anesthesia Partners"
                />
                <span className={styles.formHint}>The primary legal entity or anesthesia practice group.</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Organization Slug / Route Prefix</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={orgForm.slug}
                  onChange={e => setOrgForm({ ...orgForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="e.g. mhmc-anesthesia"
                />
                <span className={styles.formHint}>Used in board URLs: perfectboard.io/[slug]/[board]</span>
              </div>

              <div className={styles.gridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Contact / Billing Email</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    value={orgForm.contactEmail}
                    onChange={e => setOrgForm({ ...orgForm, contactEmail: e.target.value })}
                    placeholder="admin@practice.com"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Subscription Plan Tier</label>
                  <select
                    className={styles.formInput}
                    value={orgForm.tier}
                    onChange={e => setOrgForm({ ...orgForm, tier: e.target.value as any })}
                  >
                    <option value="Enterprise">Enterprise (Unlimited Boards)</option>
                    <option value="Professional">Professional (Up to 10 Boards)</option>
                    <option value="Pilot">Pilot (Single Facility)</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Data Feed Integration</label>
                <select
                  className={styles.formInput}
                  value={orgForm.feedType}
                  onChange={e => setOrgForm({ ...orgForm, feedType: e.target.value })}
                >
                  <option value="OneUSAP Automated Feed">OneUSAP Automated Scraper Feed</option>
                  <option value="Epic HL7 SIU Direct">Epic HL7 SIU Direct Interface</option>
                  <option value="Cerner SurgiNet Interface">Cerner SurgiNet REST Interface</option>
                  <option value="Manual / CSV Scraper">Manual CSV Roster Importer</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <input
                  type="checkbox"
                  id="rovingCheckbox"
                  checked={orgForm.rovingStaffEnabled}
                  onChange={e => setOrgForm({ ...orgForm, rovingStaffEnabled: e.target.checked })}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="rovingCheckbox" style={{ fontSize: 13, color: '#1e293b', fontWeight: 600 }}>
                  Enable cross-facility roving clinician staff pool
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => {
                  setIsAddOrgOpen(false);
                  setEditingOrg(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleSaveOrg}
                disabled={!orgForm.name.trim()}
              >
                <Check size={14} />
                {editingOrg ? 'Save Changes' : 'Create Organization'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT FACILITY ================= */}
      {(isAddFacilityOpen || editingFacility) && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Hospital size={18} color="#2563eb" />
                <span>{editingFacility ? 'Edit Facility Location' : 'Add Operating Facility'}</span>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => {
                  setIsAddFacilityOpen(false);
                  setEditingFacility(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Parent Organization *</label>
                <select
                  className={styles.formInput}
                  value={facilityForm.orgId}
                  onChange={e => setFacilityForm({ ...facilityForm, orgId: e.target.value })}
                >
                  {orgs.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Facility Name *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={facilityForm.name}
                  onChange={e => setFacilityForm({ ...facilityForm, name: e.target.value })}
                  placeholder="e.g. Memorial Hermann Main Hospital"
                />
              </div>

              <div className={styles.gridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Facility Short Code</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={facilityForm.code}
                    onChange={e => setFacilityForm({ ...facilityForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. MHMC-MAIN"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Operating Rooms Count</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={facilityForm.roomCount}
                    onChange={e => setFacilityForm({ ...facilityForm, roomCount: parseInt(e.target.value, 10) || 0 })}
                    placeholder="12"
                  />
                </div>
              </div>

              <div className={styles.gridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>City / Location</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={facilityForm.city}
                    onChange={e => setFacilityForm({ ...facilityForm, city: e.target.value })}
                    placeholder="e.g. Houston, TX"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Scraper / Feed Facility ID</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={facilityForm.scraperFacilityId}
                    onChange={e => setFacilityForm({ ...facilityForm, scraperFacilityId: e.target.value })}
                    placeholder="e.g. USAP-TX-1049"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Facility Timezone</label>
                <select
                  className={styles.formInput}
                  value={facilityForm.timezone}
                  onChange={e => setFacilityForm({ ...facilityForm, timezone: e.target.value })}
                >
                  <option>Central Time (US & Canada)</option>
                  <option>Eastern Time (US & Canada)</option>
                  <option>Mountain Time (US & Canada)</option>
                  <option>Pacific Time (US & Canada)</option>
                </select>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => {
                  setIsAddFacilityOpen(false);
                  setEditingFacility(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleSaveFacility}
                disabled={!facilityForm.name.trim()}
              >
                <Check size={14} />
                {editingFacility ? 'Save Changes' : 'Add Facility'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT BOARD ================= */}
      {(isAddBoardOpen || editingBoard) && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Layout size={18} color="#2563eb" />
                <span>{editingBoard ? 'Edit Board Configuration' : 'Create New Whiteboard Display'}</span>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => {
                  setIsAddBoardOpen(false);
                  setEditingBoard(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.gridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Target Organization *</label>
                  <select
                    className={styles.formInput}
                    value={boardForm.orgId}
                    onChange={e => {
                      const newOrgId = e.target.value;
                      const firstFac = facilities.find(f => f.orgId === newOrgId);
                      setBoardForm({
                        ...boardForm,
                        orgId: newOrgId,
                        facilityId: firstFac?.id || ''
                      });
                    }}
                  >
                    {orgs.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Target Facility *</label>
                  <select
                    className={styles.formInput}
                    value={boardForm.facilityId}
                    onChange={e => setBoardForm({ ...boardForm, facilityId: e.target.value })}
                  >
                    {facilities
                      .filter(f => !boardForm.orgId || f.orgId === boardForm.orgId)
                      .map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Board Display Title *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={boardForm.title}
                  onChange={e => setBoardForm({ ...boardForm, title: e.target.value })}
                  placeholder="e.g. Main OR Master Board, West Hallway TV"
                />
              </div>

              <div className={styles.gridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Display Orientation</label>
                  <select
                    className={styles.formInput}
                    value={boardForm.displayOrientation}
                    onChange={e => setBoardForm({ ...boardForm, displayOrientation: e.target.value as any })}
                  >
                    <option value="LANDSCAPE">Landscape (16:9 Standard TV)</option>
                    <option value="PORTRAIT">Portrait (9:16 Vertical TV Kiosk)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Row Architecture</label>
                  <select
                    className={styles.formInput}
                    value={boardForm.layoutMode}
                    onChange={e => setBoardForm({ ...boardForm, layoutMode: e.target.value as any })}
                  >
                    <option value="AUTO">Auto-Responsive</option>
                    <option value="SINGLE_ROW">Single Row</option>
                    <option value="TWO_ROWS">Two Rows (Split Tier)</option>
                    <option value="THREE_ROWS">Three Rows (Multi-Tier)</option>
                  </select>
                </div>
              </div>

              <div className={styles.gridTwo}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Departments Count</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={boardForm.departmentsCount}
                    onChange={e => setBoardForm({ ...boardForm, departmentsCount: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Total Rooms</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={boardForm.roomCount}
                    onChange={e => setBoardForm({ ...boardForm, roomCount: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => {
                  setIsAddBoardOpen(false);
                  setEditingBoard(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleSaveBoard}
                disabled={!boardForm.title.trim()}
              >
                <Check size={14} />
                {editingBoard ? 'Save Changes' : 'Create Board Display'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {deleteConfirm && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent} style={{ maxWidth: 460 }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle} style={{ color: '#dc2626' }}>
                <AlertCircle size={18} />
                <span>Confirm Deletion</span>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setDeleteConfirm(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ fontSize: 14, color: '#1e293b', margin: 0 }}>
                Are you sure you want to delete <strong>"{deleteConfirm.name}"</strong>?
              </p>
              {deleteConfirm.warningText && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12, color: '#991b1b', fontWeight: 600 }}>
                  {deleteConfirm.warningText}
                </div>
              )}
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                This is a simulated action in the mockup sandbox.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={handleExecuteDelete}
              >
                <Trash2 size={14} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className={styles.toastNotification}>
          <CheckCircle2 size={16} color="#4ade80" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
