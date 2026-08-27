interface MealCommandResult {
    guestId: string;
    mealCount: number;
    extraMealCount: number;
    totalMeals: number;
    recordId?: string;
}

export async function executeOptimisticMeal({
    guestId,
    quantity,
    extra,
    optimisticMeal,
    replaceMealCounts,
    acknowledgeMealRecord,
    request,
    idempotencyKey,
}: {
    guestId: string;
    quantity: number;
    extra: boolean;
    optimisticMeal: (guestId: string, quantity: number, extra: boolean) => () => void;
    replaceMealCounts: (guestId: string, mealCount: number, extraMealCount: number) => void;
    acknowledgeMealRecord: (recordId: string) => void;
    request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    idempotencyKey: string;
}) {
    const rollback = optimisticMeal(guestId, quantity, extra);
    try {
        const response = await request('/api/check-in/commands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'meal.add',
                guestId,
                quantity,
                extra,
                idempotencyKey,
            }),
        });
        const body = await response.json() as MealCommandResult & { error?: string };
        if (!response.ok) throw new Error(body.error || 'Unable to record meal');
        replaceMealCounts(guestId, body.mealCount, body.extraMealCount);
        if (body.recordId) acknowledgeMealRecord(body.recordId);
        return {
            id: body.recordId || idempotencyKey,
            guestId,
            count: extra ? body.extraMealCount : body.mealCount,
            type: extra ? 'extra' : 'guest',
        };
    } catch (error) {
        rollback();
        throw error;
    }
}
