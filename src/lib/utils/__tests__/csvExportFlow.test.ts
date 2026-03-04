import { describe, it, expect, vi } from 'vitest';

describe('CSV Export Flow Logic Tests', () => {
    describe('Header Generation', () => {
        const getHeaders = (type: string) => {
            switch (type) {
                case 'guest': return ['ID', 'Housing Status', 'Location', 'Age Group', 'Gender', 'Registration Date'];
                case 'meal': return ['Date', 'Type', 'Count', 'Guest ID', 'Proxy ID'];
                case 'shower': return ['Date', 'Time', 'Guest ID', 'Status'];
                case 'laundry': return ['Date', 'Loads', 'Guest ID', 'Status', 'Offsite'];
                default: return [];
            }
        };

        it('generates correct headers for guest export without name fields', () => {
            const headers = getHeaders('guest');
            expect(headers).toContain('Housing Status');
            expect(headers).not.toContain('First Name');
            expect(headers).not.toContain('Last Name');
            expect(headers).not.toContain('Preferred Name');
            expect(headers).not.toContain('Full Name');
        });

        it('generates correct headers for meal export', () => {
            expect(getHeaders('meal')).toContain('Proxy ID');
        });

        it('generates correct headers for laundry export', () => {
            expect(getHeaders('laundry')).toContain('Offsite');
        });
    });

    describe('Data Row Formatting (Anonymized)', () => {
        const formatRow = (data: any, type: string) => {
            if (type === 'guest') {
                // Names are omitted; only non-PII fields are exported
                return [data.id, data.housingStatus, data.location, data.age, data.gender, data.registrationDate || ''].join(',');
            }
            return '';
        };

        it('formats guest row without personal name fields', () => {
            const guest = { id: 'g1', firstName: 'John', lastName: 'Doe', preferredName: 'Johnny', housingStatus: 'unhoused', location: 'Mountain View', age: 'Adult', gender: 'Male', registrationDate: '1/1/2025' };
            const row = formatRow(guest, 'guest');
            expect(row).toBe('g1,unhoused,Mountain View,Adult,Male,1/1/2025');
            expect(row).not.toContain('John');
            expect(row).not.toContain('Doe');
            expect(row).not.toContain('Johnny');
        });

        it('omits name fields regardless of whether preferred name is set', () => {
            const guest = { id: 'g1', firstName: 'John', lastName: 'Doe', preferredName: null, housingStatus: 'unhoused', location: 'Sunnyvale', age: 'Adult', gender: 'Female', registrationDate: '' };
            const row = formatRow(guest, 'guest');
            expect(row).toBe('g1,unhoused,Sunnyvale,Adult,Female,');
            expect(row).not.toContain('John');
            expect(row).not.toContain('Doe');
        });
    });

    describe('Filename Generation', () => {
        const getFilename = (type: string, date: string) => `${type}_export_${date}.csv`;

        it('generates correct guest filename', () => {
            expect(getFilename('guests', '2025-01-06')).toBe('guests_export_2025-01-06.csv');
        });

        it('generates correct donation filename', () => {
            expect(getFilename('donations', '2025-01-01')).toBe('donations_export_2025-01-01.csv');
        });
    });

    describe('JSON to CSV conversion logic', () => {
        it('handles objects with missing keys', () => {
            const data = [{ a: 1, b: 2 }, { a: 3 }];
            const keys = ['a', 'b'];
            const rows = data.map(d => keys.map(k => (d as any)[k] ?? '').join(','));
            expect(rows[1]).toBe('3,');
        });
    });
});
