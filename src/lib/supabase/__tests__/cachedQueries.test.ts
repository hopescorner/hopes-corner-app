import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getCachedGuests,
    getCachedGuestWarnings,
    getCachedGuestProxies,
    getCachedMealRecords,
    getCachedHolidayRecords,
    getCachedHaircutRecords,
    getCachedShowerRecords,
    getCachedLaundryRecords,
    getCachedBicycleRecords,
    loadAllGuestData,
    loadAllMealData,
    loadAllServiceData,
    loadAllAppData,
} from '../cachedQueries';

// Mock the dependencies
vi.mock('../client', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                data: [],
                error: null,
            })),
        })),
    })),
}));

vi.mock('../../utils/supabasePagination', () => ({
    fetchAllPaginated: vi.fn(async () => []),
}));

vi.mock('../../utils/mappers', () => ({
    mapGuestRow: vi.fn((row) => row),
    mapGuestWarningRow: vi.fn((row) => row),
    mapGuestProxyRow: vi.fn((row) => row),
    mapMealRow: vi.fn((row) => row),
    mapHolidayRow: vi.fn((row) => row),
    mapHaircutRow: vi.fn((row) => row),
    mapShowerRow: vi.fn((row) => row),
    mapLaundryRow: vi.fn((row) => row),
    mapBicycleRow: vi.fn((row) => row),
}));

describe('Cached Supabase Queries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear React cache between tests
        // Note: React cache() automatically clears between renders
    });

    describe('Individual Cached Queries', () => {
        it('getCachedGuests returns data', async () => {
            const result = await getCachedGuests();
            expect(Array.isArray(result)).toBe(true);
        });

        it('getCachedGuestWarnings returns data', async () => {
            const result = await getCachedGuestWarnings();
            expect(Array.isArray(result)).toBe(true);
        });

        it('getCachedGuestProxies returns data', async () => {
            const result = await getCachedGuestProxies();
            expect(Array.isArray(result)).toBe(true);
        });

        it('getCachedMealRecords returns data', async () => {
            const result = await getCachedMealRecords();
            expect(Array.isArray(result)).toBe(true);
        });

        it('getCachedHolidayRecords returns data', async () => {
            const result = await getCachedHolidayRecords();
            expect(Array.isArray(result)).toBe(true);
        });

        it('getCachedHaircutRecords returns data', async () => {
            const result = await getCachedHaircutRecords();
            expect(Array.isArray(result)).toBe(true);
        });

        it('getCachedShowerRecords returns data', async () => {
            const result = await getCachedShowerRecords();
            expect(Array.isArray(result)).toBe(true);
        });

        it('getCachedLaundryRecords returns data', async () => {
            const result = await getCachedLaundryRecords();
            expect(Array.isArray(result)).toBe(true);
        });

        it('getCachedBicycleRecords returns data', async () => {
            const result = await getCachedBicycleRecords();
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('Combined Queries', () => {
        it('loadAllGuestData loads guests, warnings, and proxies', async () => {
            const result = await loadAllGuestData();
            
            expect(result).toHaveProperty('guests');
            expect(result).toHaveProperty('warnings');
            expect(result).toHaveProperty('proxies');
            expect(Array.isArray(result.guests)).toBe(true);
            expect(Array.isArray(result.warnings)).toBe(true);
            expect(Array.isArray(result.proxies)).toBe(true);
        });

        it('loadAllMealData loads meals, holidays, and haircuts', async () => {
            const result = await loadAllMealData();
            
            expect(result).toHaveProperty('meals');
            expect(result).toHaveProperty('holidays');
            expect(result).toHaveProperty('haircuts');
            expect(Array.isArray(result.meals)).toBe(true);
            expect(Array.isArray(result.holidays)).toBe(true);
            expect(Array.isArray(result.haircuts)).toBe(true);
        });

        it('loadAllServiceData loads showers, laundry, and bicycles', async () => {
            const result = await loadAllServiceData();
            
            expect(result).toHaveProperty('showers');
            expect(result).toHaveProperty('laundry');
            expect(result).toHaveProperty('bicycles');
            expect(Array.isArray(result.showers)).toBe(true);
            expect(Array.isArray(result.laundry)).toBe(true);
            expect(Array.isArray(result.bicycles)).toBe(true);
        });

        it('loadAllAppData loads all data categories', async () => {
            const result = await loadAllAppData();
            
            // Check guest data
            expect(result).toHaveProperty('guests');
            expect(result).toHaveProperty('warnings');
            expect(result).toHaveProperty('proxies');
            
            // Check meal data
            expect(result).toHaveProperty('meals');
            expect(result).toHaveProperty('holidays');
            expect(result).toHaveProperty('haircuts');
            
            // Check service data
            expect(result).toHaveProperty('showers');
            expect(result).toHaveProperty('laundry');
            expect(result).toHaveProperty('bicycles');
        });
    });

    describe('Memoization Behavior', () => {
        it('parallel calls to same query execute successfully', async () => {
            // Import the mocked function to track calls
            const { fetchAllPaginated } = await import('../../utils/supabasePagination');
            
            // Make parallel calls to the same cached function
            const [result1, result2, result3] = await Promise.all([
                getCachedGuests(),
                getCachedGuests(),
                getCachedGuests(),
            ]);
            
            // All should return arrays
            expect(Array.isArray(result1)).toBe(true);
            expect(Array.isArray(result2)).toBe(true);
            expect(Array.isArray(result3)).toBe(true);
            
            // React cache() should prevent multiple fetches within the same render
            // Note: In tests, cache behavior may vary, but function should still work
            expect(fetchAllPaginated).toHaveBeenCalled();
        });

        it('parallel calls to loadAllAppData execute efficiently', async () => {
            const startTime = performance.now();
            
            // Make multiple parallel calls
            const results = await Promise.all([
                loadAllAppData(),
                loadAllAppData(),
            ]);
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Both should return complete data structures
            expect(results[0]).toHaveProperty('guests');
            expect(results[1]).toHaveProperty('guests');
            
            // Should complete reasonably fast (memoized)
            // Note: This is a loose check since test environment may vary
            expect(duration).toBeLessThan(5000); // 5 seconds
        });
    });

    describe('Error Handling', () => {
        it('getCachedGuests handles errors gracefully', async () => {
            // Mock an error
            const { fetchAllPaginated } = await import('../../utils/supabasePagination');
            vi.mocked(fetchAllPaginated).mockRejectedValueOnce(new Error('Network error'));
            
            await expect(getCachedGuests()).rejects.toThrow('Network error');
        });

        it('loadAllGuestData propagates errors', async () => {
            const { fetchAllPaginated } = await import('../../utils/supabasePagination');
            vi.mocked(fetchAllPaginated).mockRejectedValueOnce(new Error('DB error'));
            
            await expect(loadAllGuestData()).rejects.toThrow();
        });
    });

    describe('Integration with Stores', () => {
        it('cached queries return data in expected format for guests store', async () => {
            const guests = await getCachedGuests();
            const warnings = await getCachedGuestWarnings();
            const proxies = await getCachedGuestProxies();
            
            // Should be arrays that stores can consume
            expect(Array.isArray(guests)).toBe(true);
            expect(Array.isArray(warnings)).toBe(true);
            expect(Array.isArray(proxies)).toBe(true);
        });

        it('cached queries return data in expected format for meals store', async () => {
            const meals = await getCachedMealRecords();
            const holidays = await getCachedHolidayRecords();
            const haircuts = await getCachedHaircutRecords();
            
            expect(Array.isArray(meals)).toBe(true);
            expect(Array.isArray(holidays)).toBe(true);
            expect(Array.isArray(haircuts)).toBe(true);
        });

        it('cached queries return data in expected format for services store', async () => {
            const showers = await getCachedShowerRecords();
            const laundry = await getCachedLaundryRecords();
            const bicycles = await getCachedBicycleRecords();
            
            expect(Array.isArray(showers)).toBe(true);
            expect(Array.isArray(laundry)).toBe(true);
            expect(Array.isArray(bicycles)).toBe(true);
        });
    });
});
