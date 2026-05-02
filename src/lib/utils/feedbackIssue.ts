export type FeedbackIssueCategory = 'issue' | 'feature';

export interface FeedbackEnvironment {
    os: string;
    browser: string;
    userAgent: string;
    viewport: string;
}

export interface FeedbackIssuePayload {
    category: FeedbackIssueCategory;
    summary: string;
    details: string;
    environment: FeedbackEnvironment;
    path?: string;
    appVersion?: string;
}

export interface FeedbackIssueUser {
    email?: string | null;
    role?: string | null;
    name?: string | null;
}

export interface GitHubFeedbackConfig {
    token: string;
    owner: string;
    repo: string;
    assignee: string;
}

export interface GitHubIssueResult {
    issueNumber: number;
    issueUrl: string;
    warnings?: string[];
}

export type FeedbackIssueValidationResult =
    | { ok: true; value: FeedbackIssuePayload }
    | { ok: false; error: string };

const DEFAULT_OWNER = 'hopescorner';
const DEFAULT_REPO = 'hopes-corner-app';
const DEFAULT_COPILOT_ASSIGNEE = 'copilot';
const MAX_SUMMARY_LENGTH = 140;
const MAX_DETAILS_LENGTH = 4000;
const MIN_DETAILS_LENGTH = 20;

const cleanSingleLine = (value: unknown, fallback = '') => {
    return String(value ?? fallback).replace(/\s+/g, ' ').trim();
};

const cleanBlock = (value: unknown) => {
    return String(value ?? '').replace(/\r\n/g, '\n').trim();
};

const truncate = (value: string, maxLength: number) => {
    if (value.length <= maxLength) return value;
    return value.slice(0, maxLength - 3).trimEnd() + '...';
};

const isFeedbackCategory = (value: unknown): value is FeedbackIssueCategory => {
    return value === 'issue' || value === 'feature';
};

const normalizeEnvironment = (value: unknown): FeedbackEnvironment => {
    const raw = typeof value === 'object' && value !== null ? value as Partial<FeedbackEnvironment> : {};
    return {
        os: cleanSingleLine(raw.os, 'Unknown') || 'Unknown',
        browser: cleanSingleLine(raw.browser, 'Unknown') || 'Unknown',
        userAgent: truncate(cleanSingleLine(raw.userAgent), 600),
        viewport: cleanSingleLine(raw.viewport, 'unknown') || 'unknown',
    };
};

export function validateFeedbackIssuePayload(input: unknown): FeedbackIssueValidationResult {
    const raw = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
    const category = raw.category;
    const summary = truncate(cleanSingleLine(raw.summary), MAX_SUMMARY_LENGTH);
    const details = truncate(cleanBlock(raw.details), MAX_DETAILS_LENGTH);

    if (!isFeedbackCategory(category)) {
        return { ok: false, error: 'Choose whether this is an issue or a feature request.' };
    }

    if (!summary) {
        return { ok: false, error: 'Please add a short summary.' };
    }

    if (details.length < MIN_DETAILS_LENGTH) {
        return { ok: false, error: 'Please describe the issue or requested change in at least 20 characters.' };
    }

    const path = cleanSingleLine(raw.path);
    const appVersion = cleanSingleLine(raw.appVersion);

    return {
        ok: true,
        value: {
            category,
            summary,
            details,
            environment: normalizeEnvironment(raw.environment),
            ...(path ? { path } : {}),
            ...(appVersion ? { appVersion } : {}),
        },
    };
}

export function buildFeedbackIssueTitle(payload: FeedbackIssuePayload) {
    const category = payload.category === 'feature' ? 'Feature' : 'Issue';
    return `[App Feedback] ${category}: ${payload.summary}`;
}

export function buildFeedbackIssueBody(payload: FeedbackIssuePayload, user: FeedbackIssueUser) {
    const userName = user.name || 'Unknown';
    const userEmail = user.email || 'Unknown';
    const role = user.role || 'Unknown';

    return [
        '## Request',
        '',
        payload.details,
        '',
        '## Submitted By',
        '',
        `- Name: ${userName}`,
        `- Email: ${userEmail}`,
        `- Role: ${role}`,
        '',
        '## App Context',
        '',
        `- Page: ${payload.path || 'Unknown'}`,
        `- App version: ${payload.appVersion || 'Unknown'}`,
        `- OS: ${payload.environment.os}`,
        `- Browser: ${payload.environment.browser}`,
        `- Viewport: ${payload.environment.viewport}`,
        '',
        '<details>',
        '<summary>User agent</summary>',
        '',
        '```text',
        payload.environment.userAgent || 'Unknown',
        '```',
        '',
        '</details>',
    ].join('\n');
}

export function resolveGitHubFeedbackConfig(env: NodeJS.ProcessEnv = process.env): GitHubFeedbackConfig | null {
    const token = env.GITHUB_FEEDBACK_TOKEN || env.GITHUB_ISSUE_TOKEN || env.GITHUB_TOKEN || '';
    if (!token) return null;

    return {
        token,
        owner: env.GITHUB_FEEDBACK_OWNER || DEFAULT_OWNER,
        repo: env.GITHUB_FEEDBACK_REPO || DEFAULT_REPO,
        assignee: env.GITHUB_FEEDBACK_ASSIGNEE || DEFAULT_COPILOT_ASSIGNEE,
    };
}

class GitHubIssueRequestError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = 'GitHubIssueRequestError';
    }
}

const gitHubIssueUrl = (config: GitHubFeedbackConfig, issueNumber?: number) => {
    const base = `https://api.github.com/repos/${config.owner}/${config.repo}/issues`;
    return issueNumber ? `${base}/${issueNumber}` : base;
};

const parseGitHubResponse = async (response: Response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = typeof data?.message === 'string' ? data.message : 'GitHub issue request failed.';
        throw new GitHubIssueRequestError(message, response.status);
    }
    return data;
};

const gitHubIssueFetch = async (
    url: string,
    config: GitHubFeedbackConfig,
    init: Omit<RequestInit, 'headers'>,
) => {
    const response = await fetch(url, {
        ...init,
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });

    return parseGitHubResponse(response);
};

const applyGitHubIssueMetadata = async (
    issueNumber: number,
    payload: FeedbackIssuePayload,
    config: GitHubFeedbackConfig,
) => {
    const warnings: string[] = [];
    const issueUrl = gitHubIssueUrl(config, issueNumber);

    if (config.assignee) {
        try {
            await gitHubIssueFetch(issueUrl, config, {
                method: 'PATCH',
                body: JSON.stringify({ assignees: [config.assignee] }),
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'unknown error';
            warnings.push(`Could not assign ${config.assignee}: ${message}`);
        }
    }

    try {
        await gitHubIssueFetch(issueUrl, config, {
            method: 'PATCH',
            body: JSON.stringify({ labels: ['app-feedback', payload.category] }),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        warnings.push(`Could not apply feedback labels: ${message}`);
    }

    return warnings;
};

export async function createGitHubFeedbackIssue(
    payload: FeedbackIssuePayload,
    user: FeedbackIssueUser,
    config: GitHubFeedbackConfig,
): Promise<GitHubIssueResult> {
    const data = await gitHubIssueFetch(gitHubIssueUrl(config), config, {
        method: 'POST',
        body: JSON.stringify({
            title: buildFeedbackIssueTitle(payload),
            body: buildFeedbackIssueBody(payload, user),
        }),
    });

    const issueNumber = Number(data.number);
    const warnings = await applyGitHubIssueMetadata(issueNumber, payload, config);

    return {
        issueNumber,
        issueUrl: String(data.html_url),
        ...(warnings.length ? { warnings } : {}),
    };
}
