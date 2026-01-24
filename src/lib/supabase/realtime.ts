import { createClient } from './client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 
    | 'shower_reservations' 
    | 'laundry_bookings' 
    | 'meal_attendance' 
    | 'bicycle_repairs'
    | 'guests'
    | 'guest_warnings'
    | 'guest_proxies'
    | 'guest_reminders';

type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionOptions {
    table: TableName;
    event?: ChangeEvent;
    filter?: string;
    onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void;
    onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
    onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void;
    onChange?: (payload: RealtimePostgresChangesPayload<any>) => void;
}

// Store active channels to prevent duplicates and enable cleanup
const activeChannels: Map<string, RealtimeChannel> = new Map();

/**
 * Subscribe to realtime changes on a Supabase table
 * Returns an unsubscribe function
 */
export function subscribeToTable(options: SubscriptionOptions): () => void {
    const { table, event = '*', filter, onInsert, onUpdate, onDelete, onChange } = options;
    
    // Create unique channel name
    const channelName = `realtime:${table}:${filter || 'all'}`;
    
    // If channel already exists, reuse it
    if (activeChannels.has(channelName)) {
        console.log(`[Realtime] Channel ${channelName} already exists, reusing`);
        return () => unsubscribeFromChannel(channelName);
    }

    const supabase = createClient();
    
    const channelConfig: any = {
        event,
        schema: 'public',
        table,
    };
    
    if (filter) {
        channelConfig.filter = filter;
    }

    const channel = supabase
        .channel(channelName)
        .on('postgres_changes', channelConfig, (payload: RealtimePostgresChangesPayload<any>) => {
            console.log(`[Realtime] ${table} change:`, payload.eventType);
            
            // Call specific event handlers
            if (payload.eventType === 'INSERT' && onInsert) {
                onInsert(payload);
            } else if (payload.eventType === 'UPDATE' && onUpdate) {
                onUpdate(payload);
            } else if (payload.eventType === 'DELETE' && onDelete) {
                onDelete(payload);
            }
            
            // Always call onChange if provided
            if (onChange) {
                onChange(payload);
            }
        })
        .subscribe((status) => {
            console.log(`[Realtime] ${table} subscription status:`, status);
        });

    activeChannels.set(channelName, channel);

    return () => unsubscribeFromChannel(channelName);
}

/**
 * Unsubscribe from a specific channel
 */
function unsubscribeFromChannel(channelName: string): void {
    const channel = activeChannels.get(channelName);
    if (channel) {
        const supabase = createClient();
        supabase.removeChannel(channel);
        activeChannels.delete(channelName);
        console.log(`[Realtime] Unsubscribed from ${channelName}`);
    }
}

/**
 * Unsubscribe from all active channels
 */
export function unsubscribeFromAll(): void {
    const supabase = createClient();
    activeChannels.forEach((channel, name) => {
        supabase.removeChannel(channel);
        console.log(`[Realtime] Unsubscribed from ${name}`);
    });
    activeChannels.clear();
}

/**
 * Get the count of active subscriptions
 */
export function getActiveSubscriptionCount(): number {
    return activeChannels.size;
}

/**
 * Check if a table has an active subscription
 */
export function hasActiveSubscription(table: TableName): boolean {
    for (const name of activeChannels.keys()) {
        if (name.includes(table)) {
            return true;
        }
    }
    return false;
}
