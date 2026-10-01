'use client';

import React, { useState, useEffect } from 'react';
import { User, Staff, Department, ScraperConfig, UserRole, StaffCredential } from '@/types/whiteboard';
import { 
  Users, UserCheck, ShieldCheck, Layout, Globe, 
  Plus, Trash2, Edit2, Key, RefreshCw, X, Check, RotateCcw, AlertTriangle 
} from 'lucide-react';

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
  const [scraperSaving, setScraperSaving] = useState(false);
  const [scraperMsg, setScraperMsg] = useState('');

  // Fetch users when opening modal
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

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

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
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

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff member from the roster?')) return;
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

  // --- Handlers for Scraper Config ---
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
            portalUrl,
            username: portalUser,
            password: portalPass,
            autoSyncIntervalMinutes: Number(autoSyncMins),
            mockMode
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
                            onClick={() => handleDeleteUser(u.id)}
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
                              onClick={() => handleDeleteStaff(s.id)}
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
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800 }}>Department & Room Structure</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Add or remove rooms, runner slots, and customize the surgical suite layout
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Reset entire whiteboard layout and assignments back to the photo default?')) {
                      onResetToPhotoDefault();
                    }
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
              </div>

              {/* Department Overview Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {departments.map((dept, deptIdx) => (
                  <div
                    key={dept.id}
                    style={{
                      background: 'var(--surface-hover)',
                      borderRadius: 8,
                      padding: 12,
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase' }}>
                        {dept.name}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {dept.rooms.length} Rooms • {dept.runnerSlots.length} Runners
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      <strong>Rooms:</strong> {dept.rooms.map(r => r.name).join(', ')}
                    </div>

                    {dept.runnerSlots.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        <strong>Runners:</strong> {dept.runnerSlots.map(r => r.title).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
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
                    onChange={e => setPortalType(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--surface-hover)' }}
                  >
                    <option value="qgenda">QGenda Cloud Portal</option>
                    <option value="amion">Amion Scheduling System</option>
                    <option value="custom">Custom Hospital Portal URL</option>
                  </select>
                </div>

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

                <button
                  type="submit"
                  disabled={scraperSaving}
                  style={{
                    marginTop: 10,
                    padding: '12px',
                    borderRadius: 6,
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 14
                  }}
                >
                  {scraperSaving ? 'Saving Portal Settings...' : 'Save Scraper Credentials'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
