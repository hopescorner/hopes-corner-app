const DB_NAME = 'hopes_corner_offline_db';
const STORE_NAME = 'checkin_commands';
const DB_VERSION = 1;

export interface QueuedCommand {
    id: string;
    url: string;
    body: Record<string, unknown>;
    timestamp: number;
}

const memoryQueue = new Map<string, QueuedCommand>();

function hasIndexedDB(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!hasIndexedDB()) {
            return reject(new Error('IndexedDB not supported'));
        }
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function queueCommand(command: QueuedCommand): Promise<void> {
    if (!hasIndexedDB()) {
        memoryQueue.set(command.id, command);
        return;
    }
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(command);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch {
        memoryQueue.set(command.id, command);
    }
}

export async function getQueuedCommands(): Promise<QueuedCommand[]> {
    if (!hasIndexedDB()) {
        return Array.from(memoryQueue.values());
    }
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve(Array.from(memoryQueue.values()));
        });
    } catch {
        return Array.from(memoryQueue.values());
    }
}

export async function removeQueuedCommand(id: string): Promise<void> {
    memoryQueue.delete(id);
    if (!hasIndexedDB()) return;
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch {}
}

export async function replayOfflineCommands(
    fetchFn: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = fetch
): Promise<{ successCount: number; failCount: number }> {
    const commands = await getQueuedCommands();
    if (commands.length === 0) return { successCount: 0, failCount: 0 };

    let successCount = 0;
    let failCount = 0;

    for (const cmd of commands) {
        try {
            const response = await fetchFn(cmd.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cmd.body),
            });
            if (response.ok) {
                await removeQueuedCommand(cmd.id);
                successCount++;
            } else {
                if (response.status >= 400 && response.status < 500) {
                    await removeQueuedCommand(cmd.id);
                }
                failCount++;
            }
        } catch {
            failCount++;
            break;
        }
    }

    return { successCount, failCount };
}
