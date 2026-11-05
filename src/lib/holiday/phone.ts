/**
 * Normalize a US phone number entered with or without a +1 country code.
 * Returns at most the 10 national digits.
 */
export function normalizeHolidayPhoneDigits(value: string): string {
    const digits = (value || '').replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
        return digits.slice(1);
    }
    return digits.slice(0, 10);
}

/**
 * Format a US phone number as (650) 555-0123 while typing or pasting.
 */
export function formatHolidayPhone(value: string): string {
    const digits = normalizeHolidayPhoneDigits(value);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
