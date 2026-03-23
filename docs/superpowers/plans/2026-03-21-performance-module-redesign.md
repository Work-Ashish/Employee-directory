# Performance Module Redesign — Source One Evaluation Framework

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic performance module with Source One's exact Monthly Performance Evaluation + Annual/Six-Monthly Appraisal framework as defined in their HR policy documents.

**Architecture:** Django backend gets 4 new models (ReviewCycle, MonthlyReview, Appraisal, PIP) with JSONFields for flexible metric/competency data. Existing 3 models (PerformanceReview, PerformanceTemplate, PerformanceMetrics) are preserved for backward compatibility but deprecated. Frontend forms are rewritten to match the exact document structure — recruiter metrics, team lead metrics, competency assessments with dual scoring, and multi-stage workflow.

**Tech Stack:** Django 5.1 + DRF (backend), Next.js 16 + React 19 + TailwindCSS (frontend), PostgreSQL (DB-per-tenant)

---

## Document Requirements Summary

### Doc 1: Monthly Performance Review
- **Section A:** Employee info (name, ID, designation, department, reporting manager, review month/year)
- **Section B:** 10 Recruiter metrics (Demands, CVs Sourced, CVs Submitted, Interviews Scheduled, Interviews Cleared, Offers Made, Offers Accepted, Onboarded, Avg Time-to-Fill, Client Satisfaction) with Target/Achieved/Conversion%
- **Section C:** 8 Team Lead metrics (Recruiters Managed, Active Clients, Team Demands, Submissions, Interviews, Offers, Onboards, Escalations)
- **Section D:** Rating 1-5 (Outstanding 90-100%, Excellent 75-89%, Good 60-74%, Needs Improvement 40-59%, Unsatisfactory <40%)
- **Section E:** HR remarks (rating, remarks, strengths, areas for improvement, action items, appreciation/alert)
- **Section F:** Signatures (employee, manager, HR)
- **Emails:** 3 templates (appreciation rating 4-5, alert rating 1-2, satisfactory rating 3)

### Doc 2: Annual & Six-Monthly Appraisal
- **Annual:** April, full FY (Apr-Mar), all employees with 3+ months + 9/12 monthly forms
- **Six-Monthly:** October, H1 only (Apr-Sep), for exceptional performers (4/6 months rated 4-5, no rating below 3)
- **Process:** Day 1-3 notification → Day 1-7 data compilation → Day 3-10 self-assessment → Day 10-15 manager review → Day 15-20 HR calibration → Day 20-25 one-on-one → month-end communication
- **Sections:** Employee info, Monthly summary (6/12 months), 6 Conversion KPIs, 8 Recruiter competencies (self+manager), 9 Team Lead competencies (self+manager), Self-assessment narrative, Rating scale, HR assessment, Signatures
- **Outcomes:** Rating 5 = promotion/salary; Rating 4 = salary revision; Rating 3 = standard increment; Rating 2 = 60-day PIP; Rating 1 = 90-day PIP + warning

---

## File Structure

### Backend (Django) — Create/Modify

| Action | File | Responsibility |
|--------|------|----------------|
| **Rewrite** | `backend/hiringnow/apps/performance/models.py` | 4 new models + keep 3 existing |
| **Rewrite** | `backend/hiringnow/apps/performance/serializers.py` | Serializers for all new models |
| **Rewrite** | `backend/hiringnow/apps/performance/views.py` | Views for monthly reviews, appraisals, cycles, PIPs, eligibility |
| **Rewrite** | `backend/hiringnow/apps/performance/urls.py` | URL routing for all new endpoints |
| **Create** | `backend/hiringnow/apps/performance/services.py` | Business logic: rating calculation, eligibility check, email triggers |

### Frontend — Create/Modify

| Action | File | Responsibility |
|--------|------|----------------|
| **Rewrite** | `components/performance/MonthlyReviewForm.tsx` | Monthly review form matching Doc 1 exactly |
| **Create** | `components/performance/AppraisalForm.tsx` | Annual/six-monthly appraisal form matching Doc 2 |
| **Create** | `components/performance/AppraisalSelfAssessment.tsx` | Employee self-assessment for appraisals |
| **Create** | `components/performance/ReviewCycleManager.tsx` | Admin UI for managing review cycles |
| **Create** | `components/performance/PIPTracker.tsx` | PIP tracking component |
| **Modify** | `components/performance/AdminPerformanceView.tsx` | Integrate new forms and cycle management |
| **Modify** | `components/performance/EmployeePerformanceView.tsx` | Add self-assessment, monthly view, appraisal view |
| **Modify** | `components/performance/ReviewDetailView.tsx` | Add detail views for new review types |
| **Modify** | `features/performance/api/client.ts` | Add API methods for new endpoints |
| **Create** | `app/api/performance/monthly/route.ts` | Proxy for monthly reviews |
| **Create** | `app/api/performance/appraisals/route.ts` | Proxy for appraisals |
| **Create** | `app/api/performance/cycles/route.ts` | Proxy for review cycles |
| **Create** | `app/api/performance/pip/route.ts` | Proxy for PIPs |

---

## Task Breakdown

### Task 1: Django Models — ReviewCycle, MonthlyReview, Appraisal, PIP

**Files:**
- Modify: `backend/hiringnow/apps/performance/models.py`

- [ ] **Step 1: Add the 4 new models to models.py**

Keep existing PerformanceReview, PerformanceTemplate, PerformanceMetrics models intact. Add below them:

```python
# ── NEW MODELS (Source One Evaluation Framework) ──────────────────────────

class ReviewCycle(BaseModel):
    """Tracks monthly, six-monthly, and annual evaluation cycles."""

    class CycleType(models.TextChoices):
        MONTHLY = 'MONTHLY', 'Monthly'
        SIX_MONTHLY = 'SIX_MONTHLY', 'Six-Monthly'
        ANNUAL = 'ANNUAL', 'Annual'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'

    cycle_type = models.CharField(max_length=20, choices=CycleType.choices)
    period_label = models.CharField(max_length=100)  # e.g. "March 2026", "H1 2025-26", "FY 2025-26"
    period_start = models.DateField()
    period_end = models.DateField()
    financial_year = models.CharField(max_length=10)  # e.g. "2025-26"
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    class Meta:
        db_table = 'review_cycles'
        ordering = ['-period_start']

    def __str__(self):
        return f"{self.get_cycle_type_display()} — {self.period_label}"


class MonthlyReview(BaseModel):
    """Monthly Performance Evaluation Form per Source One Doc 1."""

    class RatingCategory(models.TextChoices):
        OUTSTANDING = 'OUTSTANDING', 'Outstanding (90–100%)'
        EXCELLENT = 'EXCELLENT', 'Excellent (75–89%)'
        GOOD = 'GOOD', 'Good (60–74%)'
        NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT', 'Needs Improvement (40–59%)'
        UNSATISFACTORY = 'UNSATISFACTORY', 'Unsatisfactory (Below 40%)'

    class AlertType(models.TextChoices):
        APPRECIATION = 'APPRECIATION', 'Appreciation (Rating 4–5)'
        SATISFACTORY = 'SATISFACTORY', 'Satisfactory (Rating 3)'
        ALERT = 'ALERT', 'Performance Alert (Rating 1–2)'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SELF_ASSESSMENT = 'SELF_ASSESSMENT', 'Self-Assessment Submitted'
        SUBMITTED = 'SUBMITTED', 'Submitted to HR'
        REVIEWED = 'REVIEWED', 'HR Reviewed'
        ACKNOWLEDGED = 'ACKNOWLEDGED', 'Employee Acknowledged'

    cycle = models.ForeignKey(ReviewCycle, on_delete=models.SET_NULL, null=True, blank=True, related_name='monthly_reviews')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='monthly_reviews')
    reviewer = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='monthly_reviews_given')
    reporting_manager = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='monthly_reviews_managed')

    review_month = models.PositiveSmallIntegerField()  # 1-12
    review_year = models.PositiveIntegerField()

    # Section B: Recruiter Performance Metrics (10 rows)
    # JSON: [{"serial_no": 1, "metric": "No. of Demands Worked On", "target": 50, "achieved": 45, "conversion_pct": 90.0}, ...]
    recruiter_metrics = models.JSONField(default=list)

    # Section C: Team Lead Metrics (8 rows) — empty list for non-leads
    # JSON: [{"serial_no": 1, "metric": "No. of Recruiters Managed", "details": "5"}, ...]
    team_lead_metrics = models.JSONField(default=list, blank=True)

    # Section D: Rating (HR assigns)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)  # 1-5
    rating_category = models.CharField(max_length=30, choices=RatingCategory.choices, blank=True)
    score_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Section E: HR Reviewer Remarks
    reviewer_remarks = models.TextField(blank=True)
    strengths_observed = models.TextField(blank=True)
    areas_for_improvement = models.TextField(blank=True)
    action_items = models.TextField(blank=True)
    appreciation_or_alert = models.CharField(max_length=20, choices=AlertType.choices, blank=True)

    # Section F: Signatures
    employee_signed_at = models.DateTimeField(null=True, blank=True)
    manager_signed_at = models.DateTimeField(null=True, blank=True)
    hr_signed_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    class Meta:
        db_table = 'monthly_reviews'
        ordering = ['-review_year', '-review_month']
        unique_together = [('employee', 'review_month', 'review_year')]

    def __str__(self):
        return f"Monthly Review: {self.employee} — {self.review_month}/{self.review_year}"


class Appraisal(BaseModel):
    """Annual / Six-Monthly Performance Appraisal Form per Source One Doc 2."""

    class ReviewType(models.TextChoices):
        ANNUAL = 'ANNUAL', 'Annual'
        SIX_MONTHLY = 'SIX_MONTHLY', 'Six-Monthly (Exceptional Performer)'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        DATA_COMPILATION = 'DATA_COMPILATION', 'Data Compilation'
        SELF_ASSESSMENT = 'SELF_ASSESSMENT', 'Self-Assessment'
        MANAGER_REVIEW = 'MANAGER_REVIEW', 'Manager Review'
        HR_CALIBRATION = 'HR_CALIBRATION', 'HR Calibration'
        ONE_ON_ONE = 'ONE_ON_ONE', 'One-on-One Meeting'
        COMPLETED = 'COMPLETED', 'Completed'

    class RatingCategory(models.TextChoices):
        OUTSTANDING = 'OUTSTANDING', 'Outstanding (90–100%)'
        EXCELLENT = 'EXCELLENT', 'Excellent (75–89%)'
        GOOD = 'GOOD', 'Good (60–74%)'
        NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT', 'Needs Improvement (40–59%)'
        UNSATISFACTORY = 'UNSATISFACTORY', 'Unsatisfactory (Below 40%)'

    class OutcomeDecision(models.TextChoices):
        PROMOTION = 'PROMOTION', 'Promotion + Salary Revision'
        SALARY_REVISION = 'SALARY_REVISION', 'Salary Revision'
        STANDARD_INCREMENT = 'STANDARD_INCREMENT', 'Standard Increment'
        PIP_60 = 'PIP_60', '60-Day PIP'
        PIP_90 = 'PIP_90', '90-Day PIP + Warning'

    cycle = models.ForeignKey(ReviewCycle, on_delete=models.SET_NULL, null=True, blank=True, related_name='appraisals')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='appraisals')
    reporting_manager = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='appraisals_managed')
    hr_reviewer = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='appraisals_reviewed')

    review_type = models.CharField(max_length=20, choices=ReviewType.choices)
    review_period = models.CharField(max_length=100)  # "April 2025 – March 2026"
    financial_year = models.CharField(max_length=10)

    # Section B: Monthly Performance Summary (6 or 12 months)
    # JSON: [{"month": "Apr", "demands_worked": 50, "cvs_sourced": 200, "cvs_submitted": 80, "interviews_scheduled": 30, ...}, ...]
    monthly_summary = models.JSONField(default=list)

    # Section C: Conversion & Efficiency KPIs
    # JSON: [{"serial_no": 1, "kpi": "CV-to-Interview Conversion Rate", "target": "30%", "achieved": "28%", "hr_remarks": ""}, ...]
    conversion_kpis = models.JSONField(default=list)

    # Section D: Recruiter Competency Assessment (8 competencies)
    # JSON: [{"competency": "Sourcing Skills & Channel Diversity", "self_score": 4, "manager_score": 4, "comments": ""}, ...]
    recruiter_competencies = models.JSONField(default=list)

    # Section E: Team Lead Competency Assessment (9 competencies) — empty for non-leads
    team_lead_competencies = models.JSONField(default=list, blank=True)

    # Section F: Self-Assessment Narrative
    # JSON structure differs for six-monthly vs annual:
    # Six-monthly: {"top_3_achievements": "", "key_challenges": "", "support_needed": "", "development_goals": ""}
    # Annual: {"top_5_achievements": "", "challenges_and_resolution": "", "new_skills": "", "client_feedback": "", "support_needed": "", "career_goals": ""}
    self_assessment = models.JSONField(default=dict)

    # Section H: HR Reviewer Assessment
    overall_rating = models.PositiveSmallIntegerField(null=True, blank=True)  # 1-5
    final_rating_category = models.CharField(max_length=30, choices=RatingCategory.choices, blank=True)
    key_strengths = models.TextField(blank=True)
    development_areas = models.TextField(blank=True)
    goals_next_period = models.TextField(blank=True)
    training_recommended = models.TextField(blank=True)
    promotion_recommendation = models.TextField(blank=True)
    salary_revision_recommendation = models.TextField(blank=True)
    outcome_decision = models.CharField(max_length=30, choices=OutcomeDecision.choices, blank=True)
    additional_hr_remarks = models.TextField(blank=True)

    # Section I: Signatures
    employee_signed_at = models.DateTimeField(null=True, blank=True)
    manager_signed_at = models.DateTimeField(null=True, blank=True)
    hr_signed_at = models.DateTimeField(null=True, blank=True)

    # Eligibility (for six-monthly)
    is_eligible = models.BooleanField(default=False)
    eligibility_reason = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    class Meta:
        db_table = 'appraisals'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_review_type_display()} Appraisal: {self.employee} — {self.review_period}"


class PIP(BaseModel):
    """Performance Improvement Plan triggered by low ratings."""

    class PIPType(models.TextChoices):
        MONTHLY_30 = 'MONTHLY_30', '30-Day (Monthly Alert)'
        FORMAL_60 = 'FORMAL_60', '60-Day (Appraisal Rating 2)'
        FORMAL_90 = 'FORMAL_90', '90-Day (Appraisal Rating 1)'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        COMPLETED = 'COMPLETED', 'Completed'
        EXTENDED = 'EXTENDED', 'Extended'
        CLOSED = 'CLOSED', 'Closed'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='pips')
    triggered_by_monthly = models.ForeignKey(MonthlyReview, on_delete=models.SET_NULL, null=True, blank=True, related_name='pips')
    triggered_by_appraisal = models.ForeignKey(Appraisal, on_delete=models.SET_NULL, null=True, blank=True, related_name='pips')

    pip_type = models.CharField(max_length=20, choices=PIPType.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    specific_targets = models.JSONField(default=list)  # [{"target": "Increase CV submissions to 50/month", "metric": "cvs_submitted", "goal": 50}]
    weekly_checkins = models.JSONField(default=list)  # [{"week": 1, "date": "2026-04-07", "notes": "", "progress": ""}]

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    outcome = models.TextField(blank=True)

    class Meta:
        db_table = 'performance_pips'
        ordering = ['-start_date']

    def __str__(self):
        return f"PIP: {self.employee} — {self.get_pip_type_display()}"
```

- [ ] **Step 2: Generate and run migration**

```bash
cd backend/hiringnow
TENANT_DB_SLUGS=sourceoneai python manage.py makemigrations performance
TENANT_DB_SLUGS=sourceoneai python manage.py migrate --database=postgres_sourceoneai
```

- [ ] **Step 3: Verify Django system check passes**

```bash
TENANT_DB_SLUGS=sourceoneai python manage.py check
```

---

### Task 2: Django Business Logic — services.py

**Files:**
- Create: `backend/hiringnow/apps/performance/services.py`

- [ ] **Step 1: Create services.py with rating calculation, eligibility check, email trigger logic**

```python
from decimal import Decimal
from datetime import date

from apps.performance.models import MonthlyReview, Appraisal


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


def rating_category_from_score(score_pct: Decimal) -> str:
    """Map score percentage to rating category per Doc 1 Section D."""
    if score_pct >= 90:
        return MonthlyReview.RatingCategory.OUTSTANDING
    elif score_pct >= 75:
        return MonthlyReview.RatingCategory.EXCELLENT
    elif score_pct >= 60:
        return MonthlyReview.RatingCategory.GOOD
    elif score_pct >= 40:
        return MonthlyReview.RatingCategory.NEEDS_IMPROVEMENT
    else:
        return MonthlyReview.RatingCategory.UNSATISFACTORY


def rating_from_category(category: str) -> int:
    """Map rating category to numeric 1-5."""
    mapping = {
        'OUTSTANDING': 5,
        'EXCELLENT': 4,
        'GOOD': 3,
        'NEEDS_IMPROVEMENT': 2,
        'UNSATISFACTORY': 1,
    }
    return mapping.get(category, 3)


def alert_type_from_rating(rating: int) -> str:
    """Determine email template type from rating."""
    if rating >= 4:
        return MonthlyReview.AlertType.APPRECIATION
    elif rating == 3:
        return MonthlyReview.AlertType.SATISFACTORY
    else:
        return MonthlyReview.AlertType.ALERT


# ── Six-Monthly Eligibility ─────────────────────────────────────────────

def check_six_monthly_eligibility(employee_id, financial_year: str) -> dict:
    """
    Check if employee is eligible for six-monthly exceptional performer appraisal.
    Rules from Doc 2:
    - Rating of 4+ in at least 4 out of 6 months (Apr-Sep)
    - No monthly rating below 3
    - No active PIPs
    """
    h1_reviews = MonthlyReview.objects.filter(
        employee_id=employee_id,
        review_year=int('20' + financial_year.split('-')[0]),
        review_month__gte=4,
        review_month__lte=9,
        status__in=['REVIEWED', 'ACKNOWLEDGED'],
    ).order_by('review_month')

    if h1_reviews.count() < 4:
        return {'eligible': False, 'reason': f'Only {h1_reviews.count()}/6 monthly reviews submitted (minimum 4 needed)'}

    ratings = [r.rating for r in h1_reviews if r.rating is not None]
    if not ratings:
        return {'eligible': False, 'reason': 'No ratings assigned yet'}

    below_3 = [r for r in ratings if r < 3]
    if below_3:
        return {'eligible': False, 'reason': f'{len(below_3)} month(s) rated below 3'}

    high_ratings = [r for r in ratings if r >= 4]
    if len(high_ratings) < 4:
        return {'eligible': False, 'reason': f'Only {len(high_ratings)}/6 months rated 4+ (need 4+)'}

    from apps.performance.models import PIP
    active_pips = PIP.objects.filter(employee_id=employee_id, status='ACTIVE').exists()
    if active_pips:
        return {'eligible': False, 'reason': 'Active PIP exists'}

    return {'eligible': True, 'reason': f'{len(high_ratings)}/6 months rated 4+, no ratings below 3, no active PIPs'}


# ── Appraisal Outcome ───────────────────────────────────────────────────

def outcome_from_rating(rating: int) -> str:
    """Map appraisal rating to outcome decision per Doc 2 Section 5."""
    mapping = {
        5: Appraisal.OutcomeDecision.PROMOTION,
        4: Appraisal.OutcomeDecision.SALARY_REVISION,
        3: Appraisal.OutcomeDecision.STANDARD_INCREMENT,
        2: Appraisal.OutcomeDecision.PIP_60,
        1: Appraisal.OutcomeDecision.PIP_90,
    }
    return mapping.get(rating, '')


# ── Monthly Summary Aggregation ──────────────────────────────────────────

MONTHLY_METRIC_KEYS = [
    'demands_worked', 'cvs_sourced', 'cvs_submitted',
    'interviews_scheduled', 'interviews_cleared',
    'offers_made', 'offers_accepted', 'candidates_onboarded',
    'avg_time_to_fill',
]

MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

def aggregate_monthly_summary(employee_id, start_month, start_year, end_month, end_year) -> list:
    """Build monthly summary table from MonthlyReview recruiter_metrics."""
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
            name = metric.get('metric', '').lower().replace(' ', '_').replace('.', '')
            if 'demand' in name:
                row['demands_worked'] = metric.get('achieved', 0)
            elif 'sourced' in name or 'screened' in name:
                row['cvs_sourced'] = metric.get('achieved', 0)
            elif 'submitted' in name:
                row['cvs_submitted'] = metric.get('achieved', 0)
            elif 'scheduled' in name:
                row['interviews_scheduled'] = metric.get('achieved', 0)
            elif 'cleared' in name:
                row['interviews_cleared'] = metric.get('achieved', 0)
            elif 'offers made' in name.replace('_', ' '):
                row['offers_made'] = metric.get('achieved', 0)
            elif 'accepted' in name:
                row['offers_accepted'] = metric.get('achieved', 0)
            elif 'onboard' in name:
                row['candidates_onboarded'] = metric.get('achieved', 0)
            elif 'time' in name and 'fill' in name:
                row['avg_time_to_fill'] = metric.get('achieved', 0)

        summary.append(row)

    return summary
```

---

### Task 3: Django Serializers

**Files:**
- Modify: `backend/hiringnow/apps/performance/serializers.py`

- [ ] **Step 1: Add serializers for all 4 new models below existing ones**

Key serializers to add:
- `ReviewCycleSerializer` / `ReviewCycleCreateSerializer`
- `MonthlyReviewSerializer` / `MonthlyReviewCreateSerializer` / `MonthlyReviewUpdateSerializer`
- `AppraisalSerializer` / `AppraisalCreateSerializer` / `AppraisalUpdateSerializer`
- `PIPSerializer` / `PIPCreateSerializer`

Each read serializer includes computed `employee_name`, `reviewer_name`, `manager_name`. Write serializers accept FK IDs and JSON data.

---

### Task 4: Django Views & URLs

**Files:**
- Modify: `backend/hiringnow/apps/performance/views.py`
- Modify: `backend/hiringnow/apps/performance/urls.py`

- [ ] **Step 1: Add views for new endpoints**

New views:
- `ReviewCycleListCreateView` — GET/POST `/performance/cycles/`
- `MonthlyReviewListCreateView` — GET/POST `/performance/monthly/`
- `MonthlyReviewDetailView` — GET/PUT `/performance/monthly/{id}/`
- `MonthlyReviewSignView` — POST `/performance/monthly/{id}/sign/`
- `AppraisalListCreateView` — GET/POST `/performance/appraisals/`
- `AppraisalDetailView` — GET/PUT `/performance/appraisals/{id}/`
- `AppraisalEligibilityView` — GET `/performance/appraisals/eligibility/`
- `PIPListCreateView` — GET/POST `/performance/pip/`
- `PIPDetailView` — GET/PUT `/performance/pip/{id}/`

- [ ] **Step 2: Add URL patterns**

```python
# New Source One evaluation endpoints
path('performance/cycles/', ReviewCycleListCreateView.as_view()),
path('performance/monthly/', MonthlyReviewListCreateView.as_view()),
path('performance/monthly/<uuid:pk>/', MonthlyReviewDetailView.as_view()),
path('performance/monthly/<uuid:pk>/sign/', MonthlyReviewSignView.as_view()),
path('performance/appraisals/', AppraisalListCreateView.as_view()),
path('performance/appraisals/eligibility/', AppraisalEligibilityView.as_view()),
path('performance/appraisals/<uuid:pk>/', AppraisalDetailView.as_view()),
path('performance/pip/', PIPListCreateView.as_view()),
path('performance/pip/<uuid:pk>/', PIPDetailView.as_view()),
```

---

### Task 5: Frontend API Client Update

**Files:**
- Modify: `features/performance/api/client.ts`

- [ ] **Step 1: Add API methods for new endpoints**

```typescript
// Review Cycles
listCycles: (params?) => api.get('/performance/cycles/', { params }),
createCycle: (payload) => api.post('/performance/cycles/', payload),

// Monthly Reviews (Source One)
listMonthlyReviews: (params?) => api.get('/performance/monthly/', { params }),
createMonthlyReview: (payload) => api.post('/performance/monthly/', payload),
getMonthlyReview: (id) => api.get(`/performance/monthly/${id}/`),
updateMonthlyReview: (id, payload) => api.put(`/performance/monthly/${id}/`, payload),
signMonthlyReview: (id, role) => api.post(`/performance/monthly/${id}/sign/`, { role }),

// Appraisals (Source One)
listAppraisals: (params?) => api.get('/performance/appraisals/', { params }),
createAppraisal: (payload) => api.post('/performance/appraisals/', payload),
getAppraisal: (id) => api.get(`/performance/appraisals/${id}/`),
updateAppraisal: (id, payload) => api.put(`/performance/appraisals/${id}/`, payload),
checkEligibility: (params?) => api.get('/performance/appraisals/eligibility/', { params }),

// PIPs
listPIPs: (params?) => api.get('/performance/pip/', { params }),
createPIP: (payload) => api.post('/performance/pip/', payload),
updatePIP: (id, payload) => api.put(`/performance/pip/${id}/`, payload),
```

---

### Task 6: Frontend Proxy Routes

**Files:**
- Create: `app/api/performance/monthly/route.ts`
- Create: `app/api/performance/monthly/[id]/route.ts`
- Create: `app/api/performance/monthly/[id]/sign/route.ts`
- Create: `app/api/performance/appraisals/route.ts`
- Create: `app/api/performance/appraisals/[id]/route.ts`
- Create: `app/api/performance/appraisals/eligibility/route.ts`
- Create: `app/api/performance/cycles/route.ts`
- Create: `app/api/performance/pip/route.ts`
- Create: `app/api/performance/pip/[id]/route.ts`

Each follows the standard proxy pattern:
```typescript
import { proxyToDjango } from "@/lib/django-proxy"
export async function GET(req: Request) { return proxyToDjango(req, "/performance/monthly/") }
export async function POST(req: Request) { return proxyToDjango(req, "/performance/monthly/") }
```

---

### Task 7: Rewrite MonthlyReviewForm.tsx

**Files:**
- Modify: `components/performance/MonthlyReviewForm.tsx`

This is the most critical frontend change. The form must match Doc 1 exactly.

- [ ] **Step 1: Rewrite with Source One structure**

**Section A — Employee Information:**
Employee Name, Employee ID, Designation, Department, Reporting Manager, Review Month/Year (all auto-filled except month selection)

**Section B — Recruiter Performance Metrics (10 rows):**
| S.No. | Performance Metric | Target | Achieved | Conversion % |
Metrics: Demands Worked On, CVs Sourced/Screened, CVs Submitted to Client, Interviews Scheduled, Interviews Cleared (All Rounds), Offers Made, Offers Accepted, Candidates Onboarded, Time to Fill (Avg Days), Client Satisfaction Score

Conversion % auto-calculated: `(achieved / target) * 100`

**Section C — Team Lead Metrics (conditional, 8 rows):**
Only shown if employee has `is_team_lead` or role-based check.
| S.No. | Team Management Metric | Details |
Metrics: Recruiters Managed, Active Client Accounts, Total Team Demands, Total Team Submissions, Total Team Interviews, Total Team Offers, Total Team Onboards, Escalations Handled

**Section D — Rating Scale (HR use only):**
Display rating scale table. If current user is HR, show rating input (1-5 with category labels).

**Section E — Reviewer Remarks (HR use only):**
If HR: Overall Rating selector, Reviewer Remarks textarea, Strengths Observed textarea, Areas for Improvement textarea, Action Items textarea, Appreciation/Alert selector

**Section F — Signatures:**
Three signature blocks: Employee, Reporting Manager, HR Officer. Each shows signed date or "Sign" button.

- [ ] **Step 2: Wire up API submission**

On submit: POST to `/performance/monthly/` with all form data. Show toast on success/error.

---

### Task 8: Create AppraisalForm.tsx

**Files:**
- Create: `components/performance/AppraisalForm.tsx`

- [ ] **Step 1: Build the appraisal form matching Doc 2**

**Tabs:** "Six-Monthly" | "Annual" (toggle review type)

**Section A — Employee Information:**
Employee Name, Employee ID, Designation, Department, Reporting Manager, Date of Joining, Review Period, Review Type

**Section B — Monthly Performance Summary:**
- Six-monthly: 6-column table (Apr-Sep) + Total/Avg
- Annual: 12-column table (Apr-Mar) + Total/Avg
- Rows: Demands Worked, CVs Sourced, CVs Submitted, Interviews Scheduled, Interviews Cleared, Offers Made, Offers Accepted, Candidates Onboarded, Avg Time to Fill
- Pre-filled from monthly reviews via API, editable for corrections

**Section C — Conversion & Efficiency KPIs:**
| S.No. | KPI | Target | Achieved | HR Remarks |
KPIs: CV-to-Interview Rate, Interview-to-Offer Rate, Offer-to-Onboard Rate, Overall Demand Closure Rate, Avg Positions Closed/Month, Client Retention %

Auto-calculated from Section B data.

**Section D — Recruiter Competency Assessment (8 items):**
| S.No. | Core Competency | Self Score | Mgr Score | Comments |
Competencies: Sourcing Skills, Screening Quality, Client Requirement Understanding, Candidate Relationship Mgmt, Timeliness & Follow-up, ATS/Tools Proficiency, Communication & Professionalism, Adaptability & Learning

**Section E — Team Lead Competency Assessment (9 items, conditional):**
| S.No. | Leadership Competency | Self Score | Mgr Score | Comments |
Competencies: Team Productivity, Client Account Mgmt, Demand Allocation, Recruiter Coaching, Escalation Handling, Stakeholder Communication, Strategic Planning, Data-Driven Decisions, Accountability & Ownership

**Section F — Self-Assessment Narrative:**
- Six-monthly: Top 3 Achievements, Key Challenges, Support Needed, Professional Development Goals
- Annual: Top 5 Achievements, Key Challenges & Resolution, New Skills/Certifications, Client Feedback, Support Needed, Career Goals

**Section G — Rating Scale (display only):**
Table showing the 5-point scale with descriptions.

**Section H — HR Reviewer Assessment (HR only):**
Overall Rating, Final Category, Key Strengths, Development Areas, Goals Next Period, Training Recommended, Promotion Recommendation, Salary Revision Recommendation, Outcome Decision, Additional Remarks

**Section I — Signatures:**
Three signature blocks with dates.

---

### Task 9: Create AppraisalSelfAssessment.tsx

**Files:**
- Create: `components/performance/AppraisalSelfAssessment.tsx`

- [ ] **Step 1: Build employee-facing self-assessment form**

This is a simplified version of AppraisalForm that only shows the employee-editable sections:
- Section B (verify monthly data)
- Section D (self-scores only)
- Section E if team lead (self-scores only)
- Section F (narrative)

Submit advances the appraisal status from SELF_ASSESSMENT → MANAGER_REVIEW.

---

### Task 10: Update AdminPerformanceView.tsx

**Files:**
- Modify: `components/performance/AdminPerformanceView.tsx`

- [ ] **Step 1: Add tab navigation for review types**

Replace current view with tabbed interface:
- **Monthly Reviews** — List/create monthly evaluation forms
- **Appraisals** — List/create annual & six-monthly appraisals
- **Review Cycles** — Manage evaluation cycles
- **PIPs** — Track performance improvement plans

- [ ] **Step 2: Monthly Reviews tab**

- Table: Employee, Month/Year, Rating, Category, Status, Actions
- "New Monthly Review" button → opens MonthlyReviewForm in dialog
- Click row → ReviewDetailView with all sections

- [ ] **Step 3: Appraisals tab**

- "Check Six-Monthly Eligibility" button → calls eligibility API, shows eligible employees
- "Create Annual Appraisal" / "Create Six-Monthly Appraisal" buttons
- Table: Employee, Type, Period, Status, Rating, Outcome, Actions
- Click → AppraisalForm in dialog (HR can fill all sections)

---

### Task 11: Update EmployeePerformanceView.tsx

**Files:**
- Modify: `components/performance/EmployeePerformanceView.tsx`

- [ ] **Step 1: Redesign for Source One framework**

Show employee's own:
- **Monthly Reviews** — List with month, rating, category, status. Click → detail view
- **Appraisals** — List with type, period, status. If status is SELF_ASSESSMENT, show "Complete Self-Assessment" button → AppraisalSelfAssessment dialog
- **Active PIP** — If any active PIP, show alert banner with details, targets, progress

---

### Task 12: Update ReviewDetailView.tsx

**Files:**
- Modify: `components/performance/ReviewDetailView.tsx`

- [ ] **Step 1: Add detail views for MONTHLY_REVIEW and APPRAISAL types**

For Monthly Review detail:
- Section A: Employee info card
- Section B: Recruiter metrics table
- Section C: Team lead metrics (if present)
- Section D: Rating display with category badge
- Section E: Reviewer remarks
- Section F: Signature status

For Appraisal detail:
- All sections A-I rendered read-only
- Status timeline showing workflow progress

---

### Task 13: Frontend Build Verification

- [ ] **Step 1: Run `npx next build` and fix any TypeScript/compilation errors**
- [ ] **Step 2: Run Django system check**
- [ ] **Step 3: Verify migrations applied**

---

## Default Metric Constants (for form defaults)

### Recruiter Metrics (Section B)
```typescript
const DEFAULT_RECRUITER_METRICS = [
  { serialNo: 1, metric: "No. of Demands Worked On" },
  { serialNo: 2, metric: "No. of CVs Sourced / Screened" },
  { serialNo: 3, metric: "No. of CVs Submitted to Client" },
  { serialNo: 4, metric: "No. of Interviews Scheduled" },
  { serialNo: 5, metric: "No. of Interviews Cleared (All Rounds)" },
  { serialNo: 6, metric: "No. of Offers Made" },
  { serialNo: 7, metric: "No. of Offers Accepted" },
  { serialNo: 8, metric: "No. of Candidates Onboarded" },
  { serialNo: 9, metric: "Time to Fill (Avg. Days per Position)" },
  { serialNo: 10, metric: "Client Satisfaction Score (if applicable)" },
]
```

### Team Lead Metrics (Section C)
```typescript
const DEFAULT_TEAM_LEAD_METRICS = [
  { serialNo: 1, metric: "No. of Recruiters Managed" },
  { serialNo: 2, metric: "No. of Active Client Accounts Handled" },
  { serialNo: 3, metric: "Total Demands Assigned to Team" },
  { serialNo: 4, metric: "Total Team Submissions" },
  { serialNo: 5, metric: "Total Team Interviews" },
  { serialNo: 6, metric: "Total Team Offers" },
  { serialNo: 7, metric: "Total Team Onboards" },
  { serialNo: 8, metric: "Escalations Handled / Resolved" },
]
```

### Recruiter Competencies (Section D)
```typescript
const DEFAULT_RECRUITER_COMPETENCIES = [
  "Sourcing Skills & Channel Diversity",
  "Screening & Shortlisting Quality",
  "Client Requirement Understanding",
  "Candidate Relationship Management",
  "Timeliness & Follow-up Discipline",
  "ATS / Tools Proficiency",
  "Communication & Professionalism",
  "Adaptability & Learning Agility",
]
```

### Team Lead Competencies (Section E)
```typescript
const DEFAULT_TEAM_LEAD_COMPETENCIES = [
  "Team Productivity & Output Management",
  "Client Account Management",
  "Demand Allocation & Prioritization",
  "Recruiter Coaching & Development",
  "Escalation Handling & Resolution",
  "Stakeholder Communication",
  "Strategic Planning & Process Improvement",
  "Data-Driven Decision Making",
  "Accountability & Ownership",
]
```

### Rating Scale
```typescript
const RATING_SCALE = [
  { rating: 5, category: "Outstanding", range: "90–100%", description: "Exceptional performance; exceeds all targets consistently" },
  { rating: 4, category: "Excellent", range: "75–89%", description: "Strong performance; exceeds most targets" },
  { rating: 3, category: "Good", range: "60–74%", description: "Meets expectations; delivers on assigned targets" },
  { rating: 2, category: "Needs Improvement", range: "40–59%", description: "Below expectations; requires coaching and support" },
  { rating: 1, category: "Unsatisfactory", range: "Below 40%", description: "Significantly below targets; performance alert issued" },
]
```

### Conversion KPIs
```typescript
const DEFAULT_CONVERSION_KPIS = [
  "CV-to-Interview Conversion Rate",
  "Interview-to-Offer Conversion Rate",
  "Offer-to-Onboard Conversion Rate",
  "Overall Demand Closure Rate",
  "Average Positions Closed per Month",
  "Client Retention / Repeat Demand %",
]
```
