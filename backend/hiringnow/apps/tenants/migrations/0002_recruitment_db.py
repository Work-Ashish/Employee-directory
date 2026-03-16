from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='db_name',
            field=models.CharField(default='', max_length=100, unique=True),
            preserve_default=False,
        ),
    ]
