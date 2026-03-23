"""
Business logic for Source One Performance Evaluation Framework.
- Rating calculation from recruiter metrics
- Six-monthly eligibility checking
- Appraisal outcome mapping
- Monthly summary aggregation
"""
from decimal import Decimal


# ── Rating Calculation ──────────────────────────────────────────────────

def compute_score_percentage(recruiter_metrics: list) -> Decimal:
    """Compute overall score % from recruiter metrics (target vs achieved)."""
    total_target = Decimal(0)
    total_achieved = Decimal(0)
    for m in recruiter_metrics:
        t = Decimal(str(m.get('target', 0) or 0))
        a = Decimal(str(m.get('achieved', 0) or 0))
        if t > 0:
            total_target += t
            total_achieved += a
    if total_target == 0:
        return Decimal(0)
    return (total_achieved / total_target) * 100


def rating_category_from_score(score_pct) -> str:
    """Map score percentage to rating category per Doc 1 Section D."""
    score = Decimal(str(score_pct))
    if score >= 90:
        return 'OUTSTANDING'
    elif score >= 75:
        return 'EXCELLENT'
    elif score >= 60:
        return 'GOOD'
    elif score >= 40:
        return 'NEEDS_IMPROVEMENT'
    else:
        return 'UNSATISFACTORY'


def rating_from_category(category: str) -> int:
    """Map rating category to numeric 1-5."""
    return {
        'OUTSTANDING': 5,
        'EXCELLENT': 4,
        'GOOD': 3,
        'NEEDS_IMPROVEMENT': 2,
        'UNSATISFACTORY': 1,
    }.get(category, 3)


def category_from_rating(rating: int) -> str:
    """Map numeric 1-5 to rating category."""
    return {
        5: 'OUTSTANDING',
        4: 'EXCELLENT',
        3: 'GOOD',
        2: 'NEEDS_IMPROVEMENT',
        1: 'UNSATISFACTORY',
    }.get(rating, 'GOOD')


def alert_type_from_rating(rating: int) -> str:
    """Determine email template type from rating."""
    if rating >= 4:
        return 'APPRECIATION'
    elif rating == 3:
        return 'SATISFACTORY'
    else:
        return 'ALERT'


# ── Six-Monthly Eligibility ─────────────────────────────────────────────

def check_six_monthly_eligibility(employee_id, financial_year: str) -> dict:
    """
    Check if employee qualifies for six-monthly exceptional performer appraisal.
    Rules (Doc 2):
    - Rating of 4+ in at least 4 out of 6 months (Apr-Sep)
    - No monthly rating below 3
    - No active PIPs
    """
    from apps.performance.models import MonthlyReview, PIP

    fy_start = int('20' + financial_year.split('-')[0])
    h1_reviews = MonthlyReview.objects.filter(
        employee_id=employee_id,
        review_year=fy_start,
        review_month__gte=4,
        review_month__lte=9,
        status__in=['REVIEWED', 'ACKNOWLEDGED'],
    ).order_by('review_month')

    count = h1_reviews.count()
    if count < 4:
        return {
            'eligible': False,
            'reason': f'Only {count}/6 monthly reviews submitted (minimum 4 needed)',
        }

    ratings = [r.rating for r in h1_reviews if r.rating is not None]
    if not ratings:
        return {'eligible': False, 'reason': 'No ratings assigned yet'}

    below_3 = [r for r in ratings if r < 3]
    if below_3:
        return {
            'eligible': False,
            'reason': f'{len(below_3)} month(s) rated below 3',
        }

    high_ratings = [r for r in ratings if r >= 4]
    if len(high_ratings) < 4:
        return {
            'eligible': False,
            'reason': f'Only {len(high_ratings)}/6 months rated 4+ (need at least 4)',
        }

    active_pips = PIP.objects.filter(
        employee_id=employee_id, status='ACTIVE',
    ).exists()
    if active_pips:
        return {'eligible': False, 'reason': 'Active PIP exists'}

    return {
        'eligible': True,
        'reason': f'{len(high_ratings)}/6 months rated 4+, no ratings below 3, no active PIPs',
    }


# ── Appraisal Outcome ───────────────────────────────────────────────────

def outcome_from_rating(rating: int) -> str:
    """Map appraisal rating to outcome decision per Doc 2 Section 5."""
    return {
        5: 'PROMOTION',
        4: 'SALARY_REVISION',
        3: 'STANDARD_INCREMENT',
        2: 'PIP_60',
        1: 'PIP_90',
    }.get(rating, '')


# ── Monthly Summary Aggregation ──────────────────────────────────────────

MONTH_NAMES = [
    '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

_METRIC_KEY_MAP = {
    'demand': 'demands_worked',
    'sourced': 'cvs_sourced',
    'screened': 'cvs_sourced',
    'submitted': 'cvs_submitted',
    'scheduled': 'interviews_scheduled',
    'cleared': 'interviews_cleared',
    'offers made': 'offers_made',
    'accepted': 'offers_accepted',
    'onboard': 'candidates_onboarded',
    'time to fill': 'avg_time_to_fill',
}


def _metric_to_key(metric_name: str) -> str:
    """Map a recruiter metric name to a canonical JSON key."""
    name = metric_name.lower()
    for pattern, key in _METRIC_KEY_MAP.items():
        if pattern in name:
            return key
    return ''


def aggregate_monthly_summary(
    employee_id, start_month, start_year, end_month, end_year,
) -> list:
    """Build monthly summary table from MonthlyReview recruiter_metrics."""
    from apps.performance.models import MonthlyReview

    reviews = MonthlyReview.objects.filter(
        employee_id=employee_id,
        status__in=['REVIEWED', 'ACKNOWLEDGED'],
    ).order_by('review_year', 'review_month')

    summary = []
    for r in reviews:
        if (r.review_year, r.review_month) < (start_year, start_month):
            continue
        if (r.review_year, r.review_month) > (end_year, end_month):
            break

        row = {'month': MONTH_NAMES[r.review_month]}
        for metric in r.recruiter_metrics:
            key = _metric_to_key(metric.get('metric', ''))
            if key:
                row[key] = metric.get('achieved', 0)
        summary.append(row)

    return summary
