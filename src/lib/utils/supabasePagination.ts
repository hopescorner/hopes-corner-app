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
    cursorColumn?: string;
}

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
        cursorColumn,
    }: PaginationOptions
) => {
    if (!client) return [];
    if (!table) throw new Error("Table name is required for paginated fetch");

    const results: any[] = [];
    let offset = 0;
    let page = 0;
    let hasMore = true;
    let lastCursorValue: any = null;

    while (hasMore) {
        let query = client.from(table).select(select);

        if (orderBy) {
            query = query.order(orderBy, { ascending, nullsFirst: false });
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

        if (cursorColumn && lastCursorValue !== null && lastCursorValue !== undefined) {
            query = ascending ? query.gt(cursorColumn, lastCursorValue) : query.lt(cursorColumn, lastCursorValue);
            query = query.limit(pageSize);
        } else if (cursorColumn) {
            query = query.limit(pageSize);
        } else {
            query = query.range(offset, offset + pageSize - 1);
        }

        const { data, error } = await query;
        if (error) throw error;

        const pageRows = Array.isArray(data) ? data : [];
        const mappedRows = mapper ? pageRows.map(mapper) : pageRows;

        for (let i = 0; i < mappedRows.length; i++) {
            results.push(mappedRows[i]);
        }
        if (onPage) onPage(mappedRows, { page, offset });

        if (cursorColumn && pageRows.length > 0) {
            const lastRow = pageRows[pageRows.length - 1];
            lastCursorValue = lastRow ? (lastRow as Record<string, any>)[cursorColumn] : null;
        }

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
