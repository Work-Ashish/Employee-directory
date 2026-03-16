import uuid
from django.db import models

from common.models import BaseModel
from apps.users.models import User


# role defined per tenant in tenant database
class Role(BaseModel):
    name = models.CharField(max_length = 100)
    slug = models.SlugField(max_length = 100, unique = True)
    description = models.TextField(blank = True)
    is_system = models.BooleanField(default = False)

    class Meta:
        db_table = 'roles'
        ordering = ['name']

    def __str__(self):
        return self.name


# link roles to permission codenames from registry catalog
class RolePermission(models.Model):
    id = models.UUIDField(primary_key = True, default = uuid.uuid4, editable = False)
    role = models.ForeignKey(Role, on_delete = models.CASCADE, related_name = 'role_permissions')
    permission_codename = models.CharField(max_length = 100)
    class Meta:
        db_table = 'role_permissions'
        unique_together = [['role', 'permission_codename']]
    
    def __str__(self):
        return f"{self.role.slug} -> {self.permission_codename}"
    

# assign roles to users in tenant database
class UserRole(models.Model):
    id = models.UUIDField(primary_key  = True, default = uuid.uuid4, editable = False)
    user = models.ForeignKey(User, on_delete = models.CASCADE, related_name = 'user_roles')
    role = models.ForeignKey(Role, on_delete = models.CASCADE, related_name = 'user_roles')

    class Meta:
        db_table = 'user_roles'
        unique_together = [['user', 'role']]

    def __str__(self):
        return f"{self.user.email} -> {self.role.slug}"