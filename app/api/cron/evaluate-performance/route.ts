/**
 * /api/cron/evaluate-performance — AI Performance Agent (Sprint 14).
 *
 * NOT YET IMPLEMENTED. This endpoint is a stub for the future AI-driven
 * weekly performance evaluation pipeline. When built, it will:
 *   1. Fetch all active employees
 *   2. Gather metrics from MonthlyReview records
 *   3. Auto-compute score_percentage, rating_category, and alerts
 *   4. Create/update PerformanceMetrics records
 *   5. Trigger PIP creation for consecutive low ratings
 *
 * The Django performance module (apps.performance) provides:
 *   - MonthlyReview, Appraisal, PIP models
 *   - services.py: compute_score_percentage, rating_category_from_score,
 *     check_six_monthly_eligibility, aggregate_monthly_summary
 *
 * TODO: Implement Django management command or celery task at
 *       apps/performance/management/commands/evaluate_performance.py
 */

export async function POST(req: Request) {
    // Verify cron secret
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
        )
    }

    return Response.json(
        {
            error: "Not implemented",
            detail: "The AI performance evaluation agent is not yet built. " +
                "Use Django /api/v1/performance/monthly/ to create reviews manually.",
            status: "STUB",
        },
        { status: 501 }
    )
}
