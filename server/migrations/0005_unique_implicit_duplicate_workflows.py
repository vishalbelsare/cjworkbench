# -*- coding: utf-8 -*-
# Generated by Django 1.11.20 on 2019-04-17 20:09
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('server', '0004_internalize_converttexttonumber'),
    ]

    operations = [
        migrations.RunSQL([
            """
            CREATE UNIQUE INDEX unique_workflow_copy_by_session
            ON server_workflow (anonymous_owner_session_key,
                                original_workflow_id)
            WHERE anonymous_owner_session_key IS NOT NULL
              AND original_workflow_id IS NOT NULL
            """
        ])
    ]
