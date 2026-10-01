'use client';

import React, { useState } from 'react';
import { Department, Staff, UserRole } from '@/types/whiteboard';
import { MagnetTile } from './MagnetTile';
import { Plus, Mic, MessageSquare } from 'lucide-react';

interface DepartmentGridProps {
  departments: Department[];
  staff: Staff[];
  currentUserRole: UserRole;
  onToggleBreak: (targetType: 'room_slot' | 'runner_slot', targetId: string, breakType: 'breakfast' | 'lunch', value: boolean) => void;
  onSelectStaff: (staff: Staff) => void;
  onSelectEmptySlot: (targetType: 'room_slot' | 'runner_slot', targetId: string, label: string) => void;
  onDropStaff: (fromData: { staffId: string; type: string; id?: string }, targetType: 'room_slot' | 'runner_slot', targetId: string) => void;
  onOpenVoiceNotes: (targetType: 'room', targetId: string, currentNotes?: string) => void;
}

export const DepartmentGrid: React.FC<DepartmentGridProps> = ({
  departments,
  staff,
  currentUserRole,
  onToggleBreak,
  onSelectStaff,
  onSelectEmptySlot,
  onDropStaff,
  onOpenVoiceNotes
}) => {
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const getStaffById = (id: string | null): Staff | undefined => {
    if (!id) return undefined;
    return staff.find(s => s.id === id);
  };

  const handleDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTarget !== targetKey) {
      setDragOverTarget(targetKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = (
    e: React.DragEvent,
    targetType: 'room_slot' | 'runner_slot',
    targetId: string
  ) => {
    e.preventDefault();
    setDragOverTarget(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        onDropStaff(parsed, targetType, targetId);
      }
    } catch (err) {
      console.error('Error handling drop:', err);
    }
  };

  const handleTileDragStart = (
    e: React.DragEvent,
    staffMember: Staff,
    source: { type: string; id?: string }
  ) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        staffId: staffMember.id,
        type: source.type,
        id: source.id
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  // Split departments into 2 rows (Top 4, Bottom 4)
  const topDepartments = departments.slice(0, 4);
  const bottomDepartments = departments.slice(4);

  const renderDepartment = (dept: Department) => {
    return (
      <div key={dept.id} className="dept-column">
        {/* Department Header */}
        <div className="dept-header">
          <div className="dept-title">
            <span>{dept.name}</span>
            {dept.runnerSlots.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                {dept.runnerSlots.length} RUNNER{dept.runnerSlots.length > 1 ? 'S' : ''}
              </span>
            )}
          </div>

          {/* Runner Slots Group */}
          {dept.runnerSlots.length > 0 && (
            <div className="runner-slots-group">
              {dept.runnerSlots.map(runner => {
                const assignedStaff = getStaffById(runner.staffId);
                const isOver = dragOverTarget === runner.id;

                return (
                  <div
                    key={runner.id}
                    className={`runner-slot ${isOver ? 'drag-over' : ''}`}
                    onDragOver={e => handleDragOver(e, runner.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, 'runner_slot', runner.id)}
                    onClick={() => {
                      if (!assignedStaff) {
                        onSelectEmptySlot('runner_slot', runner.id, `${dept.name} Runner (${runner.title})`);
                      }
                    }}
                  >
                    {assignedStaff ? (
                      <MagnetTile
                        staff={assignedStaff}
                        slotId={runner.id}
                        slotType="runner_slot"
                        breakfastDone={runner.breakfastDone}
                        lunchDone={runner.lunchDone}
                        currentUserRole={currentUserRole}
                        onToggleBreak={(type, val) => onToggleBreak('runner_slot', runner.id, type, val)}
                        onSelectStaff={onSelectStaff}
                        onDragStart={handleTileDragStart}
                        isCompact={true}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px' }}>
                        <Plus size={12} />
                        <span>{runner.title}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rooms List */}
        <div className="dept-rooms-list">
          {dept.rooms.map(room => {
            return (
              <div key={room.id} className="room-row">
                {/* Room Number / Identifier */}
                <div className="room-label" title={`Room ${room.name}`}>
                  {room.name}
                </div>

                {/* Slots inside Room */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {room.slots.map(slot => {
                    const assignedStaff = getStaffById(slot.staffId);
                    const isOver = dragOverTarget === slot.id;

                    return (
                      <div
                        key={slot.id}
                        className={`room-slot-target ${!assignedStaff ? 'empty' : ''} ${isOver ? 'drag-over' : ''}`}
                        onDragOver={e => handleDragOver(e, slot.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, 'room_slot', slot.id)}
                        onClick={() => {
                          if (!assignedStaff) {
                            onSelectEmptySlot('room_slot', slot.id, `${dept.name} Room ${room.name}`);
                          }
                        }}
                      >
                        {assignedStaff ? (
                          <MagnetTile
                            staff={assignedStaff}
                            slotId={slot.id}
                            slotType="room_slot"
                            breakfastDone={slot.breakfastDone}
                            lunchDone={slot.lunchDone}
                            currentUserRole={currentUserRole}
                            onToggleBreak={(type, val) => onToggleBreak('room_slot', slot.id, type, val)}
                            onSelectStaff={onSelectStaff}
                            onDragStart={handleTileDragStart}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            color: 'var(--text-muted)',
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '4px'
                          }}>
                            <Plus size={12} />
                            <span>Assign</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Room Notes (e.g. TEE 1200/1230, PACU delay, procedure) */}
                  {room.notes && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: 'var(--marker-red)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      padding: '1px 6px',
                      background: 'rgba(211, 47, 47, 0.05)',
                      borderRadius: 3
                    }}>
                      <span>{room.notes}</span>
                      {currentUserRole !== 'basic_user' && (
                        <button
                          onClick={() => onOpenVoiceNotes('room', room.id, room.notes)}
                          title="Edit room notes with voice AI"
                          style={{ color: 'var(--marker-red)', padding: 1 }}
                        >
                          <Mic size={11} />
                        </button>
                      )}
                    </div>
                  )}
                  {!room.notes && currentUserRole !== 'basic_user' && (
                    <div style={{ display: 'none' }}>
                      <button onClick={() => onOpenVoiceNotes('room', room.id, '')}>
                        <MessageSquare size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="dept-columns-wrapper">
      {/* Top 4 Departments: MAIN OR, WEST PAV, ORTHO, VILLAGE */}
      <div className="dept-row-top">
        {topDepartments.map(renderDepartment)}
      </div>

      {/* Bottom 4 Departments: 9th Floor, ENDO, OB, IVF */}
      <div className="dept-row-bottom">
        {bottomDepartments.map(renderDepartment)}
      </div>
    </div>
  );
};
