# Generated by Django 2.2.16 on 2020-10-20 18:51

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("server", "0019_auto_20201020_1848"),
    ]

    operations = [
        migrations.RunSQL(
            [
                """
                UPDATE delta
                SET command_name = (
                    SELECT CASE django_content_type.model
                        WHEN 'addmodulecommand' THEN 'AddStep'
                        WHEN 'addtabcommand' THEN 'AddTab'
                        WHEN 'changedataversioncommand' THEN 'SetStepDataVersion'
                        WHEN 'changeparameterscommand' THEN 'SetStepParams'
                        WHEN 'changestepnotescommand' THEN 'SetStepNote'
                        WHEN 'changeworkflowtitlecommand' THEN 'SetWorkflowTitle'
                        WHEN 'deletemodulecommand' THEN 'DeleteStep'
                        WHEN 'deletetabcommand' THEN 'DeleteTab'
                        WHEN 'duplicatetabcommand' THEN 'DuplicateTab'
                        WHEN 'initworkflowcommand' THEN 'InitWorkflow'
                        WHEN 'reordermodulescommand' THEN 'ReorderSteps'
                        WHEN 'reordertabscommand' THEN 'ReorderTabs'
                        WHEN 'settabnamecommand' THEN 'SetTabName'
                        ELSE ''
                        END
                    FROM django_content_type
                    WHERE django_content_type.id = delta.polymorphic_ctype_id
                )
                """
            ],
            elidable=True,
        )
    ]