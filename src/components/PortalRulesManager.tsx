'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  PortalShiftRule, PortalCombinationRule, ScannedRoleItem, ScannedCombinationItem,
  DepartureCategoryType, LateCategoryType, RoomAssignmentStrategy, BoardInclusionStatus
} from '@/types/whiteboard';
import { 
  Search, Plus, Trash2, Edit2, RefreshCw, CheckCircle2, AlertTriangle, 
  Layers, Clock, Sliders, Filter, Sparkles, X, Check, Eye, HelpCircle, ShieldAlert
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { apiUrl } from '@/lib/api';

interface PortalRulesManagerProps {
  boardId?: string;
  activeFacilities?: string[];
  currentUser?: { id: string; username: string; displayName: string; role: string };
}

export const PortalRulesManager: React.FC<PortalRulesManagerProps> = ({
  boardId = 'current',
  activeFacilities = ['MHMC', 'MHVIL-SC', 'HIVF-SC'],
  currentUser
}) => {
  const [subTab, setSubTab] = useState<'shift_rules' | 'combinations' | 'discovery'>('shift_rules');
  const [shiftRules, setShiftRules] = useState<PortalShiftRule[]>([]);
  const [combinationRules, setCombinationRules] = useState<PortalCombinationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('ALL');
  const [roleTypeFilter, setRoleTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Edit / Add Shift Rule Modal
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShiftRule, setEditingShiftRule] = useState<Partial<PortalShiftRule> | null>(null);

  // Edit / Add Combination Rule Modal
  const [isCombModalOpen, setIsCombModalOpen] = useState(false);
  const [editingCombRule, setEditingCombRule] = useState<Partial<PortalCombinationRule> | null>(null);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    itemName: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Discovery / Live Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scannedRoles, setScannedRoles] = useState<ScannedRoleItem[]>([]);
  const [scannedCombinations, setScannedCombinations] = useState<ScannedCombinationItem[]>([]);
  const [scanStats, setScanStats] = useState<{
    totalRolesFound: number;
    affiliatedRolesCount: number;
    mappedCount: number;
    unmappedCount: number;
    coveragePercent: number;
    combinationsCount: number;
    unhandledCombinationsCount: number;
  } | null>(null);

  // Load rules on mount
  useEffect(() => {
    fetchRules();
  }, [boardId]);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/scraper/rules?boardId=${boardId}`));
      const data = await res.json();
      if (res.ok && data.success) {
        setShiftRules(data.shiftRules || []);
        setCombinationRules(data.combinationRules || []);
      } else {
        setStatusMsg({ text: `Failed to load rules: ${data.error}`, type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: `Error loading rules: ${err.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Role Harvest Scan
  const handleScanRoles = async () => {
    setIsScanning(true);
    setStatusMsg(null);
    try {
      const res = await fetch(apiUrl('/api/scraper/rules'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SCAN_ROLES',
          boardId,
          currentUser
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScannedRoles(data.scannedRoles || []);
        setScannedCombinations(data.scannedCombinations || []);
        setScanStats(data.stats);
        setSubTab('discovery');
        setStatusMsg({ 
          text: `Scan complete: ${data.stats.mappedCount}/${data.stats.affiliatedRolesCount} affiliated roles mapped (${data.stats.coveragePercent}% coverage).`, 
          type: 'success' 
        });
      } else {
        setStatusMsg({ text: `Scan failed: ${data.error}`, type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: `Error scanning schedule: ${err.message}`, type: 'error' });
    } finally {
      setIsScanning(false);
    }
  };

  // Save Shift Rule (Add or Edit)
  const handleSaveShiftRule = async () => {
    if (!editingShiftRule || !editingShiftRule.pattern) {
      setStatusMsg({ text: 'Pattern / Role code is required', type: 'error' });
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/scraper/rules'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPSERT_SHIFT_RULE',
          boardId,
          currentUser,
          payload: { rule: editingShiftRule }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShiftRules(data.shiftRules);
        setIsShiftModalOpen(false);
        setEditingShiftRule(null);
        setStatusMsg({ text: 'Shift rule saved successfully!', type: 'success' });
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        setStatusMsg({ text: `Failed to save rule: ${data.error}`, type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: `Network error: ${err.message}`, type: 'error' });
    }
  };

  // Delete Shift Rule
  const handleDeleteShiftRule = async (ruleId: string) => {
    try {
      const res = await fetch(apiUrl('/api/scraper/rules'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_SHIFT_RULE',
          boardId,
          currentUser,
          payload: { ruleId }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShiftRules(data.shiftRules);
        setStatusMsg({ text: 'Rule deleted.', type: 'success' });
        setTimeout(() => setStatusMsg(null), 2500);
      } else {
        setStatusMsg({ text: `Failed to delete rule: ${data.error}`, type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: `Error: ${err.message}`, type: 'error' });
    }
  };

  // Save Combination Rule
  const handleSaveCombRule = async () => {
    if (!editingCombRule || !editingCombRule.primaryPattern || !editingCombRule.secondaryPattern) {
      setStatusMsg({ text: 'Both Primary and Secondary role patterns are required', type: 'error' });
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/scraper/rules'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPSERT_COMBINATION_RULE',
          boardId,
          currentUser,
          payload: { combinationRule: editingCombRule }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCombinationRules(data.combinationRules);
        setIsCombModalOpen(false);
        setEditingCombRule(null);
        setStatusMsg({ text: 'Combination policy saved successfully!', type: 'success' });
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        setStatusMsg({ text: `Failed to save policy: ${data.error}`, type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: `Network error: ${err.message}`, type: 'error' });
    }
  };

  // Delete Combination Rule
  const handleDeleteCombRule = async (ruleId: string) => {
    try {
      const res = await fetch(apiUrl('/api/scraper/rules'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_COMBINATION_RULE',
          boardId,
          currentUser,
          payload: { ruleId }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCombinationRules(data.combinationRules);
        setStatusMsg({ text: 'Combination policy deleted.', type: 'success' });
        setTimeout(() => setStatusMsg(null), 2500);
      }
    } catch (err: any) {
      setStatusMsg({ text: `Error: ${err.message}`, type: 'error' });
    }
  };

  // Reset to Baseline Defaults
  const handleResetDefaults = async () => {
    try {
      const res = await fetch(apiUrl('/api/scraper/rules'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_DEFAULT_RULES',
          boardId,
          currentUser
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShiftRules(data.shiftRules);
        setCombinationRules(data.combinationRules);
        setStatusMsg({ text: 'Rules reset to baseline defaults.', type: 'success' });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err: any) {
      setStatusMsg({ text: `Error resetting rules: ${err.message}`, type: 'error' });
    }
  };

  // Filtered shift rules
  const filteredShiftRules = useMemo(() => {
    return shiftRules.filter(r => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesPattern = r.pattern.toLowerCase().includes(q);
        const matchesNotes = r.notes?.toLowerCase().includes(q);
        const matchesHours = r.shiftHours?.toLowerCase().includes(q);
        if (!matchesPattern && !matchesNotes && !matchesHours) return false;
      }
      if (facilityFilter !== 'ALL' && r.facilityCode !== facilityFilter) return false;
      if (roleTypeFilter !== 'ALL' && r.roleType !== roleTypeFilter && r.roleType !== 'ANY') return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'active' && !r.active) return false;
        if (statusFilter === 'inactive' && r.active) return false;
      }
      return true;
    });
  }, [shiftRules, searchQuery, facilityFilter, roleTypeFilter, statusFilter]);

  // Unique facilities from current rules
  const availableFacilities = useMemo(() => {
    const set = new Set<string>(['ALL', ...activeFacilities]);
    shiftRules.forEach(r => {
      if (r.facilityCode) set.add(r.facilityCode);
    });
    return Array.from(set);
  }, [shiftRules, activeFacilities]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Banner / Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        background: 'var(--surface-card)',
        padding: '14px 18px',
        borderRadius: 8,
        border: '1px solid var(--border-light)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sliders size={20} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Portal Shift Reference Table</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Deterministic mapping engine translating OneUSAP & QGenda schedule tokens to whiteboard placements.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleScanRoles}
            disabled={isScanning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              background: 'var(--accent-primary)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              cursor: isScanning ? 'wait' : 'pointer'
            }}
          >
            <RefreshCw size={14} className={isScanning ? 'spin' : ''} />
            <span>{isScanning ? 'Scanning Live...' : 'Pull & Scan Roles'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingShiftRule({
                pattern: '',
                facilityCode: activeFacilities[0] || 'MHMC',
                roleType: 'ANY',
                shiftHours: '7a-3p',
                boardStatus: 'include',
                roomAssignmentStrategy: 'scraped',
                departureCategory: 'scheduled_time',
                departureTimeEstimate: '3p',
                lateCategory: '3p',
                active: true,
                priority: 10
              });
              setIsShiftModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Plus size={14} />
            <span>New Shift Rule</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: statusMsg.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${statusMsg.type === 'success' ? '#10b981' : '#ef4444'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Coverage & Discovery Header Card (if scanned) */}
      {scanStats && (
        <div style={{
          background: scanStats.coveragePercent === 100 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          border: `1px solid ${scanStats.coveragePercent === 100 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: scanStats.coveragePercent === 100 ? '#10b981' : '#f59e0b',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 14
            }}>
              {scanStats.coveragePercent}%
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                Schedule Coverage: {scanStats.mappedCount} of {scanStats.affiliatedRolesCount} Active Roles Mapped
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {scanStats.unmappedCount === 0 
                  ? '🎯 100% of roles found in today\'s live schedule are mapped and handled!' 
                  : `⚠️ ${scanStats.unmappedCount} unmapped role(s) detected for this board. Review below.`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setSubTab('discovery')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: subTab === 'discovery' ? 'var(--accent-primary)' : 'var(--surface-hover)',
                color: subTab === 'discovery' ? '#fff' : 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 700,
                border: '1px solid var(--border-light)',
                cursor: 'pointer'
              }}
            >
              View Scanned Roles ({scanStats.affiliatedRolesCount})
            </button>
          </div>
        </div>
      )}

      {/* Sub-Tabs Navigation */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>
        <button
          type="button"
          onClick={() => setSubTab('shift_rules')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 6,
            background: subTab === 'shift_rules' ? 'var(--accent-primary)' : 'transparent',
            color: subTab === 'shift_rules' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Layers size={14} />
          <span>All Shift Rules ({shiftRules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('combinations')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 6,
            background: subTab === 'combinations' ? 'var(--accent-primary)' : 'transparent',
            color: subTab === 'combinations' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Sparkles size={14} />
          <span>Combination Policies ({combinationRules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('discovery')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 6,
            background: subTab === 'discovery' ? 'var(--accent-primary)' : 'transparent',
            color: subTab === 'discovery' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Search size={14} />
          <span>Role Discovery Assistant {scanStats?.unmappedCount ? `(${scanStats.unmappedCount} Unmapped)` : ''}</span>
        </button>
      </div>

      {/* SUB-TAB 1: ALL SHIFT RULES */}
      {subTab === 'shift_rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Search & Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search pattern, code, departure, notes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 30px',
                  borderRadius: 6,
                  border: '1px solid var(--border-light)',
                  background: 'var(--surface-hover)',
                  color: 'var(--text-primary)',
                  fontSize: 12
                }}
              />
            </div>

            <select
              value={facilityFilter}
              onChange={e => setFacilityFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-light)',
                background: 'var(--surface-hover)',
                color: 'var(--text-primary)',
                fontSize: 12
              }}
            >
              <option value="ALL">All Facilities</option>
              {availableFacilities.filter(f => f !== 'ALL').map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            <select
              value={roleTypeFilter}
              onChange={e => setRoleTypeFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-light)',
                background: 'var(--surface-hover)',
                color: 'var(--text-primary)',
                fontSize: 12
              }}
            >
              <option value="ALL">All Role Types</option>
              <option value="MD">Physician (MD)</option>
              <option value="CRNA">Anesthetist (CRNA)</option>
              <option value="ANY">Any Provider</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setDeleteModal({
                  isOpen: true,
                  title: 'Reset Rules to Baseline Defaults',
                  itemName: 'All Custom Shift Rules & Policies',
                  message: 'This will restore all shift rules and combination policies to standard USAP baseline definitions.',
                  onConfirm: () => {
                    handleResetDefaults();
                    setDeleteModal(null);
                  }
                });
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: 'transparent',
                border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Reset Baseline
            </button>
          </div>

          {/* Rules Table */}
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 8,
            overflow: 'auto',
            maxHeight: 520
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 14px' }}>Pattern / Role Code</th>
                  <th style={{ padding: '10px 14px' }}>Facility</th>
                  <th style={{ padding: '10px 14px' }}>Type</th>
                  <th style={{ padding: '10px 14px' }}>Hours</th>
                  <th style={{ padding: '10px 14px' }}>Departure Queue</th>
                  <th style={{ padding: '10px 14px' }}>Late List Bucket</th>
                  <th style={{ padding: '10px 14px' }}>Badge Note</th>
                  <th style={{ padding: '10px 14px' }}>Board Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShiftRules.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No shift rules match your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredShiftRules.map(rule => (
                    <tr 
                      key={rule.id}
                      style={{ 
                        borderBottom: '1px solid var(--border-light)',
                        opacity: rule.active ? 1 : 0.5
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700 }}>
                        {rule.pattern}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background: rule.facilityCode === 'ALL' ? 'var(--surface-hover)' : 'rgba(59, 130, 246, 0.12)',
                          color: rule.facilityCode === 'ALL' ? 'var(--text-secondary)' : '#3b82f6'
                        }}>
                          {rule.facilityCode}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background: rule.roleType === 'MD' ? 'rgba(16, 185, 129, 0.12)' : rule.roleType === 'CRNA' ? 'rgba(139, 92, 246, 0.12)' : 'var(--surface-hover)',
                          color: rule.roleType === 'MD' ? '#10b981' : rule.roleType === 'CRNA' ? '#8b5cf6' : 'var(--text-secondary)'
                        }}>
                          {rule.roleType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        {rule.shiftHours || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 600 }}>
                          {rule.departureCategory === 'scheduled_time' ? `Scheduled (${rule.departureTimeEstimate || 'Clock'})` :
                           (rule.departureCategory === 'post_call' || rule.departureCategory === 'post_call_10a') ? 'Post-Call Priority' :
                           rule.departureCategory === 'non_call_queue' ? 'Non-Call Queue' :
                           rule.departureCategory === 'special' ? 'Special Departure' : 'None'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background: rule.lateCategory !== 'none' ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface-hover)',
                          color: rule.lateCategory !== 'none' ? '#f59e0b' : 'var(--text-secondary)'
                        }}>
                          {rule.lateCategory !== 'none' ? rule.lateCategory : 'None'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {rule.badgeNote ? (
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 800,
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#059669',
                            border: '1px solid rgba(16, 185, 129, 0.25)'
                          }}>
                            {rule.badgeNote}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background: rule.boardStatus === 'include' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: rule.boardStatus === 'include' ? '#10b981' : '#ef4444'
                        }}>
                          {rule.boardStatus === 'include' ? 'Include' : 'Exclude'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingShiftRule(rule);
                              setIsShiftModalOpen(true);
                            }}
                            title="Edit Rule"
                            style={{
                              padding: '4px 8px',
                              borderRadius: 4,
                              background: 'var(--surface-hover)',
                              border: '1px solid var(--border-light)',
                              color: 'var(--text-primary)',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteModal({
                                isOpen: true,
                                title: `Delete Rule "${rule.pattern}"`,
                                itemName: rule.pattern,
                                message: `Are you sure you want to remove the shift rule for "${rule.pattern}"?`,
                                onConfirm: () => {
                                  handleDeleteShiftRule(rule.id);
                                  setDeleteModal(null);
                                }
                              });
                            }}
                            title="Delete Rule"
                            style={{
                              padding: '4px 8px',
                              borderRadius: 4,
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#ef4444',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: COMBINATION RULES */}
      {subTab === 'combinations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Explicit resolution policies for providers holding multiple roles simultaneously (e.g. Post-OB + Outside Hospital Call).
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingCombRule({
                  name: '',
                  primaryPattern: '',
                  secondaryPattern: '',
                  condition: 'has_both',
                  boardStatus: 'include',
                  departureCategory: 'post_call_10a',
                  departureTimeEstimate: '10a',
                  lateCategory: 'none',
                  roomAssignmentStrategy: 'scraped',
                  active: true
                });
                setIsCombModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 6,
                background: 'var(--accent-primary)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Plus size={14} />
              <span>New Combination Policy</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {combinationRules.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface-card)', borderRadius: 8 }}>
                No multi-role combination policies defined yet.
              </div>
            ) : (
              combinationRules.map(comb => (
                <div
                  key={comb.id}
                  style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{comb.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        [{comb.primaryPattern}]
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>+</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}>
                        [{comb.secondaryPattern}]
                      </span>
                    </div>
                    {comb.notes && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {comb.notes}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: comb.boardStatus === 'include' ? '#10b981' : '#ef4444' }}>
                        {comb.boardStatus === 'include' ? 'Include on Board' : 'Exclude from Board'}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                        Dep: {comb.departureCategory} | Late: {comb.lateCategory}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCombRule(comb);
                          setIsCombModalOpen(true);
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 4,
                          background: 'var(--surface-hover)',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteModal({
                            isOpen: true,
                            title: `Delete Policy "${comb.name}"`,
                            itemName: comb.name,
                            message: `Are you sure you want to delete this combination policy?`,
                            onConfirm: () => {
                              handleDeleteCombRule(comb.id);
                              setDeleteModal(null);
                            }
                          });
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 4,
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ROLE DISCOVERY ASSISTANT */}
      {subTab === 'discovery' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            background: 'var(--surface-card)',
            padding: '14px 18px',
            borderRadius: 8,
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Live Schedule Role Discovery</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Scans current portal schedule rows to identify active role tokens and highlight unmapped definitions.
              </div>
            </div>

            <button
              type="button"
              onClick={handleScanRoles}
              disabled={isScanning}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 6,
                background: 'var(--accent-primary)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: isScanning ? 'wait' : 'pointer'
              }}
            >
              <RefreshCw size={14} className={isScanning ? 'spin' : ''} />
              <span>{isScanning ? 'Scanning...' : 'Re-Scan Schedule'}</span>
            </button>
          </div>

          {scannedRoles.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface-card)', borderRadius: 8 }}>
              Click <strong>"Pull & Scan Roles"</strong> above to extract all active roles from today's schedule.
            </div>
          ) : (
            <div style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              overflow: 'auto',
              maxHeight: 520
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 14px' }}>Role Token</th>
                    <th style={{ padding: '10px 14px' }}>Type</th>
                    <th style={{ padding: '10px 14px' }}>Frequency</th>
                    <th style={{ padding: '10px 14px' }}>Sample Provider</th>
                    <th style={{ padding: '10px 14px' }}>Affiliation</th>
                    <th style={{ padding: '10px 14px' }}>Mapping Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scannedRoles.map(item => (
                    <tr 
                      key={item.token}
                      style={{ 
                        borderBottom: '1px solid var(--border-light)',
                        background: !item.isMapped && item.isAffiliatedWithBoard ? 'rgba(245, 158, 11, 0.04)' : undefined
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700 }}>
                        {item.token}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background: item.roleType === 'MD' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                          color: item.roleType === 'MD' ? '#10b981' : '#8b5cf6'
                        }}>
                          {item.roleType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        Seen {item.frequency}x
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        {item.sampleProvider || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background: item.isAffiliatedWithBoard ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface-hover)',
                          color: item.isAffiliatedWithBoard ? '#3b82f6' : 'var(--text-secondary)'
                        }}>
                          {item.isAffiliatedWithBoard ? 'This Board' : 'Outside Facility'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {item.isMapped ? (
                          <span style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Check size={14} /> Mapped
                          </span>
                        ) : (
                          <span style={{ color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={14} /> UNMAPPED
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {!item.isMapped ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingShiftRule({
                                pattern: item.token,
                                facilityCode: item.facilityCode || activeFacilities[0] || 'MHMC',
                                roleType: item.roleType,
                                shiftHours: '7a-3p',
                                boardStatus: item.isAffiliatedWithBoard ? 'include' : 'exclude',
                                roomAssignmentStrategy: 'scraped',
                                departureCategory: 'scheduled_time',
                                departureTimeEstimate: '3p',
                                lateCategory: 'none',
                                active: true,
                                priority: 10
                              });
                              setIsShiftModalOpen(true);
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 4,
                              background: '#10b981',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 700,
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            + Define Rule
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const existing = shiftRules.find(r => r.id === item.matchedRuleId || r.pattern.toUpperCase() === item.token.toUpperCase());
                              if (existing) {
                                setEditingShiftRule(existing);
                                setIsShiftModalOpen(true);
                              }
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 4,
                              background: 'var(--surface-hover)',
                              border: '1px solid var(--border-light)',
                              color: 'var(--text-secondary)',
                              fontSize: 11,
                              cursor: 'pointer'
                            }}
                          >
                            View Rule
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SHIFT RULE MODAL (THE ACTION BOX) */}
      {isShiftModalOpen && editingShiftRule && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 10,
            width: '100%',
            maxWidth: 580,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-hover)'
            }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                {editingShiftRule.id ? 'Edit Shift Rule' : 'New Shift Rule'}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsShiftModalOpen(false);
                  setEditingShiftRule(null);
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 600, overflow: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Shift Pattern / Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 12h-7p:Noct_MHMC, Dr8h_MHMC"
                    value={editingShiftRule.pattern || ''}
                    onChange={e => setEditingShiftRule(prev => ({ ...prev, pattern: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-light)',
                      background: 'var(--surface-hover)',
                      color: 'var(--text-primary)',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      marginTop: 4
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Facility</label>
                  <input
                    type="text"
                    placeholder="e.g. MHMC, ALL"
                    value={editingShiftRule.facilityCode || ''}
                    onChange={e => setEditingShiftRule(prev => ({ ...prev, facilityCode: e.target.value.toUpperCase() }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-light)',
                      background: 'var(--surface-hover)',
                      color: 'var(--text-primary)',
                      fontSize: 12,
                      marginTop: 4
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Provider Type</label>
                  <select
                    value={editingShiftRule.roleType || 'ANY'}
                    onChange={e => setEditingShiftRule(prev => ({ ...prev, roleType: e.target.value as any }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-light)',
                      background: 'var(--surface-hover)',
                      color: 'var(--text-primary)',
                      fontSize: 12,
                      marginTop: 4
                    }}
                  >
                    <option value="ANY">Any Provider</option>
                    <option value="MD">Physician (MD)</option>
                    <option value="CRNA">Anesthetist (CRNA)</option>
                  </select>
                </div>
              </div>

              {/* ACTION BOX CONTAINER */}
              <div style={{
                border: '2px solid var(--accent-primary)',
                borderRadius: 8,
                padding: '14px 16px',
                background: 'rgba(59, 130, 246, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Action Box (Deterministic Placement Settings)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* 1. Board Status */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>1. Board Inclusion</label>
                    <select
                      value={editingShiftRule.boardStatus || 'include'}
                      onChange={e => setEditingShiftRule(prev => ({ ...prev, boardStatus: e.target.value as any }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border-light)',
                        background: 'var(--surface-hover)',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        marginTop: 4
                      }}
                    >
                      <option value="include">Include on Board</option>
                      <option value="exclude">Exclude / Filter Out (Outside Facility or Off)</option>
                    </select>
                  </div>

                  {/* 2. Room Assignment Strategy */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>2. Room Assignment Strategy</label>
                    <select
                      value={editingShiftRule.roomAssignmentStrategy || 'scraped'}
                      onChange={e => setEditingShiftRule(prev => ({ ...prev, roomAssignmentStrategy: e.target.value as any }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border-light)',
                        background: 'var(--surface-hover)',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        marginTop: 4
                      }}
                    >
                      <option value="scraped">Keep Scraped Room (Auto-Assign)</option>
                      <option value="unassigned_pool">Force to Unassigned Tray (No Room)</option>
                      <option value="runner">Assign as Department Runner</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* 3. Departure Queue */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>3. Departure Queue</label>
                    <select
                      value={editingShiftRule.departureCategory || 'scheduled_time'}
                      onChange={e => setEditingShiftRule(prev => ({ ...prev, departureCategory: e.target.value as any }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border-light)',
                        background: 'var(--surface-hover)',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        marginTop: 4
                      }}
                    >
                      <option value="scheduled_time">Scheduled Time (e.g. 3p, 5p, 7p)</option>
                      <option value="non_call_queue">Order of Departure (Non-Call Queue)</option>
                      <option value="post_call">Post-Call Priority</option>
                      <option value="post_call_10a">Post-Call Priority (Legacy 10a)</option>
                      <option value="special">Special / Atypical Departure</option>
                      <option value="none">None (Do Not Add to Departures)</option>
                    </select>
                  </div>

                  {/* 4. Late List Bucket */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>4. Late List Bucket</label>
                    <select
                      value={editingShiftRule.lateCategory || 'none'}
                      onChange={e => setEditingShiftRule(prev => ({ ...prev, lateCategory: e.target.value as any }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border-light)',
                        background: 'var(--surface-hover)',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        marginTop: 4
                      }}
                    >
                      <option value="none">None (Suppress from Lates)</option>
                      <option value="3p">3p Late</option>
                      <option value="4p">4p Late</option>
                      <option value="5p">5p Late</option>
                      <option value="7p">7p Late</option>
                      <option value="7p-7a">7p-7a (Night Nocturnist)</option>
                      <option value="8p">8p Late</option>
                      <option value="24h">24h Shift</option>
                    </select>
                  </div>
                </div>

                {editingShiftRule.departureCategory === 'scheduled_time' && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Departure Time Estimate</label>
                    <input
                      type="text"
                      placeholder="e.g. 3p, 5p, 7p, 8p"
                      value={editingShiftRule.departureTimeEstimate || ''}
                      onChange={e => setEditingShiftRule(prev => ({ ...prev, departureTimeEstimate: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border-light)',
                        background: 'var(--surface-hover)',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        marginTop: 4
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Adjacent Badge / Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. postC1, postCV, preC2, preCV, WOR, WOV"
                  value={editingShiftRule.badgeNote || ''}
                  onChange={e => setEditingShiftRule(prev => ({ ...prev, badgeNote: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    marginTop: 4
                  }}
                />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  Custom badge displayed next to provider name (green badge on Departure list, orange badge on Late list).
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Notes & Rationale (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Doctor working 8-hour shift until 3:00 PM"
                  value={editingShiftRule.notes || ''}
                  onChange={e => setEditingShiftRule(prev => ({ ...prev, notes: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    marginTop: 4
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 18px',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              background: 'var(--surface-hover)'
            }}>
              <button
                type="button"
                onClick={() => {
                  setIsShiftModalOpen(false);
                  setEditingShiftRule(null);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border-light)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveShiftRule}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMBINATION RULE MODAL */}
      {isCombModalOpen && editingCombRule && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 10,
            width: '100%',
            maxWidth: 580,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-hover)'
            }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                {editingCombRule.id ? 'Edit Combination Policy' : 'New Combination Policy'}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCombModalOpen(false);
                  setEditingCombRule(null);
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Policy Name</label>
                <input
                  type="text"
                  placeholder="e.g. Post-OB at MHMC + Outside Katy Call"
                  value={editingCombRule.name || ''}
                  onChange={e => setEditingCombRule(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    marginTop: 4
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Primary Role Pattern</label>
                  <input
                    type="text"
                    placeholder="e.g. CIHOBPC_MHMC"
                    value={editingCombRule.primaryPattern || ''}
                    onChange={e => setEditingCombRule(prev => ({ ...prev, primaryPattern: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-light)',
                      background: 'var(--surface-hover)',
                      color: 'var(--text-primary)',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      marginTop: 4
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Secondary Role Pattern</label>
                  <input
                    type="text"
                    placeholder="e.g. L1_MHKTY"
                    value={editingCombRule.secondaryPattern || ''}
                    onChange={e => setEditingCombRule(prev => ({ ...prev, secondaryPattern: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-light)',
                      background: 'var(--surface-hover)',
                      color: 'var(--text-primary)',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      marginTop: 4
                    }}
                  />
                </div>
              </div>

              <div style={{
                border: '2px solid var(--accent-primary)',
                borderRadius: 8,
                padding: '14px 16px',
                background: 'rgba(59, 130, 246, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                  Policy Resolution Action
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Board Status</label>
                    <select
                      value={editingCombRule.boardStatus || 'include'}
                      onChange={e => setEditingCombRule(prev => ({ ...prev, boardStatus: e.target.value as any }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border-light)',
                        background: 'var(--surface-hover)',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        marginTop: 4
                      }}
                    >
                      <option value="include">Include on Board</option>
                      <option value="exclude">Exclude from Board</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Departure Queue Action</label>
                    <select
                      value={editingCombRule.departureCategory || 'post_call_10a'}
                      onChange={e => setEditingCombRule(prev => ({ ...prev, departureCategory: e.target.value as any }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border-light)',
                        background: 'var(--surface-hover)',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        marginTop: 4
                      }}
                    >
                      <option value="post_call">Post-Call Priority</option>
                      <option value="post_call_10a">Post-Call Priority (Legacy 10a)</option>
                      <option value="scheduled_time">Scheduled Time Departure</option>
                      <option value="non_call_queue">Order of Departure Queue</option>
                      <option value="none">None (Suppress from Departures)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Late List Action</label>
                    <select
                      value={editingCombRule.lateCategory || 'none'}
                      onChange={e => setEditingCombRule(prev => ({ ...prev, lateCategory: e.target.value as any }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border-light)',
                        background: 'var(--surface-hover)',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        marginTop: 4
                      }}
                    >
                      <option value="none">None (Suppress Outside Late)</option>
                      <option value="7p">7p Late</option>
                      <option value="7p-7a">7p-7a (Night Nocturnist)</option>
                      <option value="3p">3p Late</option>
                      <option value="5p">5p Late</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Room Assignment Strategy</label>
                    <select
                      value={editingCombRule.roomAssignmentStrategy || 'scraped'}
                      onChange={e => setEditingCombRule(prev => ({ ...prev, roomAssignmentStrategy: e.target.value as any }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border-light)',
                        background: 'var(--surface-hover)',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        marginTop: 4
                      }}
                    >
                      <option value="scraped">Keep Scraped Room Assignment</option>
                      <option value="unassigned_pool">Force to Unassigned Pool</option>
                      <option value="runner">Assign as Department Runner</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Notes & Clinical Guidance</label>
                <input
                  type="text"
                  placeholder="e.g. Keep provider in morning room until 10a; suppress outside Katy call from MHMC board"
                  value={editingCombRule.notes || ''}
                  onChange={e => setEditingCombRule(prev => ({ ...prev, notes: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    marginTop: 4
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: '12px 18px',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              background: 'var(--surface-hover)'
            }}>
              <button
                type="button"
                onClick={() => {
                  setIsCombModalOpen(false);
                  setEditingCombRule(null);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border-light)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCombRule}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Save Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteModal && (
        <ConfirmDeleteModal
          isOpen={deleteModal.isOpen}
          title={deleteModal.title}
          itemName={deleteModal.itemName}
          message={deleteModal.message}
          confirmButtonText="Delete"
          onClose={() => setDeleteModal(null)}
          onConfirm={deleteModal.onConfirm}
        />
      )}
    </div>
  );
};
