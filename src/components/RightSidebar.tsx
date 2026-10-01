'use client';

import React, { useState } from 'react';
import { DepartureItem, LateShiftItem, CallTeamItem, UserRole } from '@/types/whiteboard';
import { Plus, Trash2, Mic, GripVertical, StickyNote, X } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface RightSidebarProps {
  departureList: DepartureItem[];
  callTeamList: CallTeamItem[];
  departureNotes?: string;
  latesList: LateShiftItem[];
  latesNotes: string;
  currentUserRole: UserRole;
  onUpdateDepartureNotes?: (notes: string) => void;
  onUpdateLatesNotes: (notes: string) => void;
  onUpdateLists: (departureList: DepartureItem[], latesList: LateShiftItem[], isReorder?: boolean) => void;
  onUpdateCallTeam: (callTeamList: CallTeamItem[]) => void;
  onOpenVoiceNotes: (targetType: 'departure' | 'lates', currentNotes: string) => void;
  onToggleDepartureStruck: (id: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  departureList,
  callTeamList,
  latesList,
  latesNotes,
  currentUserRole,
  onUpdateLatesNotes,
  onUpdateLists,
  onUpdateCallTeam,
  onOpenVoiceNotes,
  onToggleDepartureStruck
}) => {
  const isEditor = currentUserRole !== 'basic_user';

  // State for adding departure
  const [newDepartureName, setNewDepartureName] = useState('');
  const [showAddDep, setShowAddDep] = useState(false);

  // State for Call Team
  const [showAddCall, setShowAddCall] = useState(false);
  const [newCallRole, setNewCallRole] = useState('');
  const [newCallDoc, setNewCallDoc] = useState('');

  // Drag-and-drop state for reordering departures
  const [draggedDepartureIdx, setDraggedDepartureIdx] = useState<number | null>(null);
  const [dragOverDepartureIdx, setDragOverDepartureIdx] = useState<number | null>(null);

  // State for adding late staff (supports specific category targeted by plus button)
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newLateName, setNewLateName] = useState('');
  const [showLatesNotesModal, setShowLatesNotesModal] = useState(false);

  // App-themed modal state for confirming staff deletion
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'departure' | 'late' | 'call_team';
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

  const handleMoveDeparture = (fromIndex: number, toIndex: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (toIndex < 0 || toIndex >= departureList.length) return;
    const list = [...departureList];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    const updated = list.map((item, idx) => ({ ...item, orderIndex: idx }));
    onUpdateLists(updated, latesList, true);
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

  const handleAddCallTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCallRole.trim() || !newCallDoc.trim()) return;
    const updated = [
      ...callTeamList,
      {
        id: `call_${Date.now()}`,
        role: newCallRole.trim().toUpperCase(),
        doctorName: newCallDoc.trim().toUpperCase(),
        orderIndex: callTeamList.length
      }
    ];
    onUpdateCallTeam(updated);
    setNewCallRole('');
    setNewCallDoc('');
    setShowAddCall(false);
  };

  const handleInitiateRemoveCallTeam = (item: CallTeamItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({
      type: 'call_team',
      id: item.id,
      name: `Dr. ${item.doctorName}`,
      categoryLabel: `Call Team (${item.role})`
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
    } else if (deleteTarget.type === 'late') {
      const updated = latesList.filter(l => l.id !== deleteTarget.id);
      onUpdateLists(departureList, updated);
    } else if (deleteTarget.type === 'call_team') {
      const updated = callTeamList.filter(c => c.id !== deleteTarget.id);
      onUpdateCallTeam(updated);
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
              className={`departure-item ${doc.departed ? 'struck' : ''} ${dragOverDepartureIdx === idx ? 'drag-over' : ''} ${draggedDepartureIdx === idx ? 'dragging' : ''}`}
              onClick={() => onToggleDepartureStruck(doc.id)}
              draggable={isEditor}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/departure-index', String(idx));
                setDraggedDepartureIdx(idx);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverDepartureIdx(idx);
              }}
              onDragLeave={() => {
                setDragOverDepartureIdx(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromIdx = parseInt(e.dataTransfer.getData('text/departure-index'), 10);
                if (!isNaN(fromIdx) && fromIdx !== idx) {
                  handleMoveDeparture(fromIdx, idx);
                }
                setDraggedDepartureIdx(null);
                setDragOverDepartureIdx(null);
              }}
              onDragEnd={() => {
                setDraggedDepartureIdx(null);
                setDragOverDepartureIdx(null);
              }}
              title={doc.departed ? 'Marked departed (Tap to unmark)' : 'Tap to mark departed (Strikethrough)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                {isEditor && (
                  <GripVertical size={11} style={{ color: 'var(--text-muted)', cursor: 'grab', flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 14 }}>{idx + 1}.</span>
                <span className="departure-name">{doc.name}</span>
              </div>
              {isEditor && (
                <button
                  type="button"
                  onClick={(e) => handleInitiateRemoveDeparture(doc, e)}
                  style={{ color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 3 }}
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

        {/* CALL TEAM SECTION AT BOTTOM OF DEPARTURE */}
        <div className="call-team-area">
          <div className="call-team-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--marker-red)' }}>CALL TEAM</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({callTeamList.length})</span>
            </div>
            {isEditor && (
              <button
                type="button"
                onClick={() => setShowAddCall(prev => !prev)}
                style={{
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--marker-red)'
                }}
                title="Add Doctor to Call Team"
              >
                <Plus size={12} />
              </button>
            )}
          </div>

          {/* Add Call Team Doctor Form */}
          {showAddCall && isEditor && (
            <form onSubmit={handleAddCallTeam} style={{ padding: 6, background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Add Call Doctor:
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                <input
                  type="text"
                  placeholder="Role (e.g. CV, 1st, 2nd, OB)"
                  value={newCallRole}
                  onChange={e => setNewCallRole(e.target.value)}
                  autoFocus
                  style={{
                    width: '45%',
                    padding: '4px 6px',
                    fontSize: 11,
                    borderRadius: 4,
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-card)',
                    color: 'var(--text-primary)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Doctor (e.g. KD, SHENOY)"
                  value={newCallDoc}
                  onChange={e => setNewCallDoc(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: 11,
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
                    padding: '4px',
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 800
                  }}
                >
                  Save Call Doc
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCall(false)}
                  style={{
                    padding: '4px 8px',
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

          {/* Call Team Members List */}
          <div className="call-team-list">
            {callTeamList.map((item) => (
              <div key={item.id} className="call-team-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="call-role-badge">{item.role}</span>
                  <span className="call-doc-name">{item.doctorName}</span>
                </div>
                {isEditor && (
                  <button
                    type="button"
                    onClick={(e) => handleInitiateRemoveCallTeam(item, e)}
                    style={{ color: 'var(--text-muted)', padding: 2, borderRadius: 3 }}
                    title={`Remove ${item.doctorName} from ${item.role}`}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}

            {callTeamList.length === 0 && (
              <div style={{ padding: 8, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic' }}>
                No call team assigned. Tap + to add.
              </div>
            )}
          </div>
        </div>

        {/* End of Departure Column */}
      </div>

      {/* ---------------- 2. LATES COLUMN ---------------- */}
      <div className="sidebar-col">
        <div className="sidebar-col-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>LATES</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(&gt; 3 PM)</span>
          </div>

          {/* Notes icon on far right with badge if note exists */}
          <button
            type="button"
            onClick={() => setShowLatesNotesModal(true)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: 4,
              background: latesNotes.trim() ? 'rgba(9, 105, 218, 0.12)' : 'var(--surface-card)',
              border: latesNotes.trim() ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-light)',
              color: latesNotes.trim() ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: 0
            }}
            title={latesNotes.trim() ? `Late Shift Notes: "${latesNotes.slice(0, 30)}..."` : 'Add/View Late Shift Notes'}
          >
            <StickyNote size={14} />
            {latesNotes.trim().length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -5,
                  background: 'var(--accent-primary)',
                  color: '#ffffff',
                  fontSize: 9,
                  fontWeight: 900,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                  lineHeight: 1
                }}
              >
                1
              </span>
            )}
          </button>
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

        {/* End of Lates Column */}
      </div>

      {/* App-Themed Staff Deletion Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={
          deleteTarget?.type === 'departure'
            ? 'Remove Departure Doctor'
            : deleteTarget?.type === 'call_team'
            ? 'Remove Call Team Doctor'
            : 'Remove Late Shift Staff'
        }
        itemName={deleteTarget?.name || ''}
        itemCategory={deleteTarget?.categoryLabel}
        confirmButtonText="Remove Staff"
        cancelButtonText="Cancel"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Late Shift Notes Modal (Opened via Notes icon on Lates header) */}
      {showLatesNotesModal && (
        <div className="modal-backdrop" onClick={() => setShowLatesNotesModal(false)} role="dialog" aria-modal="true">
          <div
            className="pin-pad-card"
            onClick={e => e.stopPropagation()}
            style={{
              width: 480,
              maxWidth: '92vw',
              padding: '22px',
              textAlign: 'left',
              alignItems: 'stretch'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 6,
                  background: 'rgba(9, 105, 218, 0.12)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <StickyNote size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
                    Late Shift Notes (&gt; 3 PM)
                  </h3>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                    Saved automatically in background for all coordinators
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLatesNotesModal(false)}
                style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              value={latesNotes}
              onChange={e => onUpdateLatesNotes(e.target.value)}
              disabled={!isEditor}
              placeholder="Type late shift coverage, room turnover, or handoff notes here..."
              style={{
                width: '100%',
                minHeight: 180,
                padding: '12px',
                borderRadius: 8,
                border: '1.5px solid var(--border-light)',
                background: 'var(--surface-hover)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-main)',
                fontSize: 14,
                lineHeight: 1.5,
                resize: 'vertical',
                marginBottom: 16
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {isEditor ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowLatesNotesModal(false);
                    onOpenVoiceNotes('lates', latesNotes);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-hover)',
                    color: 'var(--marker-red)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Mic size={15} />
                  <span>Dictate with Voice AI</span>
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setShowLatesNotesModal(false)}
                style={{
                  padding: '8px 22px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--accent-primary)',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
