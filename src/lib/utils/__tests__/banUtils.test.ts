import { describe, it, expect } from 'vitest';
import { getGuestBanDetails } from '../banUtils';

describe('banUtils', () => {
    it('returns default unbanned state when guest is null/undefined or not banned', () => {
        expect(getGuestBanDetails(null)).toEqual({
            isBanned: false,
            isAllProgramsBanned: false,
            hasSpecificBans: false,
            bannedPrograms: [],
            allowedPrograms: [
                { key: 'meals', label: 'Meals', isBanned: false },
                { key: 'shower', label: 'Showers', isBanned: false },
                { key: 'laundry', label: 'Laundry', isBanned: false },
                { key: 'bicycle', label: 'Bicycles', isBanned: false },
            ],
            programs: [
                { key: 'meals', label: 'Meals', isBanned: false },
                { key: 'shower', label: 'Showers', isBanned: false },
                { key: 'laundry', label: 'Laundry', isBanned: false },
                { key: 'bicycle', label: 'Bicycles', isBanned: false },
            ],
            bannedSummary: '',
        });

        const unbannedGuest = { isBanned: false };
        const details = getGuestBanDetails(unbannedGuest);
        expect(details.isBanned).toBe(false);
        expect(details.bannedPrograms).toHaveLength(0);
        expect(details.allowedPrograms).toHaveLength(4);
    });

    it('handles blanket legacy ban where isBanned is true but all program flags are false', () => {
        const bannedGuest = {
            isBanned: true,
            bannedUntil: '2026-12-31',
            banReason: 'Disruptive behavior',
            bannedFromMeals: false,
            bannedFromShower: false,
            bannedFromLaundry: false,
            bannedFromBicycle: false,
        };
        const details = getGuestBanDetails(bannedGuest);
        expect(details.isBanned).toBe(true);
        expect(details.isAllProgramsBanned).toBe(true);
        expect(details.hasSpecificBans).toBe(false);
        expect(details.bannedSummary).toBe('All Programs');
        expect(details.bannedPrograms).toHaveLength(4);
        expect(details.allowedPrograms).toHaveLength(0);
        expect(details.programs.every((p) => p.isBanned)).toBe(true);
    });

    it('handles blanket ban where all program flags are explicitly true', () => {
        const bannedGuest = {
            isBanned: true,
            bannedFromMeals: true,
            bannedFromShower: true,
            bannedFromLaundry: true,
            bannedFromBicycle: true,
        };
        const details = getGuestBanDetails(bannedGuest);
        expect(details.isBanned).toBe(true);
        expect(details.isAllProgramsBanned).toBe(true);
        expect(details.bannedSummary).toBe('All Programs');
        expect(details.bannedPrograms.map((p) => p.key)).toEqual(['meals', 'shower', 'laundry', 'bicycle']);
        expect(details.allowedPrograms).toHaveLength(0);
    });

    it('handles specific program bans (shower and laundry only)', () => {
        const bannedGuest = {
            isBanned: true,
            bannedFromMeals: false,
            bannedFromShower: true,
            bannedFromLaundry: true,
            bannedFromBicycle: false,
        };
        const details = getGuestBanDetails(bannedGuest);
        expect(details.isBanned).toBe(true);
        expect(details.isAllProgramsBanned).toBe(false);
        expect(details.hasSpecificBans).toBe(true);
        expect(details.bannedSummary).toBe('Showers, Laundry');
        expect(details.bannedPrograms.map((p) => p.key)).toEqual(['shower', 'laundry']);
        expect(details.allowedPrograms.map((p) => p.key)).toEqual(['meals', 'bicycle']);
    });

    it('handles specific program ban (meals only)', () => {
        const bannedGuest = {
            isBanned: true,
            bannedFromMeals: true,
            bannedFromShower: false,
            bannedFromLaundry: false,
            bannedFromBicycle: false,
        };
        const details = getGuestBanDetails(bannedGuest);
        expect(details.isBanned).toBe(true);
        expect(details.isAllProgramsBanned).toBe(false);
        expect(details.bannedSummary).toBe('Meals');
        expect(details.bannedPrograms.map((p) => p.key)).toEqual(['meals']);
        expect(details.allowedPrograms.map((p) => p.key)).toEqual(['shower', 'laundry', 'bicycle']);
    });

    it('handles specific program ban (bicycle only)', () => {
        const bannedGuest = {
            isBanned: true,
            bannedFromMeals: false,
            bannedFromShower: false,
            bannedFromLaundry: false,
            bannedFromBicycle: true,
        };
        const details = getGuestBanDetails(bannedGuest);
        expect(details.isBanned).toBe(true);
        expect(details.isAllProgramsBanned).toBe(false);
        expect(details.bannedSummary).toBe('Bicycles');
        expect(details.bannedPrograms.map((p) => p.key)).toEqual(['bicycle']);
        expect(details.allowedPrograms.map((p) => p.key)).toEqual(['meals', 'shower', 'laundry']);
    });
});
