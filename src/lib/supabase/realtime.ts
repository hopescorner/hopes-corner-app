import { createClient } from './client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type TableName =
    | 'shower_reservations' 
    | 'laundry_bookings' 
    | 'meal_attendance' 
    | 'bicycle_repairs'
    | 'guests'
    | 'guest_warnings'
    | 'guest_proxies'
    | 'guest_reminders'
    | 'blocked_slots'
    | 'daily_notes'
    | 'donations';

type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface SubscriptionOptions {
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

const realtimeDebugEnabled = process.env.NEXT_PUBLIC_REALTIME_DEBUG === 'true';

function dispatchPayload(options: SubscriptionOptions, payload: RealtimePostgresChangesPayload<any>) {
    const { onInsert, onUpdate, onDelete, onChange } = options;
    if (payload.eventType === 'INSERT' && onInsert) onInsert(payload);
    else if (payload.eventType === 'UPDATE' && onUpdate) onUpdate(payload);
    else if (payload.eventType === 'DELETE' && onDelete) onDelete(payload);
    onChange?.(payload);
}

/** Register several postgres-change handlers on a single websocket channel. */
export function subscribeToTables(options: SubscriptionOptions[], scope = 'route'): () => void {
    const channelName = `realtime:${scope}:${options.map((option) => option.table).join(',')}`;
    if (activeChannels.has(channelName)) return () => unsubscribeFromChannel(channelName);

    const supabase = createClient();
    let channel = supabase.channel(channelName);
    for (const option of options) {
        const config: Record<string, string> = {
            event: option.event || '*',
            schema: 'public',
            table: option.table,
        };
        if (option.filter) config.filter = option.filter;
        channel = channel.on('postgres_changes', config as any, (payload) => {
            if (realtimeDebugEnabled) console.log(`[Realtime] ${option.table} change:`, payload.eventType);
            dispatchPayload(option, payload);
        });
    }
    channel = channel.subscribe((status) => {
        if (realtimeDebugEnabled) console.log(`[Realtime] ${scope} subscription status:`, status);
    });
    activeChannels.set(channelName, channel);
    return () => unsubscribeFromChannel(channelName);
}

/**
 * Subscribe to realtime changes on a Supabase table
 * Returns an unsubscribe function
 */
export function subscribeToTable(options: SubscriptionOptions): () => void {
    const { table, event = '*', filter } = options;
    
    // Create unique channel name
    const channelName = `realtime:${table}:${filter || 'all'}`;
    
    // If channel already exists, reuse it
    if (activeChannels.has(channelName)) {
        if (realtimeDebugEnabled) {
            console.log(`[Realtime] Channel ${channelName} already exists, reusing`);
        }
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
            if (realtimeDebugEnabled) {
                console.log(`[Realtime] ${table} change:`, payload.eventType);
            }
            
            dispatchPayload(options, payload);
        })
        .subscribe((status) => {
            if (realtimeDebugEnabled) {
                console.log(`[Realtime] ${table} subscription status:`, status);
            }
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
        if (realtimeDebugEnabled) {
            console.log(`[Realtime] Unsubscribed from ${channelName}`);
        }
    }
}

/**
 * Unsubscribe from all active channels
 */
export function unsubscribeFromAll(): void {
    const supabase = createClient();
    activeChannels.forEach((channel, name) => {
        supabase.removeChannel(channel);
        if (realtimeDebugEnabled) {
            console.log(`[Realtime] Unsubscribed from ${name}`);
        }
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
