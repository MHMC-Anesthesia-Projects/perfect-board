'use client';

import React, { useState } from 'react';
import { DepartureItem, LateShiftItem, UserRole } from '@/types/whiteboard';
import { Plus, Trash2, Mic } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

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
  onToggleDepartureStruck: (id: string) => void;
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
  onToggleDepartureStruck
}) => {
  const isEditor = currentUserRole !== 'basic_user';

  // State for adding departure
  const [newDepartureName, setNewDepartureName] = useState('');
  const [showAddDep, setShowAddDep] = useState(false);

  // State for adding late staff (supports specific category targeted by plus button)
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newLateName, setNewLateName] = useState('');

  // App-themed modal state for confirming staff deletion
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'departure' | 'late';
    id: string;
    name: string;
    categoryLabel: string;
  } | null>(null);

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
        orderIndex: departureList.length,
        departed: false
      }
    ];
    onUpdateLists(updated, latesList);
    setNewDepartureName('');
    setShowAddDep(false);
  };

  const handleInitiateRemoveDeparture = (doc: DepartureItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({
      type: 'departure',
      id: doc.id,
      name: `Dr. ${doc.name}`,
      categoryLabel: 'Departure'
    });
  };

  const handleAddLateToCategory = (category: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newLateName.trim()) return;
    const updated = [
      ...latesList,
      {
        id: `late_${Date.now()}`,
        name: newLateName.trim().toUpperCase(),
        timeCategory: category,
        orderIndex: latesList.length
      }
    ];
    onUpdateLists(departureList, updated);
    setNewLateName('');
    setAddingToCategory(null);
  };

  const handleInitiateRemoveLate = (item: LateShiftItem, category: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({
      type: 'late',
      id: item.id,
      name: item.name,
      categoryLabel: `${category} Late Shift`
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'departure') {
      const updated = departureList.filter(d => d.id !== deleteTarget.id);
      onUpdateLists(updated, latesList);
    } else {
      const updated = latesList.filter(l => l.id !== deleteTarget.id);
      onUpdateLists(departureList, updated);
    }
    setDeleteTarget(null);
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
              style={{
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                background: 'var(--surface-card)',
                border: '1px solid var(--border-light)',
                color: 'var(--accent-primary)'
              }}
              title="Manually Add Doctor to Departure List"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Manual Add Departure Doctor Form */}
        {showAddDep && isEditor && (
          <form onSubmit={handleAddDeparture} style={{ padding: 6, background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Add Doctor to Departure:
            </div>
            <input
              type="text"
              placeholder="Doctor Last Name (e.g. SMITH)"
              value={newDepartureName}
              onChange={e => setNewDepartureName(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '5px 8px',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid var(--border-light)',
                background: 'var(--surface-card)',
                color: 'var(--text-primary)',
                marginBottom: 6
              }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '4px',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 800
                }}
              >
                Add Doctor
              </button>
              <button
                type="button"
                onClick={() => setShowAddDep(false)}
                style={{
                  padding: '4px 10px',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-light)',
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
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, padding: '2px 4px' }}>
            Tap name to mark departed (strikethrough)
          </div>

          {departureList.map((doc, idx) => (
            <div
              key={doc.id}
              className={`departure-item ${doc.departed ? 'struck' : ''}`}
              onClick={() => onToggleDepartureStruck(doc.id)}
              title={doc.departed ? 'Marked departed (Tap to unmark)' : 'Tap to mark departed (Strikethrough)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 14 }}>{idx + 1}.</span>
                <span className="departure-name">{doc.name}</span>
              </div>
              {isEditor && (
                <button
                  onClick={(e) => handleInitiateRemoveDeparture(doc, e)}
                  style={{ color: 'var(--text-muted)', padding: 3, borderRadius: 3 }}
                  title="Remove from departure list"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}

          {departureList.length === 0 && (
            <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
              No doctors on departure list. Tap + to add.
            </div>
          )}
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
        </div>

        {/* Categorized Late Shifts Area */}
        <div className="lates-list-area">
          {Object.entries(latesGrouped).map(([category, items]) => {
            if (items.length === 0 && !['4p', '5p', '7p', '8p', '7p-7a'].includes(category)) return null;

            return (
              <div key={category} style={{ marginBottom: 10 }}>
                {/* Category Header (4p, 5p, 7p, 8p, 7p-7a) with + Plus Button */}
                <div style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: 'var(--marker-black)',
                  borderBottom: '1.5px solid var(--board-grid-line)',
                  paddingBottom: 2,
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ textDecoration: 'underline' }}>{category}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>({items.length})</span>
                  </div>

                  {/* Manual Add Plus Sign next to Time Header */}
                  {isEditor && (
                    <button
                      onClick={() => {
                        setAddingToCategory(addingToCategory === category ? null : category);
                        setNewLateName('');
                      }}
                      style={{
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: addingToCategory === category ? 'var(--accent-primary)' : 'var(--surface-card)',
                        color: addingToCategory === category ? '#fff' : 'var(--accent-primary)',
                        border: '1px solid var(--border-light)',
                        fontSize: 11,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}
                      title={`Add staff to ${category}`}
                    >
                      <Plus size={11} />
                      <span style={{ fontSize: 10 }}>Add</span>
                    </button>
                  )}
                </div>

                {/* Inline Add Input for this specific time category */}
                {addingToCategory === category && isEditor && (
                  <form onSubmit={(e) => handleAddLateToCategory(category, e)} style={{ padding: 4, background: 'var(--surface-hover)', borderRadius: 4, marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        type="text"
                        placeholder={`Staff Last Name for ${category}...`}
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
                      <button
                        type="submit"
                        style={{
                          padding: '3px 8px',
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
                        onClick={() => setAddingToCategory(null)}
                        style={{
                          padding: '3px 6px',
                          background: 'var(--surface-card)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 4,
                          fontSize: 11
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </form>
                )}

                {/* Staff names under this time slot */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {items.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '3px 6px',
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-main)',
                        borderRadius: 3,
                        background: 'rgba(0, 0, 0, 0.02)'
                      }}
                    >
                      <span>{item.name}</span>
                      {isEditor && (
                        <button
                          onClick={(e) => handleInitiateRemoveLate(item, category, e)}
                          style={{ color: 'var(--text-muted)', padding: 2, borderRadius: 3 }}
                          title={`Remove ${item.name} from ${category}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text-muted)', padding: '2px 6px' }}>
                      No staff scheduled for {category}
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

      {/* App-Themed Staff Deletion Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.type === 'departure' ? 'Remove Departure Doctor' : 'Remove Late Shift Staff'}
        itemName={deleteTarget?.name || ''}
        itemCategory={deleteTarget?.categoryLabel}
        confirmButtonText="Remove Staff"
        cancelButtonText="Cancel"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </aside>
  );
};
