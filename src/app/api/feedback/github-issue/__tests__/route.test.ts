import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.fn();

vi.mock('@/lib/auth/config', () => ({
    auth: authMock,
}));

describe('POST /api/feedback/github-issue', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = {
            ...originalEnv,
            GITHUB_FEEDBACK_TOKEN: 'ghp_test',
            GITHUB_FEEDBACK_OWNER: 'karangattu',
            GITHUB_FEEDBACK_REPO: 'hopes-corner-app',
        };
        authMock.mockResolvedValue({
            user: {
                email: 'staff@example.org',
                name: 'Staff User',
                role: 'staff',
            },
        });
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
            number: 42,
            html_url: 'https://github.com/karangattu/hopes-corner-app/issues/42',
        }), { status: 201, headers: { 'content-type': 'application/json' } })));
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('creates a GitHub issue assigned to Copilot for non-checkin users', async () => {
        const { POST } = await import('../route');
        const response = await POST(new Request('https://example.org/api/feedback/github-issue', {
            method: 'POST',
            body: JSON.stringify({
                category: 'issue',
                summary: 'Laundry workflow is stuck',
                details: 'The laundry record stays transported after we mark it returned from offsite.',
                environment: {
                    os: 'macOS',
                    browser: 'Chrome 124',
                    userAgent: 'Mozilla/5.0 Chrome/124.0.0.0 Safari/537.36',
                    viewport: '1440x900',
                },
                path: '/services',
                appVersion: '0.5.26',
            }),
        }));

        const body = await response.json();
        expect(response.status).toBe(201);
        expect(body).toEqual({
            issueNumber: 42,
            issueUrl: 'https://github.com/karangattu/hopes-corner-app/issues/42',
        });

        expect(fetch).toHaveBeenCalledWith(
            'https://api.github.com/repos/karangattu/hopes-corner-app/issues',
            expect.objectContaining({ method: 'POST' }),
        );
        const [, init] = vi.mocked(fetch).mock.calls[0];
        const githubBody = JSON.parse(String(init?.body));
        expect(githubBody.assignees).toEqual(['copilot']);
        expect(githubBody.labels).toEqual(['app-feedback', 'issue']);
        expect(githubBody.body).toContain('Chrome 124');
        expect(githubBody.body).toContain('staff@example.org');
    });

    it('rejects checkin users before calling GitHub', async () => {
        authMock.mockResolvedValue({ user: { email: 'checkin@example.org', role: 'checkin' } });

        const { POST } = await import('../route');
        const response = await POST(new Request('https://example.org/api/feedback/github-issue', {
            method: 'POST',
            body: JSON.stringify({
                category: 'issue',
                summary: 'Cannot submit',
                details: 'This should not be submitted by the checkin role.',
                environment: { os: 'Unknown', browser: 'Unknown', userAgent: '', viewport: 'unknown' },
            }),
        }));

        expect(response.status).toBe(403);
        expect(fetch).not.toHaveBeenCalled();
    });
});
