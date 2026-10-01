'use client';

import React, { useState } from 'react';
import { DepartureItem, LateShiftItem, UserRole } from '@/types/whiteboard';
import { Clock, Plus, Trash2, Mic, RefreshCw, Edit3 } from 'lucide-react';

interface RightSidebarProps {
  departureList: DepartureItem[];
  departureNotes: string;
  latesList: LateShiftItem[];
  latesNotes: string;
  currentUserRole: UserRole;
  onUpdateDepartureNotes: (notes: string) => void;
  onUpdateLatesNotes: (notes: string) => void;
  onUpdateLists: (departureList: DepartureItem[], latesList: LateShiftItem[]) => void;
  onOpenVoiceNotes: (targetType: 'departure' | 'lates', currentNotes: string) => void;
  onTriggerSync: () => void;
  isSyncing: boolean;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  departureList,
  departureNotes,
  latesList,
  latesNotes,
  currentUserRole,
  onUpdateDepartureNotes,
  onUpdateLatesNotes,
  onUpdateLists,
  onOpenVoiceNotes,
  onTriggerSync,
  isSyncing
}) => {
  const isEditor = currentUserRole !== 'basic_user';
  const [newDepartureName, setNewDepartureName] = useState('');
  const [showAddDep, setShowAddDep] = useState(false);

  const [newLateName, setNewLateName] = useState('');
  const [newLateTime, setNewLateTime] = useState('5p');
  const [showAddLate, setShowAddLate] = useState(false);

  // Group lates by time category (4p, 5p, 7p, 8p, 7p-7a)
  const timeCategories = ['4p', '5p', '7p', '8p', '7p-7a'];
  const latesGrouped: Record<string, LateShiftItem[]> = {};
  timeCategories.forEach(cat => {
    latesGrouped[cat] = [];
  });
  // Also collect any custom categories
  latesList.forEach(item => {
    if (!latesGrouped[item.timeCategory]) {
      latesGrouped[item.timeCategory] = [];
    }
    latesGrouped[item.timeCategory].push(item);
  });

  const handleAddDeparture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartureName.trim()) return;
    const updated = [
      ...departureList,
      {
        id: `dep_${Date.now()}`,
        name: newDepartureName.trim().toUpperCase(),
        orderIndex: departureList.length
      }
    ];
    onUpdateLists(updated, latesList);
    setNewDepartureName('');
    setShowAddDep(false);
  };

  const handleRemoveDeparture = (id: string) => {
    const updated = departureList.filter(d => d.id !== id);
    onUpdateLists(updated, latesList);
  };

  const handleAddLate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLateName.trim()) return;
    const updated = [
      ...latesList,
      {
        id: `late_${Date.now()}`,
        name: newLateName.trim().toUpperCase(),
        timeCategory: newLateTime,
        orderIndex: latesList.length
      }
    ];
    onUpdateLists(departureList, updated);
    setNewLateName('');
    setShowAddLate(false);
  };

  const handleRemoveLate = (id: string) => {
    const updated = latesList.filter(l => l.id !== id);
    onUpdateLists(departureList, updated);
  };

  return (
    <aside className="right-sidebar-columns">
      {/* ---------------- 1. DEPARTURE COLUMN ---------------- */}
      <div className="sidebar-col">
        <div className="sidebar-col-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>DEPARTURE</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({departureList.length})</span>
          </div>
          {isEditor && (
            <button
              onClick={() => setShowAddDep(prev => !prev)}
              style={{ padding: 2, color: 'var(--accent-primary)' }}
              title="Add Doctor to Departure List"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {/* Add Departure Doctor Form */}
        {showAddDep && isEditor && (
          <form onSubmit={handleAddDeparture} style={{ padding: 6, background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-light)' }}>
            <input
              type="text"
              placeholder="Doctor Last Name"
              value={newDepartureName}
              onChange={e => setNewDepartureName(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '4px 6px',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid var(--border-light)',
                background: 'var(--surface-card)',
                color: 'var(--text-primary)',
                marginBottom: 4
              }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '3px',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddDep(false)}
                style={{
                  padding: '3px 8px',
                  background: 'var(--surface-card)',
                  borderRadius: 4,
                  fontSize: 11
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Departure Order List */}
        <div className="departure-list-area">
          {departureList.map((doc, idx) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 8px',
                background: 'var(--surface-card)',
                borderRadius: 4,
                border: '1px solid var(--border-light)',
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: 0.5
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 14 }}>{idx + 1}.</span>
                <span>{doc.name}</span>
              </div>
              {isEditor && (
                <button
                  onClick={() => handleRemoveDeparture(doc.id)}
                  style={{ color: 'var(--text-muted)', padding: 2 }}
                  title="Remove from departure list"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Departure Dry-Erase Scratchpad Notes */}
        <div className="scratchpad-notes">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="scratchpad-title">Runner Scratchpad</span>
            {isEditor && (
              <button
                onClick={() => onOpenVoiceNotes('departure', departureNotes)}
                style={{ color: 'var(--marker-red)', padding: 2 }}
                title="Speak notes with Voice AI"
              >
                <Mic size={14} />
              </button>
            )}
          </div>
          <textarea
            className="scratchpad-textarea"
            value={departureNotes}
            onChange={e => onUpdateDepartureNotes(e.target.value)}
            disabled={!isEditor}
            placeholder="Tap to write or speak runner scratchpad notes..."
          />
        </div>
      </div>

      {/* ---------------- 2. LATES COLUMN ---------------- */}
      <div className="sidebar-col">
        <div className="sidebar-col-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>LATES</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(&gt; 3 PM)</span>
          </div>
          {isEditor && (
            <button
              onClick={() => setShowAddLate(prev => !prev)}
              style={{ padding: 2, color: 'var(--accent-primary)' }}
              title="Add Late Shift Staff"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {/* Add Late Shift Staff Form */}
        {showAddLate && isEditor && (
          <form onSubmit={handleAddLate} style={{ padding: 6, background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <select
                value={newLateTime}
                onChange={e => setNewLateTime(e.target.value)}
                style={{
                  padding: '4px',
                  borderRadius: 4,
                  fontSize: 12,
                  border: '1px solid var(--border-light)',
                  background: 'var(--surface-card)',
                  color: 'var(--text-primary)',
                  fontWeight: 700
                }}
              >
                <option value="4p">4p</option>
                <option value="5p">5p</option>
                <option value="7p">7p</option>
                <option value="8p">8p</option>
                <option value="7p-7a">7p-7a</option>
              </select>
              <input
                type="text"
                placeholder="Staff Last Name"
                value={newLateName}
                onChange={e => setNewLateName(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: 12,
                  borderRadius: 4,
                  border: '1px solid var(--border-light)',
                  background: 'var(--surface-card)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '3px',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                Add Late Staff
              </button>
              <button
                type="button"
                onClick={() => setShowAddLate(false)}
                style={{
                  padding: '3px 8px',
                  background: 'var(--surface-card)',
                  borderRadius: 4,
                  fontSize: 11
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Categorized Late Shifts Area */}
        <div className="lates-list-area">
          {Object.entries(latesGrouped).map(([category, items]) => {
            if (items.length === 0 && !['4p', '5p', '7p', '8p', '7p-7a'].includes(category)) return null;

            return (
              <div key={category} style={{ marginBottom: 8 }}>
                {/* Category Header (4p, 5p, 7p, 8p, 7p-7a) with authentic handwriting style */}
                <div style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: 'var(--marker-black)',
                  borderBottom: '1.5px solid var(--board-grid-line)',
                  paddingBottom: 1,
                  marginBottom: 3,
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ textDecoration: 'underline' }}>{category}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{items.length} staff</span>
                </div>

                {/* Staff names under this time slot */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {items.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '2px 6px',
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-main)'
                      }}
                    >
                      <span>{item.name}</span>
                      {isEditor && (
                        <button
                          onClick={() => handleRemoveLate(item.id)}
                          style={{ color: 'var(--text-muted)', padding: 1 }}
                          title="Remove late staff"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text-muted)', padding: '2px 6px' }}>
                      No staff scheduled
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Lates Scratchpad Notes */}
        <div className="scratchpad-notes">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="scratchpad-title">Late Shift Notes</span>
            {isEditor && (
              <button
                onClick={() => onOpenVoiceNotes('lates', latesNotes)}
                style={{ color: 'var(--marker-red)', padding: 2 }}
                title="Speak notes with Voice AI"
              >
                <Mic size={14} />
              </button>
            )}
          </div>
          <textarea
            className="scratchpad-textarea"
            value={latesNotes}
            onChange={e => onUpdateLatesNotes(e.target.value)}
            disabled={!isEditor}
            placeholder="Coverage notes after 3pm..."
          />
        </div>
      </div>
    </aside>
  );
};
