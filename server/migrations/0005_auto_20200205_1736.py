# Generated by Django 2.2.10 on 2020-02-05 17:36

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [("server", "0004_auto_20200203_1518")]

    operations = [
        migrations.RemoveField(model_name="storedobject", name="bucket"),
        migrations.RemoveField(model_name="uploadedfile", name="bucket"),
    ]
