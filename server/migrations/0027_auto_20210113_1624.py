# Generated by Django 3.1.5 on 2021-01-13 16:24

import cjwstate.models.module_version
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("server", "0026_fix_duplicated_custom_reports"),
    ]

    operations = [
        migrations.AlterField(
            model_name="delta",
            name="values_for_backward",
            field=models.JSONField(default=dict),
        ),
        migrations.AlterField(
            model_name="delta",
            name="values_for_forward",
            field=models.JSONField(default=dict),
        ),
        migrations.AlterField(
            model_name="moduleversion",
            name="spec",
            field=models.JSONField(
                validators=[
                    cjwstate.models.module_version._django_validate_module_spec
                ],
                verbose_name="spec",
            ),
        ),
        migrations.AlterField(
            model_name="step",
            name="cached_migrated_params",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="step",
            name="params",
            field=models.JSONField(default=dict),
        ),
        migrations.AlterField(
            model_name="step",
            name="secrets",
            field=models.JSONField(default=dict),
        ),
    ]
