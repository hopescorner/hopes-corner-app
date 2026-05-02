import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import {
    createGitHubFeedbackIssue,
    resolveGitHubFeedbackConfig,
    validateFeedbackIssuePayload,
} from '@/lib/utils/feedbackIssue';
import type { UserRole } from '@/lib/auth/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
    const session = await auth();
    const role = (session?.user?.role || 'checkin') as UserRole;

    if (!session?.user) {
        return NextResponse.json({ error: 'Sign in before filing an issue.' }, { status: 401 });
    }

    if (role === 'checkin') {
        return NextResponse.json({ error: 'Check-in users cannot file GitHub issues from the app.' }, { status: 403 });
    }

    let rawPayload: unknown;
    try {
        rawPayload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const validation = validateFeedbackIssuePayload(rawPayload);
    if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const config = resolveGitHubFeedbackConfig();
    if (!config) {
        return NextResponse.json({ error: 'GitHub feedback token is not configured.' }, { status: 503 });
    }

    try {
        const issue = await createGitHubFeedbackIssue(validation.value, {
            email: session.user.email,
            name: session.user.name,
            role,
        }, config);

        return NextResponse.json(issue, { status: 201 });
    } catch (error) {
        console.error('[FeedbackIssue] Failed to create GitHub issue:', error);
        return NextResponse.json({ error: 'Unable to create the GitHub issue right now.' }, { status: 502 });
    }
}
