import { describe, expect, it } from 'vitest';
import { serviceTabDataKeys } from '@/lib/services/tabLoading';

describe('serviceTabDataKeys', () => {
    it('loads only donation data for the donations tab', () => {
        expect(serviceTabDataKeys('donations')).toEqual(['donations']);
    });

    it('loads meals, the guest directory, and notes for the meals tab', () => {
        expect(serviceTabDataKeys('meals')).toEqual(['meals', 'guests', 'dailyNotes']);
    });

    it('loads operational data and notes needed for a booking tab', () => {
        expect(serviceTabDataKeys('showers')).toEqual(['services', 'guests', 'reminders', 'dailyNotes']);
    });

    it('loads only holiday data for the holiday tab', () => {
        expect(serviceTabDataKeys('holiday')).toEqual(['holiday']);
    });

    it('loads the datasets required to calculate overview metrics', () => {
        expect(serviceTabDataKeys('overview')).toEqual(['services', 'guests', 'meals']);
    });
});
