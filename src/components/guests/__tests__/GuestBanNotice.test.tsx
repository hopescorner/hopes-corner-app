import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GuestBanNotice } from '../GuestBanNotice';

describe('GuestBanNotice Component', () => {
    it('renders nothing when guest is not banned', () => {
        const { container } = render(
            <GuestBanNotice guest={{ isBanned: false }} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders all programs as banned for blanket ban', () => {
        const guest = {
            isBanned: true,
            bannedUntil: '2026-12-31',
            banReason: 'Disruptive behavior',
            bannedFromMeals: false,
            bannedFromShower: false,
            bannedFromLaundry: false,
            bannedFromBicycle: false,
        };

        render(<GuestBanNotice guest={guest} />);

        expect(screen.getByText(/Guest is banned/)).toBeDefined();
        expect(screen.getByText('All Programs')).toBeDefined();
        expect(screen.getByText('Reason: Disruptive behavior')).toBeDefined();

        const bannedBadges = screen.getAllByText('Banned');
        expect(bannedBadges).toHaveLength(4);
        expect(screen.queryByText('Allowed')).toBeNull();
    });

    it('renders specific banned and allowed programs for partial ban', () => {
        const guest = {
            isBanned: true,
            bannedUntil: '2026-10-15',
            banReason: 'Shower rule violation',
            bannedFromMeals: false,
            bannedFromShower: true,
            bannedFromLaundry: true,
            bannedFromBicycle: false,
        };

        render(<GuestBanNotice guest={guest} />);

        expect(screen.getByText('2 Restricted')).toBeDefined();
        expect(screen.getByText('Reason: Shower rule violation')).toBeDefined();

        const bannedBadges = screen.getAllByText('Banned');
        expect(bannedBadges).toHaveLength(2);

        const allowedBadges = screen.getAllByText('Allowed');
        expect(allowedBadges).toHaveLength(2);

        expect(screen.getByText('Meals')).toBeDefined();
        expect(screen.getByText('Showers')).toBeDefined();
        expect(screen.getByText('Laundry')).toBeDefined();
        expect(screen.getByText('Bicycles')).toBeDefined();
    });

    it('supports custom title and compact layout', () => {
        const guest = {
            isBanned: true,
            bannedFromMeals: true,
            bannedFromShower: false,
            bannedFromLaundry: false,
            bannedFromBicycle: false,
        };

        render(
            <GuestBanNotice
                guest={guest}
                title="Currently Banned"
                compact={true}
            />
        );

        expect(screen.getByText('Currently Banned')).toBeDefined();
        expect(screen.getByText('1 Restricted')).toBeDefined();
        const bannedBadges = screen.getAllByText('Banned');
        expect(bannedBadges).toHaveLength(1);
        const allowedBadges = screen.getAllByText('Allowed');
        expect(allowedBadges).toHaveLength(3);
    });
});
