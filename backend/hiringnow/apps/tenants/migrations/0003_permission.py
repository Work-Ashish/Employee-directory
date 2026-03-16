from email.policy import default
import uuid
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0002_recruitment_db'),
    ]

    operations = [
        migrations.CreateModel(
            name = 'Permission',
            fields = [
                ('id', models.UUIDField(default = uuid.uuid4, editable = False, primary_key = True, serialize = False)),
                ('codename', models.CharField(max_length = 100, unique = True)),
                ('name', models.CharField(max_length = 255)),
                ('module', models.CharField(max_length = 50)),
                ('created_at', models.DateTimeField(auto_now_add = True)),
                ('updated_at', models.DateTimeField(auto_now = True)),
            ],
            options = {
                'db_table': 'permissions',
                'ordering': ['module', 'codename'],
            },
        ),
    ]