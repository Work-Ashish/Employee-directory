import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='EmploymentType',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('code', models.SlugField(max_length=50, unique=True)),
            ],
            options={
                'db_table': 'employment_types',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Employee',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('employee_code', models.CharField(blank=True, max_length=50, unique=True)),
                ('candidate_id', models.UUIDField(blank=True, db_index=True, null=True)),
                ('offer_id', models.UUIDField(blank=True, db_index=True, null=True)),
                ('first_name', models.CharField(max_length=100)),
                ('last_name', models.CharField(max_length=100)),
                ('email', models.EmailField(max_length=254)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('department', models.CharField(blank=True, max_length=100)),
                ('designation', models.CharField(blank=True, max_length=200)),
                ('location', models.CharField(blank=True, max_length=100)),
                ('start_date', models.DateField(blank=True, null=True)),
                ('joined_at', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(
                    choices=[
                        ('pre_joining', 'Pre Joining'),
                        ('active', 'Active'),
                        ('on_notice', 'On Notice'),
                        ('exited', 'Exited'),
                    ],
                    default='pre_joining',
                    max_length=20,
                )),
                ('exit_date', models.DateField(blank=True, null=True)),
                ('exit_reason', models.CharField(blank=True, max_length=100)),
                ('user', models.OneToOneField(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='employee_profile',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('employment_type', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='employees',
                    to='employees.employmenttype',
                )),
                ('reporting_to', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='direct_reports',
                    to='employees.employee',
                )),
            ],
            options={
                'db_table': 'employees',
                'ordering': ['first_name', 'last_name'],
            },
        ),
    ]
