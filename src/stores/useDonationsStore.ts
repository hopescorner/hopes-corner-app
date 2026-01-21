import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient } from '@/lib/supabase/client';
import { mapDonationRow, mapLaPlazaDonationRow } from '@/lib/utils/mappers';
import { Donation, LaPlazaDonation } from '@/types/database';

export interface DonationRecord {
    id: string;
    type: string;
    itemName: string;
    trays: number;
    weightLbs: number;
    density?: 'light' | 'medium' | 'high';
    servings: number;
    temperature?: string;
    donor: string;
    date: string;
    dateKey?: string;
    createdAt?: string;
    donatedAt?: string;
    [key: string]: any;
}

interface LaPlazaRecord {
    id: string;
    category: string;
    weightLbs: number;
    notes?: string;
    receivedAt?: string;
    dateKey?: string;
    createdAt?: string;
    [key: string]: any;
}

interface DonationsState {
    donationRecords: DonationRecord[];
    laPlazaRecords: LaPlazaRecord[];

    // Actions
    addDonation: (donation: Partial<Donation>) => Promise<DonationRecord>;
    updateDonation: (id: string, updates: Partial<Donation>) => Promise<DonationRecord>;
    deleteDonation: (id: string) => Promise<void>;

    addLaPlazaDonation: (donation: Partial<LaPlazaDonation>) => Promise<LaPlazaRecord>;
    updateLaPlazaDonation: (id: string, updates: Partial<LaPlazaDonation>) => Promise<LaPlazaRecord>;
    deleteLaPlazaDonation: (id: string) => Promise<void>;

    loadFromSupabase: () => Promise<void>;
    getRecentDonations: (limit?: number) => DonationRecord[];
}

export const useDonationsStore = create<DonationsState>()(
    devtools(
        subscribeWithSelector(
            persist(
                immer((set, get) => ({
                    donationRecords: [],
                    laPlazaRecords: [],

                    addDonation: async (donation) => {
                        const supabase = createClient();
                        const { data, error } = await supabase
                            .from('donations')
                            .insert({
                                donation_type: donation.donation_type, // maps to database enum
                                item_name: donation.item_name,
                                trays: donation.trays || 0,
                                weight_lbs: donation.weight_lbs || 0,
                                servings: donation.servings || 0,
                                temperature: donation.temperature,
                                donor: donation.donor,
                                donated_at: donation.donated_at || new Date().toISOString(),
                                date_key: donation.date_key,
                            })
                            .select()
                            .single();

                        if (error) throw error;
                        const mapped = mapDonationRow(data);
                        set((state) => {
                            state.donationRecords.push(mapped);
                        });
                        return mapped;
                    },

                    updateDonation: async (id, updates) => {
                        const supabase = createClient();
                        const payload: any = {};
                        if (updates.donation_type) payload.donation_type = updates.donation_type;
                        if (updates.item_name) payload.item_name = updates.item_name;
                        if (typeof updates.trays === 'number') payload.trays = updates.trays;
                        if (typeof updates.weight_lbs === 'number') payload.weight_lbs = updates.weight_lbs;
                        if (typeof updates.servings === 'number') payload.servings = updates.servings;
                        if (typeof updates.temperature !== 'undefined') payload.temperature = updates.temperature;
                        if (typeof updates.donor !== 'undefined') payload.donor = updates.donor;
                        if (updates.donated_at) payload.donated_at = updates.donated_at;

                        const { data, error } = await supabase
                            .from('donations')
                            .update(payload)
                            .eq('id', id)
                            .select()
                            .single();

                        if (error) throw error;
                        const mapped = mapDonationRow(data);
                        set((state) => {
                            const index = state.donationRecords.findIndex(r => r.id === id);
                            if (index !== -1) {
                                state.donationRecords[index] = mapped;
                            }
                        });
                        return mapped;
                    },

                    deleteDonation: async (id) => {
                        const supabase = createClient();
                        const { error } = await supabase.from('donations').delete().eq('id', id);
                        if (error) throw error;
                        set((state) => {
                            state.donationRecords = state.donationRecords.filter(r => r.id !== id);
                        });
                    },

                    addLaPlazaDonation: async (donation) => {
                        const supabase = createClient();
                        const { data, error } = await supabase
                            .from('la_plaza_donations')
                            .insert({
                                category: donation.category,
                                weight_lbs: donation.weight_lbs,
                                notes: donation.notes,
                                received_at: donation.received_at || new Date().toISOString(),
                                date_key: donation.date_key,
                            })
                            .select()
                            .single();

                        if (error) throw error;
                        const mapped = mapLaPlazaDonationRow(data);
                        set((state) => {
                            state.laPlazaRecords.push(mapped);
                        });
                        return mapped;
                    },

                    updateLaPlazaDonation: async (id, updates) => {
                        const supabase = createClient();
                        const payload: any = {};
                        if (updates.category) payload.category = updates.category;
                        if (typeof updates.weight_lbs === 'number') payload.weight_lbs = updates.weight_lbs;
                        if (typeof updates.notes !== 'undefined') payload.notes = updates.notes;
                        if (updates.received_at) payload.received_at = updates.received_at;

                        const { data, error } = await supabase
                            .from('la_plaza_donations')
                            .update(payload)
                            .eq('id', id)
                            .select()
                            .single();

                        if (error) throw error;
                        const mapped = mapLaPlazaDonationRow(data);
                        set((state) => {
                            const index = state.laPlazaRecords.findIndex(r => r.id === id);
                            if (index !== -1) {
                                state.laPlazaRecords[index] = mapped;
                            }
                        });
                        return mapped;
                    },

                    deleteLaPlazaDonation: async (id) => {
                        const supabase = createClient();
                        const { error } = await supabase.from('la_plaza_donations').delete().eq('id', id);
                        if (error) throw error;
                        set((state) => {
                            state.laPlazaRecords = state.laPlazaRecords.filter(r => r.id !== id);
                        });
                    },

                    loadFromSupabase: async () => {
                        const supabase = createClient();
                        const { data: donations } = await supabase
                            .from('donations')
                            .select('*')
                            .order('donated_at', { ascending: false })
                            .limit(2000); // Reasonable limit for recent history

                        const { data: laPlaza } = await supabase
                            .from('la_plaza_donations')
                            .select('*')
                            .order('received_at', { ascending: false })
                            .limit(2000);

                        set((state) => {
                            if (donations) state.donationRecords = donations.map(mapDonationRow);
                            if (laPlaza) state.laPlazaRecords = laPlaza.map(mapLaPlazaDonationRow);
                        });
                    },

                    getRecentDonations: (limit = 5) => {
                        return get().donationRecords
                            .sort((a, b) => new Date(b.donated_at || b.created_at).getTime() - new Date(a.donated_at || a.created_at).getTime())
                            .slice(0, limit);
                    }
                })),
                { name: 'DonationsStore' }
            )
        ),
        { name: 'DonationsStore' }
    )
);
