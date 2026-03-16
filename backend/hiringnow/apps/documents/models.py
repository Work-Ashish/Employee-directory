from django.db import models

from common.models import BaseModel
from apps.employees.models import Employee


class Document(BaseModel):

    class Category(models.TextChoices):
        POLICY = 'POLICY', 'Policy'
        CONTRACT = 'CONTRACT', 'Contract'
        CERTIFICATE = 'CERTIFICATE', 'Certificate'
        ID_PROOF = 'ID_PROOF', 'ID Proof'
        OTHER = 'OTHER', 'Other'

    title = models.CharField(max_length=300)
    file_url = models.URLField(max_length=500)
    file_type = models.CharField(max_length=50, blank=True)
    size = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        Employee, on_delete=models.SET_NULL, null=True, related_name='uploaded_documents',
    )
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    is_public = models.BooleanField(default=False)

    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']

    def __str__(self):
        return self.title
