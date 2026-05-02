import { describe, expect, it } from 'vitest';
import {
    buildFeedbackIssueBody,
    buildFeedbackIssueTitle,
    validateFeedbackIssuePayload,
} from '../feedbackIssue';

describe('feedback issue utilities', () => {
    it('validates the minimum fields needed to create an issue', () => {
        const result = validateFeedbackIssuePayload({
            category: 'issue',
            summary: 'Laundry status does not update',
            details: 'When I mark a laundry bag as returned, the status still shows as transported.',
            environment: {
                os: 'macOS',
                browser: 'Chrome 124',
                userAgent: 'Mozilla/5.0 Chrome/124.0.0.0 Safari/537.36',
                viewport: '1440x900',
            },
            path: '/services',
            appVersion: '0.5.26',
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.summary).toBe('Laundry status does not update');
            expect(result.value.environment.browser).toBe('Chrome 124');
        }
    });

    it('rejects short descriptions so empty GitHub issues are not created', () => {
        const result = validateFeedbackIssuePayload({
            category: 'feature',
            summary: 'Add report',
            details: 'Too short',
            environment: {
                os: 'Unknown',
                browser: 'Unknown',
                userAgent: '',
                viewport: 'unknown',
            },
        });

        expect(result).toEqual({ ok: false, error: 'Please describe the issue or requested change in at least 20 characters.' });
    });

    it('builds a concise title and body with user and browser context', () => {
        const payload = validateFeedbackIssuePayload({
            category: 'feature',
            summary: 'Compare two custom date ranges',
            details: 'The dashboard should show which services are increasing between two custom periods.',
            environment: {
                os: 'iPadOS',
                browser: 'Safari 17',
                userAgent: 'Mozilla/5.0 Version/17.0 Mobile Safari/604.1',
                viewport: '1024x768',
            },
            path: '/dashboard',
            appVersion: '0.5.26',
        });

        expect(payload.ok).toBe(true);
        if (!payload.ok) return;

        expect(buildFeedbackIssueTitle(payload.value)).toBe('[App Feedback] Feature: Compare two custom date ranges');

        const body = buildFeedbackIssueBody(payload.value, {
            email: 'staff@example.org',
            role: 'staff',
            name: 'Staff User',
        });

        expect(body).toContain('The dashboard should show which services are increasing between two custom periods.');
        expect(body).toContain('staff@example.org');
        expect(body).toContain('staff');
        expect(body).toContain('iPadOS');
        expect(body).toContain('Safari 17');
        expect(body).toContain('/dashboard');
    });
});
