from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class PerformanceTemplate(BaseModel):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    criteria = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'performance_templates'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class PerformanceReview(BaseModel):

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SUBMITTED = 'SUBMITTED', 'Submitted'
        ACKNOWLEDGED = 'ACKNOWLEDGED', 'Acknowledged'

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='performance_reviews',
    )
    reviewer = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reviews_given',
    )
    template = models.ForeignKey(
        PerformanceTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    period = models.CharField(max_length=50)
    overall_score = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True,
    )
    strengths = models.TextField(blank=True)
    improvements = models.TextField(blank=True)
    goals = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    class Meta:
        db_table = 'performance_reviews'
        ordering = ['-created_at']

    def __str__(self):
        return f"Review: {self.employee} — {self.period}"


class PerformanceMetrics(BaseModel):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='perf_metrics',
    )
    period = models.CharField(max_length=50)
    task_completion_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )
    attendance_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )
    collaboration_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )
    quality_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )
    overall_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )

    class Meta:
        db_table = 'performance_metrics'
        ordering = ['-created_at']

    def __str__(self):
        return f"Metrics: {self.employee} — {self.period}"


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
    period_label = models.CharField(max_length=100)
    period_start = models.DateField()
    period_end = models.DateField()
    financial_year = models.CharField(max_length=10)
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

    cycle = models.ForeignKey(
        ReviewCycle, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='monthly_reviews',
    )
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='monthly_reviews',
    )
    reviewer = models.ForeignKey(
        Employee, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='monthly_reviews_given',
    )
    reporting_manager = models.ForeignKey(
        Employee, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='monthly_reviews_managed',
    )

    review_month = models.PositiveSmallIntegerField()  # 1-12
    review_year = models.PositiveIntegerField()

    # Section B: Recruiter Performance Metrics (10 rows)
    # JSON: [{"serial_no": 1, "metric": "...", "target": 50, "achieved": 45, "conversion_pct": 90.0}]
    recruiter_metrics = models.JSONField(default=list)

    # Section C: Team Lead Metrics (8 rows) — empty list for non-leads
    # JSON: [{"serial_no": 1, "metric": "...", "details": "5"}]
    team_lead_metrics = models.JSONField(default=list, blank=True)

    # Section D: Rating (HR assigns)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)  # 1-5
    rating_category = models.CharField(
        max_length=30, choices=RatingCategory.choices, blank=True,
    )
    score_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
    )

    # Section E: HR Reviewer Remarks
    reviewer_remarks = models.TextField(blank=True)
    strengths_observed = models.TextField(blank=True)
    areas_for_improvement = models.TextField(blank=True)
    action_items = models.TextField(blank=True)
    appreciation_or_alert = models.CharField(
        max_length=20, choices=AlertType.choices, blank=True,
    )

    # Section F: Signatures
    employee_signed_at = models.DateTimeField(null=True, blank=True)
    manager_signed_at = models.DateTimeField(null=True, blank=True)
    hr_signed_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT,
    )

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

    cycle = models.ForeignKey(
        ReviewCycle, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='appraisals',
    )
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='appraisals',
    )
    reporting_manager = models.ForeignKey(
        Employee, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='appraisals_managed',
    )
    hr_reviewer = models.ForeignKey(
        Employee, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='appraisals_reviewed',
    )

    review_type = models.CharField(max_length=20, choices=ReviewType.choices)
    review_period = models.CharField(max_length=100)
    financial_year = models.CharField(max_length=10)

    # Section B: Monthly Performance Summary (6 or 12 months)
    monthly_summary = models.JSONField(default=list)

    # Section C: Conversion & Efficiency KPIs
    conversion_kpis = models.JSONField(default=list)

    # Section D: Recruiter Competency Assessment (8 competencies)
    recruiter_competencies = models.JSONField(default=list)

    # Section E: Team Lead Competency Assessment (9 competencies)
    team_lead_competencies = models.JSONField(default=list, blank=True)

    # Section F: Self-Assessment Narrative
    self_assessment = models.JSONField(default=dict)

    # Section H: HR Reviewer Assessment
    overall_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    final_rating_category = models.CharField(
        max_length=30, choices=RatingCategory.choices, blank=True,
    )
    key_strengths = models.TextField(blank=True)
    development_areas = models.TextField(blank=True)
    goals_next_period = models.TextField(blank=True)
    training_recommended = models.TextField(blank=True)
    promotion_recommendation = models.TextField(blank=True)
    salary_revision_recommendation = models.TextField(blank=True)
    outcome_decision = models.CharField(
        max_length=30, choices=OutcomeDecision.choices, blank=True,
    )
    additional_hr_remarks = models.TextField(blank=True)

    # Section I: Signatures
    employee_signed_at = models.DateTimeField(null=True, blank=True)
    manager_signed_at = models.DateTimeField(null=True, blank=True)
    hr_signed_at = models.DateTimeField(null=True, blank=True)

    # Eligibility (for six-monthly)
    is_eligible = models.BooleanField(default=False)
    eligibility_reason = models.TextField(blank=True)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT,
    )

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

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='pips',
    )
    triggered_by_monthly = models.ForeignKey(
        MonthlyReview, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='pips',
    )
    triggered_by_appraisal = models.ForeignKey(
        Appraisal, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='pips',
    )

    pip_type = models.CharField(max_length=20, choices=PIPType.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    specific_targets = models.JSONField(default=list)
    weekly_checkins = models.JSONField(default=list)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE,
    )
    outcome = models.TextField(blank=True)

    class Meta:
        db_table = 'performance_pips'
        ordering = ['-start_date']

    def __str__(self):
        return f"PIP: {self.employee} — {self.get_pip_type_display()}"
