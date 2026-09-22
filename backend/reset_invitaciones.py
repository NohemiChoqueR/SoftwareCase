import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'case_backend.settings')
django.setup()

with connection.cursor() as cursor:
    cursor.execute('DROP TABLE IF EXISTS invitaciones_invitation CASCADE;')
    cursor.execute("DELETE FROM django_migrations WHERE app='invitaciones';")
    print("Table and migrations record dropped.")
