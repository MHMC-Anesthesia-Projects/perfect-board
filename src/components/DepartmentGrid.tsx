'use client';

import React, { useState } from 'react';
import { Department, Staff, UserRole, ReliefAssignment, RunnerSlot } from '@/types/whiteboard';
import { MagnetTile } from './MagnetTile';
import { Plus } from 'lucide-react';

interface DepartmentGridProps {
  departments: Department[];
  staff: Staff[];
  currentUserRole: UserRole;
  onToggleBreak: (targetType: 'room_slot' | 'runner_slot', targetId: string, breakType: 'breakfast' | 'lunch', value: boolean) => void;
  onSelectStaff: (staff: Staff) => void;
  onSelectEmptySlot: (targetType: 'room_slot' | 'runner_slot', targetId: string, label: string, roomId?: string, currentFutureTime?: string | null) => void;
  onDropStaff: (fromData: { staffId: string; type: string; id?: string }, targetType: 'room_slot' | 'runner_slot' | 'runner_dept', targetId: string) => void;
  onOpenVoiceNotes?: (targetType: 'room', targetId: string, currentNotes?: string) => void;
  onAddRunnerSlot?: (departmentId: string) => void;
  onRemoveRunnerSlot?: (departmentId: string, runnerSlotId: string) => void;
  onSetRoomFutureTime?: (roomId: string, futureTime: string | null) => void;
  onOpenReliefModal?: (target: {
    type: 'room_slot' | 'runner_slot';
    id: string;
    roomName: string;
    departmentName: string;
    currentStaff: Staff | null;
    currentRelief?: ReliefAssignment | null;
  }) => void;
  onExecuteHandoff?: (targetType: 'room_slot' | 'runner_slot', targetId: string) => void;
  onSetRelief?: (targetType: 'room_slot' | 'runner_slot', targetId: string, reliefStaffId: string, reliefTime?: string, notes?: string, isRedBox?: boolean, fromSource?: { type?: string; id?: string }) => void;
  onRemoveRelief?: (targetType: 'room_slot' | 'runner_slot', targetId: string, forceDelete?: boolean) => void;
  activeReliefStaffIds?: Set<string>;
  unreadCountsByPhone?: Record<string, number>;
  onUpdateMagnetNote?: (staffId: string, note: string) => void;
}

export const DepartmentGrid: React.FC<DepartmentGridProps> = ({
  departments,
  staff,
  currentUserRole,
  onToggleBreak,
  onSelectStaff,
  onSelectEmptySlot,
  onDropStaff,
  onAddRunnerSlot,
  onRemoveRunnerSlot,
  onOpenReliefModal,
  onExecuteHandoff,
  onSetRelief,
  onRemoveRelief,
  onSetRoomFutureTime,
  activeReliefStaffIds,
  unreadCountsByPhone,
  onUpdateMagnetNote
}) => {
  const [dragOverRoomSlotId, setDragOverRoomSlotId] = useState<string | null>(null);
  const dragLeaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const cancelDragLeaveTimer = () => {
    if (dragLeaveTimerRef.current) {
      clearTimeout(dragLeaveTimerRef.current);
      dragLeaveTimerRef.current = null;
    }
  };

  const activateRoomDragNear = (slotId: string, hasStaff: boolean) => {
    cancelDragLeaveTimer();
    if (hasStaff) {
      setDragOverRoomSlotId(slotId);
    }
  };

  const scheduleRoomDragLeave = (slotId: string) => {
    cancelDragLeaveTimer();
    dragLeaveTimerRef.current = setTimeout(() => {
      setDragOverRoomSlotId(prev => (prev === slotId ? null : prev));
    }, 150);
  };

  React.useEffect(() => {
    return () => {
      cancelDragLeaveTimer();
    };
  }, []);

  const getStaffUnreadCount = (staffMember: Staff | null): number => {
    if (!staffMember?.phone || !unreadCountsByPhone) return 0;
    const clean = staffMember.phone.replace(/\D/g, '').slice(-10);
    return unreadCountsByPhone[clean] || 0;
  };
  const justDroppedRef = React.useRef(false);
  const isEditor = currentUserRole === 'board_runner' || currentUserRole === 'admin' || currentUserRole === 'superuser';

  const getStaffById = (id: string | null): Staff | undefined => {
    if (!id) return undefined;
    return staff.find(s => s.id === id);
  };

  const handleZoneDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  };

  const handleZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!e.currentTarget.classList.contains('drag-over')) {
      e.currentTarget.classList.add('drag-over');
    }
  };

  const handleZoneDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleReliefDrop = (
    e: React.DragEvent,
    targetType: 'room_slot' | 'runner_slot',
    targetId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    justDroppedRef.current = true;
    setTimeout(() => { justDroppedRef.current = false; }, 400);

    cancelDragLeaveTimer();
    setDragOverRoomSlotId(null);
    if (typeof document !== 'undefined') {
      document.body.classList.remove('dragging-staff');
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    try {
      const dataStr =
        e.dataTransfer.getData('application/json') ||
        e.dataTransfer.getData('text/plain') ||
        e.dataTransfer.getData('text');

      let staffId = '';
      let fromSource: { type?: string; id?: string } | undefined = undefined;
      if (dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          staffId = parsed.staffId || parsed.id || '';
          if (parsed.type) {
            fromSource = { type: parsed.type, id: parsed.id };
          }
        } catch {
          staffId = dataStr.trim();
        }
      }

      // Resilient fallback to window.__activeDraggedStaff
      if (!staffId && typeof window !== 'undefined' && (window as any).__activeDraggedStaff) {
        staffId = (window as any).__activeDraggedStaff.staffId || '';
        if ((window as any).__activeDraggedStaff.type) {
          fromSource = {
            type: (window as any).__activeDraggedStaff.type,
            id: (window as any).__activeDraggedStaff.id
          };
        }
      }

      if (staffId) {
        if (activeReliefStaffIds?.has(staffId)) {
          const st = getStaffById(staffId);
          const name = st ? `${st.lastName} (${st.credentials})` : 'This clinician';
          alert(`${name} is already assigned as relief in another room! A person cannot appear in 2 relief boxes at the same time.`);
          return;
        }

        if (onSetRelief) {
          onSetRelief(targetType, targetId, staffId, undefined, undefined, undefined, fromSource);
        }
      }
    } catch (err) {
      console.error('Error handling relief drop:', err);
    }
  };

  const handleDrop = (
    e: React.DragEvent,
    targetType: 'room_slot' | 'runner_slot' | 'runner_dept',
    targetId: string,
    currentStaffId?: string | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    justDroppedRef.current = true;
    setTimeout(() => { justDroppedRef.current = false; }, 400);

    cancelDragLeaveTimer();
    setDragOverRoomSlotId(null);
    if (typeof document !== 'undefined') {
      document.body.classList.remove('dragging-staff');
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    try {
      const dataStr =
        e.dataTransfer.getData('application/json') ||
        e.dataTransfer.getData('text/plain') ||
        e.dataTransfer.getData('text');

      let staffId = '';
      let parsedObj: any = null;
      if (dataStr) {
        try {
          parsedObj = JSON.parse(dataStr);
          staffId = parsedObj.staffId || parsedObj.id || '';
        } catch {
          staffId = dataStr.trim();
          parsedObj = { staffId, type: 'unassigned' };
        }
      }

      // Resilient fallback to window.__activeDraggedStaff
      if (!parsedObj && typeof window !== 'undefined' && (window as any).__activeDraggedStaff) {
        parsedObj = (window as any).__activeDraggedStaff;
        staffId = parsedObj?.staffId || '';
      }

      if (!staffId) return;
      const validStaff = getStaffById(staffId);
      if (!validStaff) return;

      // SELF-RELIEF: If user drags the provider currently assigned to this slot and drops them back onto the slot,
      // designate them as relieving themselves!
      if (currentStaffId && staffId === currentStaffId && targetType === 'room_slot' && onSetRelief) {
        onSetRelief(targetType, targetId, staffId);
        return;
      }

      onDropStaff(parsedObj, targetType, targetId);
    } catch (err) {
      console.error('Error handling drop:', err);
    }
  };

  const handleTileDragStart = (
    e: React.DragEvent,
    staffMember: Staff,
    source: { type: string; id?: string }
  ) => {
    const payloadObj = {
      staffId: staffMember.id,
      type: source.type,
      id: source.id
    };
    const payload = JSON.stringify(payloadObj);
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.setData('text', payload);
    e.dataTransfer.effectAllowed = 'all';

    if (typeof window !== 'undefined') {
      (window as any).__activeDraggedStaff = payloadObj;
      document.body.classList.add('dragging-staff');
    }
  };

  const handleTileDragEnd = () => {
    cancelDragLeaveTimer();
    setDragOverRoomSlotId(null);
    if (typeof window !== 'undefined') {
      (window as any).__activeDraggedStaff = null;
      document.body.classList.remove('dragging-staff');
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }
  };

  // Split departments into 2 rows (Top 4, Bottom 4)
  const topDepartments = departments.slice(0, 4);
  const bottomDepartments = departments.slice(4);

  const renderDepartment = (dept: Department) => {
    const assignedRoomsCount = dept.rooms.filter(r => r.slots.some(s => !!s.staffId)).length;

    return (
      <div key={dept.id} className="dept-column">
        {/* Department Header - Drag and drop any magnet here to add as a runner */}
        <div
          className="dept-header"
          onDragEnter={handleZoneDragEnter}
          onDragOver={handleZoneDragOver}
          onDragLeave={handleZoneDragLeave}
          onDrop={e => {
            handleDrop(e, 'runner_dept', dept.id);
          }}
          title={`Drag & drop a staff magnet here to add as runner for ${dept.name}`}
        >
          <div className="dept-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="dept-name-text">{dept.name}</span>
              <span className="dept-occupancy-pill" title={`${assignedRoomsCount} of ${dept.rooms.length} rooms assigned`}>
                {assignedRoomsCount}/{dept.rooms.length}
              </span>
            </div>
          </div>

          {/* Runner Slots Group (Only occupied runners) */}
          {(() => {
            const occupied = (dept.runnerSlots || []).filter(r => Boolean(r.staffId && getStaffById(r.staffId)));
            if (occupied.length === 0) return null;
            const isMultiRunner = occupied.length > 1;

            return (
              <div
                className="runner-slots-group"
                onDragEnter={handleZoneDragEnter}
                onDragOver={handleZoneDragOver}
                onDragLeave={handleZoneDragLeave}
                onDrop={e => {
                  handleDrop(e, 'runner_dept', dept.id);
                }}
              >
                {occupied.map((runner, idx) => {
                  const assignedStaff = getStaffById(runner.staffId);
                  if (!assignedStaff) return null;
                  const displayTitle = (runner.title || `Runner ${idx + 1}`).replace(/^RUNNER(\s+\d+)?$/i, (m: string, n?: string) => `Runner${n || ''}`);

                  return (
                    <div
                      key={runner.id}
                      className={`runner-slot-row ${isMultiRunner ? 'multi' : 'single'}`}
                      style={{
                        flex: isMultiRunner ? '1 1 0' : '1 1 100%',
                        minWidth: 0,
                        height: '24px',
                        maxHeight: '26px'
                      }}
                      onDragEnter={handleZoneDragEnter}
                      onDragOver={handleZoneDragOver}
                      onDragLeave={handleZoneDragLeave}
                      onDrop={e => {
                        handleDrop(e, 'runner_dept', dept.id);
                      }}
                    >
                      {/* Primary Runner Zone - dropping here adds an additional runner */}
                      <div
                        className="primary-runner-zone"
                        style={{ flex: 1, minWidth: 0, height: '100%' }}
                        onDragEnter={handleZoneDragEnter}
                        onDragOver={handleZoneDragOver}
                        onDragLeave={handleZoneDragLeave}
                        onDrop={e => {
                          handleDrop(e, 'runner_dept', dept.id);
                        }}
                      >
                        <MagnetTile
                          staff={assignedStaff}
                          slotId={runner.id}
                          slotType="runner_slot"
                          breakfastDone={runner.breakfastDone}
                          lunchDone={runner.lunchDone}
                          currentUserRole={currentUserRole}
                          unreadMessageCount={getStaffUnreadCount(assignedStaff)}
                          magnetNote={assignedStaff.magnetNote || ''}
                          onUpdateNote={onUpdateMagnetNote ? (note) => onUpdateMagnetNote(assignedStaff.id, note) : undefined}
                          onToggleBreak={(type, val) => onToggleBreak('runner_slot', runner.id, type, val)}
                          onSelectStaff={onSelectStaff}
                          onDragStart={handleTileDragStart}
                          onDragEnd={handleTileDragEnd}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
                <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: 3, alignItems: 'center', height: '100%', minWidth: 0 }}>
                  {/* Left adjusted future case time in red box (clickable to open assign staff modal where time can be cleared) */}
                  {room.futureTime && (
                    <div
                      className="room-future-time-badge"
                      title={`Estimated future case time: ${room.futureTime}. Click to edit, clear time, or assign staff.`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const firstSlot = room.slots[0];
                        const targetSlotId = firstSlot?.id || `room_slot_${room.id}`;
                        onSelectEmptySlot('room_slot', targetSlotId, `${dept.name} Room ${room.name}`, room.id, room.futureTime);
                      }}
                    >
                      <span className="room-future-time-text">{room.futureTime}</span>
                    </div>
                  )}

                  {room.slots
                    .filter((slot, idx) => idx === 0 || !!slot.staffId)
                    .map(slot => {
                    const assignedStaff = getStaffById(slot.staffId);
                    const reliefStaff = getStaffById(slot.relief?.staffId || null);
                    const hasAssignedRelief = Boolean(slot.relief && reliefStaff);
                    const isOpenRedBox = Boolean(slot.relief && (!slot.relief.staffId || slot.relief.isRedBox) && !hasAssignedRelief);

                    return (
                      <div
                        key={slot.id}
                        className={`room-slot-row ${dragOverRoomSlotId === slot.id ? 'drag-near' : ''}`}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          activateRoomDragNear(slot.id, Boolean(assignedStaff));
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          activateRoomDragNear(slot.id, Boolean(assignedStaff));
                        }}
                        onDragLeave={() => {
                          scheduleRoomDragLeave(slot.id);
                        }}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', width: '100%', height: '100%', gap: 3, minWidth: 0, position: 'relative' }}
                      >
                        {/* Primary Staff Drop Zone */}
                        <div
                          className="primary-slot-zone"
                          style={{ flex: 1, minWidth: 0, height: '100%' }}
                          onDragEnter={(e) => {
                            handleZoneDragEnter(e);
                            activateRoomDragNear(slot.id, Boolean(assignedStaff));
                          }}
                          onDragOver={(e) => {
                            handleZoneDragOver(e);
                            activateRoomDragNear(slot.id, Boolean(assignedStaff));
                          }}
                          onDragLeave={(e) => {
                            handleZoneDragLeave(e);
                            scheduleRoomDragLeave(slot.id);
                          }}
                          onDrop={e => {
                            cancelDragLeaveTimer();
                            handleDrop(e, 'room_slot', slot.id, assignedStaff?.id);
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
                              unreadMessageCount={getStaffUnreadCount(assignedStaff)}
                              magnetNote={assignedStaff.magnetNote || ''}
                              onUpdateNote={onUpdateMagnetNote ? (note) => onUpdateMagnetNote(assignedStaff.id, note) : undefined}
                              onToggleBreak={(type, val) => onToggleBreak('room_slot', slot.id, type, val)}
                              onSelectStaff={onSelectStaff}
                              onDragStart={handleTileDragStart}
                              onDragEnd={handleTileDragEnd}
                            />
                          ) : (
                            <div
                              className="room-slot-target empty"
                              style={{ width: '100%', height: '100%' }}
                              onClick={() => {
                                onSelectEmptySlot('room_slot', slot.id, `${dept.name} Room ${room.name}`, room.id, room.futureTime);
                              }}
                              title={`Click or drop staff to assign to Room ${room.name}`}
                            />
                          )}
                        </div>

                        {/* Relief Zone (assigned relief-box, open 3 PM red box, or hoverable + Relief) */}
                        {hasAssignedRelief && reliefStaff ? (
                          <>
                            <span className="relief-arrow" title="Relief assignment">➔</span>
                            <div
                              className="relief-box"
                              draggable={isEditor}
                              onDragStart={(e) => {
                                if (!isEditor) return;
                                const payloadObj = {
                                  staffId: reliefStaff.id,
                                  type: 'relief_slot',
                                  id: slot.id,
                                  sourceSlotId: slot.id,
                                  sourceSlotType: 'room_slot'
                                };
                                const payload = JSON.stringify(payloadObj);
                                e.dataTransfer.setData('application/json', payload);
                                e.dataTransfer.setData('text/plain', payload);
                                e.dataTransfer.setData('text', payload);
                                e.dataTransfer.effectAllowed = 'all';

                                if (typeof window !== 'undefined') {
                                  (window as any).__activeDraggedStaff = payloadObj;
                                  document.body.classList.add('dragging-staff');
                                }
                              }}
                              onDragEnd={handleTileDragEnd}
                              onDragEnter={(e) => {
                                handleZoneDragEnter(e);
                                activateRoomDragNear(slot.id, Boolean(assignedStaff));
                              }}
                              onDragOver={(e) => {
                                handleZoneDragOver(e);
                                activateRoomDragNear(slot.id, Boolean(assignedStaff));
                              }}
                              onDragLeave={(e) => {
                                handleZoneDragLeave(e);
                                scheduleRoomDragLeave(slot.id);
                              }}
                              onDrop={(e) => {
                                cancelDragLeaveTimer();
                                handleReliefDrop(e, 'room_slot', slot.id);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (justDroppedRef.current) return;
                                if (onOpenReliefModal) {
                                  onOpenReliefModal({
                                    type: 'room_slot',
                                    id: slot.id,
                                    roomName: `Room ${room.name}`,
                                    departmentName: dept.name,
                                    currentStaff: assignedStaff || null,
                                    currentRelief: slot.relief
                                  });
                                }
                              }}
                              title={`Relief: ${reliefStaff.lastName} (${reliefStaff.credentials}). Drag back to Bullpen to remove, or tap to edit/handoff.`}
                            >
                              <div className="relief-identity">
                                <span className="relief-name">{reliefStaff.lastName.toUpperCase()}</span>
                              </div>
                            </div>
                          </>
                        ) : isOpenRedBox ? (
                          <div
                            className="relief-slot-target persistent-red-box"
                            onDragEnter={(e) => {
                              handleZoneDragEnter(e);
                              activateRoomDragNear(slot.id, Boolean(assignedStaff));
                            }}
                            onDragOver={(e) => {
                              handleZoneDragOver(e);
                              activateRoomDragNear(slot.id, Boolean(assignedStaff));
                            }}
                            onDragLeave={(e) => {
                              handleZoneDragLeave(e);
                              scheduleRoomDragLeave(slot.id);
                            }}
                            onDrop={(e) => {
                              cancelDragLeaveTimer();
                              handleReliefDrop(e, 'room_slot', slot.id);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (justDroppedRef.current) return;
                              // PHASE 2: Open modal to assign a clinician
                              if (onOpenReliefModal) {
                                onOpenReliefModal({
                                  type: 'room_slot',
                                  id: slot.id,
                                  roomName: `Room ${room.name}`,
                                  departmentName: dept.name,
                                  currentStaff: assignedStaff || null,
                                  currentRelief: slot.relief
                                });
                              }
                            }}
                            title="Red Box active. Tap to assign relief clinician, or drop staff here."
                          >
                            <span className="relief-slot-label">+ Relief</span>
                            {isEditor && onRemoveRelief && (
                              <button
                                type="button"
                                className="relief-quick-clear-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveRelief('room_slot', slot.id, true);
                                }}
                                title="Clear red box"
                                aria-label="Clear red box"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ) : (isEditor && assignedStaff) ? (
                          <div
                            className={`relief-slot-target ${dragOverRoomSlotId === slot.id ? 'drag-near-active' : ''}`}
                            onDragEnter={(e) => {
                              handleZoneDragEnter(e);
                              activateRoomDragNear(slot.id, Boolean(assignedStaff));
                            }}
                            onDragOver={(e) => {
                              handleZoneDragOver(e);
                              activateRoomDragNear(slot.id, Boolean(assignedStaff));
                            }}
                            onDragLeave={(e) => {
                              handleZoneDragLeave(e);
                              scheduleRoomDragLeave(slot.id);
                            }}
                            onDrop={(e) => {
                              cancelDragLeaveTimer();
                              handleReliefDrop(e, 'room_slot', slot.id);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (justDroppedRef.current) return;
                              // PHASE 1: DIRECT SINGLE CLICK TO DESIGNATE RED BOX!
                              if (onSetRelief) {
                                onSetRelief('room_slot', slot.id, '', '', '', true);
                              }
                            }}
                            title="Single click / tap to designate relief (Red Box), or drop staff here"
                          >
                            <span className="relief-slot-label">+ Relief</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
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
      {/* Top 4 Departments */}
      <div className="dept-row-top">
        {topDepartments.map(renderDepartment)}
      </div>

      {/* Bottom 4 Departments */}
      <div className="dept-row-bottom">
        {bottomDepartments.map(renderDepartment)}
      </div>
    </div>
  );
};
