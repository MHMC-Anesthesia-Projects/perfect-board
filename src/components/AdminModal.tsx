'use client';

import React, { useState, useEffect } from 'react';
import { User, Staff, Department, ScraperConfig, UserRole, StaffCredential, RunnerSlot, ScraperPreviewResult } from '@/types/whiteboard';
import { 
  Users, UserCheck, ShieldCheck, Layout, Globe, 
  Plus, Trash2, Edit2, Key, RefreshCw, X, Check, RotateCcw, AlertTriangle,
  Eye, Search, Phone, Building2, CheckCircle2, ChevronRight, Sparkles
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { id: string; username: string; displayName: string; role: UserRole };
  departments: Department[];
  staff: Staff[];
  scraperConfig: ScraperConfig;
  onSaveDepartments: (departments: Department[]) => void;
  onResetToPhotoDefault: () => void;
  onRefreshData: () => void;
}

const CORE_FACILITIES = [
  { code: 'MHMC', name: 'Memorial Hermann Medical Center', short: 'MHMC' },
  { code: 'MHVIL-SC', name: 'MH Village Surgery Center', short: 'Village SC' },
  { code: 'HIVF-SC', name: 'Houston IVF Surgery Center', short: 'Houston IVF' }
];

const NETWORK_FACILITIES = [
  { code: 'HMWST', name: 'Methodist West' },
  { code: 'MHTW', name: 'MH Woodlands' },
  { code: 'HMH', name: 'Methodist Main' },
  { code: 'MHGH', name: 'MH Greater Heights' },
  { code: 'MHPH', name: 'MH Pearland' },
  { code: 'MHSE', name: 'MH Southeast' },
  { code: 'MHNE', name: 'MH Northeast' },
  { code: 'MHCH', name: 'MH Cypress' },
  { code: 'MHSW', name: 'MH Southwest' },
  { code: 'MHKTY', name: 'MH Katy' },
  { code: 'HMWB', name: 'Methodist Willowbrook' },
  { code: 'MHSL', name: 'MH Sugarland' },
  { code: 'PSC', name: 'Premier Surgery Center' },
  { code: 'TCPFW', name: 'TCH Pavilion for Women' }
];

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  departments,
  staff,
  scraperConfig,
  onSaveDepartments,
  onResetToPhotoDefault,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'staff' | 'layout' | 'scraper'>('users');

  const handleAddRunnerToDept = (deptId: string) => {
    const updated = departments.map(d => {
      if (d.id !== deptId) return d;
      const count = d.runnerSlots.length + 1;
      const newSlot: RunnerSlot = {
        id: `runner_${d.id}_${Date.now()}`,
        title: `Runner ${count}`,
        staffId: null,
        breakfastDone: false,
        lunchDone: false
      };
      return {
        ...d,
        runnerSlots: [...d.runnerSlots, newSlot]
      };
    });
    onSaveDepartments(updated);
  };

  const handleRemoveRunnerFromDept = (deptId: string, runnerSlotId: string) => {
    const updated = departments.map(d => {
      if (d.id !== deptId) return d;
      return {
        ...d,
        runnerSlots: d.runnerSlots.filter(r => r.id !== runnerSlotId)
      };
    });
    onSaveDepartments(updated);
  };

  // --- User Management State ---
  const [userList, setUserList] = useState<User[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('board_runner');
  const [newPin, setNewPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userActionError, setUserActionError] = useState('');
  const [userActionSuccess, setUserActionSuccess] = useState('');

  // App-themed modal state for confirming deletions
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    title: string;
    itemName: string;
    itemCategory?: string;
    message?: string;
    confirmButtonText?: string;
    onConfirm: () => void;
  } | null>(null);

  // --- Staff Management State ---
  const [staffSearch, setStaffSearch] = useState('');
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [staffFirst, setStaffFirst] = useState('');
  const [staffLast, setStaffLast] = useState('');
  const [staffCred, setStaffCred] = useState<StaffCredential>('CRNA');
  const [staffPhone, setStaffPhone] = useState('(555) ');
  const [staffShift, setStaffShift] = useState('07:00 - 15:30');

  // --- Scraper Settings State ---
  const [portalType, setPortalType] = useState(scraperConfig.portalType);
  const [portalUrl, setPortalUrl] = useState(scraperConfig.portalUrl);
  const [portalUser, setPortalUser] = useState(scraperConfig.username);
  const [portalPass, setPortalPass] = useState(scraperConfig.password);
  const [autoSyncMins, setAutoSyncMins] = useState(scraperConfig.autoSyncIntervalMinutes);
  const [mockMode, setMockMode] = useState(scraperConfig.mockMode);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(
    scraperConfig.selectedFacilities || ['MHMC', 'MHVIL-SC', 'HIVF-SC']
  );
  const [showNetworkFacilities, setShowNetworkFacilities] = useState(false);
  const [customFacilityCode, setCustomFacilityCode] = useState('');
  const [scraperSaving, setScraperSaving] = useState(false);
  const [scraperMsg, setScraperMsg] = useState('');

  // --- Test Sync State ---
  const [isTestSyncing, setIsTestSyncing] = useState(false);
  const [testSyncResult, setTestSyncResult] = useState<ScraperPreviewResult | null>(null);
  const [testSyncError, setTestSyncError] = useState('');
  const [testSyncTab, setTestSyncTab] = useState<'staff' | 'departure' | 'lates' | 'callTeam'>('staff');
  const [testStaffFilter, setTestStaffFilter] = useState('');

  // --- Dynamic Layout Editor State ---
  const [layoutDepts, setLayoutDepts] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [newDeptName, setNewDeptName] = useState('');
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [layoutSaveMsg, setLayoutSaveMsg] = useState('');

  // Fetch users & initialize layout when opening modal
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      const cloned = JSON.parse(JSON.stringify(departments));
      setLayoutDepts(cloned);
      if (cloned.length > 0) {
        setSelectedDeptId(prev => prev && cloned.some((d: Department) => d.id === prev) ? prev : cloned[0].id);
      }
    }
  }, [isOpen, departments]);

  useEffect(() => {
    if (scraperConfig) {
      setPortalType(scraperConfig.portalType);
      setPortalUrl(scraperConfig.portalUrl);
      setPortalUser(scraperConfig.username);
      setPortalPass(scraperConfig.password);
      setAutoSyncMins(scraperConfig.autoSyncIntervalMinutes);
      setMockMode(scraperConfig.mockMode);
      if (scraperConfig.selectedFacilities) {
        setSelectedFacilities(scraperConfig.selectedFacilities);
      }
    }
  }, [scraperConfig]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) {
        setUserList(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  if (!isOpen) return null;

  // --- Handlers for User Management ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError('');
    setUserActionSuccess('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          displayName: newDisplayName,
          role: newRole,
          pin: newPin,
          password: newPassword,
          currentUser
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setUserActionError(data.error || 'Failed to create user');
        return;
      }
      setUserActionSuccess(`User ${data.user.username} created successfully!`);
      setIsAddingUser(false);
      setNewUsername('');
      setNewDisplayName('');
      setNewPin('');
      setNewPassword('');
      fetchUsers();
    } catch {
      setUserActionError('Network error creating user');
    }
  };

  const executeDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-user-name': currentUser.displayName
        }
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const promptDeleteUser = (u: User) => {
    setDeleteModalState({
      isOpen: true,
      title: 'Delete System User',
      itemName: `${u.displayName} (@${u.username})`,
      itemCategory: `${u.role.toUpperCase()} Account`,
      confirmButtonText: 'Delete User',
      onConfirm: () => executeDeleteUser(u.id)
    });
  };

  // --- Handlers for Staff Management ---
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: staffFirst,
          lastName: staffLast,
          credentials: staffCred,
          phone: staffPhone,
          shift: staffShift,
          currentUser
        })
      });
      if (res.ok) {
        setIsAddingStaff(false);
        setStaffFirst('');
        setStaffLast('');
        setStaffPhone('(555) ');
        onRefreshData();
      }
    } catch (err) {
      console.error('Error adding staff:', err);
    }
  };

  const executeDeleteStaff = async (id: string) => {
    try {
      const res = await fetch(`/api/staff?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-user-name': currentUser.displayName
        }
      });
      if (res.ok) {
        onRefreshData();
      }
    } catch (err) {
      console.error('Error deleting staff:', err);
    }
  };

  const promptDeleteStaff = (s: Staff) => {
    setDeleteModalState({
      isOpen: true,
      title: 'Remove Staff from Roster',
      itemName: `${s.lastName}, ${s.firstName} (${s.credentials})`,
      itemCategory: 'Master Roster',
      confirmButtonText: 'Remove Staff',
      onConfirm: () => executeDeleteStaff(s.id)
    });
  };

  // --- Handlers for Scraper Config ---
  const toggleFacility = (facCode: string) => {
    setSelectedFacilities(prev => {
      if (prev.includes(facCode)) {
        if (prev.length === 1) return prev; // Keep at least one facility selected
        return prev.filter(c => c !== facCode);
      } else {
        return [...prev, facCode];
      }
    });
  };

  const handleAddCustomFacility = () => {
    const trimmed = customFacilityCode.trim().toUpperCase();
    if (!trimmed) return;
    if (!selectedFacilities.includes(trimmed)) {
      setSelectedFacilities(prev => [...prev, trimmed]);
    }
    setCustomFacilityCode('');
  };

  const handleSaveScraperConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setScraperSaving(true);
    setScraperMsg('');
    try {
      const res = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_CONFIG',
          currentUser,
          config: {
            portalType,
            portalUrl: portalType === 'oneusap' && (!portalUrl || !portalUrl.includes('oneusap')) ? 'https://www.oneusap.com/assignments' : portalUrl,
            username: portalType === 'oneusap' ? '' : portalUser,
            password: portalPass,
            autoSyncIntervalMinutes: Number(autoSyncMins),
            mockMode,
            selectedFacilities
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        setScraperMsg('Portal configuration saved successfully!');
        onRefreshData();
      } else {
        setScraperMsg(data.error || 'Failed to update config');
      }
    } catch {
      setScraperMsg('Connection error');
    } finally {
      setScraperSaving(false);
    }
  };

  const handleTestSync = async () => {
    setIsTestSyncing(true);
    setTestSyncError('');
    setTestSyncResult(null);
    try {
      const res = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_SYNC',
          currentUser,
          config: {
            portalType,
            portalUrl: portalType === 'oneusap' && (!portalUrl || !portalUrl.includes('oneusap')) ? 'https://www.oneusap.com/assignments' : portalUrl,
            username: portalUser,
            password: portalPass || (portalType === 'oneusap' ? '321usap' : ''),
            selectedFacilities
          }
        })
      });
      const data = await res.json();
      if (data.success && data.preview) {
        setTestSyncResult(data.preview);
      } else {
        setTestSyncError(data.error || 'Test sync failed to connect or parse.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestSyncError(msg || 'Network error running test sync');
    } finally {
      setIsTestSyncing(false);
    }
  };

  // --- Handlers for Layout Editor ---
  const handleRenameDept = (deptId: string, name: string) => {
    setLayoutDepts(prev => prev.map(d => d.id === deptId ? { ...d, name: name.toUpperCase() } : d));
  };

  const handleAddRoom = (deptId: string) => {
    if (!newRoomName.trim()) return;
    setLayoutDepts(prev => prev.map(d => {
      if (d.id !== deptId) return d;
      const roomNum = d.rooms.length + 1;
      const name = newRoomName.trim();
      const newRoom = {
        id: `${deptId}_room_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
        name: name,
        orderIndex: roomNum,
        notes: '',
        slots: [{
          id: `${deptId}_room_${name}_slot_0`,
          roleType: 'primary' as const,
          staffId: null,
          breakfastDone: false,
          lunchDone: false
        }]
      };
      return {
        ...d,
        rooms: [...d.rooms, newRoom]
      };
    }));
    setNewRoomName('');
  };

  const handleRemoveRoom = (deptId: string, roomId: string) => {
    setLayoutDepts(prev => prev.map(d => {
      if (d.id !== deptId) return d;
      return {
        ...d,
        rooms: d.rooms.filter(r => r.id !== roomId)
      };
    }));
  };

  const handleRenameRoom = (deptId: string, roomId: string, newName: string) => {
    setLayoutDepts(prev => prev.map(d => {
      if (d.id !== deptId) return d;
      return {
        ...d,
        rooms: d.rooms.map(r => r.id === roomId ? { ...r, name: newName } : r)
      };
    }));
  };

  const handleAddRunner = (deptId: string) => {
    setLayoutDepts(prev => prev.map(d => {
      if (d.id !== deptId) return d;
      const num = d.runnerSlots.length + 1;
      return {
        ...d,
        runnerSlots: [
          ...d.runnerSlots,
          {
            id: `runner_${deptId}_${Date.now()}`,
            title: `RUNNER ${num}`,
            staffId: null,
            breakfastDone: false,
            lunchDone: false
          }
        ]
      };
    }));
  };

  const handleRemoveRunner = (deptId: string, runnerId: string) => {
    setLayoutDepts(prev => prev.map(d => {
      if (d.id !== deptId) return d;
      return {
        ...d,
        runnerSlots: d.runnerSlots.filter(r => r.id !== runnerId)
      };
    }));
  };

  const handleRenameRunner = (deptId: string, runnerId: string, title: string) => {
    setLayoutDepts(prev => prev.map(d => {
      if (d.id !== deptId) return d;
      return {
        ...d,
        runnerSlots: d.runnerSlots.map(r => r.id === runnerId ? { ...r, title: title.toUpperCase() } : r)
      };
    }));
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    const id = `dept_${newDeptName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const newDept: Department = {
      id,
      name: newDeptName.trim().toUpperCase(),
      orderIndex: layoutDepts.length,
      runnerSlots: [
        {
          id: `runner_${id}_1`,
          title: 'RUNNER 1',
          staffId: null,
          breakfastDone: false,
          lunchDone: false
        }
      ],
      rooms: [
        {
          id: `${id}_room_1`,
          name: '1',
          orderIndex: 1,
          slots: [{
            id: `${id}_room_1_slot_0`,
            roleType: 'primary',
            staffId: null,
            breakfastDone: false,
            lunchDone: false
          }]
        }
      ]
    };
    setLayoutDepts(prev => [...prev, newDept]);
    setSelectedDeptId(id);
    setNewDeptName('');
    setIsAddingDept(false);
  };

  const executeDeleteDepartment = (deptId: string) => {
    const filtered = layoutDepts.filter(d => d.id !== deptId);
    setLayoutDepts(filtered);
    if (selectedDeptId === deptId && filtered.length > 0) {
      setSelectedDeptId(filtered[0].id);
    }
  };

  const promptDeleteDepartment = (deptId: string) => {
    const dept = layoutDepts.find(d => d.id === deptId);
    if (!dept) return;
    setDeleteModalState({
      isOpen: true,
      title: 'Delete Department',
      itemName: dept.name,
      itemCategory: 'Department Column',
      message: `Are you sure you want to permanently delete department "${dept.name}" and all of its configured rooms from the board?`,
      confirmButtonText: 'Delete Department',
      onConfirm: () => executeDeleteDepartment(deptId)
    });
  };

  const handleSaveLayoutChanges = () => {
    onSaveDepartments(layoutDepts);
    setLayoutSaveMsg('Layout saved and live on the whiteboard!');
    setTimeout(() => setLayoutSaveMsg(''), 3500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="pin-pad-card"
        onClick={e => e.stopPropagation()}
        style={{ width: 840, maxWidth: '95vw', height: '85vh', padding: 24, textAlign: 'left', alignItems: 'stretch' }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(211, 47, 47, 0.1)', padding: 8, borderRadius: 8, color: 'var(--marker-red)' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase' }}>
                Superuser Admin Command Center
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                System configuration, user roles, layout customization & scheduling portal
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid var(--border-light)', paddingBottom: 8, marginBottom: 16 }}>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              background: activeTab === 'users' ? 'var(--accent-primary)' : 'var(--surface-hover)',
              color: activeTab === 'users' ? '#fff' : 'var(--text-primary)',
              fontWeight: 700,
              fontSize: 13
            }}
          >
            <Users size={15} />
            <span>User Accounts & Roles</span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              background: activeTab === 'staff' ? 'var(--accent-primary)' : 'var(--surface-hover)',
              color: activeTab === 'staff' ? '#fff' : 'var(--text-primary)',
              fontWeight: 700,
              fontSize: 13
            }}
          >
            <UserCheck size={15} />
            <span>Site Staff Roster ({staff.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('layout')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              background: activeTab === 'layout' ? 'var(--accent-primary)' : 'var(--surface-hover)',
              color: activeTab === 'layout' ? '#fff' : 'var(--text-primary)',
              fontWeight: 700,
              fontSize: 13
            }}
          >
            <Layout size={15} />
            <span>Board Layout Editor</span>
          </button>

          <button
            onClick={() => setActiveTab('scraper')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              background: activeTab === 'scraper' ? 'var(--accent-primary)' : 'var(--surface-hover)',
              color: activeTab === 'scraper' ? '#fff' : 'var(--text-primary)',
              fontWeight: 700,
              fontSize: 13
            }}
          >
            <Globe size={15} />
            <span>Portal Sync (QGenda/Amion)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* ===================== TAB 1: USERS ===================== */}
          {activeTab === 'users' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800 }}>Manage System Users & Permissions</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Control access tiers: Superuser, Board Runner, or view-only Basic User
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingUser(prev => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12
                  }}
                >
                  <Plus size={14} />
                  <span>{isAddingUser ? 'Cancel' : 'Add New User'}</span>
                </button>
              </div>

              {userActionError && (
                <div style={{ padding: 8, background: 'rgba(211,47,47,0.1)', color: 'var(--marker-red)', borderRadius: 6, marginBottom: 10, fontSize: 13, fontWeight: 600 }}>
                  {userActionError}
                </div>
              )}
              {userActionSuccess && (
                <div style={{ padding: 8, background: 'rgba(46,160,67,0.1)', color: 'var(--marker-green)', borderRadius: 6, marginBottom: 10, fontSize: 13, fontWeight: 600 }}>
                  {userActionSuccess}
                </div>
              )}

              {/* Add User Form */}
              {isAddingUser && (
                <form onSubmit={handleCreateUser} style={{ background: 'var(--surface-hover)', padding: 14, borderRadius: 8, marginBottom: 16, border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Username</label>
                      <input
                        type="text"
                        placeholder="e.g. jdoe_crna"
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        required
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border-light)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Display Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Jane Doe, CRNA"
                        value={newDisplayName}
                        onChange={e => setNewDisplayName(e.target.value)}
                        required
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border-light)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Role Permission Level</label>
                      <select
                        value={newRole}
                        onChange={e => setNewRole(e.target.value as UserRole)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border-light)', background: 'var(--surface-card)' }}
                      >
                        <option value="board_runner">Board Runner (Move magnets & staff)</option>
                        <option value="superuser">Superuser (Full admin control)</option>
                        <option value="basic_user">Basic User (View & breaks only)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Touch PIN (4-6 Digits)</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="e.g. 5678"
                        value={newPin}
                        onChange={e => setNewPin(e.target.value)}
                        required
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border-light)' }}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', borderRadius: 6, fontWeight: 700, fontSize: 13 }}
                  >
                    Save User Account
                  </button>
                </form>
              )}

              {/* Users Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-hover)', textAlign: 'left', borderBottom: '2px solid var(--border-light)' }}>
                    <th style={{ padding: '8px 10px' }}>Display Name</th>
                    <th style={{ padding: '8px 10px' }}>Username</th>
                    <th style={{ padding: '8px 10px' }}>Access Level</th>
                    <th style={{ padding: '8px 10px' }}>PIN</th>
                    <th style={{ padding: '8px 10px' }}>Status</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userList.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{u.displayName}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{u.username}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 800,
                          background: u.role === 'superuser' ? 'rgba(211,47,47,0.1)' : u.role === 'board_runner' ? 'rgba(9,105,218,0.1)' : 'var(--surface-hover)',
                          color: u.role === 'superuser' ? 'var(--marker-red)' : u.role === 'board_runner' ? 'var(--accent-primary)' : 'var(--text-secondary)'
                        }}>
                          {u.role === 'superuser' ? 'Superuser' : u.role === 'board_runner' ? 'Board Runner' : 'Basic User'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {u.pin}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ color: u.active ? 'var(--marker-green)' : 'var(--text-muted)', fontWeight: 700 }}>
                          {u.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => promptDeleteUser(u)}
                            style={{ color: 'var(--marker-red)', padding: 4 }}
                            title="Delete user"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===================== TAB 2: STAFF ROSTER ===================== */}
          {activeTab === 'staff' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Search staff by name, credential, or phone..."
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  style={{ width: 320, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-light)' }}
                />
                <button
                  onClick={() => setIsAddingStaff(prev => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12
                  }}
                >
                  <Plus size={14} />
                  <span>{isAddingStaff ? 'Cancel' : 'Add Staff to Site'}</span>
                </button>
              </div>

              {/* Add Staff Form */}
              {isAddingStaff && (
                <form onSubmit={handleCreateStaff} style={{ background: 'var(--surface-hover)', padding: 14, borderRadius: 8, marginBottom: 16, border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>First Name</label>
                      <input
                        type="text"
                        value={staffFirst}
                        onChange={e => setStaffFirst(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border-light)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Last Name</label>
                      <input
                        type="text"
                        value={staffLast}
                        onChange={e => setStaffLast(e.target.value)}
                        required
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border-light)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Credentials</label>
                      <select
                        value={staffCred}
                        onChange={e => setStaffCred(e.target.value as StaffCredential)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border-light)', background: 'var(--surface-card)' }}
                      >
                        <option value="CRNA">CRNA</option>
                        <option value="MD">MD</option>
                        <option value="Resident">Resident</option>
                        <option value="SRNA">SRNA</option>
                        <option value="PA">PA</option>
                        <option value="Fellow">Fellow</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Cell Phone</label>
                      <input
                        type="text"
                        value={staffPhone}
                        onChange={e => setStaffPhone(e.target.value)}
                        required
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border-light)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Shift</label>
                      <input
                        type="text"
                        value={staffShift}
                        onChange={e => setStaffShift(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border-light)' }}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', borderRadius: 6, fontWeight: 700, fontSize: 13 }}
                  >
                    Save to Staff Roster
                  </button>
                </form>
              )}

              {/* Staff List */}
              <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-hover)', textAlign: 'left', borderBottom: '2px solid var(--border-light)' }}>
                      <th style={{ padding: '8px 10px' }}>Staff Name</th>
                      <th style={{ padding: '8px 10px' }}>Credentials</th>
                      <th style={{ padding: '8px 10px' }}>Cell Phone</th>
                      <th style={{ padding: '8px 10px' }}>Shift</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff
                      .filter(s => {
                        if (!staffSearch.trim()) return true;
                        const q = staffSearch.toLowerCase();
                        return s.lastName.toLowerCase().includes(q) || s.firstName.toLowerCase().includes(q) || s.credentials.toLowerCase().includes(q) || s.phone.includes(q);
                      })
                      .map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 800, textTransform: 'uppercase' }}>
                            {s.lastName}, {s.firstName || ''}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span className={`magnet-cred cred-${s.credentials}`} style={{ fontSize: 11 }}>
                              {s.credentials}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <a href={`tel:${s.phone}`} style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{s.phone}</a>
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{s.shift || '07:00 - 15:30'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <button
                              onClick={() => promptDeleteStaff(s)}
                              style={{ color: 'var(--marker-red)', padding: 4 }}
                              title="Delete staff member"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================== TAB 3: LAYOUT EDITOR ===================== */}
          {activeTab === 'layout' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
              {/* Header Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 10 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase' }}>
                    Interactive Board Layout & Room Editor
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Fully customize department names, add/edit/delete numbered rooms, and adjust runner slots
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      setDeleteModalState({
                        isOpen: true,
                        title: 'Restore Layout Defaults',
                        itemName: 'Original Photo Layout & Assignments',
                        itemCategory: 'Layout Reset',
                        message: 'Are you sure you want to reset the whiteboard layout, rooms, and assignments back to the photo default?',
                        confirmButtonText: 'Restore Defaults',
                        onConfirm: onResetToPhotoDefault
                      });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: 'rgba(211,47,47,0.1)',
                      border: '1px solid var(--marker-red)',
                      color: 'var(--marker-red)',
                      fontWeight: 700,
                      fontSize: 12
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Restore Photo Default</span>
                  </button>

                  <button
                    onClick={handleSaveLayoutChanges}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 6,
                      background: 'var(--break-done-bg)',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 13,
                      boxShadow: '0 2px 6px rgba(46, 160, 67, 0.3)'
                    }}
                  >
                    <Check size={16} />
                    <span>Save Layout Changes to Board</span>
                  </button>
                </div>
              </div>

              {layoutSaveMsg && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'rgba(46,160,67,0.15)',
                  color: 'var(--marker-green)',
                  fontWeight: 800,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <Check size={16} />
                  <span>{layoutSaveMsg}</span>
                </div>
              )}

              {/* Master Layout Workspace */}
              <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 400, overflow: 'hidden' }}>
                {/* Left: Department List Selector */}
                <div style={{ width: 220, borderRight: '1px solid var(--border-light)', paddingRight: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Departments ({layoutDepts.length})
                    </span>
                    <button
                      onClick={() => setIsAddingDept(prev => !prev)}
                      style={{ padding: '2px 6px', fontSize: 11, fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 2 }}
                    >
                      <Plus size={12} />
                      <span>Add</span>
                    </button>

                  </div>

                  {/* Add Department Input */}
                  {isAddingDept && (
                    <form onSubmit={handleAddDepartment} style={{ padding: 6, background: 'var(--surface-hover)', borderRadius: 6, marginBottom: 6 }}>
                      <input
                        type="text"
                        placeholder="Department Name..."
                        value={newDeptName}
                        onChange={e => setNewDeptName(e.target.value)}
                        autoFocus
                        style={{ width: '100%', padding: '4px 6px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border-light)', marginBottom: 4 }}
                      />
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button type="submit" style={{ flex: 1, padding: 3, background: 'var(--accent-primary)', color: '#fff', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          Create
                        </button>
                        <button type="button" onClick={() => setIsAddingDept(false)} style={{ padding: '3px 6px', fontSize: 11 }}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Department Navigation Buttons */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {layoutDepts.map(dept => {
                      const isSelected = dept.id === selectedDeptId;
                      return (
                        <button
                          key={dept.id}
                          onClick={() => setSelectedDeptId(dept.id)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 6,
                            textAlign: 'left',
                            background: isSelected ? 'var(--accent-primary)' : 'var(--surface-hover)',
                            color: isSelected ? '#fff' : 'var(--text-primary)',
                            fontWeight: 800,
                            fontSize: 12,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ textTransform: 'uppercase' }}>{dept.name}</span>
                          <span style={{
                            fontSize: 10,
                            opacity: 0.85,
                            background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--surface-card)',
                            padding: '1px 5px',
                            borderRadius: 3
                          }}>
                            {dept.rooms.length} R
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Selected Department Detail & Room Editor */}
                {selectedDeptId && (() => {
                  const currentDept = layoutDepts.find(d => d.id === selectedDeptId);
                  if (!currentDept) return null;

                  return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', paddingRight: 6 }}>
                      {/* Department Name & Delete Row */}
                      <div style={{
                        background: 'var(--surface-hover)',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                            Department Name:
                          </label>
                          <input
                            type="text"
                            value={currentDept.name}
                            onChange={e => handleRenameDept(currentDept.id, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              fontSize: 14,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              borderRadius: 6,
                              border: '1px solid var(--border-light)',
                              background: 'var(--surface-card)',
                              color: 'var(--text-primary)'
                            }}
                          />
                        </div>
                        {layoutDepts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => promptDeleteDepartment(currentDept.id)}
                            style={{
                              marginTop: 18,
                              padding: '8px 12px',
                              borderRadius: 6,
                              background: 'rgba(211,47,47,0.1)',
                              border: '1px solid var(--marker-red)',
                              color: 'var(--marker-red)',
                              fontWeight: 700,
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Delete this entire department"
                          >
                            <Trash2 size={13} />
                            <span>Delete Dept</span>
                          </button>
                        )}
                      </div>

                      {/* Runner Slots Config */}
                      <div style={{
                        background: 'var(--surface-hover)',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid var(--border-light)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
                            Runner Slots ({currentDept.runnerSlots.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddRunner(currentDept.id)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: 4,
                              background: 'var(--accent-primary)',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2
                            }}
                          >
                            <Plus size={11} />
                            <span>Add Runner Slot</span>
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {currentDept.runnerSlots.map(r => (
                            <div
                              key={r.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                                background: 'var(--surface-card)',
                                border: '1px solid var(--border-light)',
                                borderRadius: 4
                              }}
                            >
                              <input
                                type="text"
                                value={r.title}
                                onChange={e => handleRenameRunner(currentDept.id, r.id, e.target.value)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  fontSize: 12,
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  width: 100
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveRunner(currentDept.id, r.id)}
                                style={{ color: 'var(--text-muted)', padding: 1 }}
                                title="Remove runner slot"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                          {currentDept.runnerSlots.length === 0 && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              No runner slots. Tap &quot;Add Runner Slot&quot; to configure runners.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Numbered Rooms Display Editor */}
                      <div style={{
                        background: 'var(--surface-hover)',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid var(--border-light)',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase' }}>
                              Displayed Rooms ({currentDept.rooms.length})
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                              Modify room numbers, add rooms, or remove rooms
                            </span>
                          </div>
                        </div>

                        {/* Add Room Row */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                          <input
                            type="text"
                            placeholder="Room Number or Name (e.g. 13, MRI, Cath 1, P3)..."
                            value={newRoomName}
                            onChange={e => setNewRoomName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddRoom(currentDept.id);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              fontSize: 13,
                              borderRadius: 6,
                              border: '1px solid var(--border-light)',
                              background: 'var(--surface-card)',
                              color: 'var(--text-primary)'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddRoom(currentDept.id)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: 6,
                              background: 'var(--accent-primary)',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: 13,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <Plus size={14} />
                            <span>Add Room</span>
                          </button>
                        </div>

                        {/* Rooms Grid / Chips */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                          gap: 8,
                          maxHeight: 240,
                          overflowY: 'auto',
                          padding: 4
                        }}>
                          {currentDept.rooms.map((room, rIdx) => (
                            <div
                              key={room.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 8px',
                                background: 'var(--surface-card)',
                                border: '1px solid var(--border-light)',
                                borderRadius: 6
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, overflow: 'hidden' }}>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{rIdx + 1}</span>
                                <input
                                  type="text"
                                  value={room.name}
                                  onChange={e => handleRenameRoom(currentDept.id, room.id, e.target.value)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontWeight: 800,
                                    fontSize: 13,
                                    width: '100%',
                                    outline: 'none',
                                    fontFamily: 'var(--font-mono)'
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveRoom(currentDept.id, room.id)}
                                style={{ color: 'var(--text-muted)', padding: 2 }}
                                title={`Delete Room ${room.name}`}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>

                        {currentDept.rooms.length === 0 && (
                          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No rooms configured in this department. Type a room name above and click Add Room.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ===================== TAB 4: SCRAPER / INTEGRATION ===================== */}
          {activeTab === 'scraper' && (
            <form onSubmit={handleSaveScraperConfig} style={{ maxWidth: 540 }}>
              <div style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800 }}>External Scheduling System Sync</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Pulls the Departure list and after-3pm Lates schedule automatically
                </p>
              </div>

              {scraperMsg && (
                <div style={{
                  padding: 8,
                  borderRadius: 6,
                  background: 'rgba(46,160,67,0.1)',
                  color: 'var(--marker-green)',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 12
                }}>
                  {scraperMsg}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>System Provider</label>
                  <select
                    value={portalType}
                    onChange={e => {
                      const nextType = e.target.value as any;
                      setPortalType(nextType);
                      if (nextType === 'oneusap') {
                        if (!portalUrl || portalUrl.includes('qgenda') || portalUrl.includes('app.qgenda')) {
                          setPortalUrl('https://www.oneusap.com/assignments');
                        }
                        if (!portalPass || portalPass.includes('•••')) {
                          setPortalPass('321usap');
                        }
                      }
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--surface-hover)' }}
                  >
                    <option value="oneusap">OneUSAP Scheduling (oneusap.com)</option>
                    <option value="qgenda">QGenda Cloud Portal</option>
                    <option value="amion">Amion Scheduling System</option>
                    <option value="custom">Custom Hospital Portal URL</option>
                  </select>
                </div>

                {portalType === 'oneusap' && (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    background: 'rgba(9, 105, 218, 0.08)',
                    border: '1px solid rgba(9, 105, 218, 0.25)',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    lineHeight: 1.4
                  }}>
                    <strong>OneUSAP Portal Mode:</strong> Connects directly to <code>https://www.oneusap.com/assignments</code> using passcode authentication. Automatically extracts working providers, phone numbers, departure lists, and late shifts for <strong>MHMC</strong> (Memorial Hermann Medical Center) and <strong>MHVIL-SC</strong> (Village SC).
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Portal Login URL</label>
                  <input
                    type="url"
                    value={portalUrl}
                    onChange={e => setPortalUrl(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-light)' }}
                  />
                </div>

                {portalType === 'oneusap' ? (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>OneUSAP Passcode / Password</label>
                    <input
                      type="password"
                      value={portalPass}
                      onChange={e => setPortalPass(e.target.value)}
                      placeholder="Enter OneUSAP passcode (e.g. 321usap)"
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-light)' }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      OneUSAP only requires a passcode for access. Username is not required.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Account Username / Email</label>
                      <input
                        type="text"
                        value={portalUser}
                        onChange={e => setPortalUser(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-light)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Account Password</label>
                      <input
                        type="password"
                        value={portalPass}
                        onChange={e => setPortalPass(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-light)' }}
                      />
                    </div>
                  </div>
                )}

                {/* Facility Selector for Whiteboard Scope */}
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--surface-hover)',
                  borderRadius: 8,
                  border: '1px solid var(--border-light)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building2 size={16} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: 13, fontWeight: 800 }}>Facilities to Include on Whiteboard</span>
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: 'rgba(9, 105, 218, 0.1)',
                      color: 'var(--accent-primary)'
                    }}>
                      {selectedFacilities.length} Selected
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                    Only staff and room assignments for these facilities will populate your whiteboard and Available Staff pool.
                  </div>

                  {/* Core Active Facilities */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                    {CORE_FACILITIES.map(fac => {
                      const isSel = selectedFacilities.includes(fac.code);
                      return (
                        <button
                          key={fac.code}
                          type="button"
                          onClick={() => toggleFacility(fac.code)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            padding: '8px 10px',
                            borderRadius: 6,
                            border: `1.5px solid ${isSel ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                            background: isSel ? 'rgba(9, 105, 218, 0.08)' : 'var(--surface-card)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 900, color: isSel ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                              {fac.code}
                            </span>
                            <div style={{
                              width: 16,
                              height: 16,
                              borderRadius: 4,
                              background: isSel ? 'var(--accent-primary)' : 'transparent',
                              border: `1px solid ${isSel ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff'
                            }}>
                              {isSel && <Check size={11} strokeWidth={3} />}
                            </div>
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.2 }}>
                            {fac.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Expand Other Network Facilities */}
                  <div style={{ marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setShowNetworkFacilities(prev => !prev)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '4px 0'
                      }}
                    >
                      <ChevronRight size={13} style={{ transform: showNetworkFacilities ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                      <span>{showNetworkFacilities ? 'Hide Other Network Facilities' : '+ Show / Add Other Health Network Facilities'}</span>
                    </button>

                    {showNetworkFacilities && (
                      <div style={{
                        marginTop: 8,
                        padding: 10,
                        background: 'var(--surface-card)',
                        borderRadius: 6,
                        border: '1px solid var(--border-light)'
                      }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                          Click any facility code to include or exclude from this whiteboard:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                          {NETWORK_FACILITIES.map(fac => {
                            const isSel = selectedFacilities.includes(fac.code);
                            return (
                              <button
                                key={fac.code}
                                type="button"
                                onClick={() => toggleFacility(fac.code)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  border: `1px solid ${isSel ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                                  background: isSel ? 'rgba(9, 105, 218, 0.12)' : 'var(--surface-hover)',
                                  color: isSel ? 'var(--accent-primary)' : 'var(--text-primary)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                {isSel && <Check size={11} strokeWidth={3} />}
                                <span>{fac.code}</span>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({fac.name})</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Code Input */}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="text"
                            placeholder="Add custom facility code (e.g. NWRO-SC)..."
                            value={customFacilityCode}
                            onChange={e => setCustomFacilityCode(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomFacility(); } }}
                            style={{
                              flex: 1,
                              padding: '5px 8px',
                              borderRadius: 4,
                              border: '1px solid var(--border-light)',
                              fontSize: 11
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomFacility}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 4,
                              background: 'var(--accent-primary)',
                              color: '#fff',
                              border: 'none',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-hover)', borderRadius: 6 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Offline / Realistic Photo Mode</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Use preloaded verified hospital schedule data</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={mockMode}
                    onChange={e => setMockMode(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                </div>

                {testSyncError && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'rgba(211, 47, 47, 0.1)',
                    border: '1px solid rgba(211, 47, 47, 0.25)',
                    color: 'var(--marker-red)',
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    {testSyncError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button
                    type="submit"
                    disabled={scraperSaving || isTestSyncing}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: 6,
                      background: 'var(--accent-primary)',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    {scraperSaving ? 'Saving Portal Settings...' : 'Save Scraper Credentials'}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestSync}
                    disabled={scraperSaving || isTestSyncing}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: 6,
                      background: 'rgba(9, 105, 218, 0.12)',
                      border: '1.5px solid var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      fontWeight: 800,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={15} className={isTestSyncing ? 'animate-spin' : ''} />
                    <span>{isTestSyncing ? 'Scraping OneUSAP...' : 'Test Sync (Preview Data)'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Test Sync Preview Modal Overlay */}
          {testSyncResult && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(5px)',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20
              }}
              onClick={() => setTestSyncResult(null)}
            >
              <div
                style={{
                  background: 'var(--surface-card)',
                  borderRadius: 12,
                  width: 820,
                  maxWidth: '95vw',
                  maxHeight: '90vh',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
                  border: '1.5px solid var(--border-light)',
                  overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Preview Header */}
                <div style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border-light)',
                  background: 'var(--surface-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(46, 160, 67, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--marker-green)'
                    }}>
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase' }}>
                          OneUSAP Scrape Preview
                        </span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          background: 'rgba(46, 160, 67, 0.15)',
                          color: 'var(--marker-green)',
                          padding: '2px 8px',
                          borderRadius: 10
                        }}>
                          CONNECTED • LIVE TEST
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Facilities Included:</span>
                        {(testSyncResult.selectedFacilities || testSyncResult.facilities || ['MHMC', 'MHVIL-SC', 'HIVF-SC']).map(fac => {
                          const count = testSyncResult.rawCounts?.facilityStaffCounts?.[fac] ?? (fac === 'MHMC' ? testSyncResult.rawCounts?.mhmcStaffCount : (fac === 'MHVIL-SC' ? testSyncResult.rawCounts?.mhvilStaffCount : undefined));
                          return (
                            <span key={fac} style={{
                              fontSize: 10,
                              fontWeight: 800,
                              background: 'var(--surface-hover)',
                              border: '1px solid var(--border-light)',
                              padding: '1px 6px',
                              borderRadius: 4,
                              color: 'var(--text-primary)'
                            }}>
                              {fac} {count !== undefined ? `(${count})` : ''}
                            </span>
                          );
                        })}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                          &bull; Scraped: {new Date(testSyncResult.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTestSyncResult(null)}
                    style={{
                      border: '1px solid var(--border-light)',
                      background: 'var(--surface-card)',
                      borderRadius: 6,
                      padding: 6,
                      cursor: 'pointer',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Metrics Summary Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10,
                  padding: '12px 20px',
                  background: 'rgba(0,0,0,0.02)',
                  borderBottom: '1px solid var(--border-light)'
                }}>
                  <div style={{ padding: '8px 12px', background: 'var(--surface-card)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Working Staff Today</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent-primary)' }}>{testSyncResult.workingStaff.length}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Scheduled Active on Duty</div>
                  </div>

                  <div style={{ padding: '8px 12px', background: 'var(--surface-card)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Departure Docs</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--marker-red)' }}>{testSyncResult.departureCandidates.length}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {testSyncResult.departureCandidates.filter(c => c.category === 'post_call').length} Post-Call &bull; {testSyncResult.departureCandidates.filter(c => c.category === 'non_call').length} Non-Call
                    </div>
                  </div>

                  <div style={{ padding: '8px 12px', background: 'var(--surface-card)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Late Shifts</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#f59e0b' }}>{testSyncResult.lateCandidates.length}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>3p, 4p, 5p, 7p, 8p, Night</div>
                  </div>

                  <div style={{ padding: '8px 12px', background: 'var(--surface-card)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Call Team</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>{testSyncResult.callTeamCandidates.length}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>CV, 1st, 2nd, 3rd, OB</div>
                  </div>
                </div>

                {/* Sub-tabs Navigation */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  borderBottom: '1px solid var(--border-light)',
                  background: 'var(--surface-card)'
                }}>
                  <button
                    type="button"
                    onClick={() => setTestSyncTab('staff')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 800,
                      background: testSyncTab === 'staff' ? 'var(--accent-primary)' : 'var(--surface-hover)',
                      color: testSyncTab === 'staff' ? '#fff' : 'var(--text-primary)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Working Staff Today ({testSyncResult.workingStaff.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestSyncTab('departure')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 800,
                      background: testSyncTab === 'departure' ? 'var(--accent-primary)' : 'var(--surface-hover)',
                      color: testSyncTab === 'departure' ? '#fff' : 'var(--text-primary)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Departure Candidates ({testSyncResult.departureCandidates.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestSyncTab('lates')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 800,
                      background: testSyncTab === 'lates' ? 'var(--accent-primary)' : 'var(--surface-hover)',
                      color: testSyncTab === 'lates' ? '#fff' : 'var(--text-primary)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Late Shifts ({testSyncResult.lateCandidates.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestSyncTab('callTeam')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 800,
                      background: testSyncTab === 'callTeam' ? 'var(--accent-primary)' : 'var(--surface-hover)',
                      color: testSyncTab === 'callTeam' ? '#fff' : 'var(--text-primary)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Call Team ({testSyncResult.callTeamCandidates.length})
                  </button>
                </div>

                {/* Tab Content Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
                  {/* 1. Working Staff Roster */}
                  {testSyncTab === 'staff' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          These {testSyncResult.workingStaff.length} providers will populate the <strong>Available Unassigned Staff</strong> pool:
                        </div>
                        <input
                          type="text"
                          placeholder="Filter name, QGenda ID, room, credential..."
                          value={testStaffFilter}
                          onChange={e => setTestStaffFilter(e.target.value)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: '1px solid var(--border-light)',
                            fontSize: 12,
                            width: 250
                          }}
                        />
                      </div>

                      <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 10px' }}>Provider Name</th>
                              <th style={{ padding: '8px 10px' }}>Order #</th>
                              <th style={{ padding: '8px 10px' }}>QGenda ID</th>
                              <th style={{ padding: '8px 10px' }}>Credential</th>
                              <th style={{ padding: '8px 10px' }}>Assigned Room(s)</th>
                              <th style={{ padding: '8px 10px' }}>Facility</th>
                              <th style={{ padding: '8px 10px' }}>Shift</th>
                              <th style={{ padding: '8px 10px' }}>Phone / SMS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {testSyncResult.workingStaff
                              .filter(s => !testStaffFilter.trim() || 
                                s.displayName.toLowerCase().includes(testStaffFilter.toLowerCase()) ||
                                (s.qgendaAbbr && s.qgendaAbbr.toLowerCase().includes(testStaffFilter.toLowerCase())) ||
                                s.facility.toLowerCase().includes(testStaffFilter.toLowerCase()) ||
                                (s.roomAssignment && s.roomAssignment.toLowerCase().includes(testStaffFilter.toLowerCase())) ||
                                s.credentials.toLowerCase().includes(testStaffFilter.toLowerCase())
                              )
                              .map(s => (
                                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                  <td style={{ padding: '8px 10px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                                    {s.displayName}
                                  </td>
                                  <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                                    {s.orderNumber ? (
                                      <span style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        background: 'rgba(9, 105, 218, 0.08)',
                                        color: 'var(--accent-primary)',
                                        padding: '1px 5px',
                                        borderRadius: 3
                                      }}>
                                        #{s.orderNumber}
                                      </span>
                                    ) : '—'}
                                  </td>
                                  <td style={{ padding: '8px 10px' }}>
                                    <span style={{
                                      fontFamily: 'var(--font-mono)',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      background: 'rgba(9, 105, 218, 0.08)',
                                      color: 'var(--accent-primary)',
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      border: '1px solid rgba(9, 105, 218, 0.2)'
                                    }}>
                                      {s.qgendaAbbr || s.rawId || '—'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px 10px' }}>
                                    <span className={`magnet-cred cred-${s.credentials}`}>
                                      {s.credentials}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px 10px' }}>
                                    {s.roomAssignment ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{
                                          fontWeight: 800,
                                          fontSize: 11,
                                          background: 'rgba(46, 160, 67, 0.12)',
                                          color: 'var(--marker-green)',
                                          padding: '2px 6px',
                                          borderRadius: 4,
                                          border: '1px solid rgba(46, 160, 67, 0.25)'
                                        }}>
                                          {s.roomAssignment}
                                        </span>
                                        {s.startTime && (
                                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                                            ({s.startTime})
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span style={{
                                        fontSize: 10,
                                        color: 'var(--text-muted)',
                                        fontStyle: 'italic',
                                        background: 'var(--surface-hover)',
                                        padding: '2px 6px',
                                        borderRadius: 4
                                      }}>
                                        Unassigned (Bullpen / Runner Candidate)
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                                    {s.facility}
                                  </td>
                                  <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                    {s.shift || 'Day'}
                                  </td>
                                  <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>
                                    {s.phone !== '(555) 000-0000' ? (
                                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.phone}</span>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not listed</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 2. Departure Candidates */}
                  {testSyncTab === 'departure' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Post-Call List */}
                      <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--marker-red)', marginBottom: 8 }}>
                          POST-CALL DOCTORS ({testSyncResult.departureCandidates.filter(c => c.category === 'post_call').length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {testSyncResult.departureCandidates
                            .filter(c => c.category === 'post_call')
                            .map((c, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface-hover)', borderRadius: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {c.orderNumber && (
                                    <span style={{
                                      fontSize: 10,
                                      fontWeight: 900,
                                      color: 'var(--marker-red)',
                                      background: 'rgba(211, 47, 47, 0.1)',
                                      border: '1px solid rgba(211, 47, 47, 0.25)',
                                      padding: '1px 5px',
                                      borderRadius: 4
                                    }}>
                                      #{c.orderNumber}
                                    </span>
                                  )}
                                  <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{c.name}</span>
                                  {c.qgendaAbbr && (
                                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--surface-card)', padding: '1px 4px', borderRadius: 3 }}>
                                      {c.qgendaAbbr}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {c.roomAssignment && (
                                    <span style={{ fontSize: 10, color: 'var(--marker-green)', fontWeight: 700 }}>
                                      {c.roomAssignment}
                                    </span>
                                  )}
                                  <span style={{ fontSize: 11, color: 'var(--marker-red)', fontWeight: 700 }}>{c.shift || 'Post-Call'}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Non-Call List */}
                      <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
                          NON-CALL DOCTORS ({testSyncResult.departureCandidates.filter(c => c.category === 'non_call').length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
                          {testSyncResult.departureCandidates
                            .filter(c => c.category === 'non_call')
                            .map((c, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface-hover)', borderRadius: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {c.orderNumber && (
                                    <span style={{
                                      fontSize: 10,
                                      fontWeight: 900,
                                      color: 'var(--accent-primary)',
                                      background: 'rgba(9, 105, 218, 0.1)',
                                      border: '1px solid rgba(9, 105, 218, 0.25)',
                                      padding: '1px 5px',
                                      borderRadius: 4
                                    }}>
                                      #{c.orderNumber}
                                    </span>
                                  )}
                                  <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{c.name}</span>
                                  {c.qgendaAbbr && (
                                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--surface-card)', padding: '1px 4px', borderRadius: 3 }}>
                                      {c.qgendaAbbr}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {c.roomAssignment && (
                                    <span style={{ fontSize: 10, color: 'var(--marker-green)', fontWeight: 700 }}>
                                      {c.roomAssignment}
                                    </span>
                                  )}
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.facility} {c.shift ? `(${c.shift})` : ''}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Late Shift Candidates */}
                  {testSyncTab === 'lates' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {['3p', '4p', '5p', '7p', '8p', '7p-7a'].map(timeCat => {
                        const inCat = testSyncResult.lateCandidates.filter(l => l.timeCategory === timeCat);
                        if (inCat.length === 0) return null;
                        return (
                          <div key={timeCat} style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 900, background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>
                                {timeCat.toUpperCase()}
                              </span>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
                                {inCat.length} providers
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
                              {inCat.map((l, i) => (
                                <div key={i} style={{ padding: '6px 10px', background: 'var(--surface-hover)', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      {l.orderNumber && (
                                        <span style={{
                                          fontSize: 9,
                                          fontWeight: 900,
                                          color: 'var(--text-secondary)',
                                          background: 'rgba(0,0,0,0.06)',
                                          border: '1px solid var(--border-light)',
                                          padding: '1px 4px',
                                          borderRadius: 3
                                        }}>
                                          #{l.orderNumber}
                                        </span>
                                      )}
                                      <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{l.name}</span>
                                    </div>
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l.role} &bull; {l.facility}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
                                    {l.qgendaAbbr && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{l.qgendaAbbr}</span>}
                                    {l.roomAssignment && <span style={{ color: 'var(--marker-green)', fontWeight: 700 }}>{l.roomAssignment}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 4. Call Team Preview */}
                  {testSyncTab === 'callTeam' && (
                    <div style={{ maxWidth: 540 }}>
                      <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 12px' }}>Role</th>
                              <th style={{ padding: '8px 12px' }}>Assigned Doctor</th>
                              <th style={{ padding: '8px 12px' }}>Order #</th>
                              <th style={{ padding: '8px 12px' }}>QGenda ID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {testSyncResult.callTeamCandidates.map((c, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                <td style={{ padding: '8px 12px', fontWeight: 800, color: 'var(--accent-primary)' }}>{c.role}</td>
                                <td style={{ padding: '8px 12px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{c.doctorName}</td>
                                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                                  {c.orderNumber ? `#${c.orderNumber}` : '—'}
                                </td>
                                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                                  {c.qgendaAbbr || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview Footer */}
                <div style={{
                  padding: '12px 20px',
                  borderTop: '1px solid var(--border-light)',
                  background: 'var(--surface-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <strong>Note:</strong> This is a live preview test. Your active whiteboard, rooms, and assignments remain unmodified.
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestSyncResult(null)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 6,
                      background: 'var(--accent-primary)',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 12,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* App-Themed Deletion & Reset Confirmation Modal */}
      {deleteModalState && (
        <ConfirmDeleteModal
          isOpen={deleteModalState.isOpen}
          title={deleteModalState.title}
          itemName={deleteModalState.itemName}
          itemCategory={deleteModalState.itemCategory}
          message={deleteModalState.message}
          confirmButtonText={deleteModalState.confirmButtonText}
          cancelButtonText="Cancel"
          onConfirm={deleteModalState.onConfirm}
          onClose={() => setDeleteModalState(null)}
        />
      )}
    </div>
  );
};
