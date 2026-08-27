import { SupabaseClient } from '@supabase/supabase-js';

interface PaginationOptions {
    table: string;
    select?: string;
    pageSize?: number;
    orderBy?: string;
    ascending?: boolean;
    filters?: any[];
    sinceColumn?: string;
    sinceValue?: string;
    mapper?: (row: any) => any;
    onPage?: (rows: any[], meta: { page: number; offset: number }) => void;
    maxPages?: number;
}

/**
 * Paginated Supabase fetch helper for large tables.
 * Uses offset-based pagination with a configurable page size and optional filters.
 * Accepts an optional mapper to transform rows and an onPage callback to stream results.
 */
export const fetchAllPaginated = async (
    client: SupabaseClient,
    {
        table,
        select = "*",
        pageSize = 1000,
        orderBy = "created_at",
        ascending = false,
        filters = [],
        sinceColumn,
        sinceValue,
        mapper,
        onPage,
        maxPages,
    }: PaginationOptions
) => {
    if (!client) return [];
    if (!table) throw new Error("Table name is required for paginated fetch");

    const results: any[] = [];
    let offset = 0;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
        let query = client.from(table).select(select);

        if (orderBy) {
            query = query.order(orderBy, { ascending, nullsFirst: false });
            // Tiebreaker: offset pagination over a non-unique sort key can skip or
            // duplicate rows when many rows share the same value (e.g. bulk-migrated
            // updated_at timestamps), because Postgres does not guarantee a stable
            // order among ties across separate page queries.
            if (orderBy !== "id") {
                query = query.order("id", { ascending: true });
            }
        }

        if (sinceColumn && sinceValue) {
            query = query.gte(sinceColumn, sinceValue);
        }

        if (Array.isArray(filters)) {
            filters.forEach((filter) => {
                if (!filter || !filter.column || !filter.op) return;
                const op = filter.op;
                const value = filter.value;

                // @ts-ignore - Dynamic filter operator access
                if (typeof query[op] === "function") {
                    // @ts-ignore - Dynamic filter method call
                    query = query[op](filter.column, value);
                }
            });
        }

        query = query.range(offset, offset + pageSize - 1);

        // Supabase query builders are thenable; await works directly.
        const { data, error } = await query;
        if (error) throw error;

        const pageRows = Array.isArray(data) ? data : [];
        const mappedRows = mapper ? pageRows.map(mapper) : pageRows;

        results.push(...mappedRows);
        if (onPage) onPage(mappedRows, { page, offset });

        offset += pageSize;
        page += 1;

        if (pageRows.length < pageSize) {
            hasMore = false;
        }

        if (maxPages && page >= maxPages) {
            hasMore = false;
        }
    }

    return results;
};

export default fetchAllPaginated;
