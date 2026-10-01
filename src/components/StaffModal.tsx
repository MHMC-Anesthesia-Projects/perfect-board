'use client';

import React, { useState } from 'react';
import { Staff, Department, UserRole } from '@/types/whiteboard';
import { Phone, Clock, MapPin, X, ArrowRight, CornerDownLeft, Coffee, Utensils, CheckCircle, ShieldCheck, Sparkles } from 'lucide-react';

interface StaffModalProps {
  staff: Staff | null;
  departments: Department[];
  bullpenStaffIds?: string[];
  bullpenBreaks?: Record<string, { breakfastDone: boolean; lunchDone: boolean; breakfastTime?: string | null; lunchTime?: string | null }>;
  currentUserRole: UserRole;
  onClose: () => void;
  onAssignToSlot: (targetType: 'room_slot' | 'runner_slot', targetId: string, staffId: string) => void;
  onUnassign: (staffId: string) => void;
  onMoveToBullpen?: (staffId: string) => void;
  onToggleBreak: (targetType: 'room_slot' | 'runner_slot' | 'bullpen', targetId: string, breakType: 'breakfast' | 'lunch', value: boolean) => void;
  onUpdateShift?: (staffId: string, newShift: string, lastName?: string, credentials?: Staff['credentials']) => void;
  onSetStaffInfrequent?: (staffId: string, isInfrequent: boolean) => void;
}

export const StaffModal: React.FC<StaffModalProps> = ({
  staff,
  departments,
  bullpenStaffIds = [],
  bullpenBreaks = {},
  currentUserRole,
  onClose,
  onAssignToSlot,
  onUnassign,
  onMoveToBullpen,
  onToggleBreak,
  onUpdateShift,
  onSetStaffInfrequent
}) => {
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [isEditingShift, setIsEditingShift] = useState(false);
  const [customShift, setCustomShift] = useState(staff?.shift || 'Day');

  React.useEffect(() => {
    if (staff) {
      setCustomShift(staff.shift || 'Day');
      setIsEditingShift(false);
    }
  }, [staff?.id, staff?.shift]);

  if (!staff) return null;

  const isEditor = currentUserRole !== 'basic_user';

  // Find where this staff is currently assigned
  let currentPlacement: {
    type: 'runner_slot' | 'room_slot' | 'bullpen';
    id: string;
    locationName: string;
    breakfastDone: boolean;
    lunchDone: boolean;
  } | null = null;

  for (const dept of departments) {
    for (const r of dept.runnerSlots) {
      if (r.staffId === staff.id) {
        currentPlacement = {
          type: 'runner_slot',
          id: r.id,
          locationName: `${dept.name} Runner (${r.title})`,
          breakfastDone: r.breakfastDone,
          lunchDone: r.lunchDone
        };
        break;
      }
    }
    if (currentPlacement) break;

    for (const room of dept.rooms) {
      for (const slot of room.slots) {
        if (slot.staffId === staff.id) {
          currentPlacement = {
            type: 'room_slot',
            id: slot.id,
            locationName: `${dept.name} Room ${room.name}`,
            breakfastDone: slot.breakfastDone,
            lunchDone: slot.lunchDone
          };
          break;
        }
      }
      if (currentPlacement) break;
    }
    if (currentPlacement) break;
  }

  if (!currentPlacement && bullpenStaffIds.includes(staff.id)) {
    const b = bullpenBreaks[staff.id];
    currentPlacement = {
      type: 'bullpen',
      id: staff.id,
      locationName: 'Bullpen (Available Staff)',
      breakfastDone: b?.breakfastDone ?? false,
      lunchDone: b?.lunchDone ?? false
    };
  }

  // Available room & runner slots for quick reassignment
  const availableSlots: Array<{ id: string; type: 'room_slot' | 'runner_slot'; label: string }> = [];
  departments.forEach(dept => {
    dept.runnerSlots.forEach(r => {
      availableSlots.push({
        id: r.id,
        type: 'runner_slot',
        label: `${dept.name} Runner: ${r.title}`
      });
    });
    dept.rooms.forEach(room => {
      room.slots.forEach(slot => {
        availableSlots.push({
          id: slot.id,
          type: 'room_slot',
          label: `${dept.name} Room ${room.name}`
        });
      });
    });
  });

  const handleReassign = () => {
    if (!selectedDestination) return;
    const dest = availableSlots.find(s => s.id === selectedDestination);
    if (dest) {
      onAssignToSlot(dest.type, dest.id, staff.id);
      onClose();
    }
  };

  const handleUnassignClick = () => {
    onUnassign(staff.id);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="pin-pad-card"
        onClick={e => e.stopPropagation()}
        style={{ width: 440, padding: 24, textAlign: 'left', alignItems: 'stretch' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase' }}>
                {staff.lastName}, {staff.firstName || ''}
              </h2>
              <span className={`magnet-cred cred-${staff.credentials}`} style={{ fontSize: 11, padding: '2px 6px' }}>
                {staff.credentials}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>ID: {staff.id.split('_').slice(-1)[0]} • Anesthesia Care Team</span>
              {staff.orderNumber && (
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 3,
                    background: 'rgba(9, 105, 218, 0.1)',
                    color: 'var(--accent-primary)',
                    border: '1px solid rgba(9, 105, 218, 0.25)'
                  }}
                  title={`OneUSAP Departure Order #${staff.orderNumber}`}
                >
                  OneUSAP Order #{staff.orderNumber}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Contact & Shift Info */}
        <div style={{
          background: 'var(--surface-hover)',
          borderRadius: 8,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          border: '1px solid var(--border-light)',
          marginBottom: 16
        }}>
          {/* Phone */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              <Phone size={15} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontWeight: 600 }}>Cell Phone:</span>
              <a
                href={`tel:${staff.phone}`}
                style={{ fontWeight: 800, color: 'var(--accent-primary)', textDecoration: 'underline' }}
              >
                {staff.phone}
              </a>
            </div>
          </div>

          {/* Shift (View and Edit) */}
          {!isEditingShift ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Clock size={15} style={{ color: 'var(--marker-red)' }} />
                <span style={{ fontWeight: 600 }}>Scheduled Shift:</span>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{staff.shift || '07:00 - 15:30'}</span>
              </div>
              {isEditor && onUpdateShift && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomShift(staff.shift || 'Day');
                    setIsEditingShift(true);
                  }}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--accent-primary)',
                    cursor: 'pointer'
                  }}
                  title="Change scheduled shift or late time (e.g. 4p instead of 3p)"
                >
                  Edit Shift
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px', background: 'var(--surface-card)', borderRadius: 6, border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Change Shift / Departure Time:</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Quick select or type below</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {['Day', '3p', '4p', '5p', '7p', '8p', '7p-7a', 'Post-Call'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomShift(preset)}
                    style={{
                      padding: '2px 7px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      border: customShift.toLowerCase() === preset.toLowerCase() ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-light)',
                      background: customShift.toLowerCase() === preset.toLowerCase() ? 'var(--accent-surface)' : 'var(--surface-hover)',
                      color: customShift.toLowerCase() === preset.toLowerCase() ? 'var(--accent-primary)' : 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input
                  type="text"
                  value={customShift}
                  onChange={e => setCustomShift(e.target.value)}
                  placeholder="e.g. 4p or 07:00 - 16:00"
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-board)',
                    color: 'var(--text-primary)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateShift && customShift.trim()) {
                      onUpdateShift(staff.id, customShift.trim(), staff.lastName, staff.credentials);
                      setIsEditingShift(false);
                    }
                  }}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingShift(false)}
                  style={{
                    padding: '4px 8px',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 4,
                    fontSize: 11,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Current Assignment */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
            <MapPin size={15} style={{ color: 'var(--marker-green)' }} />
            <span style={{ fontWeight: 600 }}>Current Assignment:</span>
            <span style={{
              fontWeight: 800,
              color: currentPlacement ? 'var(--text-primary)' : 'var(--text-muted)',
              background: currentPlacement ? 'var(--surface-card)' : 'transparent',
              padding: currentPlacement ? '2px 6px' : '0',
              borderRadius: 4,
              border: currentPlacement ? '1px solid var(--border-light)' : 'none'
            }}>
              {currentPlacement ? currentPlacement.locationName : 'Available Unassigned Staff'}
            </span>
          </div>
        </div>

        {/* Break Management Status (Accessible to ALL users, including Basic User!) */}
        {currentPlacement && (
          <div style={{
            background: 'var(--surface-card)',
            borderRadius: 8,
            padding: '12px 14px',
            border: '1.5px solid var(--border-light)',
            marginBottom: 16
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: 'var(--text-secondary)',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Daily Meal & Rest Breaks</span>
              <span style={{ fontSize: 10, color: 'var(--marker-green)' }}>● Zero-Login Access</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Breakfast Break Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (currentPlacement) {
                    onToggleBreak(currentPlacement.type, currentPlacement.id, 'breakfast', !currentPlacement.breakfastDone);
                  }
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: currentPlacement.breakfastDone ? '1.5px solid var(--break-done-border)' : '1px solid var(--border-light)',
                  background: currentPlacement.breakfastDone ? 'rgba(46, 160, 67, 0.12)' : 'var(--surface-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  textAlign: 'left'
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: currentPlacement.breakfastDone ? 'var(--break-done-bg)' : 'var(--break-empty-bg)',
                  color: currentPlacement.breakfastDone ? '#fff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 12
                }}>
                  {currentPlacement.breakfastDone ? '✓' : 'B'}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>Breakfast</div>
                  <div style={{ fontSize: 10, color: currentPlacement.breakfastDone ? 'var(--break-done-border)' : 'var(--text-muted)' }}>
                    {currentPlacement.breakfastDone ? 'Completed [✓]' : 'Pending'}
                  </div>
                </div>
              </button>

              {/* Lunch Break Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (currentPlacement) {
                    onToggleBreak(currentPlacement.type, currentPlacement.id, 'lunch', !currentPlacement.lunchDone);
                  }
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: currentPlacement.lunchDone ? '1.5px solid var(--break-done-border)' : '1px solid var(--border-light)',
                  background: currentPlacement.lunchDone ? 'rgba(46, 160, 67, 0.12)' : 'var(--surface-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  textAlign: 'left'
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: currentPlacement.lunchDone ? 'var(--break-done-bg)' : 'var(--break-empty-bg)',
                  color: currentPlacement.lunchDone ? '#fff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 12
                }}>
                  {currentPlacement.lunchDone ? '✓' : 'L'}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>Lunch</div>
                  <div style={{ fontSize: 10, color: currentPlacement.lunchDone ? 'var(--break-done-border)' : 'var(--text-muted)' }}>
                    {currentPlacement.lunchDone ? 'Completed [✓]' : 'Pending'}
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Board Runner / Superuser Assignment Controls */}
        {isEditor ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Quick Reassign Dropdown */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                Move or Assign to Room / Runner:
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  value={selectedDestination}
                  onChange={e => setSelectedDestination(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  <option value="">Select Target Room or Runner...</option>
                  {availableSlots.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleReassign}
                  disabled={!selectedDestination}
                  style={{
                    padding: '8px 14px',
                    background: selectedDestination ? 'var(--accent-primary)' : 'var(--surface-hover)',
                    color: selectedDestination ? '#fff' : 'var(--text-muted)',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>Assign</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Infrequent Staff Grouping Toggle */}
            {onSetStaffInfrequent && (
              <div style={{ marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => {
                    onSetStaffInfrequent(staff.id, !staff.isInfrequent);
                    onClose();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: staff.isInfrequent ? 'var(--surface-active, rgba(0,0,0,0.06))' : 'var(--surface-hover)',
                    border: staff.isInfrequent ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-light)',
                    color: staff.isInfrequent ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  <span>
                    {staff.isInfrequent
                      ? 'Infrequent Staff • Click to return to Regular MD/CRNA'
                      : 'Move to Infrequent Group (PRN / Occasional)'}
                  </span>
                </button>
              </div>
            )}

            {/* Unassign or move to bullpen if placed */}
            {currentPlacement && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {onMoveToBullpen && (
                  <button
                    type="button"
                    onClick={() => {
                      onMoveToBullpen(staff.id);
                      onClose();
                    }}
                    style={{
                      padding: '10px',
                      borderRadius: 6,
                      background: 'rgba(9, 105, 218, 0.08)',
                      border: '1.5px solid var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      fontWeight: 700,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer'
                    }}
                  >
                    <Sparkles size={16} />
                    <span>Move to Bullpen (Available for Breaks / Cases)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleUnassignClick}
                  style={{
                    padding: '10px',
                    borderRadius: 6,
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--marker-red)',
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  <CornerDownLeft size={16} />
                  <span>Return to Available Unassigned Staff</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            padding: 10,
            borderRadius: 6,
            background: 'var(--surface-hover)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}>
            <ShieldCheck size={14} style={{ color: 'var(--text-muted)' }} />
            <span>Login as Board Runner or Superuser to move staff.</span>
          </div>
        )}
      </div>
    </div>
  );
};
