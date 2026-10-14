import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queueCommand, getQueuedCommands, removeQueuedCommand, replayOfflineCommands } from '../offlineQueue';

describe('offlineQueue', () => {
    beforeEach(async () => {
        // Clear database between tests
        const commands = await getQueuedCommands();
        for (const cmd of commands) {
            await removeQueuedCommand(cmd.id);
        }
    });

    it('queues and retrieves offline commands', async () => {
        await queueCommand({
            id: 'test-key-1',
            url: '/api/check-in/commands',
            body: { guestId: 'g1', quantity: 1 },
            timestamp: 123456789,
        });

        const commands = await getQueuedCommands();
        expect(commands).toHaveLength(1);
        expect(commands[0].id).toBe('test-key-1');
        expect(commands[0].body).toEqual({ guestId: 'g1', quantity: 1 });
    });

    it('removes queued command after processing', async () => {
        await queueCommand({
            id: 'test-key-2',
            url: '/api/check-in/commands',
            body: { guestId: 'g2' },
            timestamp: 123456789,
        });

        await removeQueuedCommand('test-key-2');
        const commands = await getQueuedCommands();
        expect(commands).toHaveLength(0);
    });

    it('replays queued commands and removes successful ones', async () => {
        await queueCommand({
            id: 'test-key-3',
            url: '/api/check-in/commands',
            body: { guestId: 'g3' },
            timestamp: 123456789,
        });

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
        });

        const result = await replayOfflineCommands(mockFetch as any);
        expect(result.successCount).toBe(1);
        expect(result.failCount).toBe(0);

        const remaining = await getQueuedCommands();
        expect(remaining).toHaveLength(0);
    });
});
