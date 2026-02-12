/**
 * Story wrappers for Playwright Component Testing.
 *
 * Because Playwright CT runs components in a real browser while tests
 * execute in Node.js, we cannot pass complex objects or functions across
 * the boundary. These wrapper components accept only serialisable props
 * and wire up Zustand stores, toast, and other browser-side dependencies
 * internally.
 */
import React, { useEffect, useLayoutEffect } from 'react';
import { TodayStats } from '@/components/checkin/TodayStats';
import { BanManagementModal } from '@/components/modals/BanManagementModal';
import { GuestEditModal } from '@/components/modals/GuestEditModal';
import { GuestCreateModal } from '@/components/guests/GuestCreateModal';
import { ShowerBookingModal } from '@/components/modals/ShowerBookingModal';
import { LaundryBookingModal } from '@/components/modals/LaundryBookingModal';
import { MealsSection } from '@/components/services/MealsSection';
import { DonationsSection } from '@/components/services/DonationsSection';
import { BicycleSection } from '@/components/services/BicycleSection';
import { useMealsStore } from '@/stores/useMealsStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useModalStore } from '@/stores/useModalStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useDonationsStore } from '@/stores/useDonationsStore';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { useBlockedSlotsStore } from '@/stores/useBlockedSlotsStore';
import { useRemindersStore } from '@/stores/useRemindersStore';
import { useWaiverStore } from '@/stores/useWaiverStore';
// The mock for next-auth/react is resolved via Vite alias in playwright-ct.config.ts
// @ts-expect-error __setMockSession is exported by our mock, not the real next-auth/react
import { __setMockSession } from 'next-auth/react';

// ---------------------------------------------------------------------------
// TodayStats wrapper – seeds the meals store with serialisable data
// ---------------------------------------------------------------------------

interface TodayStatsStoryProps {
  mealRecords?: Array<{
    id: string;
    guestId: string;
    count: number;
    date: string;
  }>;
  extraMealRecords?: Array<{
    id: string;
    guestId: string;
    count: number;
    date: string;
  }>;
}

export function TodayStatsStory({
  mealRecords = [],
  extraMealRecords = [],
}: TodayStatsStoryProps) {
  // Seed store before render
  useEffect(() => {
    useMealsStore.setState({
      mealRecords: mealRecords as any,
      extraMealRecords: extraMealRecords as any,
    });
  }, [mealRecords, extraMealRecords]);

  return <TodayStats />;
}

// ---------------------------------------------------------------------------
// BanManagementModal wrapper
// ---------------------------------------------------------------------------

interface BanManagementStoryProps {
  guest: {
    id: string;
    name: string;
    preferredName?: string;
    isBanned: boolean;
    bannedUntil?: string | null;
    banReason?: string;
    bannedFromMeals?: boolean;
    bannedFromShower?: boolean;
    bannedFromLaundry?: boolean;
    bannedFromBicycle?: boolean;
  };
  /** When the component calls onClose we set this flag visible so tests can detect it */
}

export function BanManagementStory({ guest }: BanManagementStoryProps) {
  const [closed, setClosed] = React.useState(false);

  // Provide stub store methods
  useEffect(() => {
    useGuestsStore.setState({
      banGuest: (async () => {}) as any,
      clearGuestBan: (async () => {}) as any,
    });
  }, []);

  if (closed) return <div data-testid="modal-closed">closed</div>;

  return <BanManagementModal guest={guest} onClose={() => setClosed(true)} />;
}

// ---------------------------------------------------------------------------
// GuestEditModal wrapper
// ---------------------------------------------------------------------------

interface GuestEditStoryProps {
  guest: {
    id: string;
    name: string;
    preferredName?: string;
    firstName: string;
    lastName: string;
    housingStatus?: string;
    location?: string;
    age?: string;
    gender?: string;
    notes?: string;
    bicycleDescription?: string;
  };
}

export function GuestEditStory({ guest }: GuestEditStoryProps) {
  const [closed, setClosed] = React.useState(false);

  useEffect(() => {
    useGuestsStore.setState({
      updateGuest: (async () => {}) as any,
    });
  }, []);

  if (closed) return <div data-testid="modal-closed">closed</div>;

  return <GuestEditModal guest={guest} onClose={() => setClosed(true)} />;
}

// ---------------------------------------------------------------------------
// GuestCreateModal wrapper
// ---------------------------------------------------------------------------

interface GuestCreateStoryProps {
  initialName?: string;
  defaultLocation?: string;
  existingGuests?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    preferredName?: string;
  }>;
}

export function GuestCreateStory({
  initialName = '',
  defaultLocation = '',
  existingGuests = [],
}: GuestCreateStoryProps) {
  const [closed, setClosed] = React.useState(false);

  useEffect(() => {
    useGuestsStore.setState({
      guests: existingGuests as any,
      addGuest: (async () => {}) as any,
    });
  }, [existingGuests]);

  if (closed) return <div data-testid="modal-closed">closed</div>;

  return (
    <GuestCreateModal
      onClose={() => setClosed(true)}
      initialName={initialName}
      defaultLocation={defaultLocation}
    />
  );
}

// ---------------------------------------------------------------------------
// ShowerBookingModal wrapper
// ---------------------------------------------------------------------------

interface ShowerBookingStoryProps {
  /** Guest object to set as showerPickerGuest in the modal store */
  guest: { id: string; name: string; preferredName?: string };
  /** User role — controls checkin vs staff/admin UI */
  role?: 'checkin' | 'staff' | 'admin';
  /** Existing shower records for today's slot occupancy */
  showerRecords?: Array<{
    id: string;
    guestId: string;
    time?: string;
    date: string;
    status: string;
  }>;
  /** Blocked slot times (e.g. ['09:00']) */
  blockedSlots?: Array<{
    id: string;
    serviceType: 'shower';
    slotTime: string;
    date: string;
  }>;
}

export function ShowerBookingStory({
  guest,
  role = 'checkin',
  showerRecords = [],
  blockedSlots = [],
}: ShowerBookingStoryProps) {
  const [closed, setClosed] = React.useState(false);

  useEffect(() => {
    // Set mock session role
    (__setMockSession as any)({
      data: { user: { role, email: 'test@test.com', name: 'Test User' }, expires: '2099-01-01' },
      status: 'authenticated',
    });

    // Seed modal store with guest
    useModalStore.setState({
      showerPickerGuest: guest,
      setShowerPickerGuest: ((g: any) => {
        if (g === null) setClosed(true);
        useModalStore.setState({ showerPickerGuest: g });
      }) as any,
    });

    // Seed services store
    useServicesStore.setState({
      showerRecords: showerRecords as any,
      addShowerRecord: (async () => ({ id: 'new-shower', guestId: guest.id, date: new Date().toISOString(), status: 'booked' })) as any,
      addShowerWaitlist: (async () => ({ id: 'new-waitlist', guestId: guest.id, date: new Date().toISOString(), status: 'waitlisted' })) as any,
    });

    // Seed guests store
    useGuestsStore.setState({
      guests: [guest] as any,
    });

    // Seed action history store
    useActionHistoryStore.setState({
      addAction: (() => {}) as any,
    });

    // Seed blocked slots store
    useBlockedSlotsStore.setState({
      blockedSlots: blockedSlots as any,
      fetchBlockedSlots: (async () => {}) as any,
      isSlotBlocked: ((serviceType: string, slotTime: string, date: string) => {
        return blockedSlots.some(
          (b) => b.serviceType === serviceType && b.slotTime === slotTime && b.date === date
        );
      }) as any,
    });

    // Seed reminders store (empty so ServiceCardReminder renders nothing)
    useRemindersStore.setState({
      reminders: [],
      getRemindersForService: (() => []) as any,
      hasActiveReminder: (() => false) as any,
    });
  }, [guest, role, showerRecords, blockedSlots]);

  if (closed) return <div data-testid="modal-closed">closed</div>;

  return <ShowerBookingModal />;
}

// ---------------------------------------------------------------------------
// LaundryBookingModal wrapper
// ---------------------------------------------------------------------------

interface LaundryBookingStoryProps {
  /** Guest object to set as laundryPickerGuest */
  guest: { id: string; name: string; preferredName?: string };
  /** User role */
  role?: 'checkin' | 'staff' | 'admin';
  /** Existing laundry records */
  laundryRecords?: Array<{
    id: string;
    guestId: string;
    time?: string;
    laundryType?: string;
    date: string;
    status: string;
  }>;
  /** Blocked slot labels */
  blockedSlots?: Array<{
    id: string;
    serviceType: 'laundry';
    slotTime: string;
    date: string;
  }>;
}

export function LaundryBookingStory({
  guest,
  role = 'checkin',
  laundryRecords = [],
  blockedSlots = [],
}: LaundryBookingStoryProps) {
  const [closed, setClosed] = React.useState(false);

  useEffect(() => {
    // Set mock session role
    (__setMockSession as any)({
      data: { user: { role, email: 'test@test.com', name: 'Test User' }, expires: '2099-01-01' },
      status: 'authenticated',
    });

    // Seed modal store with guest
    useModalStore.setState({
      laundryPickerGuest: guest,
      setLaundryPickerGuest: ((g: any) => {
        if (g === null) setClosed(true);
        useModalStore.setState({ laundryPickerGuest: g });
      }) as any,
    });

    // Seed services store
    useServicesStore.setState({
      laundryRecords: laundryRecords as any,
      addLaundryRecord: (async () => ({ id: 'new-laundry', guestId: guest.id, date: new Date().toISOString(), status: 'waiting' })) as any,
    });

    // Seed action history store
    useActionHistoryStore.setState({
      addAction: (() => {}) as any,
    });

    // Seed blocked slots store
    useBlockedSlotsStore.setState({
      blockedSlots: blockedSlots as any,
      fetchBlockedSlots: (async () => {}) as any,
      isSlotBlocked: ((serviceType: string, slotTime: string, date: string) => {
        return blockedSlots.some(
          (b) => b.serviceType === serviceType && b.slotTime === slotTime && b.date === date
        );
      }) as any,
    });

    // Seed reminders store
    useRemindersStore.setState({
      reminders: [],
      getRemindersForService: (() => []) as any,
      hasActiveReminder: (() => false) as any,
    });
  }, [guest, role, laundryRecords, blockedSlots]);

  if (closed) return <div data-testid="modal-closed">closed</div>;

  return <LaundryBookingModal />;
}

// ---------------------------------------------------------------------------
// MealsSection wrapper
// ---------------------------------------------------------------------------

interface MealsSectionStoryProps {
  /** Guest meal records */
  mealRecords?: Array<{
    id: string;
    guestId: string;
    count: number;
    date: string;
    createdAt?: string;
  }>;
  /** RV meal records */
  rvMealRecords?: Array<{
    id: string;
    guestId: string;
    count: number;
    date: string;
    createdAt?: string;
  }>;
  /** Extra meal records */
  extraMealRecords?: Array<{
    id: string;
    guestId: string;
    count: number;
    date: string;
    createdAt?: string;
  }>;
  /** Day worker records */
  dayWorkerMealRecords?: Array<{
    id: string;
    guestId: string;
    count: number;
    date: string;
    createdAt?: string;
  }>;
  /** Shelter meal records */
  shelterMealRecords?: Array<{
    id: string;
    guestId: string;
    count: number;
    date: string;
    createdAt?: string;
  }>;
  /** United effort records */
  unitedEffortMealRecords?: Array<{
    id: string;
    guestId: string;
    count: number;
    date: string;
    createdAt?: string;
  }>;
  /** Lunch bag records */
  lunchBagRecords?: Array<{
    id: string;
    guestId: string;
    count: number;
    date: string;
    createdAt?: string;
  }>;
  /** Guests for name resolution */
  guests?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    preferredName?: string;
    name?: string;
  }>;
}

export function MealsSectionStory({
  mealRecords = [],
  rvMealRecords = [],
  extraMealRecords = [],
  dayWorkerMealRecords = [],
  shelterMealRecords = [],
  unitedEffortMealRecords = [],
  lunchBagRecords = [],
  guests = [],
}: MealsSectionStoryProps) {
  // Use layout effect so the store is seeded before MealsSection's own useEffects run.
  // Otherwise CT will execute the real store actions (Supabase client creation) on mount.
  useLayoutEffect(() => {
    useMealsStore.setState({
      mealRecords: mealRecords as any,
      rvMealRecords: rvMealRecords as any,
      extraMealRecords: extraMealRecords as any,
      dayWorkerMealRecords: dayWorkerMealRecords as any,
      shelterMealRecords: shelterMealRecords as any,
      unitedEffortMealRecords: unitedEffortMealRecords as any,
      lunchBagRecords: lunchBagRecords as any,
      deleteMealRecord: (async () => {}) as any,
      deleteRvMealRecord: (async () => {}) as any,
      deleteExtraMealRecord: (async () => {}) as any,
      addBulkMealRecord: (async () => ({ id: 'new-bulk' })) as any,
      deleteBulkMealRecord: (async () => {}) as any,
      updateBulkMealRecord: (async () => {}) as any,
      updateMealRecord: (async () => {}) as any,
      checkAndAddAutomaticMeals: (async () => {}) as any,
    });

    useGuestsStore.setState({
      guests: guests as any,
    });
  }, [
    mealRecords,
    rvMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    lunchBagRecords,
    guests,
  ]);

  return <MealsSection />;
}

// ---------------------------------------------------------------------------
// DonationsSection wrapper
// ---------------------------------------------------------------------------

interface DonationsSectionStoryProps {
  /** General donation records */
  donationRecords?: Array<{
    id: string;
    type: string;
    itemName: string;
    trays: number;
    weightLbs: number;
    density?: string;
    servings: number;
    temperature?: string;
    donor: string;
    date: string;
    dateKey?: string;
    createdAt?: string;
    donatedAt?: string;
  }>;
  /** La Plaza donation records */
  laPlazaRecords?: Array<{
    id: string;
    category: string;
    weightLbs: number;
    notes?: string;
    receivedAt?: string;
    dateKey?: string;
    createdAt?: string;
  }>;
}

export function DonationsSectionStory({
  donationRecords = [],
  laPlazaRecords = [],
}: DonationsSectionStoryProps) {
  useEffect(() => {
    useDonationsStore.setState({
      donationRecords: donationRecords as any,
      laPlazaRecords: laPlazaRecords as any,
      addDonation: (async (d: any) => {
        const newRecord = {
          id: 'new-donation-' + Date.now(),
          type: d.donation_type,
          itemName: d.item_name,
          trays: d.trays || 0,
          weightLbs: d.weight_lbs || 0,
          servings: d.servings || 0,
          donor: d.donor || '',
          date: d.donated_at || new Date().toISOString(),
          dateKey: d.date_key,
          donatedAt: d.donated_at,
        };
        useDonationsStore.setState((state: any) => ({
          donationRecords: [...state.donationRecords, newRecord],
        }));
        return newRecord;
      }) as any,
      updateDonation: (async () => ({})) as any,
      deleteDonation: (async (id: string) => {
        useDonationsStore.setState((state: any) => ({
          donationRecords: state.donationRecords.filter((r: any) => r.id !== id),
        }));
      }) as any,
      addLaPlazaDonation: (async (d: any) => {
        const newRecord = {
          id: 'new-laplaza-' + Date.now(),
          category: d.category,
          weightLbs: d.weight_lbs || 0,
          notes: d.notes || '',
          dateKey: d.date_key,
        };
        useDonationsStore.setState((state: any) => ({
          laPlazaRecords: [...state.laPlazaRecords, newRecord],
        }));
        return newRecord;
      }) as any,
      updateLaPlazaDonation: (async () => ({})) as any,
      deleteLaPlazaDonation: (async (id: string) => {
        useDonationsStore.setState((state: any) => ({
          laPlazaRecords: state.laPlazaRecords.filter((r: any) => r.id !== id),
        }));
      }) as any,
    });
  }, [donationRecords, laPlazaRecords]);

  return <DonationsSection />;
}

// ---------------------------------------------------------------------------
// BicycleSection wrapper
// ---------------------------------------------------------------------------

interface BicycleSectionStoryProps {
  /** Bicycle repair records */
  bicycleRecords?: Array<{
    id: string;
    guestId: string;
    date: string;
    type: string;
    repairType: string;
    repairTypes: string[];
    completedRepairs: string[];
    notes?: string;
    status: string;
    priority: number;
    createdAt?: string;
  }>;
  /** Guests for name resolution */
  guests?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    preferredName?: string;
    name?: string;
    bicycleDescription?: string;
  }>;
}

export function BicycleSectionStory({
  bicycleRecords = [],
  guests = [],
}: BicycleSectionStoryProps) {
  useEffect(() => {
    useServicesStore.setState({
      bicycleRecords: bicycleRecords as any,
      updateBicycleRecord: (async () => {}) as any,
      deleteBicycleRecord: (async () => {}) as any,
    });

    useGuestsStore.setState({
      guests: guests as any,
    });

    // Stub waiver store so CompactWaiverIndicator doesn't crash
    useWaiverStore.setState({
      waiverVersion: 0,
      guestNeedsWaiverReminder: (async () => false) as any,
      hasActiveWaiver: (async () => false) as any,
      dismissWaiver: (async () => true) as any,
    });

    // Stub reminders store so ReminderIndicator renders nothing
    useRemindersStore.setState({
      reminders: [],
      getRemindersForService: (() => []) as any,
      hasActiveReminder: (() => false) as any,
    });
  }, [bicycleRecords, guests]);

  return <BicycleSection />;
}
