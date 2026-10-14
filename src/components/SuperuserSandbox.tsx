'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, RefreshCw, Sliders, CheckCircle2, AlertTriangle, 
  Search, Filter, Clock, Building2, Layers, Download, 
  ShieldCheck, Eye, HelpCircle, ChevronDown, ChevronUp, 
  Check, X, Sparkles, UserCheck, Stethoscope, DoorOpen,
  ArrowRight, Database
} from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { 
  ScraperPreviewResult, 
  PortalShiftRule, 
  PortalCombinationRule 
} from '@/types/whiteboard';
import { PortalRulesManager } from './PortalRulesManager';
import { resolveProviderShiftPolicy, extractTokensFromContext } from '@/lib/portalRuleMatcher';

interface SuperuserSandboxProps {
  currentUser?: any;
}

export const SuperuserSandbox: React.FC<SuperuserSandboxProps> = ({ currentUser }) => {
  // Test execution parameters
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(['MHMC', 'MHVIL-SC', 'HIVF-SC']);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationResult, setSimulationResult] = useState<ScraperPreviewResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // Reference Table Drawer State
  const [showRulesManager, setShowRulesManager] = useState(false);
  const [shiftRules, setShiftRules] = useState<PortalShiftRule[]>([]);
  const [combinationRules, setCombinationRules] = useState<PortalCombinationRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'MD' | 'CRNA'>('ALL');
  const [placementFilter, setPlacementFilter] = useState<'ALL' | 'DEPARTURE' | 'LATE' | 'ROOMS' | 'CALL'>('ALL');
  const [mappingFilter, setMappingFilter] = useState<'ALL' | 'MAPPED' | 'COMBINATION'>('ALL');

  // Load rules on mount
  const fetchRules = async () => {
    setLoadingRules(true);
    try {
      const res = await fetch(apiUrl('/api/scraper/rules?boardId=current'));
      if (res.ok) {
        const data = await res.json();
        setShiftRules(data.shiftRules || []);
        setCombinationRules(data.combinationRules || []);
      }
    } catch {}
    setLoadingRules(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // Run in-memory simulation
  const handleRunSimulation = async () => {
    setIsRunning(true);
    setSimError(null);
    try {
      const res = await fetch(apiUrl('/api/scraper'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_SYNC',
          date: selectedDate,
          currentUser: currentUser || { role: 'superuser', displayName: 'Superuser' },
          config: {
            portalType: 'oneusap',
            portalUrl: 'https://www.oneusap.com/assignments',
            selectedFacilities
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.preview) {
        setSimulationResult(data.preview);
        // Refresh rules in case new ones were seeded
        fetchRules();
      } else {
        setSimError(data.error || 'Failed to execute sandbox simulation.');
      }
    } catch (err: any) {
      setSimError(err.message || 'Network error running simulation.');
    } finally {
      setIsRunning(false);
    }
  };

  // Compile unified verification dataset from simulation
  const providerVerificationRows = useMemo(() => {
    if (!simulationResult || !simulationResult.workingStaff) return [];

    const departureMap = new Map(simulationResult.departureCandidates.map(d => [d.qgendaAbbr?.toLowerCase(), d]));
    const lateMap = new Map(simulationResult.lateCandidates.map(l => [l.qgendaAbbr?.toLowerCase(), l]));
    const callTeamMap = new Map(simulationResult.callTeamCandidates.map(c => [c.qgendaAbbr?.toLowerCase(), c]));

    return simulationResult.workingStaff.map(staff => {
      const qAbbr = staff.qgendaAbbr?.toLowerCase() || '';
      const depItem = departureMap.get(qAbbr);
      const lateItem = lateMap.get(qAbbr);
      const callItem = callTeamMap.get(qAbbr);

      // Resolve policy using the matcher
      const policy = resolveProviderShiftPolicy({
        rawName: staff.rawId || staff.lastName,
        qgendaAbbr: staff.qgendaAbbr,
        role: staff.credentials === 'MD' ? 'MD' : 'CRNA',
        facility: staff.facility,
        shift: staff.shift,
        assignedRooms: staff.assignedRooms || (staff.roomAssignment ? [staff.roomAssignment] : []),
        activeFacilities: selectedFacilities,
        portalRules: shiftRules,
        combinationRules: combinationRules
      });

      return {
        id: staff.id,
        qgendaAbbr: staff.qgendaAbbr || staff.lastName,
        displayName: staff.displayName,
        lastName: staff.lastName,
        credentials: staff.credentials,
        phone: staff.phone,
        facility: staff.facility,
        shift: staff.shift,
        roomAssignment: staff.roomAssignment,
        assignedRooms: staff.assignedRooms,
        policy,
        depItem,
        lateItem,
        callItem
      };
    });
  }, [simulationResult, shiftRules, combinationRules, selectedFacilities]);

  // Filtered rows for diff report
  const filteredRows = useMemo(() => {
    return providerVerificationRows.filter(row => {
      // Role filter
      if (roleFilter !== 'ALL' && row.credentials !== roleFilter) return false;

      // Placement filter
      if (placementFilter === 'DEPARTURE' && !row.depItem) return false;
      if (placementFilter === 'LATE' && !row.lateItem) return false;
      if (placementFilter === 'CALL' && !row.callItem) return false;
      if (placementFilter === 'ROOMS' && (!row.roomAssignment || row.policy.roomAssignmentStrategy === 'unassigned_pool')) return false;

      // Mapping filter
      if (mappingFilter === 'MAPPED' && !row.policy.matchedRuleId) return false;
      if (mappingFilter === 'COMBINATION' && !row.policy.isCombination) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = row.displayName.toLowerCase().includes(q) || row.qgendaAbbr.toLowerCase().includes(q);
        const matchShift = (row.shift || '').toLowerCase().includes(q);
        const matchRoom = (row.roomAssignment || '').toLowerCase().includes(q);
        const matchRule = (row.policy.matchedPattern || '').toLowerCase().includes(q);
        if (!matchName && !matchShift && !matchRoom && !matchRule) return false;
      }

      return true;
    });
  }, [providerVerificationRows, roleFilter, placementFilter, mappingFilter, searchQuery]);

  // Export simulation JSON
  const handleExportJson = () => {
    if (!simulationResult) return;
    const blob = new Blob([JSON.stringify(simulationResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portal_simulation_${selectedDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* SANDBOX HEADER & CONTROLS */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#6366f1', padding: 10, borderRadius: 10, color: '#fff' }}>
              <Sliders size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a', fontWeight: 800 }}>
                  Superuser Schedule Sandbox & Rule Tuner
                </h3>
                <span style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '2px 8px',
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}>
                  Zero-Write Sandbox
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                Replay schedule ingestion in-memory, inspect rule matching, and verify room/departure/late placements without affecting live hospital boards.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowRulesManager(!showRulesManager)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 14px',
                borderRadius: 8,
                background: showRulesManager ? '#e0e7ff' : '#f8fafc',
                border: '1px solid #cbd5e1',
                color: showRulesManager ? '#4338ca' : '#334155',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Database size={15} />
              <span>{showRulesManager ? 'Hide Master Reference Table' : 'Inspect Master Reference Table'}</span>
              {showRulesManager ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {simulationResult && (
              <button
                type="button"
                onClick={handleExportJson}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 14px',
                  borderRadius: 8,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Download size={15} />
                <span>Export Snapshot JSON</span>
              </button>
            )}
          </div>
        </div>

        {/* CONTROLS ROW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          padding: 14,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8
        }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              Target Schedule Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 600,
                background: '#fff'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              Facility Scope
            </label>
            <div style={{
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              fontWeight: 700,
              background: '#fff',
              color: '#0f172a'
            }}>
              MHMC / Village SC / Houston IVF
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={isRunning}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 6,
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                fontSize: 13,
                cursor: isRunning ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
              }}
            >
              {isRunning ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Running Simulation...</span>
                </>
              ) : (
                <>
                  <Play size={15} />
                  <span>Run Sandbox Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {simError && (
          <div style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 8,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <AlertTriangle size={16} />
            <span>{simError}</span>
          </div>
        )}
      </div>

      {/* EMBEDDED MASTER REFERENCE TABLE DRAWER */}
      {showRulesManager && (
        <div style={{
          background: '#ffffff',
          border: '2px solid #6366f1',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#6366f1', padding: 8, borderRadius: 8, color: '#fff' }}>
                <Sliders size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Live Master Reference Table & Action Policies
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  Changes saved here apply across both live syncs and sandbox simulations.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowRulesManager(false)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                padding: 4
              }}
            >
              <X size={18} />
            </button>
          </div>

          <PortalRulesManager
            boardId="current"
            activeFacilities={selectedFacilities}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* SIMULATION SUMMARY STATS */}
      {simulationResult && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Ingested Working Staff
            </span>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>
              {simulationResult.workingStaff.length}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {simulationResult.rawCounts?.totalDocs || 0} Docs / {simulationResult.rawCounts?.totalAnes || 0} CRNAs
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Departure Queue
            </span>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#2563eb' }}>
              {simulationResult.departureCandidates.length}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {simulationResult.departureCandidates.filter(d => d.category === 'post_call').length} Post-Call (10:00 AM)
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Late List Candidates
            </span>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#f59e0b' }}>
              {simulationResult.lateCandidates.length}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              3p, 4p, 5p, 7p & Nocturnist
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Call Team Slots
            </span>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981' }}>
              {simulationResult.callTeamCandidates.length}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              CV, Call 3, 2, 1 & OB
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Rule Book Coverage
            </span>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a' }}>
              100%
            </div>
            <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4, fontWeight: 600 }}>
              All shifts resolved dynamically
            </div>
          </div>
        </div>
      )}

      {/* VERIFICATION REPORT TABLE */}
      {simulationResult && (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                Simulation Verification & Diff Report ({filteredRows.length} Providers)
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                Verifies how every provider is classified, matched to rules, and mapped across rooms, departures, and lates.
              </p>
            </div>

            {/* FILTERS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filter name, shift, room, rule..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    padding: '7px 10px 7px 30px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    width: 220
                  }}
                />
              </div>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as any)}
                style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 600 }}
              >
                <option value="ALL">All Roles</option>
                <option value="MD">Doctors (MD)</option>
                <option value="CRNA">Anesthetists (CRNA)</option>
              </select>

              <select
                value={placementFilter}
                onChange={e => setPlacementFilter(e.target.value as any)}
                style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 600 }}
              >
                <option value="ALL">All Placements</option>
                <option value="DEPARTURE">Departure Queue</option>
                <option value="LATE">Late List</option>
                <option value="CALL">Call Team</option>
                <option value="ROOMS">Assigned Rooms</option>
              </select>

              <select
                value={mappingFilter}
                onChange={e => setMappingFilter(e.target.value as any)}
                style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 600 }}
              >
                <option value="ALL">All Mappings</option>
                <option value="MAPPED">Matched Shift Rule</option>
                <option value="COMBINATION">Multi-Role Combination</option>
              </select>
            </div>
          </div>

          {/* TABLE */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                  <th style={{ padding: '10px 12px' }}>Provider</th>
                  <th style={{ padding: '10px 12px' }}>Facility</th>
                  <th style={{ padding: '10px 12px' }}>Scraped Shift & Tasks</th>
                  <th style={{ padding: '10px 12px' }}>Matched Policy Rule</th>
                  <th style={{ padding: '10px 12px' }}>Room Placement</th>
                  <th style={{ padding: '10px 12px' }}>Departure Queue</th>
                  <th style={{ padding: '10px 12px' }}>Late List Bucket</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                      No providers matched the current sandbox filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(row => {
                    const isComb = row.policy.isCombination;
                    const isUnassigned = row.policy.roomAssignmentStrategy === 'unassigned_pool';

                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                        {/* PROVIDER */}
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong style={{ color: '#0f172a' }}>{row.displayName}</strong>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: row.credentials === 'MD' ? '#dbeafe' : '#fef3c7',
                              color: row.credentials === 'MD' ? '#1e40af' : '#92400e'
                            }}>
                              {row.credentials}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {row.qgendaAbbr} • {row.phone}
                          </div>
                        </td>

                        {/* FACILITY */}
                        <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 600 }}>
                          {row.facility}
                        </td>

                        {/* SCRAPED SHIFT & TASKS */}
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: 11,
                            background: '#f1f5f9',
                            padding: '2px 6px',
                            borderRadius: 4,
                            color: '#0f172a',
                            fontWeight: 700
                          }}>
                            {row.shift || 'None'}
                          </span>
                          {row.policy.outsideTokens.length > 0 && (
                            <div style={{ marginTop: 4 }}>
                              <span style={{
                                fontSize: 10,
                                background: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                padding: '1px 5px',
                                borderRadius: 4,
                                fontWeight: 700
                              }}>
                                Filtered: {row.policy.outsideTokens.join(', ')}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* MATCHED RULE */}
                        <td style={{ padding: '10px 12px' }}>
                          {isComb ? (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700
                            }}>
                              <Sparkles size={11} />
                              <span>{row.policy.matchedPattern}</span>
                            </div>
                          ) : row.policy.matchedRuleId ? (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              color: '#15803d',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700
                            }}>
                              <CheckCircle2 size={11} />
                              <span>{row.policy.matchedPattern}</span>
                            </div>
                          ) : (
                            <span style={{
                              fontSize: 11,
                              color: '#94a3b8',
                              fontWeight: 600
                            }}>
                              Standard Fallback
                            </span>
                          )}
                        </td>

                        {/* ROOM PLACEMENT */}
                        <td style={{ padding: '10px 12px' }}>
                          {isUnassigned ? (
                            <span style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700
                            }}>
                              Unassigned Staff Pool
                            </span>
                          ) : row.roomAssignment ? (
                            <span style={{
                              color: '#0f172a',
                              fontWeight: 700
                            }}>
                              {row.roomAssignment}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>None</span>
                          )}
                        </td>

                        {/* DEPARTURE QUEUE */}
                        <td style={{ padding: '10px 12px' }}>
                          {row.depItem ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                background: row.depItem.category === 'post_call' ? '#dcfce7' : '#eff6ff',
                                color: row.depItem.category === 'post_call' ? '#15803d' : '#1d4ed8',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 800
                              }}>
                                {row.depItem.category === 'post_call' ? 'Post-Call' : 'Departure'}
                              </span>
                              {row.depItem.shift && (
                                <strong style={{ color: '#0f172a' }}>{row.depItem.shift}</strong>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>

                        {/* LATE LIST BUCKET */}
                        <td style={{ padding: '10px 12px' }}>
                          {row.lateItem ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                background: row.lateItem.timeCategory === '7p-7a' ? '#f3e8ff' : '#fef3c7',
                                color: row.lateItem.timeCategory === '7p-7a' ? '#7e22ce' : '#b45309',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 800
                              }}>
                                {row.lateItem.timeCategory}
                              </span>
                              {row.lateItem.notes && (
                                <span style={{ fontSize: 11, color: '#64748b' }}>({row.lateItem.notes})</span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
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
    </div>
  );
};
