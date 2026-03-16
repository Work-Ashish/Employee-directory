from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rbac', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='role',
            name='slug',
            field=models.SlugField(max_length=100, unique=True),
        ),
    ]
