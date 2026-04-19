import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAppVersion, hasUnseenUpdates, markVersionAsSeen, CHANGELOG, APP_VERSION } from '../appVersion';

describe('App Version Logic Tests', () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it('returns the current app version', () => {
        expect(getAppVersion()).toBe(APP_VERSION);
    });

    describe('hasUnseenUpdates', () => {
        it('returns false when window is undefined (SSR)', () => {
            vi.stubGlobal('window', undefined);
            expect(hasUnseenUpdates()).toBe(false);
        });

        it('returns true when no version is in localStorage', () => {
            vi.spyOn(localStorage, 'getItem').mockReturnValue(null);
            expect(hasUnseenUpdates()).toBe(true);
        });

        it('returns true when a different version is in localStorage', () => {
            vi.spyOn(localStorage, 'getItem').mockReturnValue('0.0.1');
            expect(hasUnseenUpdates()).toBe(true);
        });

        it('returns false when current version is in localStorage', () => {
            vi.spyOn(localStorage, 'getItem').mockReturnValue(APP_VERSION);
            expect(hasUnseenUpdates()).toBe(false);
        });
    });

    describe('markVersionAsSeen', () => {
        it('does nothing when window is undefined', () => {
            vi.stubGlobal('window', undefined);
            const setItemSpy = vi.spyOn(localStorage, 'setItem');
            markVersionAsSeen();
            expect(setItemSpy).not.toHaveBeenCalled();
        });

        it('sets the current version in localStorage', () => {
            const setItemSpy = vi.spyOn(localStorage, 'setItem');
            markVersionAsSeen();
            expect(setItemSpy).toHaveBeenCalledWith('hopes-corner-seen-version', APP_VERSION);
        });
    });

    describe('Changelog Structure', () => {
        it('has at least one entry', () => {
            expect(CHANGELOG.length).toBeGreaterThan(0);
        });

        it('has valid structure for each entry', () => {
            CHANGELOG.forEach(entry => {
                expect(entry.version).toBeDefined();
                expect(entry.date).toBeDefined();
                expect(entry.highlights.length).toBeGreaterThan(0);
                entry.highlights.forEach(h => {
                    expect(['feature', 'fix', 'performance', 'improvement']).toContain(h.type);
                    expect(h.title).toBeDefined();
                    expect(h.description).toBeDefined();
                });
            });
        });

        // Exhaustive checks for changelog consistency
        it.each(CHANGELOG)('verifies changelog entry for version %s', (entry) => {
            expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/);
            expect(entry.highlights.every(h => h.title.length > 0)).toBe(true);
        });
    });
});
