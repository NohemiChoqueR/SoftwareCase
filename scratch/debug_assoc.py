import json
import os
import sys

sys.path.insert(0, os.getcwd())

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'case_backend.settings')
django.setup()

from diagramas.models import Diagram
from diagramas.codegen import _preanalyze_relationships

diagram = Diagram.objects.first()
semantic = diagram.semantic_data

classes = semantic.get('classes', [])
relationships = semantic.get('relationships', [])

print("--- RELATIONSHIPS ---")
for r in relationships:
    print(f"ID: {r.get('id')}, TYPE: {r.get('type')}, SRC: {r.get('source_id')}, TGT: {r.get('target_id')}")

try:
    class_by_id, parent_map, parent_is_abstract, jpa_fields, sql_fk, junction_tables, pk_info = _preanalyze_relationships(classes, relationships)
    print("\n--- ACTIVE RELS EXPECTED ---")
    
    print("\n--- JUNCTION TABLES ---")
    for j in junction_tables:
        print(j)
    
    print("\n--- SQL FK ---")
    import pprint
    pprint.pprint(sql_fk)
except Exception as e:
    import traceback
    traceback.print_exc()
