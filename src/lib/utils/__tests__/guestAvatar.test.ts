import { describe, it, expect } from 'vitest';
import { getGuestInitials, getGuestAvatarColor } from '../guestAvatar';

describe('guestAvatar', () => {
    describe('getGuestInitials', () => {
        it('returns initials from firstName and lastName', () => {
            expect(getGuestInitials({ firstName: 'John', lastName: 'Doe' })).toBe('JD');
        });

        it('returns initials from preferredName and lastName', () => {
            expect(getGuestInitials({ preferredName: 'Johnny Cash', firstName: 'John', lastName: 'Doe' })).toBe('JD');
        });

        it('returns initial from single name without lastName', () => {
            expect(getGuestInitials({ firstName: 'Madonna' })).toBe('MA');
        });

        it('returns initials from multi-word single preferredName without lastName', () => {
            expect(getGuestInitials({ preferredName: 'Billy Jean' })).toBe('BJ');
        });

        it('handles full name string in name field', () => {
            expect(getGuestInitials({ name: 'Alice Walker' })).toBe('AW');
        });

        it('returns G when guest has no names', () => {
            expect(getGuestInitials({})).toBe('G');
        });
    });

    describe('getGuestAvatarColor', () => {
        it('deterministically returns color palette for given string seed', () => {
            const color1 = getGuestAvatarColor('guest-123');
            const color2 = getGuestAvatarColor('guest-123');
            expect(color1).toEqual(color2);
            expect(color1.bg).toBeDefined();
            expect(color1.text).toBeDefined();
            expect(color1.border).toBeDefined();
        });

        it('handles null/undefined seeds gracefully', () => {
            const color = getGuestAvatarColor(undefined);
            expect(color.bg).toBeDefined();
        });

        it('distributes colors across different seeds', () => {
            const colorA = getGuestAvatarColor('guest-abc');
            const colorB = getGuestAvatarColor('guest-xyz');
            expect(colorA).toBeDefined();
            expect(colorB).toBeDefined();
        });
    });
});
