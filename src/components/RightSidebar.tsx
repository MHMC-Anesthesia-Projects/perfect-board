'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { DepartureItem, LateShiftItem, CallTeamItem, UserRole, Staff, Department } from '@/types/whiteboard';
import { Plus, Trash2, Mic, StickyNote, X, ChevronRight, Check } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface RightSidebarProps {
  departureList: DepartureItem[];
  callTeamList: CallTeamItem[];
  departureNotes?: string;
  latesList: LateShiftItem[];
  latesNotes: string;
  currentUserRole: UserRole;
  staff?: Staff[];
  departments?: Department[];
  showDepartureList?: boolean;
  showLateList?: boolean;
  onSelectStaff?: (staff: Staff) => void;
  onUpdateDepartureNotes?: (notes: string) => void;
  onUpdateLatesNotes: (notes: string) => void;
  onUpdateLists: (departureList: DepartureItem[], latesList: LateShiftItem[], isReorder?: boolean) => void;
  onUpdateCallTeam: (callTeamList: CallTeamItem[]) => void;
  onOpenVoiceNotes: (targetType: 'departure' | 'lates', currentNotes: string) => void;
  onToggleDepartureStruck: (id: string) => void;
  onToggleCollapse?: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  departureList,
  callTeamList,
  latesList,
  latesNotes,
  currentUserRole,
  staff = [],
  departments = [],
  showDepartureList = true,
  showLateList = true,
  onSelectStaff,
  onUpdateLatesNotes,
  onUpdateLists,
  onUpdateCallTeam,
  onOpenVoiceNotes,
  onToggleDepartureStruck,
  onToggleCollapse
}) => {
  const isEditor = currentUserRole === 'board_runner' || currentUserRole === 'admin' || currentUserRole === 'superuser';

  // Resizable column state (persisted to localStorage)
  const [sidebarWidth, setSidebarWidth] = useState<number>(380);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    try {
      const savedWidth = localStorage.getItem('whiteboard_right_sidebar_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 260 && parsed <= 800) {
          setSidebarWidth(parsed);
        }
      }
    } catch {}
  }, []);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startW = sidebarWidth;

    const handleMouseMove = (moveEvt: MouseEvent) => {
      const deltaX = startX - moveEvt.clientX;
      const nextW = Math.min(800, Math.max(260, startW + deltaX));
      setSidebarWidth(nextW);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setSidebarWidth(currentW => {
        try {
          localStorage.setItem('whiteboard_right_sidebar_width', String(currentW));
        } catch {}
        return currentW;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStartResize = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    setIsResizing(true);
    const startX = e.touches[0].clientX;
    const startW = sidebarWidth;

    const handleTouchMove = (moveEvt: TouchEvent) => {
      if (moveEvt.touches.length === 0) return;
      moveEvt.preventDefault();
      const deltaX = startX - moveEvt.touches[0].clientX;
      const nextW = Math.min(800, Math.max(260, startW + deltaX));
      setSidebarWidth(nextW);
    };

    const handleTouchEnd = () => {
      setIsResizing(false);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      setSidebarWidth(currentW => {
        try {
          localStorage.setItem('whiteboard_right_sidebar_width', String(currentW));
        } catch {}
        return currentW;
      });
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  };

  const handleStaffClick = (
    lastName: string,
    id?: string,
    qgendaAbbr?: string,
    orderNumber?: number,
    shift?: string,
    fallbackCreds: Staff['credentials'] = 'MD'
  ) => {
    if (!onSelectStaff) return;

    const cleanLast = lastName.trim().toUpperCase();
    const cleanQ = (qgendaAbbr || '').replace(/\[.*?\]/g, '').toUpperCase().trim();
    const targetRole = fallbackCreds;

    // 1. Exact match by qgendaAbbr
    let matched = cleanQ ? staff.find(s => s.qgendaAbbr?.toUpperCase() === cleanQ) : undefined;

    // 2. Direct match by id
    if (!matched && id) {
      matched = staff.find(s => s.id === id);
    }

    // 3. Match by matching lastName AND matching role/credentials
    if (!matched) {
      matched = staff.find(s => {
        const sLast = s.lastName.toUpperCase();
        const isLastMatch = sLast === cleanLast ||
          cleanLast.startsWith(sLast + ' ') ||
          (cleanLast === 'KD' && (sLast.includes('DWARAK') || s.qgendaAbbr?.toUpperCase().includes('DWARAK'))) ||
          (cleanLast === 'TALL' && (sLast.includes('TALLACK') || s.qgendaAbbr?.toUpperCase().includes('TALLACK')));

        if (!isLastMatch) return false;

        if (targetRole === 'MD') {
          return s.credentials === 'MD';
        } else if (targetRole === 'CRNA') {
          return s.credentials === 'CRNA' || s.credentials === 'Resident' || s.credentials === 'SRNA' || s.credentials === 'PA';
        }
        return true;
      });
    }

    // 4. Fallback to lastName only if no credential-specific match
    if (!matched) {
      matched = staff.find(s => {
        const sLast = s.lastName.toUpperCase();
        return sLast === cleanLast ||
          cleanLast.startsWith(sLast + ' ') ||
          (cleanLast === 'KD' && (sLast.includes('DWARAK') || s.qgendaAbbr?.toUpperCase().includes('DWARAK'))) ||
          (cleanLast === 'TALL' && (sLast.includes('TALLACK') || s.qgendaAbbr?.toUpperCase().includes('TALLACK')));
      });
    }

    if (matched) {
      onSelectStaff({
        ...matched,
        orderNumber: orderNumber ?? matched.orderNumber,
        shift: matched.shift || shift
      });
    } else {
      const fallbackStaff: Staff = {
        id: id || `staff_roster_${cleanLast.toLowerCase()}`,
        firstName: '',
        lastName: cleanLast,
        credentials: fallbackCreds,
        phone: '(555) 000-0000',
        shift: shift || 'Day',
        facility: 'MHMC',
        active: true,
        orderNumber,
        qgendaAbbr
      };
      onSelectStaff(fallbackStaff);
    }
  };

  // State for adding departure
  const [newDepartureName, setNewDepartureName] = useState('');
  const [newDepartureCategory, setNewDepartureCategory] = useState<'post_call' | 'special' | 'non_call'>('non_call');
  const [newDepartureTime, setNewDepartureTime] = useState('2p');
  const [showAddDep, setShowAddDep] = useState(false);

  // State for Call Team
  const [showAddCall, setShowAddCall] = useState(false);
  const [newCallRole, setNewCallRole] = useState('');
  const [newCallDoc, setNewCallDoc] = useState('');

  // Drag-and-drop state for reordering departures
  const [draggedDepartureId, setDraggedDepartureId] = useState<string | null>(null);
  const [dragOverDepartureId, setDragOverDepartureId] = useState<string | null>(null);

  // Helper to check standard late shift (3p, 4p, 5p, 7p, 8p, night, 7p-7a)
  const isStandardLateTime = (t: string) => /^(?:3p|4p|5p|7p|8p|night|7p-7a|11a-11p)/i.test(t) ||
    t.includes('3p') || t.includes('4p') || t.includes('5p') || t.includes('7p') || t.includes('8p');

  // Helper to check atypical departure time (e.g. 2p, 1p, 1:30p)
  const isAtypicalDepartureTime = (t: string) => /^[0-9]{1,2}(?::[0-9]{2})?\s*(?:a|p|am|pm)$/i.test(t) && !isStandardLateTime(t);

  // 1. Post-Call list
  const postCallList = useMemo(() => {
    return departureList
      .filter(d => d.category === 'post_call')
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [departureList]);

  // 2. Special list (MDs with atypical departure times e.g. 2p)
  const specialDepartureList = useMemo(() => {
    return departureList
      .filter(d => {
        if (d.category === 'post_call') return false;
        if (d.category === 'special') return true;
        const timeEst = (d.timeEstimate || '').toLowerCase().trim();
        const matchedStaff = staff.find(s =>
          s.lastName.toUpperCase() === d.name.toUpperCase() ||
          (d.qgendaAbbr && s.qgendaAbbr?.toUpperCase() === d.qgendaAbbr.toUpperCase())
        );
        const staffShift = (matchedStaff?.shift || '').toLowerCase().trim();
        return isAtypicalDepartureTime(timeEst) || isAtypicalDepartureTime(staffShift);
      })
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [departureList, staff]);

  // 3. Non-Call list (regular non-call MDs without fixed late/atypical times)
  const nonCallList = useMemo(() => {
    return departureList
      .filter(d => {
        if (d.category === 'post_call' || d.category === 'special') return false;
        const timeEst = (d.timeEstimate || '').toLowerCase().trim();
        const matchedStaff = staff.find(s =>
          s.lastName.toUpperCase() === d.name.toUpperCase() ||
          (d.qgendaAbbr && s.qgendaAbbr?.toUpperCase() === d.qgendaAbbr.toUpperCase())
        );
        const staffShift = (matchedStaff?.shift || '').toLowerCase().trim();
        const isLate = isStandardLateTime(timeEst) || isStandardLateTime(staffShift);
        const isAtypical = isAtypicalDepartureTime(timeEst) || isAtypicalDepartureTime(staffShift);
        if (isLate || isAtypical) return false;
        return true;
      })
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [departureList, staff]);

  // Map of relief staffId -> string[] of locations they are assigned to relieve
  const pendingReliefMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!departments) return map;

    departments.forEach(dept => {
      (dept.runnerSlots || []).forEach(runner => {
        if (runner.relief?.staffId && runner.relief.staffId.trim() !== '') {
          const loc = `${dept.name} (${runner.title || 'Runner'})`;
          const existing = map.get(runner.relief.staffId) || [];
          existing.push(loc);
          map.set(runner.relief.staffId, existing);
        }
      });

      (dept.rooms || []).forEach(room => {
        (room.slots || []).forEach(slot => {
          if (slot.relief?.staffId && slot.relief.staffId.trim() !== '') {
            const loc = `${dept.name} Rm ${room.name}`;
            const existing = map.get(slot.relief.staffId) || [];
            existing.push(loc);
            map.set(slot.relief.staffId, existing);
          }
        });
      });
    });

    return map;
  }, [departments]);

  // Helper to match clinicians in Departure/Lates/Call Team to pending relief assignments
  const getReliefLocations = (name: string, id?: string, qgendaAbbr?: string): string[] | null => {
    if (pendingReliefMap.size === 0) return null;

    // 1. Direct ID match
    if (id && pendingReliefMap.has(id)) {
      return pendingReliefMap.get(id) || null;
    }

    const cleanName = (name || '').trim().toUpperCase();
    const normalizedClean = cleanName.replace(/^DR\.?\s*/i, '').trim();

    // 2. Iterate pending relief map entries and match against staff
    for (const [reliefStaffId, locations] of pendingReliefMap.entries()) {
      if (id && reliefStaffId === id) return locations;

      const s = staff.find(st => st.id === reliefStaffId);
      if (s) {
        const sLast = (s.lastName || '').trim().toUpperCase();
        const sFirst = (s.firstName || '').trim().toUpperCase();
        const sDisplay = s.displayName ? s.displayName.trim().toUpperCase() : '';
        const sQgenda = s.qgendaAbbr ? s.qgendaAbbr.trim().toUpperCase() : '';
        const itemQgenda = qgendaAbbr ? qgendaAbbr.trim().toUpperCase() : '';

        // Match by Qgenda abbreviation
        if (itemQgenda && sQgenda && itemQgenda === sQgenda) {
          return locations;
        }

        if (normalizedClean) {
          // Exact match on last name or display name
          if (sLast && normalizedClean === sLast) return locations;
          if (sDisplay && (normalizedClean === sDisplay || normalizedClean === sDisplay.replace(/^DR\.?\s*/i, '').trim())) {
            return locations;
          }

          // Match full name formats
          if (sFirst && sLast) {
            if (
              normalizedClean === `${sFirst} ${sLast}` ||
              normalizedClean === `${sLast}, ${sFirst}` ||
              normalizedClean === `${sLast} ${sFirst}` ||
              normalizedClean === `${sFirst[0]}. ${sLast}` ||
              normalizedClean === `${sLast} ${sFirst[0]}.`
            ) {
              return locations;
            }
          }

          // Well-known hospital aliases
          if (normalizedClean === 'KD' && (sLast === 'DAVID' || sFirst === 'KAMILAH' || sQgenda === 'KD')) {
            return locations;
          }
          if (normalizedClean === 'TALL' && (sLast === 'TALLACKSON' || sQgenda === 'TALL')) {
            return locations;
          }

          // Split hyphenated or multi-part last names
          const lastParts = sLast.split(/[-\s]+/);
          if (lastParts.length > 1 && lastParts.includes(normalizedClean)) {
            return locations;
          }
        }
      }
    }

    return null;
  };

  // State for adding late staff (supports specific category targeted by plus button)
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newLateName, setNewLateName] = useState('');
  const [newLateRole, setNewLateRole] = useState<'CRNA' | 'MD'>('CRNA');
  const [disambiguationMessage, setDisambiguationMessage] = useState<string | null>(null);
  const [showLatesNotesModal, setShowLatesNotesModal] = useState(false);

  // Matching staff suggestions for late staff addition with disambiguation (e.g. Patel MD vs Patel CRNA)
  const matchingLateStaffSuggestions = useMemo(() => {
    const q = newLateName.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return staff.filter(s => {
      const last = (s.lastName || '').toLowerCase();
      const first = (s.firstName || '').toLowerCase();
      const disp = (s.displayName || '').toLowerCase();
      const qg = (s.qgendaAbbr || '').toLowerCase();
      return last.startsWith(q) || last.includes(q) || first.includes(q) || disp.includes(q) || qg.includes(q);
    }).slice(0, 10);
  }, [newLateName, staff]);

  // App-themed modal state for confirming staff deletion
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'departure' | 'late' | 'call_team';
    id: string;
    name: string;
    categoryLabel: string;
  } | null>(null);

  // Helper to parse late category or time into sortable minutes from midnight
  const parseLateCategoryMinutes = (category: string, items?: LateShiftItem[]): number => {
    const cat = (category || '').toLowerCase().trim();
    if (cat === 'special') {
      const itemTime = items?.find(i => Boolean(i.timeEstimate))?.timeEstimate || items?.[0]?.timeEstimate;
      if (itemTime) {
        return parseLateCategoryMinutes(itemTime);
      }
      return 14 * 60; // 2:00 PM (before 3pm)
    }
    if (cat === '7p-7a' || cat.includes('night')) {
      return 19 * 60 + 1; // 7:01 PM night shift
    }
    if (cat === '24h') {
      return 24 * 60 + 50; // 24-hour shift at bottom of late list
    }
    const match = cat.match(/(\d{1,2})(?::(\d{2}))?\s*(a|p|am|pm)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const mins = match[2] ? parseInt(match[2], 10) : 0;
      const meridian = match[3] ? match[3].toLowerCase() : '';
      if (meridian.startsWith('p') && hours < 12) {
        hours += 12;
      } else if (meridian.startsWith('a') && hours === 12) {
        hours = 0;
      } else if (!meridian) {
        if (hours >= 1 && hours <= 6) hours += 12;
        else if (hours >= 7 && hours <= 11) hours += 12;
      }
      return hours * 60 + mins;
    }
    return 9999;
  };

  // Group lates by time category (Special at top, then 3p, 4p, 5p, 7p, 8p, 7p-7a, 24h)
  const baseLateCategories = ['special', '3p', '4p', '5p', '7p', '8p', '7p-7a', '24h'];
  const latesGrouped: Record<string, LateShiftItem[]> = {};
  baseLateCategories.forEach(cat => {
    latesGrouped[cat] = [];
  });
  
  // Standard late categories (>= 3pm)
  const standardLateCats = ['3p', '4p', '5p', '7p', '8p', '7p-7a', '24h'];

  // Group items: Any atypical time (like 2p, 1p, special) groups into 'special'
  latesList.forEach(item => {
    const rawCat = (item.timeCategory || '').trim();
    const lowerCat = rawCat.toLowerCase();
    const isStandard = standardLateCats.includes(lowerCat);
    const groupKey = isStandard ? lowerCat : 'special';

    // The blue time badge shows their specific time (e.g. 2p) to guide the board runner
    const effectiveTime = item.timeEstimate || (!isStandard && rawCat !== 'special' && rawCat ? rawCat : '2p');

    if (!latesGrouped[groupKey]) {
      latesGrouped[groupKey] = [];
    }

    latesGrouped[groupKey].push({
      ...item,
      timeEstimate: effectiveTime
    });
  });

  // Sort each time section first by MD then by CRNA, and sort alphabetically
  const isItemMd = (item: LateShiftItem) => {
    if (item.role === 'MD') return true;
    if (item.role === 'CRNA') return false;
    if (item.qgendaAbbr) {
      const matchQ = staff.find(s => s.qgendaAbbr?.toUpperCase() === item.qgendaAbbr?.toUpperCase());
      if (matchQ) return matchQ.credentials === 'MD';
    }
    const match = staff.find(s => s.lastName.toUpperCase() === item.name.toUpperCase());
    return match?.credentials === 'MD';
  };

  baseLateCategories.forEach(cat => {
    if (latesGrouped[cat]) {
      latesGrouped[cat].sort((a, b) => {
        if (cat === 'special' && a.timeEstimate && b.timeEstimate && a.timeEstimate !== b.timeEstimate) {
          const aMins = parseLateCategoryMinutes(a.timeEstimate);
          const bMins = parseLateCategoryMinutes(b.timeEstimate);
          if (aMins !== bMins) return aMins - bMins;
        }

        const isMdA = isItemMd(a);
        const isMdB = isItemMd(b);
        if (isMdA && !isMdB) return -1;
        if (!isMdA && isMdB) return 1;

        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
    }
  });

  // Sort late categories chronologically by time: Special (with times before 3pm like 2p) appears at the TOP!
  const sortedLateCategories = Object.keys(latesGrouped).sort((a, b) => {
    const aMins = parseLateCategoryMinutes(a, latesGrouped[a]);
    const bMins = parseLateCategoryMinutes(b, latesGrouped[b]);
    return aMins - bMins;
  });

  const handleAddDeparture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartureName.trim()) return;
    const targetCat = newDepartureCategory;
    const targetSubList = targetCat === 'post_call' ? postCallList : targetCat === 'special' ? specialDepartureList : nonCallList;

    const newItem: DepartureItem = {
      id: `dep_${Date.now()}`,
      name: newDepartureName.trim().toUpperCase(),
      category: targetCat,
      timeEstimate: targetCat === 'special' ? (newDepartureTime.trim() || '2p') : undefined,
      orderIndex: targetSubList.length,
      departed: false
    };

    const updated = [...departureList, newItem];
    onUpdateLists(updated, latesList);
    setNewDepartureName('');
    setShowAddDep(false);
  };

  const handleMoveDeparture = (draggedId: string, targetCategory: 'post_call' | 'special' | 'non_call', targetIndex: number) => {
    const itemToMove = departureList.find(d => d.id === draggedId);
    if (!itemToMove) return;

    let postList = postCallList.filter(d => d.id !== draggedId);
    let specList = specialDepartureList.filter(d => d.id !== draggedId);
    let nonList = nonCallList.filter(d => d.id !== draggedId);

    const updatedItem: DepartureItem = {
      ...itemToMove,
      category: targetCategory
    };

    if (targetCategory === 'post_call') {
      const insertAt = Math.max(0, Math.min(targetIndex, postList.length));
      postList.splice(insertAt, 0, updatedItem);
    } else if (targetCategory === 'special') {
      const insertAt = Math.max(0, Math.min(targetIndex, specList.length));
      specList.splice(insertAt, 0, updatedItem);
    } else {
      const insertAt = Math.max(0, Math.min(targetIndex, nonList.length));
      nonList.splice(insertAt, 0, updatedItem);
    }

    postList = postList.map((d, idx) => ({ ...d, orderIndex: idx, category: 'post_call' as const }));
    specList = specList.map((d, idx) => ({ ...d, orderIndex: postList.length + idx, category: 'special' as const }));
    nonList = nonList.map((d, idx) => ({ ...d, orderIndex: postList.length + specList.length + idx, category: 'non_call' as const }));

    onUpdateLists([...postList, ...specList, ...nonList], latesList, true);
  };

  const handleInitiateRemoveDeparture = (doc: DepartureItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const catLabel = doc.category === 'post_call' ? 'Post-Call' : 'Non-Call';
    setDeleteTarget({
      type: 'departure',
      id: doc.id,
      name: `Dr. ${doc.name}`,
      categoryLabel: `${catLabel} Departure`
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

  const handleAddSelectedStaffToLate = (category: string, selectedStaff: Staff) => {
    // Check if multiple providers share this last name to determine whether to use displayName
    const sameLastName = staff.filter(s => (s.lastName || '').toUpperCase() === (selectedStaff.lastName || '').toUpperCase());
    const useDisplayName = sameLastName.length > 1;
    const finalName = useDisplayName && selectedStaff.displayName
      ? selectedStaff.displayName.toUpperCase()
      : (selectedStaff.lastName || selectedStaff.displayName || '').toUpperCase();

    const role = (selectedStaff.credentials as 'MD' | 'CRNA') || newLateRole;

    const newItem: LateShiftItem = {
      id: `late_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: finalName,
      timeCategory: category,
      role: role,
      qgendaAbbr: selectedStaff.qgendaAbbr,
      orderIndex: latesList.length
    };

    const updated = [...latesList, newItem];
    onUpdateLists(departureList, updated);
    setNewLateName('');
    setDisambiguationMessage(null);
    setAddingToCategory(null);
  };

  const handleAddLateToCategory = (category: string, e: React.FormEvent) => {
    e.preventDefault();
    const query = newLateName.trim();
    if (!query) return;

    const cleanUpper = query.toUpperCase();
    const exactMatches = staff.filter(s =>
      (s.lastName || '').toUpperCase() === cleanUpper ||
      (s.displayName && s.displayName.toUpperCase() === cleanUpper) ||
      (s.qgendaAbbr && s.qgendaAbbr.toUpperCase() === cleanUpper)
    );

    // If there are multiple matches (e.g. Patel MD and Patel CRNA)
    if (exactMatches.length > 1) {
      const roleMatches = exactMatches.filter(s => s.credentials === newLateRole);
      if (roleMatches.length === 1) {
        handleAddSelectedStaffToLate(category, roleMatches[0]);
        return;
      }
      setDisambiguationMessage(`Multiple providers found matching "${query}". Please choose CRNA or MD above or select below:`);
      return;
    }

    if (exactMatches.length === 1) {
      handleAddSelectedStaffToLate(category, exactMatches[0]);
      return;
    }

    // Partial matches if only 1 exists
    const partialMatches = staff.filter(s =>
      (s.lastName || '').toUpperCase().startsWith(cleanUpper) ||
      (s.displayName && s.displayName.toUpperCase().startsWith(cleanUpper))
    );
    if (partialMatches.length === 1) {
      handleAddSelectedStaffToLate(category, partialMatches[0]);
      return;
    }

    // Otherwise, add as custom/manual staff with selected role
    const newItem: LateShiftItem = {
      id: `late_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanUpper,
      timeCategory: category,
      role: newLateRole,
      orderIndex: latesList.length
    };
    const updated = [...latesList, newItem];
    onUpdateLists(departureList, updated);
    setNewLateName('');
    setDisambiguationMessage(null);
    setAddingToCategory(null);
  };

  const handleInitiateRemoveLate = (item: LateShiftItem, category: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({
      type: 'late',
      id: item.id,
      name: `${item.name}${item.role ? ' (' + item.role + ')' : ''}`,
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
    <aside className="right-sidebar-columns" style={{ width: `${sidebarWidth}px` }}>
      {/* Resizable drag handle (Mouse and Touch) */}
      <div
        className={`sidebar-resize-handle ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleMouseDownResize}
        onTouchStart={handleTouchStartResize}
        title="Drag with mouse or finger to expand or narrow Departure & Lates"
      />

      {/* ---------------- 1. DEPARTURE COLUMN ---------------- */}
      {showDepartureList && (
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
            {/* Category Selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <button
                type="button"
                onClick={() => setNewDepartureCategory('post_call')}
                style={{
                  flex: 1,
                  padding: '4px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  border: newDepartureCategory === 'post_call' ? '1.5px solid var(--marker-red)' : '1px solid var(--border-light)',
                  background: newDepartureCategory === 'post_call' ? 'rgba(211, 47, 47, 0.12)' : 'var(--surface-card)',
                  color: newDepartureCategory === 'post_call' ? 'var(--marker-red)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Post-Call
              </button>
              <button
                type="button"
                onClick={() => setNewDepartureCategory('special')}
                style={{
                  flex: 1,
                  padding: '4px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  border: newDepartureCategory === 'special' ? '1.5px solid #2563eb' : '1px solid var(--border-light)',
                  background: newDepartureCategory === 'special' ? 'rgba(37, 99, 235, 0.15)' : 'var(--surface-card)',
                  color: newDepartureCategory === 'special' ? '#2563eb' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Special
              </button>
              <button
                type="button"
                onClick={() => setNewDepartureCategory('non_call')}
                style={{
                  flex: 1,
                  padding: '4px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  border: newDepartureCategory === 'non_call' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-light)',
                  background: newDepartureCategory === 'non_call' ? 'var(--accent-surface)' : 'var(--surface-card)',
                  color: newDepartureCategory === 'non_call' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Non-Call
              </button>
            </div>
            {newDepartureCategory === 'special' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>Fixed Time:</span>
                <input
                  type="text"
                  placeholder="e.g. 2p, 1:30p"
                  value={newDepartureTime}
                  onChange={e => setNewDepartureTime(e.target.value)}
                  style={{
                    width: 110,
                    padding: '3px 6px',
                    fontSize: 11,
                    borderRadius: 4,
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-card)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            )}
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
                Add to {newDepartureCategory === 'post_call' ? 'Post-Call' : 'Non-Call'}
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
          {/* 1.1 POST-CALL SECTION (Above Non-Call) */}
          <div className="departure-sub-section">
            <div className="departure-sub-header post-call-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800, color: 'var(--marker-red)', fontSize: 11 }}>POST-CALL</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({postCallList.length})</span>
              </div>
              {isEditor && (
                <button
                  type="button"
                  onClick={() => {
                    setNewDepartureCategory('post_call');
                    setShowAddDep(true);
                  }}
                  style={{
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 3,
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--marker-red)',
                    cursor: 'pointer'
                  }}
                  title="Add Doctor to Post-Call"
                >
                  <Plus size={11} />
                </button>
              )}
            </div>

            <div
              className="departure-sub-list"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/departure-id');
                if (draggedId) {
                  handleMoveDeparture(draggedId, 'post_call', postCallList.length);
                }
                setDraggedDepartureId(null);
                setDragOverDepartureId(null);
              }}
            >
              {postCallList.map((doc, idx) => {
                const reliefLocs = getReliefLocations(doc.name, doc.id, doc.qgendaAbbr);
                return (
                <div
                  key={doc.id}
                  className={`departure-item ${doc.departed ? 'struck' : ''} ${dragOverDepartureId === doc.id ? 'drag-over' : ''} ${draggedDepartureId === doc.id ? 'dragging' : ''}`}
                  onClick={() => handleStaffClick(doc.name, doc.id, doc.qgendaAbbr, doc.orderNumber, doc.timeEstimate, 'MD')}
                  draggable={isEditor}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/departure-id', doc.id);
                    setDraggedDepartureId(doc.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverDepartureId(doc.id);
                  }}
                  onDragLeave={() => {
                    setDragOverDepartureId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const draggedId = e.dataTransfer.getData('text/departure-id');
                    if (draggedId && draggedId !== doc.id) {
                      handleMoveDeparture(draggedId, 'post_call', idx);
                    }
                    setDraggedDepartureId(null);
                    setDragOverDepartureId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedDepartureId(null);
                    setDragOverDepartureId(null);
                  }}
                  title={doc.departed ? 'Marked departed (Click name to view/edit details)' : 'Click to view/edit details (or use circle to mark departed)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                    {reliefLocs && (
                      <span
                        className="pending-relief-indicator-dot"
                        title={`Assigned as pending relief for: ${reliefLocs.join(', ')}`}
                      />
                    )}
                    <span className="departure-name">{doc.name}</span>
                    {doc.timeEstimate && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 4px',
                          borderRadius: 3,
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#059669',
                          flexShrink: 0
                        }}
                      >
                        {doc.timeEstimate}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {isEditor && (
                      <button
                        type="button"
                        onClick={(e) => handleInitiateRemoveDeparture(doc, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.5
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        title={`Remove ${doc.name} from Departure list`}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                    {/* Mark Departed Toggle Circle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDepartureStruck(doc.id);
                      }}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: doc.departed ? '1.5px solid var(--marker-green)' : '1.5px solid var(--border-light)',
                        background: doc.departed ? 'var(--marker-green)' : 'transparent',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0
                      }}
                      title={doc.departed ? 'Marked departed (Click to unmark)' : 'Mark as departed (Strike through)'}
                    >
                      {doc.departed && <Check size={10} strokeWidth={3} />}
                    </button>
                  </div>
                </div>
              );
            })}

              {postCallList.length === 0 && (
                <div className="departure-empty-hint">
                  No doctors on post-call list.
                </div>
              )}
            </div>
          </div>

          {/* 1.1b SPECIAL SECTION (Atypical departure times like 2p) - Hidden if empty */}
          {specialDepartureList.length > 0 && (
            <div className="departure-sub-section">
              <div className="departure-sub-header special-header" style={{ borderLeft: '3px solid #2563eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 800, color: '#2563eb', fontSize: 11 }}>SPECIAL</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({specialDepartureList.length})</span>
                </div>
                {isEditor && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewDepartureCategory('special');
                      setShowAddDep(true);
                    }}
                    style={{
                      width: 18,
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 3,
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-light)',
                      color: '#2563eb',
                      cursor: 'pointer'
                    }}
                    title="Add Doctor to Special Departure"
                  >
                    <Plus size={11} />
                  </button>
                )}
              </div>

              <div
                className="departure-sub-list"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedId = e.dataTransfer.getData('text/departure-id');
                  if (draggedId) {
                    handleMoveDeparture(draggedId, 'special', specialDepartureList.length);
                  }
                  setDraggedDepartureId(null);
                  setDragOverDepartureId(null);
                }}
              >
                {specialDepartureList.map((doc, idx) => {
                  const reliefLocs = getReliefLocations(doc.name, doc.id, doc.qgendaAbbr);
                  return (
                  <div
                    key={doc.id}
                    className={`departure-item ${doc.departed ? 'struck' : ''} ${dragOverDepartureId === doc.id ? 'drag-over' : ''} ${draggedDepartureId === doc.id ? 'dragging' : ''}`}
                    onClick={() => handleStaffClick(doc.name, doc.id, doc.qgendaAbbr, doc.orderNumber, doc.timeEstimate, 'MD')}
                    draggable={isEditor}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/departure-id', doc.id);
                      setDraggedDepartureId(doc.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverDepartureId(doc.id);
                    }}
                    onDragLeave={() => {
                      setDragOverDepartureId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const draggedId = e.dataTransfer.getData('text/departure-id');
                      if (draggedId && draggedId !== doc.id) {
                        handleMoveDeparture(draggedId, 'special', idx);
                      }
                      setDraggedDepartureId(null);
                      setDragOverDepartureId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedDepartureId(null);
                      setDragOverDepartureId(null);
                    }}
                    title={doc.departed ? 'Marked departed (Click name to view/edit details)' : 'Click to view/edit details'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      {/* Blue box with white text time before user name */}
                      <span className="atypical-time-badge">
                        {doc.timeEstimate || '2p'}
                      </span>
                      {reliefLocs && (
                        <span
                          className="pending-relief-indicator-dot"
                          title={`Assigned as pending relief for: ${reliefLocs.join(', ')}`}
                        />
                      )}
                      <span className="departure-name">{doc.name}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {isEditor && (
                        <button
                          type="button"
                          onClick={(e) => handleInitiateRemoveDeparture(doc, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '2px',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.5
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                          title={`Remove ${doc.name} from Departure list`}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                      {/* Mark Departed Toggle Circle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleDepartureStruck(doc.id);
                        }}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          border: doc.departed ? '1.5px solid var(--marker-green)' : '1.5px solid var(--border-light)',
                          background: doc.departed ? 'var(--marker-green)' : 'transparent',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                          flexShrink: 0
                        }}
                        title={doc.departed ? 'Marked departed (Click to unmark)' : 'Mark as departed (Strike through)'}
                      >
                        {doc.departed && <Check size={10} strokeWidth={3} />}
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {/* 1.2 NON-CALL SECTION */}
          <div className="departure-sub-section">
            <div className="departure-sub-header non-call-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: 11 }}>NON-CALL</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({nonCallList.length})</span>
              </div>
              {isEditor && (
                <button
                  type="button"
                  onClick={() => {
                    setNewDepartureCategory('non_call');
                    setShowAddDep(true);
                  }}
                  style={{
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 3,
                    background: 'var(--surface-card)',
                    border: '1px solid rgba(37, 99, 235, 0.3)',
                    color: 'var(--accent-primary)',
                    cursor: 'pointer'
                  }}
                  title="Add Doctor to Non-Call"
                >
                  <Plus size={11} />
                </button>
              )}
            </div>

            <div
              className="departure-sub-list"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/departure-id');
                if (draggedId) {
                  handleMoveDeparture(draggedId, 'non_call', nonCallList.length);
                }
                setDraggedDepartureId(null);
                setDragOverDepartureId(null);
              }}
            >
              {nonCallList.map((doc, idx) => {
                const reliefLocs = getReliefLocations(doc.name, doc.id, doc.qgendaAbbr);
                return (
                <div
                  key={doc.id}
                  className={`departure-item ${doc.departed ? 'struck' : ''} ${dragOverDepartureId === doc.id ? 'drag-over' : ''} ${draggedDepartureId === doc.id ? 'dragging' : ''}`}
                  onClick={() => handleStaffClick(doc.name, doc.id, doc.qgendaAbbr, doc.orderNumber, doc.timeEstimate, 'MD')}
                  draggable={isEditor}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/departure-id', doc.id);
                    setDraggedDepartureId(doc.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverDepartureId(doc.id);
                  }}
                  onDragLeave={() => {
                    setDragOverDepartureId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const draggedId = e.dataTransfer.getData('text/departure-id');
                    if (draggedId && draggedId !== doc.id) {
                      handleMoveDeparture(draggedId, 'non_call', idx);
                    }
                    setDraggedDepartureId(null);
                    setDragOverDepartureId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedDepartureId(null);
                    setDragOverDepartureId(null);
                  }}
                  title={doc.departed ? 'Marked departed (Click name to view/edit details)' : 'Click to view/edit details (or use circle to mark departed)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                    {reliefLocs && (
                      <span
                        className="pending-relief-indicator-dot"
                        title={`Assigned as pending relief for: ${reliefLocs.join(', ')}`}
                      />
                    )}
                    <span className="departure-name">{doc.name}</span>
                    {doc.timeEstimate && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 4px',
                          borderRadius: 3,
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#059669',
                          flexShrink: 0
                        }}
                      >
                        {doc.timeEstimate}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {isEditor && (
                      <button
                        type="button"
                        onClick={(e) => handleInitiateRemoveDeparture(doc, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.5
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        title={`Remove ${doc.name} from Departure list`}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                    {/* Mark Departed Toggle Circle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDepartureStruck(doc.id);
                      }}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: doc.departed ? '1.5px solid var(--marker-green)' : '1.5px solid var(--border-light)',
                        background: doc.departed ? 'var(--marker-green)' : 'transparent',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0
                      }}
                      title={doc.departed ? 'Marked departed (Click to unmark)' : 'Mark as departed (Strike through)'}
                    >
                      {doc.departed && <Check size={10} strokeWidth={3} />}
                    </button>
                  </div>
                </div>
              );
            })}

              {nonCallList.length === 0 && (
                <div className="departure-empty-hint">
                  No doctors on non-call list.
                </div>
              )}
            </div>
          </div>
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
                  placeholder="Role (e.g. CV, Call 3, Call 2, Call 1, OB)"
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
            {callTeamList.map((item) => {
              const reliefLocs = getReliefLocations(item.doctorName, item.id, item.qgendaAbbr);
              return (
              <div
                key={item.id}
                className="call-team-item clickable"
                onClick={() => handleStaffClick(item.doctorName, item.id, item.qgendaAbbr, item.orderNumber, item.role, 'MD')}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                title={`Click to view/edit details for Dr. ${item.doctorName}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="call-role-badge">{item.role}</span>
                  {reliefLocs && (
                    <span
                      className="pending-relief-indicator-dot"
                      title={`Assigned as pending relief for: ${reliefLocs.join(', ')}`}
                    />
                  )}
                  <span className="call-doc-name">{item.doctorName}</span>
                </div>
                {isEditor && (
                  <button
                    type="button"
                    onClick={(e) => handleInitiateRemoveCallTeam(item, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '2px',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.5
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    title={`Remove ${item.doctorName} from Call Team`}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            );
            })}

            {callTeamList.length === 0 && (
              <div style={{ padding: 8, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic' }}>
                No call team assigned. Tap + to add.
              </div>
            )}
          </div>
        </div>

        {/* End of Departure Column */}
      </div>
      )}

      {/* ---------------- 2. LATES COLUMN ---------------- */}
      {showLateList && (
      <div className="sidebar-col">
        <div className="sidebar-col-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>LATES</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(&gt; 3 PM)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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

            {/* Collapse/Hide Sidebar Button */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 0
                }}
                title="Hide Departure & Lates (Expand Whiteboard)"
              >
                <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Categorized Late Shifts Area */}
        <div className="lates-list-area">
          {sortedLateCategories.map(category => {
            const items = latesGrouped[category] || [];
            const isSpecial = category.toLowerCase() === 'special';
            const is24h = category.toLowerCase() === '24h';
            const isAtypicalTime = !['3p', '4p', '5p', '7p', '8p', '7p-7a', '24h'].includes(category.toLowerCase());
            // Hide special, 24h, and custom atypical times if empty; keep standard late categories visible
            if ((isSpecial || is24h || isAtypicalTime) && items.length === 0) return null;

            return (
              <div key={category} style={{ marginBottom: 4 }}>
                {/* Category Header with + Plus Button */}
                <div style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: isSpecial ? '#2563eb' : 'var(--marker-black)',
                  borderBottom: isSpecial ? '1.5px solid #2563eb' : '1.5px solid var(--board-grid-line)',
                  paddingBottom: 2,
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ textDecoration: 'underline' }}>{isSpecial ? 'Special' : category}</span>
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
                  <div style={{ padding: 8, background: 'var(--surface-hover)', borderRadius: 6, marginBottom: 8, border: '1px solid var(--border-light)' }}>
                    {/* Role toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)' }}>ROLE:</span>
                      <button
                        type="button"
                        onClick={() => { setNewLateRole('CRNA'); setDisambiguationMessage(null); }}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 700,
                          border: newLateRole === 'CRNA' ? '1.5px solid #059669' : '1px solid var(--border-light)',
                          background: newLateRole === 'CRNA' ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-card)',
                          color: newLateRole === 'CRNA' ? '#059669' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        CRNA
                      </button>
                      <button
                        type="button"
                        onClick={() => { setNewLateRole('MD'); setDisambiguationMessage(null); }}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 700,
                          border: newLateRole === 'MD' ? '1.5px solid #2563eb' : '1px solid var(--border-light)',
                          background: newLateRole === 'MD' ? 'rgba(37, 99, 235, 0.15)' : 'var(--surface-card)',
                          color: newLateRole === 'MD' ? '#2563eb' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        MD
                      </button>
                    </div>

                    {disambiguationMessage && (
                      <div style={{ fontSize: 11, color: 'var(--marker-red)', fontWeight: 700, marginBottom: 6 }}>
                        {disambiguationMessage}
                      </div>
                    )}

                    <form onSubmit={(e) => handleAddLateToCategory(category, e)}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        <input
                          type="text"
                          placeholder={`Staff name (e.g. Patel)...`}
                          value={newLateName}
                          onChange={e => {
                            setNewLateName(e.target.value);
                            setDisambiguationMessage(null);
                          }}
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
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingToCategory(null);
                            setNewLateName('');
                            setDisambiguationMessage(null);
                          }}
                          style={{
                            padding: '3px 6px',
                            background: 'var(--surface-card)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </form>

                    {/* Suggestions list dropdown */}
                    {matchingLateStaffSuggestions.length > 0 && (
                      <div
                        style={{
                          marginTop: 4,
                          maxHeight: 140,
                          overflowY: 'auto',
                          background: 'var(--surface-card)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 4,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ padding: '3px 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>
                          Click to add exact provider:
                        </div>
                        {matchingLateStaffSuggestions.map(s => {
                          const isMd = s.credentials === 'MD';
                          return (
                            <div
                              key={s.id}
                              onClick={() => handleAddSelectedStaffToLate(category, s)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: 11,
                                borderBottom: '1px solid rgba(0,0,0,0.04)',
                                transition: 'background 0.15s'
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {s.lastName}, {s.firstName}
                                </span>
                                {s.displayName && (
                                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                    ({s.displayName})
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {s.qgendaAbbr && (
                                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                                    [{s.qgendaAbbr}]
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 800,
                                    padding: '1px 4px',
                                    borderRadius: 3,
                                    background: isMd ? 'rgba(37, 99, 235, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                    color: isMd ? '#2563eb' : '#059669',
                                    border: isMd ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)'
                                  }}
                                >
                                  {s.credentials || 'CRNA'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {/* Staff names under this time slot */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {items.map(item => {
                    const reliefLocs = getReliefLocations(item.name, item.id, item.qgendaAbbr);
                    return (
                    <div
                      key={item.id}
                      onClick={() => handleStaffClick(item.name, item.id, item.qgendaAbbr, item.orderNumber, item.timeCategory, (item.role as any) || 'CRNA')}
                      className="late-staff-row"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '3px 6px',
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-main)',
                        borderRadius: 3,
                        background: 'rgba(0, 0, 0, 0.02)',
                        cursor: 'pointer'
                      }}
                      title={`Click to view/edit details for ${item.name}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {(isSpecial || isAtypicalTime) && (
                          <span className="atypical-time-badge">
                            {item.timeEstimate || category}
                          </span>
                        )}
                        {reliefLocs && (
                          <span
                            className="pending-relief-indicator-dot"
                            title={`Assigned as pending relief for: ${reliefLocs.join(', ')}`}
                          />
                        )}
                        <span>{item.name}</span>
                        {item.notes && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              padding: '1px 4px',
                              borderRadius: 3,
                              background: 'rgba(234, 88, 12, 0.12)',
                              color: '#ea580c',
                              border: '1px solid rgba(234, 88, 12, 0.3)'
                            }}
                            title={`Shift detail: ${item.notes}`}
                          >
                            {item.notes}
                          </span>
                        )}
                        {item.role && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              padding: '1px 3px',
                              borderRadius: 3,
                              background: item.role === 'MD' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: item.role === 'MD' ? '#2563eb' : '#059669',
                              border: item.role === 'MD' ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)'
                            }}
                          >
                            {item.role}
                          </span>
                        )}
                      </div>

                      {/* Delete button from late section */}
                      {isEditor && (
                        <button
                          type="button"
                          onClick={(e) => handleInitiateRemoveLate(item, category, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '2px 4px',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            borderRadius: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.6,
                            transition: 'opacity 0.15s, color 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.6';
                            e.currentTarget.style.color = 'var(--text-muted)';
                          }}
                          title={`Remove ${item.name} from ${category}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
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
      )}

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
