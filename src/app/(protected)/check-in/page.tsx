'use client';

import { useState, useMemo, useCallback, useEffect, useRef, useDeferredValue } from 'react';
import { Search, UserPlus, X, Users, Loader2 } from 'lucide-react';
import { useGuestsStore, Guest } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useRemindersStore } from '@/stores/useRemindersStore';
import { flexibleNameSearch } from '@/lib/utils/flexibleNameSearch';
import { findFuzzySuggestions } from '@/lib/utils/fuzzyMatch';
import { GuestCard } from '@/components/guests/GuestCard';
import { GuestCreateModal } from '@/components/guests/GuestCreateModal';
import { ServiceStatusOverview } from '@/components/checkin/ServiceStatusOverview';
import { KeyboardShortcutsBar } from '@/components/checkin/KeyboardShortcutsBar';
import { MealServiceTimer } from '@/components/checkin/MealServiceTimer';
import { TodayStats } from '@/components/checkin/TodayStats';
import { useTodayStatusMaps } from '@/stores/selectors/todayStatusSelectors';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

// Threshold for disabling animations for better performance
const LARGE_LIST_THRESHOLD = 20;

type SortKey = 'firstName' | 'lastName' | null;
type SortDirection = 'asc' | 'desc';

export default function CheckInPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: null, direction: 'asc' });
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [defaultLocation, setDefaultLocation] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const guestCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const listContainerRef = useRef<HTMLDivElement>(null);

    // Use deferred value for search to prevent UI jank during typing
    const deferredSearchQuery = useDeferredValue(searchQuery);

    const { guests, loadFromSupabase: loadGuests, loadGuestWarningsFromSupabase, loadGuestProxiesFromSupabase } = useGuestsStore();
    const { loadFromSupabase: loadMeals } = useMealsStore();
    const { loadFromSupabase: loadServices } = useServicesStore();
    const { loadFromSupabase: loadReminders } = useRemindersStore();

    // Precomputed status maps for efficient per-guest lookups
    const { mealStatus, serviceStatus, actionStatus, recentGuests } = useTodayStatusMaps();

    // Shared function to load all data
    const loadAllData = useCallback(async () => {
        await Promise.all([
            loadGuests(),
            loadGuestWarningsFromSupabase(),
            loadGuestProxiesFromSupabase(),
            loadMeals(),
            loadServices(),
            loadReminders()
        ]);
    }, [loadGuests, loadGuestWarningsFromSupabase, loadGuestProxiesFromSupabase, loadMeals, loadServices, loadReminders]);

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

    // Search logic using the migrated flexibleNameSearch (with deferred value)
    // Deduplicate results to prevent duplicate key React errors
    const filteredGuests = useMemo(() => {
        if (!deferredSearchQuery.trim()) {
            return [];
        }
        const results = flexibleNameSearch(deferredSearchQuery, guests);
        // Deduplicate by guest ID to prevent React key warnings
        const seen = new Set<string>();
        return results.filter((guest: Guest) => {
            if (!guest || !guest.id || seen.has(guest.id)) {
                return false;
            }
            seen.add(guest.id);
            return true;
        });
    }, [guests, deferredSearchQuery]);

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

    // Determine if we should use virtualization and disable animations
    const isLargeList = sortedGuests.length > LARGE_LIST_THRESHOLD;

    // Fuzzy suggestions for when there are no matches (use deferred value)
    const fuzzySuggestions = useMemo(() => {
        if (deferredSearchQuery.trim().length < 2 || filteredGuests.length > 0) return [];
        return findFuzzySuggestions(deferredSearchQuery, guests, 3);
    }, [deferredSearchQuery, filteredGuests, guests]);

    const handleShowCreateForm = useCallback(() => {
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
    }, [searchQuery]);

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        setSelectedIndex(-1);
        searchInputRef.current?.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
    }, [showCreateModal, sortedGuests, selectedIndex, handleClearSearch, handleShowCreateForm]);

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header with Stats */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Check-In</h1>
                    <p className="text-sm text-gray-500 hidden md:block">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                        <MealServiceTimer />
                    </div>
                    <TodayStats />
                </div>
            </div>

            {/* Service Status Overview */}
            <ServiceStatusOverview />

            {/* Search Header */}
            <div className="bg-white rounded-2xl shadow-xl shadow-emerald-900/5 border border-emerald-100/50 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100 rounded-xl">
                            <Users size={22} className="text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Find or Add Guests</h2>
                            <p className="text-xs text-gray-500 font-medium">Type a name to search · Type first AND last name, then press Enter to create</p>
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
                                setSearchQuery(e.target.value);
                                setSelectedIndex(-1);
                            }}
                            onKeyDown={(e) => {
                                // If Enter is pressed and there are no results, open create form
                                if (e.key === 'Enter' && searchQuery.trim() && filteredGuests.length === 0) {
                                    handleShowCreateForm();
                                }
                            }}
                            placeholder="Start typing a name (e.g. 'John' or 'JS')"
                            className="w-full pl-14 pr-14 py-5 rounded-2xl border-2 border-gray-100 bg-gray-50/50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-xl font-bold placeholder:text-gray-300 outline-none shadow-inner"
                            autoFocus
                        />
                        <AnimatePresence>
                            {searchQuery && (
                                <motion.button
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedIndex(-1);
                                    }}
                                    className="absolute right-5 p-1.5 bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700 rounded-full transition-all"
                                >
                                    <X size={18} strokeWidth={3} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Keyboard Shortcuts Bar */}
                <KeyboardShortcutsBar className="mt-4 hidden sm:flex" />

                <div className="flex items-center gap-3 mt-4">
                    <button
                        onClick={handleShowCreateForm}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-black transition-all text-sm font-bold shadow-lg shadow-gray-200 active:scale-95"
                    >
                        <UserPlus size={18} />
                        New Guest
                    </button>
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-400">
                        <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-400 bg-gray-100 rounded border border-gray-200">⌘⌥G</kbd>
                    </span>
                </div>
            </div>

            {/* Results Section */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 gap-4">
                        <Loader2 size={40} className="text-emerald-500 animate-spin" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading Guest Database...</p>
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
                                                className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-all active:scale-95"
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
                                    className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
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
                                // Non-animated list for large result sets (better performance)
                                <div className="grid grid-cols-1 gap-4">
                                    {sortedGuests.filter((g: Guest) => g && g.id).map((guest: Guest, index: number) => (
                                        <div
                                            key={guest.id}
                                            className={cn(
                                                'outline-none',
                                                selectedIndex === index ? 'ring-2 ring-emerald-500 ring-offset-2 rounded-2xl' : ''
                                            )}
                                            tabIndex={-1}
                                            ref={(el) => { guestCardRefs.current[guest.id] = el; }}
                                        >
                                            <GuestCard
                                                guest={guest}
                                                onClearSearch={handleClearSearch}
                                                isSelected={selectedIndex === index}
                                                mealStatusMap={mealStatus}
                                                serviceStatusMap={serviceStatus}
                                                actionStatusMap={actionStatus}
                                                recentGuestsMap={recentGuests}
                                                disableLayoutAnimation={true}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // Animated list for small result sets
                                <div className="grid grid-cols-1 gap-4">
                                    <AnimatePresence>
                                        {sortedGuests.filter((g: Guest) => g && g.id).map((guest: Guest, index: number) => (
                                            <motion.div
                                                key={guest.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.2 }}
                                                className={cn(
                                                    'outline-none',
                                                    selectedIndex === index ? 'ring-2 ring-emerald-500 ring-offset-2 rounded-2xl' : ''
                                                )}
                                                tabIndex={-1}
                                                ref={(el) => { guestCardRefs.current[guest.id] = el; }}
                                            >
                                                <GuestCard
                                                    guest={guest}
                                                    onClearSearch={handleClearSearch}
                                                    isSelected={selectedIndex === index}
                                                    mealStatusMap={mealStatus}
                                                    serviceStatusMap={serviceStatus}
                                                    actionStatusMap={actionStatus}
                                                    recentGuestsMap={recentGuests}
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showCreateModal && (
                    <GuestCreateModal
                        onClose={() => setShowCreateModal(false)}
                        initialName={searchQuery}
                        defaultLocation={defaultLocation}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
