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

        expect(fetch).toHaveBeenNthCalledWith(
            1,
            'https://api.github.com/repos/karangattu/hopes-corner-app/issues',
            expect.objectContaining({ method: 'POST' }),
        );
        const [, init] = vi.mocked(fetch).mock.calls[0];
        const githubBody = JSON.parse(String(init?.body));
        expect(githubBody.assignees).toBeUndefined();
        expect(githubBody.labels).toBeUndefined();
        expect(githubBody.body).toContain('Chrome 124');
        expect(githubBody.body).toContain('staff@example.org');

        const [, assigneeInit] = vi.mocked(fetch).mock.calls[1];
        expect(vi.mocked(fetch).mock.calls[1][0]).toBe('https://api.github.com/repos/karangattu/hopes-corner-app/issues/42');
        expect(JSON.parse(String(assigneeInit?.body)).assignees).toEqual(['copilot']);

        const [, labelInit] = vi.mocked(fetch).mock.calls[2];
        expect(vi.mocked(fetch).mock.calls[2][0]).toBe('https://api.github.com/repos/karangattu/hopes-corner-app/issues/42');
        expect(JSON.parse(String(labelInit?.body)).labels).toEqual(['app-feedback', 'issue']);
    });

    it('still creates the issue when GitHub rejects optional assignment or labels', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                number: 43,
                html_url: 'https://github.com/karangattu/hopes-corner-app/issues/43',
            }), { status: 201, headers: { 'content-type': 'application/json' } }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Validation Failed: assignee invalid' }), { status: 422, headers: { 'content-type': 'application/json' } }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Validation Failed: label does not exist' }), { status: 422, headers: { 'content-type': 'application/json' } }))
        );

        const { POST } = await import('../route');
        const response = await POST(new Request('https://example.org/api/feedback/github-issue', {
            method: 'POST',
            body: JSON.stringify({
                category: 'feature',
                summary: 'Add weather to reports',
                details: 'Automatically record Mountain View weather so we can compare attendance patterns.',
                environment: {
                    os: 'macOS',
                    browser: 'Firefox 150',
                    userAgent: 'Mozilla/5.0 Firefox/150.0',
                    viewport: '1680x777',
                },
                path: '/check-in',
                appVersion: '0.5.29',
            }),
        }));

        const body = await response.json();
        expect(response.status).toBe(201);
        expect(body.issueNumber).toBe(43);
        expect(body.issueUrl).toBe('https://github.com/karangattu/hopes-corner-app/issues/43');
        expect(body.warnings).toEqual([
            'Could not assign copilot: Validation Failed: assignee invalid',
            'Could not apply feedback labels: Validation Failed: label does not exist',
        ]);
        expect(fetch).toHaveBeenCalledTimes(3);
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
