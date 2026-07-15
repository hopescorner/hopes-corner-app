import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllPaginated } from '../supabasePagination';

describe('supabasePagination', () => {
    let mockClient: any;
    let mockQuery: any;

    beforeEach(() => {
        mockQuery = {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            range: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: [], error: null })),
        };

        mockClient = {
            from: vi.fn().mockReturnValue(mockQuery),
        };
    });

    it('returns empty array if no client is provided', async () => {
        const result = await fetchAllPaginated(null as any, { table: 'test' });
        expect(result).toEqual([]);
    });

    it('throws error if no table is provided', async () => {
        await expect(fetchAllPaginated(mockClient, { table: '' })).rejects.toThrow('Table name is required');
    });

    it('fetches all pages until data length < pageSize', async () => {
        const page1 = [{ id: 1 }, { id: 2 }];
        const page2 = [{ id: 3 }];

        mockQuery.then
            .mockImplementationOnce((resolve) => resolve({ data: page1, error: null }))
            .mockImplementationOnce((resolve) => resolve({ data: page2, error: null }));

        const result = await fetchAllPaginated(mockClient, { table: 'test', pageSize: 2 });

        expect(result).toEqual([...page1, ...page2]);
        expect(mockClient.from).toHaveBeenCalledTimes(2);
        expect(mockQuery.range).toHaveBeenNthCalledWith(1, 0, 1);
        expect(mockQuery.range).toHaveBeenNthCalledWith(2, 2, 3);
    });

    it('applies filters, order, and since constraints', async () => {
        await fetchAllPaginated(mockClient, {
            table: 'test',
            orderBy: 'name',
            ascending: true,
            sinceColumn: 'updated_at',
            sinceValue: '2023-01-01',
            filters: [
                { column: 'status', op: 'eq', value: 'active' },
                { column: 'type', op: 'neq', value: 'internal' },
            ],
        });

        expect(mockQuery.order).toHaveBeenCalledWith('name', { ascending: true, nullsFirst: false });
        expect(mockQuery.gte).toHaveBeenCalledWith('updated_at', '2023-01-01');
        expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
        expect(mockQuery.neq).toHaveBeenCalledWith('type', 'internal');
    });

    it('adds id as a tiebreaker order so pagination is stable across tied sort values', async () => {
        await fetchAllPaginated(mockClient, { table: 'test', orderBy: 'updated_at' });

        expect(mockQuery.order).toHaveBeenNthCalledWith(1, 'updated_at', { ascending: false, nullsFirst: false });
        expect(mockQuery.order).toHaveBeenNthCalledWith(2, 'id', { ascending: true });
    });

    it('does not add a duplicate order when already ordering by id', async () => {
        await fetchAllPaginated(mockClient, { table: 'test', orderBy: 'id' });

        expect(mockQuery.order).toHaveBeenCalledTimes(1);
        expect(mockQuery.order).toHaveBeenCalledWith('id', { ascending: false, nullsFirst: false });
    });

    it('respects maxPages constraint', async () => {
        const pageRows = [{ id: 1 }];
        mockQuery.then.mockImplementation((resolve) => resolve({ data: pageRows, error: null }));

        const result = await fetchAllPaginated(mockClient, {
            table: 'test',
            pageSize: 1,
            maxPages: 2,
        });

        expect(result.length).toBe(2);
        expect(mockClient.from).toHaveBeenCalledTimes(2);
    });

    it('uses mapper and onPage callback', async () => {
        const data = [{ id: 1 }];
        mockQuery.then.mockImplementation((resolve) => resolve({ data, error: null }));

        const mapper = (row: any) => ({ ...row, mapped: true });
        const onPage = vi.fn();

        const result = await fetchAllPaginated(mockClient, {
            table: 'test',
            pageSize: 1,
            maxPages: 1,
            mapper,
            onPage,
        });

        expect(result[0].mapped).toBe(true);
        expect(onPage).toHaveBeenCalledWith([{ id: 1, mapped: true }], { page: 0, offset: 0 });
    });

    it('throws error if query fails', async () => {
        const error = { message: 'DB Error' };
        mockQuery.then.mockImplementation((resolve) => resolve({ data: null, error }));

        await expect(fetchAllPaginated(mockClient, { table: 'test' })).rejects.toEqual(error);
    });

    it('handles null data returned from query', async () => {
        mockQuery.then.mockImplementation((resolve) => resolve({ data: null, error: null }));
        const result = await fetchAllPaginated(mockClient, { table: 'test' });
        expect(result).toEqual([]);
    });
});
