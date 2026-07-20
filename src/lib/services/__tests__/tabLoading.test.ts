import { describe, expect, it } from 'vitest';
import { serviceTabDataKeys } from '@/lib/services/tabLoading';

describe('serviceTabDataKeys', () => {
    it('loads only donation data for the donations tab', () => {
        expect(serviceTabDataKeys('donations')).toEqual(['donations']);
    });

    it('loads meals and the guest directory for the meals tab', () => {
        expect(serviceTabDataKeys('meals')).toEqual(['meals', 'guests']);
    });

    it('loads operational data needed for a booking tab', () => {
        expect(serviceTabDataKeys('showers')).toEqual(['services', 'guests', 'reminders']);
    });

    it('loads the datasets required to calculate overview metrics', () => {
        expect(serviceTabDataKeys('overview')).toEqual(['services', 'guests', 'meals']);
    });
});
