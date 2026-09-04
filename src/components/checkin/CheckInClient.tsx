'use client';

import { useState, useMemo, useCallback, useEffect, useRef, useDeferredValue, useTransition } from 'react';
import { AlertTriangle, Search, UserPlus, X, Users } from 'lucide-react';
import { useGuestsStore, Guest } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useRemindersStore } from '@/stores/useRemindersStore';
import { useDailyNotesStore } from '@/stores/useDailyNotesStore';
import { flexibleNameSearch } from '@/lib/utils/flexibleNameSearch';
import { findFuzzySuggestions, type FuzzySuggestion } from '@/lib/utils/fuzzyMatch';
import { GuestCard } from '@/components/guests/GuestCard';
import { ServiceStatusOverview } from '@/components/checkin/ServiceStatusOverview';
import { KeyboardShortcutsBar } from '@/components/checkin/KeyboardShortcutsBar';
import { MealServiceTimer } from '@/components/checkin/MealServiceTimer';
import { TodayStats } from '@/components/checkin/TodayStats';
import { DailyNotesSection } from '@/components/checkin/DailyNotesSection';
import { LiveConnectionPill } from '@/components/checkin/LiveConnectionPill';
import { RecentCheckinsBar } from '@/components/checkin/RecentCheckinsBar';
import { UndoTray } from '@/components/checkin/UndoTray';
import { useModalStore } from '@/stores/useModalStore';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { useBlockedSlotsStore } from '@/stores/useBlockedSlotsStore';
import { useTodayStatusMaps } from '@/stores/selectors/todayStatusSelectors';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useSecretTap } from '@/hooks/useSecretTap';
import dynamic from 'next/dynamic';
import { useCheckInStore } from '@/stores/useCheckInStore';
import { hydrateLegacyStoresFromSnapshot, snapshotToMealStatusMap } from '@/lib/checkin/legacyAdapter';
import type { CheckInSnapshot } from '@/types/checkin';
import type { PotentialDuplicatePair } from '@/lib/utils/duplicateDetection';

const PenaltyKickGame = dynamic(
  () => import('@/components/checkin/PenaltyKickGame').then((m) => m.PenaltyKickGame),
  { ssr: false },
);
const GuestCreateModal = dynamic(
    () => import('@/components/guests/GuestCreateModal').then((module) => module.GuestCreateModal),
);
const RealtimeSyncProvider = dynamic(
    () => import('@/components/providers/RealtimeSyncProvider').then((module) => module.RealtimeSyncProvider),
    { ssr: false },
);
const DuplicateGuestResolutionModal = dynamic(
    () => import('@/components/checkin/DuplicateGuestResolutionModal').then((module) => module.DuplicateGuestResolutionModal),
);

// Threshold for disabling animations for better performance
const LARGE_LIST_THRESHOLD = 20;

type SortKey = 'firstName' | 'lastName' | null;
type SortDirection = 'asc' | 'desc';
type DuplicateCandidateIds = { firstGuestId: string; secondGuestId: string };

export default function CheckInClient({
    initialSnapshot,
    v2Enabled = true,
}: {
    initialSnapshot?: CheckInSnapshot | null;
    v2Enabled?: boolean;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isLoading, setIsLoading] = useState(!initialSnapshot);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: null, direction: 'asc' });
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [defaultLocation, setDefaultLocation] = useState('');
    const [scrollMargin, setScrollMargin] = useState(0);
    const [fuzzySuggestions, setFuzzySuggestions] = useState<FuzzySuggestion[]>([]);
    const [duplicatePairToResolve, setDuplicatePairToResolve] = useState<PotentialDuplicatePair | null>(null);
    const [duplicateCandidateIds, setDuplicateCandidateIds] = useState<DuplicateCandidateIds[]>([]);
    const [, startTransition] = useTransition();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const guestCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const listContainerRef = useRef<HTMLDivElement>(null);
    const firstSearchMarkRef = useRef(false);
    const firstCreateModalMarkRef = useRef(false);
    const [showPenaltyGame, setShowPenaltyGame] = useState(false);
    const handleSecretTap = useSecretTap(() => setShowPenaltyGame(true));

    const markPerf = useCallback((name: string) => {
        if (typeof performance === 'undefined') return;
        performance.mark(name);
    }, []);

    // Use deferred value for search to prevent UI jank during typing
    const deferredSearchQuery = useDeferredValue(searchQuery);

    const legacyGuests = useGuestsStore((s) => s.guests);
    const warnings = useGuestsStore((s) => s.warnings);
    const guestProxies = useGuestsStore((s) => s.guestProxies);
    const reminders = useRemindersStore((s) => s.reminders);
    const snapshotGuests = useCheckInStore((s) => s.guests);
    const snapshotReady = useCheckInStore((s) => s.isReady);
    const snapshotTodayByGuest = useCheckInStore((s) => s.todayByGuest);
    const snapshotServiceDate = useCheckInStore((s) => s.serviceDate);
    const hydrateCheckIn = useCheckInStore((s) => s.hydrate);
    const searchSnapshotGuests = useCheckInStore((s) => s.searchGuests);
    const guests: Guest[] = snapshotReady ? snapshotGuests as unknown as Guest[] : legacyGuests;

    const { ensureLoaded: ensureGuestsLoaded, loadGuestWarningsFromSupabase, loadGuestProxiesFromSupabase } = useGuestsStore(
        useShallow((s) => ({
            ensureLoaded: s.ensureLoaded,
            loadGuestWarningsFromSupabase: s.loadGuestWarningsFromSupabase,
            loadGuestProxiesFromSupabase: s.loadGuestProxiesFromSupabase,
        }))
    );
    const ensureMealsLoaded = useMealsStore((s) => s.ensureLoaded);
    const addMealRecord = useMealsStore((s) => s.addMealRecord);
    const ensureServicesLoaded = useServicesStore((s) => s.ensureLoaded);
    const ensureBlockedSlotsLoaded = useBlockedSlotsStore((s) => s.ensureLoaded);
    const loadReminders = useRemindersStore((s) => s.loadFromSupabase);
    const { ensureLoaded: ensureDailyNotesLoaded, subscribeToRealtime: subscribeDailyNotes } = useDailyNotesStore(
        useShallow((s) => ({ ensureLoaded: s.ensureLoaded, subscribeToRealtime: s.subscribeToRealtime }))
    );
    const { setShowerPickerGuest, setLaundryPickerGuest, setBicyclePickerGuest } = useModalStore(
        useShallow((s) => ({
            setShowerPickerGuest: s.setShowerPickerGuest,
            setLaundryPickerGuest: s.setLaundryPickerGuest,
            setBicyclePickerGuest: s.setBicyclePickerGuest,
        }))
    );
    const { addAction, undoAction, getActionsForGuestToday } = useActionHistoryStore(
        useShallow((s) => ({
            addAction: s.addAction,
            undoAction: s.undoAction,
            getActionsForGuestToday: s.getActionsForGuestToday,
        }))
    );

    const handleSelectRecentGuest = useCallback((recentGuest: Guest) => {
        const query = recentGuest.preferredName || recentGuest.name || `${recentGuest.firstName || ''} ${recentGuest.lastName || ''}`.trim();
        setSearchQuery(query);
        setSelectedIndex(0);
        searchInputRef.current?.focus();
    }, []);

    // Precomputed status maps for efficient per-guest lookups
    const {
        mealStatus: legacyMealStatus,
        serviceStatus,
        actionStatus,
        recentGuests: legacyRecentGuests,
        lastVisitDates: legacyLastVisitDates,
        nextAvailableShowerSlot,
        nextAvailableLaundrySlot,
    } = useTodayStatusMaps();
    const mealStatus = useMemo(() => snapshotReady
        ? snapshotToMealStatusMap(snapshotTodayByGuest, snapshotServiceDate)
        : legacyMealStatus,
    [snapshotReady, snapshotTodayByGuest, snapshotServiceDate, legacyMealStatus]);

    const recentGuests = useMemo(() => snapshotReady
        ? new Set(snapshotGuests.filter((guest) => guest.recentMeal).map((guest) => guest.id))
        : legacyRecentGuests,
    [snapshotReady, snapshotGuests, legacyRecentGuests]);
    const lastVisitDates = useMemo(() => snapshotReady
        ? new Map(snapshotGuests.flatMap((guest) => guest.lastVisitDate ? [[guest.id, guest.lastVisitDate] as const] : []))
        : legacyLastVisitDates,
    [snapshotReady, snapshotGuests, legacyLastVisitDates]);

    const applySnapshot = useCallback((snapshot: CheckInSnapshot) => {
        hydrateCheckIn(snapshot);
        hydrateLegacyStoresFromSnapshot(snapshot);
    }, [hydrateCheckIn]);

    // Shared function to load all data
    const loadAllData = useCallback(async () => {
        if (initialSnapshot) {
            applySnapshot(initialSnapshot);
            return;
        }
        if (v2Enabled) {
            try {
                const response = await fetch('/api/check-in/snapshot', { cache: 'no-store' });
                if (!response.ok) throw new Error(`Snapshot request failed (${response.status})`);
                applySnapshot(await response.json() as CheckInSnapshot);
                return;
            } catch (error) {
                console.warn('[check-in] Snapshot unavailable; using legacy loader', error);
            }
        }
        await Promise.all([
            ensureGuestsLoaded(),
            loadGuestWarningsFromSupabase(),
            loadGuestProxiesFromSupabase(),
            ensureMealsLoaded(),
            ensureServicesLoaded(),
            ensureBlockedSlotsLoaded(),
            loadReminders(),
            ensureDailyNotesLoaded()
        ]);
    }, [v2Enabled, initialSnapshot, applySnapshot, ensureGuestsLoaded, loadGuestWarningsFromSupabase, loadGuestProxiesFromSupabase, ensureMealsLoaded, ensureServicesLoaded, ensureBlockedSlotsLoaded, loadReminders, ensureDailyNotesLoaded]);

    // Initial data load
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                await loadAllData();
            } catch (error) {
                console.error('Failed to load initial data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [loadAllData]);

    // Subscribe to real-time daily notes updates
    useEffect(() => {
        const unsubscribe = subscribeDailyNotes();
        return () => {
            unsubscribe();
        };
    }, [subscribeDailyNotes]);

    useEffect(() => {
        if (!snapshotReady) return;
        const reconcile = async () => {
            try {
                const response = await fetch('/api/check-in/reconcile', { cache: 'no-store' });
                if (response.ok) applySnapshot(await response.json() as CheckInSnapshot);
            } catch {
                // Realtime remains active; the next reconciliation can recover.
            }
        };
        const timer = window.setTimeout(reconcile, 1500);
        // Realtime events can be missed while the tab is hidden or the device
        // sleeps (dropped websocket); re-reconcile whenever the tab returns so
        // a stale device converges without a manual reload.
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') void reconcile();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        // A front-desk tab can stay visible all day while its websocket dies
        // silently; a periodic reconcile bounds how stale it can get.
        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible') void reconcile();
        }, 120_000);
        return () => {
            window.clearTimeout(timer);
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [snapshotReady, applySnapshot]);

    // Search logic using the migrated flexibleNameSearch (with deferred value)
    // Deduplicate results to prevent duplicate key React errors
    const filteredGuests = useMemo(() => {
        if (!deferredSearchQuery.trim()) {
            return [];
        }
        const results: Guest[] = snapshotReady
            ? searchSnapshotGuests(deferredSearchQuery) as unknown as Guest[]
            : flexibleNameSearch(deferredSearchQuery, guests);
        // Deduplicate by guest ID to prevent React key warnings
        const seen = new Set<string>();
        return results.filter((guest: Guest) => {
            if (!guest || !guest.id || seen.has(guest.id)) {
                return false;
            }
            seen.add(guest.id);
            return true;
        });
    }, [snapshotReady, searchSnapshotGuests, guests, deferredSearchQuery]);

    // Apply sorting
    const sortedGuests = useMemo(() => {
        if (!sortConfig.key) return filteredGuests;

        return [...filteredGuests].sort((a: Guest, b: Guest) => {
            const aValue = ((a[sortConfig.key as keyof Guest] || '') as string).toLowerCase();
            const bValue = ((b[sortConfig.key as keyof Guest] || '') as string).toLowerCase();
            const comparison = aValue.localeCompare(bValue);
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }, [filteredGuests, sortConfig]);

    const duplicateCandidatePairs = useMemo(() => {
        const byId = new Map(guests.map((guest) => [guest.id, guest]));
        return duplicateCandidateIds.flatMap(({ firstGuestId, secondGuestId }) => {
            const first = byId.get(firstGuestId);
            const second = byId.get(secondGuestId);
            return first && second ? [{ first, second, reason: 'Exact name match', confidence: 1 }] : [];
        });
    }, [duplicateCandidateIds, guests]);
    const searchDuplicatePairs = useMemo(() => {
        if (!deferredSearchQuery.trim()) return [];
        const resultIds = new Set(sortedGuests.map((guest) => guest.id));
        return duplicateCandidatePairs.filter((pair) => resultIds.has(pair.first.id) && resultIds.has(pair.second.id));
    }, [deferredSearchQuery, duplicateCandidatePairs, sortedGuests]);

    useEffect(() => {
        if (guests.length === 0) return;
        let cancelled = false;
        fetch('/api/check-in/guests/duplicates', { cache: 'no-store' })
            .then(async (response) => {
                if (!response.ok) throw new Error(`Duplicate candidate request failed (${response.status})`);
                return response.json() as Promise<DuplicateCandidateIds[]>;
            })
            .then((pairs) => {
                if (!cancelled) setDuplicateCandidateIds(Array.isArray(pairs) ? pairs : []);
            })
            .catch((error) => console.warn('[check-in] Duplicate candidates unavailable', error));
        return () => { cancelled = true; };
    }, [guests]);

    // Determine if we should use virtualization and disable animations
    const isLargeList = sortedGuests.length > LARGE_LIST_THRESHOLD;

    const warningsCountMap = useMemo(() => {
        if (snapshotReady) return new Map(snapshotGuests.map((guest) => [guest.id, guest.warningCount]));
        const map = new Map<string, number>();
        for (const w of warnings || []) {
            if (!w?.guestId || !w.active) continue;
            map.set(w.guestId, (map.get(w.guestId) || 0) + 1);
        }
        return map;
    }, [snapshotReady, snapshotGuests, warnings]);

    const linkedGuestsCountMap = useMemo(() => {
        if (snapshotReady) return new Map(snapshotGuests.map((guest) => [guest.id, guest.linkedGuestCount]));
        const sets = new Map<string, Set<string>>();
        for (const p of guestProxies || []) {
            if (!p?.guestId || !p?.proxyId) continue;
            if (!sets.has(p.guestId)) sets.set(p.guestId, new Set());
            if (!sets.has(p.proxyId)) sets.set(p.proxyId, new Set());
            sets.get(p.guestId)!.add(p.proxyId);
            sets.get(p.proxyId)!.add(p.guestId);
        }
        const counts = new Map<string, number>();
        sets.forEach((set, id) => counts.set(id, set.size));
        return counts;
    }, [snapshotReady, snapshotGuests, guestProxies]);

    const activeRemindersCountMap = useMemo(() => {
        if (snapshotReady) return new Map(snapshotGuests.map((guest) => [guest.id, guest.reminderCount]));
        const map = new Map<string, number>();
        for (const r of reminders || []) {
            if (!r?.guestId || r.dismissedAt) continue;
            map.set(r.guestId, (map.get(r.guestId) || 0) + 1);
        }
        return map;
    }, [snapshotReady, snapshotGuests, reminders]);

    useEffect(() => {
        if (!isLargeList) return;
        const el = listContainerRef.current;
        if (!el) return;
        setScrollMargin(el.getBoundingClientRect().top + window.scrollY);
    }, [isLargeList, sortedGuests.length]);

    const rowVirtualizer = useWindowVirtualizer({
        count: sortedGuests.length,
        estimateSize: () => 190,
        overscan: 10,
        scrollMargin,
    });

    useEffect(() => {
        if (!isLargeList) return;
        if (selectedIndex < 0 || selectedIndex >= sortedGuests.length) return;

        rowVirtualizer.scrollToIndex(selectedIndex, { align: 'auto' });
        requestAnimationFrame(() => {
            const guest = sortedGuests[selectedIndex];
            if (guest?.id) guestCardRefs.current[guest.id]?.focus();
        });
    }, [isLargeList, selectedIndex, sortedGuests, rowVirtualizer]);

    // Fuzzy suggestions for when there are no matches (deprioritized to keep typing responsive)
    useEffect(() => {
        if (deferredSearchQuery.trim().length < 2 || filteredGuests.length > 0) {
            setFuzzySuggestions([]);
            return;
        }
        startTransition(() => {
            setFuzzySuggestions(findFuzzySuggestions(deferredSearchQuery, guests, 3));
        });
    }, [deferredSearchQuery, filteredGuests.length, guests, startTransition]);

    const handleShowCreateForm = useCallback(() => {
        if (!firstCreateModalMarkRef.current) {
            firstCreateModalMarkRef.current = true;
            markPerf('checkin:first-create-modal-open');
        }
        const rawSearch = searchQuery.trim();
        let defaultCity = '';
        let workingSearch = rawSearch;

        // Smart suffix handling
        if (rawSearch.toLowerCase().endsWith(' mv')) {
            defaultCity = 'Mountain View';
            workingSearch = rawSearch.slice(0, -3).trim();
        } else if (rawSearch.toLowerCase().endsWith(' mountain view')) {
            defaultCity = 'Mountain View';
            workingSearch = rawSearch.slice(0, -14).trim();
        }

        setSearchQuery(workingSearch); // Clean up the search box
        setDefaultLocation(defaultCity);
        setShowCreateModal(true);
    }, [searchQuery, markPerf]);

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        setSelectedIndex(-1);
        searchInputRef.current?.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // Keep the latest sorted list reachable from a stable callback so each guest
    // card can advance to the next result without stale closure concerns.
    const sortedGuestsRef = useRef(sortedGuests);
    sortedGuestsRef.current = sortedGuests;

    const handleAdvanceToNext = useCallback((guestId: string) => {
        const current = sortedGuestsRef.current;
        const idx = current.findIndex((g) => g.id === guestId);
        if (idx < 0 || idx >= current.length - 1) {
            handleClearSearch();
            return;
        }
        const nextGuest = current[idx + 1];
        setSelectedIndex(idx + 1);
        if (isLargeList) {
            rowVirtualizer.scrollToIndex(idx + 1, { align: 'auto' });
        }
        requestAnimationFrame(() => {
            guestCardRefs.current[nextGuest.id]?.focus();
        });
    }, [handleClearSearch, isLargeList, rowVirtualizer]);

    const handleGuestCreated = useCallback(async () => {
        if (!snapshotReady) return;
        const response = await fetch('/api/check-in/snapshot', { cache: 'no-store' });
        if (response.ok) applySnapshot(await response.json() as CheckInSnapshot);
    }, [snapshotReady, applySnapshot]);

    const handleMergeGuests = useCallback(async (selection: { keepGuestId: string; duplicateGuestId: string }) => {
        const response = await fetch('/api/check-in/guests/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(selection),
        });
        const result = await response.json().catch(() => ({})) as { error?: string; transferredRecords?: number };
        if (!response.ok) {
            const message = result.error || 'Unable to merge guest profiles';
            toast.error(message);
            throw new Error(message);
        }

        const snapshotResponse = await fetch('/api/check-in/reconcile', { cache: 'no-store' });
        if (snapshotResponse.ok) {
            applySnapshot(await snapshotResponse.json() as CheckInSnapshot);
        } else {
            await ensureGuestsLoaded({ force: true });
        }
        setDuplicatePairToResolve(null);
        toast.success(`Duplicate removed and ${result.transferredRecords || 0} related records consolidated.`);
    }, [applySnapshot, ensureGuestsLoaded]);

    const handleDismissDuplicate = useCallback(async (selection: DuplicateCandidateIds) => {
        const response = await fetch('/api/check-in/guests/duplicates/dismiss', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(selection),
        });
        if (!response.ok) {
            const result = await response.json().catch(() => ({})) as { error?: string };
            const message = result.error || 'Unable to save duplicate review';
            toast.error(message);
            throw new Error(message);
        }
        setDuplicateCandidateIds((pairs) => pairs.filter((pair) =>
            !(
                (pair.firstGuestId === selection.firstGuestId && pair.secondGuestId === selection.secondGuestId) ||
                (pair.firstGuestId === selection.secondGuestId && pair.secondGuestId === selection.firstGuestId)
            )
        ));
        setDuplicatePairToResolve(null);
        toast.success('These profiles were marked as different people.');
    }, []);

    const handleSort = (key: SortKey) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isEditable = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

            // Cmd/Ctrl + K to focus search
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
                return;
            }

            // Cmd/Ctrl + Alt + G to open create guest form
            if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'g') {
                if (isEditable || showCreateModal) return;
                e.preventDefault();
                handleShowCreateForm();
                return;
            }

            // Navigation and actions when not in editable field
            if (!isEditable && sortedGuests.length > 0) {
                // Arrow down - navigate to next
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => {
                        const next = Math.min(prev + 1, sortedGuests.length - 1);
                        const nextGuest = sortedGuests[next];
                        if (nextGuest) {
                            guestCardRefs.current[nextGuest.id]?.focus();
                        }
                        return next;
                    });
                    return;
                }

                // Arrow up - navigate to previous
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => {
                        const next = Math.max(prev - 1, -1);
                        if (next === -1) {
                            searchInputRef.current?.focus();
                        } else {
                            const nextGuest = sortedGuests[next];
                            if (nextGuest) {
                                guestCardRefs.current[nextGuest.id]?.focus();
                            }
                        }
                        return next;
                    });
                    return;
                }

                // 1 or 2 - log meals for selected guest
                if ((e.key === '1' || e.key === '2') && selectedIndex >= 0 && sortedGuests[selectedIndex]) {
                    e.preventDefault();
                    const guest = sortedGuests[selectedIndex];
                    const count = parseInt(e.key, 10);
                    const guestStatus = mealStatus?.get(guest.id);
                    if (guestStatus?.hasMeal) {
                        toast.error(`${guest.preferredName || guest.firstName} already has a meal today`);
                    } else {
                        void addMealRecord(guest.id, count).then((record: any) => {
                            if (record) {
                                addAction('MEAL_ADDED', { recordId: record.id, guestId: guest.id });
                                toast.success(`${count} meal${count > 1 ? 's' : ''} logged for ${guest.preferredName || guest.firstName}`);
                            }
                        }).catch((err: any) => {
                            toast.error(err?.message || 'Failed to log meals');
                        });
                    }
                    return;
                }

                // S - shower picker for selected guest
                if (e.key.toLowerCase() === 's' && selectedIndex >= 0 && sortedGuests[selectedIndex]) {
                    e.preventDefault();
                    const guest = sortedGuests[selectedIndex];
                    setShowerPickerGuest(guest);
                    return;
                }

                // L - laundry picker for selected guest
                if (e.key.toLowerCase() === 'l' && selectedIndex >= 0 && sortedGuests[selectedIndex]) {
                    e.preventDefault();
                    const guest = sortedGuests[selectedIndex];
                    setLaundryPickerGuest(guest);
                    return;
                }

                // B - bicycle picker for selected guest
                if (e.key.toLowerCase() === 'b' && selectedIndex >= 0 && sortedGuests[selectedIndex]) {
                    e.preventDefault();
                    const guest = sortedGuests[selectedIndex];
                    setBicyclePickerGuest(guest);
                    return;
                }

                // H - history for selected guest
                if (e.key.toLowerCase() === 'h' && selectedIndex >= 0 && sortedGuests[selectedIndex]) {
                    e.preventDefault();
                    const guest = sortedGuests[selectedIndex];
                    const cardEl = guestCardRefs.current[guest.id];
                    if (cardEl) {
                        const historyBtn = cardEl.querySelector('button[title*="history" i]') as HTMLButtonElement | null;
                        historyBtn?.click();
                    }
                    return;
                }

                // U or Z - undo last action for selected guest
                if ((e.key.toLowerCase() === 'u' || e.key.toLowerCase() === 'z') && selectedIndex >= 0 && sortedGuests[selectedIndex]) {
                    e.preventDefault();
                    const guest = sortedGuests[selectedIndex];
                    const actions = getActionsForGuestToday(guest.id);
                    const latestAction = actions[0];
                    if (latestAction) {
                        void undoAction(latestAction.id).then((success: boolean) => {
                            if (success) toast.success('Action undone');
                            else toast.error('Failed to undo action');
                        });
                    } else {
                        toast.error('No recent actions to undo for this guest');
                    }
                    return;
                }

                // Enter - expand first card or current selection
                if (e.key === 'Enter' && selectedIndex < 0 && sortedGuests.length > 0) {
                    e.preventDefault();
                    setSelectedIndex(0);
                    const firstGuest = sortedGuests[0];
                    if (firstGuest) {
                        guestCardRefs.current[firstGuest.id]?.focus();
                    }
                    return;
                }

                // R - reset selection and focus search
                if (e.key.toLowerCase() === 'r' && selectedIndex >= 0) {
                    e.preventDefault();
                    handleClearSearch();
                    return;
                }

                // Escape - clear search
                if (e.key === 'Escape') {
                    e.preventDefault();
                    handleClearSearch();
                    return;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showCreateModal, sortedGuests, selectedIndex, handleClearSearch, handleShowCreateForm, mealStatus, addMealRecord, addAction, undoAction, getActionsForGuestToday, setShowerPickerGuest, setLaundryPickerGuest, setBicyclePickerGuest]);

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {!isLoading && <RealtimeSyncProvider />}
            {/* Header with Stats */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1
                        className="text-2xl font-bold text-gray-900 select-none"
                        onClick={handleSecretTap}
                    >Check-In</h1>
                    <p className="text-sm text-gray-500 hidden md:block">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                        <LiveConnectionPill />
                        <MealServiceTimer />
                    </div>
                    <TodayStats />
                </div>
            </div>

            {/* Service Status Overview */}
            <ServiceStatusOverview />

            {/* Daily Notes Section */}
            <DailyNotesSection />

            {duplicateCandidatePairs.length > 0 && (
                <div className="flex flex-col gap-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700"><AlertTriangle size={22} /></div>
                        <div>
                            <p className="font-black text-amber-950">{duplicateCandidatePairs.length} potential duplicate profile{duplicateCandidatePairs.length === 1 ? '' : 's'} need review</p>
                            <p className="mt-1 text-sm font-medium text-amber-800">Legacy migration records have matching names. Choose the profile to keep; all history will be consolidated before the duplicate is deleted.</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => setDuplicatePairToResolve(duplicateCandidatePairs[0])} className="shrink-0 rounded-xl bg-amber-700 px-4 py-2.5 font-bold text-white hover:bg-amber-800">Review next duplicate</button>
                </div>
            )}

            {/* Search Header */}
            <div className="sticky top-0 z-30 bg-white rounded-2xl shadow-xl shadow-emerald-900/5 border border-emerald-100/50 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100 rounded-xl">
                            <Users size={22} className="text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Find or Add Guests</h2>
                            <p className="text-xs text-gray-500 font-medium">Type a name to search or click New Guest to register</p>
                        </div>
                    </div>
                </div>

                <div className="relative group">
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl blur-xl group-focus-within:opacity-100 opacity-0 transition-opacity" />
                    <div className="relative flex items-center">
                        <Search className="absolute left-5 text-gray-400 font-bold" size={24} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                if (!firstSearchMarkRef.current) {
                                    firstSearchMarkRef.current = true;
                                    markPerf('checkin:first-search-interaction');
                                }
                                setSearchQuery(e.target.value);
                                setSelectedIndex(-1);
                            }}
                            placeholder="Start typing a name (e.g. 'John' or 'JS')"
                            className="w-full pl-14 pr-14 py-4 sm:py-5 rounded-2xl border-2 border-gray-100 bg-gray-50/50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-lg sm:text-xl font-bold placeholder:text-gray-300 outline-none shadow-inner touch-manipulation"
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                onClick={handleClearSearch}
                                className="absolute right-3.5 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 rounded-full transition-all touch-manipulation active:scale-90"
                                aria-label="Clear search"
                            >
                                <X size={18} strokeWidth={3} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Keyboard Shortcuts Bar */}
                <KeyboardShortcutsBar className="mt-4" />

                <div className="flex items-center gap-3 mt-4">
                    <button
                        onClick={handleShowCreateForm}
                        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-black transition-all text-sm font-bold shadow-lg shadow-gray-200 active:scale-95 touch-manipulation"
                    >
                        <UserPlus size={18} />
                        New Guest
                    </button>
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-400">
                        <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-400 bg-gray-100 rounded border border-gray-200">⌘⌥G</kbd>
                    </span>
                </div>
            </div>

            {/* Recent Check-ins Quick-Bar */}
            <RecentCheckinsBar
                guests={guests}
                onSelectGuest={handleSelectRecentGuest}
            />

            {/* Results Section */}
            <div
                className="space-y-4"
                onTouchMove={() => {
                    if (document.activeElement === searchInputRef.current) {
                        searchInputRef.current?.blur();
                    }
                }}
            >
                {isLoading ? (
                    <div className="space-y-4" aria-busy="true" aria-label="Loading guest database">
                        <p className="sr-only">Loading guest database...</p>
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gray-200" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-1/3 bg-gray-200 rounded" />
                                        <div className="h-3 w-1/2 bg-gray-100 rounded" />
                                    </div>
                                    <div className="w-24 h-10 bg-gray-100 rounded-xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : sortedGuests.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        <div className="p-12 flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                                <Search size={40} className="text-gray-200" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">
                                {searchQuery ? `No matches for "${searchQuery}"` : 'Ready for Search'}
                            </h3>
                            <p className="text-gray-500 max-w-sm font-medium">
                                {searchQuery
                                    ? "We couldn't find anyone with that name. Try a different spelling or check for initials."
                                    : 'Type a name in the box above to find a guest.'}
                            </p>

                            {fuzzySuggestions.length > 0 && (
                                <div className="mt-8 w-full max-w-md">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Did you mean?</p>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {fuzzySuggestions.map((suggestion) => (
                                            <button
                                                key={suggestion.id}
                                                onClick={() => setSearchQuery(suggestion.preferredName || suggestion.name || '')}
                                                className="px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-all active:scale-95 touch-manipulation flex items-center justify-center"
                                            >
                                                {suggestion.preferredName || suggestion.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchQuery && (
                                <button
                                    onClick={handleShowCreateForm}
                                    className="mt-8 inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 touch-manipulation"
                                >
                                    <UserPlus size={20} />
                                    Add &quot;{searchQuery}&quot; as New Guest
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Results Info & Sort */}
                        <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                    <Users size={18} className="text-emerald-600" />
                                </div>
                                <div>
                                    <span className="font-bold text-gray-900">{sortedGuests.length} guest{sortedGuests.length !== 1 ? 's' : ''} found</span>
                                    {searchQuery && (
                                        <span className="text-gray-400 ml-2 text-sm">
                                            Searching for &quot;{searchQuery}&quot;
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-400 bg-gray-50 rounded border border-gray-200">↑↓</kbd>
                                    <span className="text-xs text-gray-400 font-medium">Navigate</span>
                                </div>
                                <span className="text-gray-200">·</span>
                                <div className="flex items-center gap-1.5">
                                    <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-400 bg-gray-50 rounded border border-gray-200">Enter</kbd>
                                    <span className="text-xs text-gray-400 font-medium">Expand</span>
                                </div>
                            </div>
                        </div>

                        {searchDuplicatePairs.length > 0 && (
                            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={22} />
                                        <div>
                                            <p className="font-black text-red-900">Check-in blocked: these profiles may be the same person</p>
                                            <p className="mt-1 text-sm font-medium text-red-700">Review the profiles and merge the duplicate before recording meals or services under either identity.</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setDuplicatePairToResolve(searchDuplicatePairs[0])} className="shrink-0 rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700">Resolve duplicate</button>
                                </div>
                            </div>
                        )}

                        {searchDuplicatePairs.length === 0 && (
                            <>
                        {/* Sort Options */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sort:</span>
                            <button
                                onClick={() => handleSort('firstName')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortConfig.key === 'firstName'
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                                    }`}
                            >
                                First Name {sortConfig.key === 'firstName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </button>
                            <button
                                onClick={() => handleSort('lastName')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortConfig.key === 'lastName'
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                                    }`}
                            >
                                Last Name {sortConfig.key === 'lastName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </button>
                        </div>

                        {/* Guest Cards - Animations disabled for large lists */}
                        <div ref={listContainerRef} className="space-y-4">
                            {isLargeList ? (
                                // Virtualized, non-animated list for large result sets (only visible cards mount)
                                <div
                                    style={{
                                        height: rowVirtualizer.getTotalSize(),
                                        width: '100%',
                                        position: 'relative',
                                    }}
                                >
                                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                        const guest = sortedGuests[virtualRow.index];
                                        if (!guest?.id) return null;

                                        return (
                                            <div
                                                key={guest.id}
                                                data-index={virtualRow.index}
                                                className={cn(
                                                    'outline-none',
                                                    selectedIndex === virtualRow.index ? 'ring-2 ring-emerald-500 ring-offset-2 rounded-2xl' : ''
                                                )}
                                                tabIndex={-1}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                                                }}
                                                ref={(el) => {
                                                    // Keep both: measurement and focus ref
                                                    if (el) rowVirtualizer.measureElement(el);
                                                    guestCardRefs.current[guest.id] = el;
                                                }}
                                            >
                                                <GuestCard
                                                    guest={guest}
                                                    onClearSearch={handleClearSearch}
                                                    onAdvanceToNext={handleAdvanceToNext}
                                                    isSelected={selectedIndex === virtualRow.index}
                                                    mealStatusMap={mealStatus}
                                                    serviceStatusMap={serviceStatus}
                                                    actionStatusMap={actionStatus}
                                                    recentGuestsMap={recentGuests}
                                                    lastVisitDateMap={lastVisitDates}
                                                    nextAvailableShowerSlot={nextAvailableShowerSlot}
                                                    nextAvailableLaundrySlot={nextAvailableLaundrySlot}
                                                    warningsCount={warningsCountMap.get(guest.id) || 0}
                                                    linkedGuestsCount={linkedGuestsCountMap.get(guest.id) || 0}
                                                    activeRemindersCount={activeRemindersCountMap.get(guest.id) || 0}
                                                    disableLayoutAnimation={true}
                                                    onExpandedChange={(_guestId, _expanded) => rowVirtualizer.measure()}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                // Small lists use CSS-only transitions to keep the animation runtime off the hot path.
                                <div className="grid grid-cols-1 gap-4">
                                        {sortedGuests.filter((g: Guest) => g && g.id).map((guest: Guest, index: number) => (
                                            <div
                                                key={guest.id}
                                                className={cn(
                                                    'outline-none motion-safe:animate-[fadeIn_160ms_ease-out]',
                                                    selectedIndex === index ? 'ring-2 ring-emerald-500 ring-offset-2 rounded-2xl' : ''
                                                )}
                                                tabIndex={-1}
                                                ref={(el) => { guestCardRefs.current[guest.id] = el; }}
                                            >
                                                <GuestCard
                                                    guest={guest}
                                                    onClearSearch={handleClearSearch}
                                                    onAdvanceToNext={handleAdvanceToNext}
                                                    isSelected={selectedIndex === index}
                                                    mealStatusMap={mealStatus}
                                                    serviceStatusMap={serviceStatus}
                                                    actionStatusMap={actionStatus}
                                                    recentGuestsMap={recentGuests}
                                                    lastVisitDateMap={lastVisitDates}
                                                    nextAvailableShowerSlot={nextAvailableShowerSlot}
                                                    nextAvailableLaundrySlot={nextAvailableLaundrySlot}
                                                    warningsCount={warningsCountMap.get(guest.id) || 0}
                                                    linkedGuestsCount={linkedGuestsCountMap.get(guest.id) || 0}
                                                    activeRemindersCount={activeRemindersCountMap.get(guest.id) || 0}
                                                />
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            {showCreateModal && (
                    <GuestCreateModal
                        onClose={() => setShowCreateModal(false)}
                        initialName={searchQuery}
                        defaultLocation={defaultLocation}
                        onCreated={handleGuestCreated}
                        onSelectExisting={handleSelectRecentGuest}
                    />
            )}

            {duplicatePairToResolve && (
                <DuplicateGuestResolutionModal
                    pair={duplicatePairToResolve}
                    onClose={() => setDuplicatePairToResolve(null)}
                    onMerge={handleMergeGuests}
                    onDismiss={handleDismissDuplicate}
                />
            )}

            {/* Hidden penalty-kick Easter egg */}
            {showPenaltyGame && (
                    <PenaltyKickGame onClose={() => setShowPenaltyGame(false)} />
            )}

            {/* Undo tray for the most recent action on this page */}
            <UndoTray />
        </div>
    );
}
