from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class Reimbursement(BaseModel):

    class Category(models.TextChoices):
        TRAVEL = 'TRAVEL', 'Travel'
        FOOD = 'FOOD', 'Food'
        EQUIPMENT = 'EQUIPMENT', 'Equipment'
        MEDICAL = 'MEDICAL', 'Medical'
        OTHER = 'OTHER', 'Other'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        PAID = 'PAID', 'Paid'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='reimbursements')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=20, choices=Category.choices)
    description = models.TextField(blank=True)
    receipt_url = models.URLField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    approved_by = models.ForeignKey(
        Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_reimbursements',
    )

    class Meta:
        db_table = 'reimbursements'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee} — {self.get_category_display()} ({self.amount})"
