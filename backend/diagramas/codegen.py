"""
Motor de Generación de Código Backend — UMLForge CASE Tool
==========================================================
Versión corregida tras análisis arquitectónico.

PRINCIPIO RECTOR: El diagrama UML es la única fuente de verdad.
- Solo se generan columnas y relaciones explícitamente presentes en el UML.
- Las multiplicidades de las relaciones determinan automáticamente dónde va la FK
  y qué anotaciones JPA corresponden a cada lado — el usuario NO dibuja FKs.
- Los tipos se mapean por coincidencia EXACTA del tipo UML, nunca por el nombre
  del atributo ni por coincidencia de subcadena.

═══════════════════════════════════════════════════════════════════════════════
REGLAS FORMALES DE TRANSFORMACIÓN  (versión 2 — corregida)
═══════════════════════════════════════════════════════════════════════════════

NOMENCLATURA
  R-N1  Clase UML  → PascalCase Java
  R-N2  Atributo/Método → camelCase Java
  R-N3  Tabla SQL  → snake_case plural  (Orden → ordenes)
  R-N4  Columna SQL → snake_case del atributo UML
  R-N5  FK col     → {clase_referenciada_snake}_id

TIPOS  (coincidencia EXACTA del campo "type" del atributo UML)
  R-T01 string/str/varchar/text → Java: String  → SQL: VARCHAR(255)
  R-T02 int/integer             → Java: Integer → SQL: INTEGER
  R-T03 long/bigint             → Java: Long    → SQL: BIGINT
  R-T04 float/real              → Java: Float   → SQL: REAL
  R-T05 double                  → Java: Double  → SQL: DOUBLE PRECISION
  R-T06 decimal/bigdecimal/numeric/money → Java: BigDecimal → SQL: NUMERIC(19,2)
  R-T07 boolean/bool            → Java: Boolean → SQL: BOOLEAN DEFAULT FALSE
  R-T08 date/localdate          → Java: LocalDate → SQL: DATE
  R-T09 datetime/localdatetime/timestamp → Java: LocalDateTime → SQL: TIMESTAMP WITHOUT TIME ZONE
  R-T10 uuid/guid               → Java: UUID    → SQL: UUID DEFAULT gen_random_uuid()
  R-T11 char/character          → Java: Character → SQL: CHAR(1)
  R-T12 text/longtext/clob      → Java: String  → SQL: TEXT
  R-T13 (tipo desconocido)      → Java: String  → SQL: VARCHAR(255)

CLASES
  R-C1  Clase concreta     → @Entity + @Table(name="tabla_sql")
  R-C2  Clase abstracta    → @MappedSuperclass (sin @Table, sin tabla SQL propia)
  R-C3  Clase sin herencia → declara @Id @GeneratedValue(IDENTITY) Long id
  R-C4  Clase hija de abstracta → declara @Id (la superclase no tiene @Id JPA)
  R-C5  Clase hija de concreta → hereda @Id (no lo redeclara)
  R-C6  Cada clase concreta genera Repository + Controller REST

RELACIONES — Pre-análisis único (FK y JPA asignados exactamente una vez)
  R-R1 HERENCIA/GENERALIZACIÓN  source → child, target → parent
       Java: class Child extends Parent  (si parent es @MappedSuperclass: child hereda columnas en SQL)
       SQL:  Solo clases concretas obtienen tabla (TABLE_PER_CLASS)

  R-R2 MANY_TO_ONE  (source_mult=* ó 1..*, target_mult=1 ó 0..1)
       • FK en tabla de SOURCE (el lado Muchos posee la FK)
       • Java source: @ManyToOne @JoinColumn(name="{tgt}_id")
       • Java target: @OneToMany(mappedBy="{campo_en_source}")

  R-R3 ONE_TO_MANY  (source_mult=1 ó 0..1, target_mult=* ó 1..*)
       • FK en tabla de TARGET (el lado Muchos posee la FK)
       • Java source: @OneToMany(mappedBy="{campo_en_target}")
       • Java target: @ManyToOne @JoinColumn(name="{src}_id")

  R-R4 ONE_TO_ONE   (ambos lados no son Many)
       • FK en tabla de SOURCE (owner por convención)
       • Java source: @OneToOne @JoinColumn(name="{tgt}_id", unique=true)
       • Java target: @OneToOne(mappedBy="{campo_en_source}")

  R-R5 MANY_TO_MANY (ambos lados son Many)
       • Tabla intermedia
       • Java source: @ManyToMany @JoinTable(...)
       • Java target: @ManyToMany(mappedBy="{campo_en_source}")

  R-R6 COMPOSICIÓN → cascade=ALL, orphanRemoval=true, ON DELETE CASCADE
  R-R7 AGREGACIÓN  → cascade vacío, orphanRemoval=false, ON DELETE SET NULL
  R-R8 DEPENDENCIA → solo comentario Java, sin campo ni FK SQL

  R-R9 mappedBy = nombre exacto del campo en el lado propietario de la FK
       Propietario @ManyToOne: field = to_camelCase(TargetClassName)
       Propietario @OneToOne:  field = to_camelCase(TargetClassName)
       Propietario @ManyToMany: field = to_camelCase(TargetClassName) + "List"

SQL DDL
  R-S1 Orden: primero tablas sin FK, luego tablas con FK (respetar dependencias)
  R-S2 Columnas SOLO las definidas en UML (no se añaden created_at/updated_at salvo que estén en UML)
  R-S3 Tabla hija en herencia incluye columnas del padre abstracto (TABLE_PER_CLASS)
  R-S4 CONSTRAINT nombre: fk_{tabla_fuente}_{columna_fk}
  R-S5 pgcrypto solo si algún atributo tiene tipo uuid/guid
"""

import re
from typing import Dict, List, Optional, Set, Tuple, Any

# ─────────────────────────────────────────────────────────────────────────────
# Utilidades de nomenclatura
# ─────────────────────────────────────────────────────────────────────────────

def to_snake_case(name: str) -> str:
    """R-N4: CamelCase → snake_case, eliminando caracteres no alfanuméricos."""
    if not name:
        return "campo"
    s1 = re.sub(r'(.)([A-Z][a-z]+)', r'\1_\2', name.strip())
    s2 = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s1).lower()
    result = re.sub(r'[^a-z0-9_]', '_', s2).strip('_')
    return re.sub(r'_+', '_', result) or "campo"


def to_pascal_case(name: str) -> str:
    """R-N1: Cualquier nombre → PascalCase."""
    if not name:
        return "Entidad"
    clean = re.sub(r'[^a-zA-Z0-9]', ' ', name.strip())
    parts = clean.split()
    return ''.join(p[0].upper() + p[1:] if len(p) > 0 else '' for p in parts) if parts else "Entidad"


def to_camel_case(name: str) -> str:
    """R-N2: Cualquier nombre → camelCase."""
    p = to_pascal_case(name)
    return p[0].lower() + p[1:] if p else "campo"


def table_name_for(class_name: str) -> str:
    """R-N3: snake_case plural del nombre de la clase para tabla SQL."""
    sn = to_snake_case(class_name)
    if not sn or sn == "campo":
        return "tablas"
    # Pluralización simple
    if sn.endswith(('a', 'e', 'i', 'o', 'u')):
        return sn + "s"
    if sn.endswith('z'):
        return sn[:-1] + "ces"
    if sn.endswith(('s', 'x')):
        return sn + "es"
    return sn + "s"


def fk_col_name(ref_class_name: str) -> str:
    """R-N5: {snake_class}_id para columnas de clave foránea."""
    return f"{to_snake_case(ref_class_name)}_id"


# ─────────────────────────────────────────────────────────────────────────────
# Mapeo de tipos UML → Java y PostgreSQL  (coincidencia EXACTA — R-T01…R-T13)
# ─────────────────────────────────────────────────────────────────────────────

# Diccionario: clave = tipo UML en minúsculas (exacto), valor = (java_type, sql_type)
_TYPE_MAP: Dict[str, Tuple[str, str]] = {
    # Cadenas
    "string":      ("String",     "VARCHAR(255)"),
    "str":         ("String",     "VARCHAR(255)"),
    "varchar":     ("String",     "VARCHAR(255)"),
    "char":        ("Character",  "CHAR(1)"),
    "character":   ("Character",  "CHAR(1)"),
    "text":        ("String",     "TEXT"),
    "longtext":    ("String",     "TEXT"),
    "clob":        ("String",     "TEXT"),
    # Enteros
    "int":         ("Integer",    "INTEGER"),
    "integer":     ("Integer",    "INTEGER"),
    # Larga
    "long":        ("Long",       "BIGINT"),
    "bigint":      ("Long",       "BIGINT"),
    # Decimales
    "float":       ("Float",      "REAL"),
    "real":        ("Float",      "REAL"),
    "double":      ("Double",     "DOUBLE PRECISION"),
    "decimal":     ("BigDecimal", "NUMERIC(19, 2)"),
    "bigdecimal":  ("BigDecimal", "NUMERIC(19, 2)"),
    "numeric":     ("BigDecimal", "NUMERIC(19, 2)"),
    "money":       ("BigDecimal", "NUMERIC(19, 2)"),
    # Booleanos
    "boolean":     ("Boolean",    "BOOLEAN DEFAULT FALSE"),
    "bool":        ("Boolean",    "BOOLEAN DEFAULT FALSE"),
    # Fechas y tiempos
    "date":        ("LocalDate",      "DATE"),
    "localdate":   ("LocalDate",      "DATE"),
    "datetime":    ("LocalDateTime",  "TIMESTAMP WITHOUT TIME ZONE"),
    "timestamp":   ("LocalDateTime",  "TIMESTAMP WITHOUT TIME ZONE"),
    "localdatetime": ("LocalDateTime","TIMESTAMP WITHOUT TIME ZONE"),
    # UUID
    "uuid":        ("UUID",       "UUID DEFAULT gen_random_uuid()"),
    "guid":        ("UUID",       "UUID DEFAULT gen_random_uuid()"),
    # Void
    "void":        ("void",       None),
}

_UNKNOWN_JAVA = "String"
_UNKNOWN_SQL  = "VARCHAR(255)"


def map_java_type(uml_type: str) -> str:
    """Mapeo EXACTO de tipo UML a tipo Java. Regla 10."""
    key = (uml_type or "string").strip().lower()
    if key in _TYPE_MAP:
        return _TYPE_MAP[key][0]
    return f"Object /* TODO: Revisa el tipo desconocido '{uml_type}' */"


def map_sql_type(uml_type: str) -> str:
    """Mapeo EXACTO de tipo UML a tipo PostgreSQL. Regla 10."""
    key = (uml_type or "string").strip().lower()
    if key in _TYPE_MAP:
        return _TYPE_MAP[key][1]
    return f"VARCHAR(255) /* TODO: Revisa el tipo desconocido '{uml_type}' */"


def _is_uuid_type(uml_type: str) -> bool:
    return (uml_type or "").strip().lower() in ("uuid", "guid")


# ─────────────────────────────────────────────────────────────────────────────
# Clasificación de multiplicidades
# ─────────────────────────────────────────────────────────────────────────────

def _parse_multiplicity(mult: str) -> Tuple[int, float]:
    """
    Parsea una multiplicidad UML en una tupla (limite_inferior, limite_superior).
    Soporta: '*', '0..*', '1..*', '0..1', '1', 'many', 'n', etc. (Regla 2)
    """
    m = (mult or "1").strip().lower()
    if m in ("*", "many", "n"):
        return (0, float('inf'))
    
    if ".." in m:
        parts = m.split("..")
        if len(parts) == 2:
            lower_str, upper_str = parts[0].strip(), parts[1].strip()
            lower = int(lower_str) if lower_str.isdigit() else 0
            upper = float('inf') if upper_str in ("*", "n", "many") else (int(upper_str) if upper_str.isdigit() else float('inf'))
            return (lower, upper)
            
    # Número exacto (ej. '1', '0')
    if m.isdigit():
        val = int(m)
        return (val, val)
        
    return (0, float('inf'))  # Fallback


def _classify_cardinality(src_mult: str, tgt_mult: str) -> Tuple[str, Tuple[int, float], Tuple[int, float]]:
    """
    Determina la cardinalidad y devuelve los límites (lower, upper) de ambos lados.
    """
    src_bounds = _parse_multiplicity(src_mult)
    tgt_bounds = _parse_multiplicity(tgt_mult)
    
    src_many = src_bounds[1] > 1
    tgt_many = tgt_bounds[1] > 1
    
    if src_many and tgt_many:
        kind = "MANY_TO_MANY"
    elif src_many:
        kind = "MANY_TO_ONE"
    elif tgt_many:
        kind = "ONE_TO_MANY"
    else:
        kind = "ONE_TO_ONE"
        
    return kind, src_bounds, tgt_bounds


# ─────────────────────────────────────────────────────────────────────────────
# Estructura de datos para relaciones pre-analizadas
# ─────────────────────────────────────────────────────────────────────────────

def _preanalyze_relationships(
    classes: List[dict],
    relationships: List[dict],
) -> Tuple[
    Dict[str, dict],           # class_by_id
    Dict[str, str],            # parent_map: child_id → parent_class_name
    Dict[str, bool],           # parent_is_abstract: child_id → bool
    Dict[str, List[dict]],     # jpa_fields: class_id → list of JPA field descriptors
    Dict[str, List[dict]],     # sql_fk: class_id → list of FK column descriptors
    List[dict],                # junction_tables
    Dict[str, dict],           # pk_info: class_id → info de la clave primaria
]:
    """
    Pase único sobre las relaciones.
    Determina, para cada clase:
      - jpa_fields: campos JPA (owner y inverse) que debe declarar
      - sql_fk: columnas FK que su tabla SQL debe contener
    Garantiza que cada relación produce exactamente dos entradas JPA (una por lado)
    y exactamente una FK SQL (en el lado correcto).
    """
    class_by_id: Dict[str, dict] = {c["id"]: c for c in classes if c.get("id")}

    parent_map: Dict[str, str] = {}       # child_id → parent class name (PascalCase)
    parent_is_abstract: Dict[str, bool] = {}

    jpa_fields: Dict[str, List[dict]] = {cid: [] for cid in class_by_id}
    sql_fk:     Dict[str, List[dict]] = {cid: [] for cid in class_by_id}
    junction_tables: List[dict] = []
    junction_seen: Set[str] = set()
    
    # ── Identificar PK por clase (Regla 7 y 9) ──────────────────────────────
    pk_info: Dict[str, dict] = {}
    for cid, cls in class_by_id.items():
        attrs = cls.get("attributes", [])
        # Buscar atributo llamado 'id' o marcado como pk (simplificado a nombre 'id' por ahora)
        pk_attr = next((a for a in attrs if (a.get("name") or "").lower() == "id"), None)
        
        if pk_attr:
            uml_type = pk_attr.get("type", "long")
            # Regla 10: Validar tipo desconocido para PK (implícito en map)
            j_type = map_java_type(uml_type)
            s_type = map_sql_type(uml_type)
            
            # Ajuste para SQL PK def
            if j_type == "UUID":
                sql_def = "UUID PRIMARY KEY DEFAULT gen_random_uuid()"
                strategy = "UUID"
            elif j_type in ("String", "Character"):
                sql_def = f"{s_type} PRIMARY KEY"
                strategy = "NONE"
            else:
                sql_def = f"{s_type} PRIMARY KEY"
                strategy = "NONE" # Si el usuario lo define, asume que lo asigna manualmente o usa sequence
            
            pk_info[cid] = {
                "name": "id",
                "java_type": j_type,
                "sql_type": s_type,
                "sql_def": sql_def,
                "strategy": strategy,
                "is_custom": True
            }
        else:
            # ID técnico implícito
            pk_info[cid] = {
                "name": "id",
                "java_type": "Long",
                "sql_type": "BIGINT",
                "sql_def": "BIGSERIAL PRIMARY KEY",
                "strategy": "IDENTITY",
                "is_custom": False
            }

    for rel in relationships:
        rtype   = rel.get("type", "")
        src_id  = rel.get("source_id", "")
        tgt_id  = rel.get("target_id", "")
        src_mult = rel.get("source_multiplicity", "1")
        tgt_mult = rel.get("target_multiplicity", "1")
        is_composition = rtype == "composition"

        # ── Herencia (R-R1) ──────────────────────────────────────────────────
        if rtype in ("inheritance", "generalization"):
            if src_id in class_by_id and tgt_id in class_by_id:
                parent_cls = class_by_id[tgt_id]
                parent_map[src_id]        = to_pascal_case(parent_cls.get("name", ""))
                parent_is_abstract[src_id] = parent_cls.get("is_abstract", False)
            continue

        # ── Dependencia (R-R8) — solo comentario, sin campo ni FK ────────────
        if rtype == "dependency":
            continue

        # Validar que ambos extremos existen en el diagrama
        if src_id not in class_by_id or tgt_id not in class_by_id:
            continue

        src_cls  = class_by_id[src_id]
        tgt_cls  = class_by_id[tgt_id]
        src_name = to_pascal_case(src_cls.get("name", ""))
        tgt_name = to_pascal_case(tgt_cls.get("name", ""))
        src_tbl  = table_name_for(src_name)
        tgt_tbl  = table_name_for(tgt_name)

        cardinality, src_bounds, tgt_bounds = _classify_cardinality(src_mult, tgt_mult)
        
        # ── Nombres semánticos (Regla 9 y 10) ─────────────────────────
        rel_name = (rel.get("name") or rel.get("role") or "").strip()
        if rel_name:
            tgt_field  = to_camel_case(rel_name)
            tgt_fk_col = to_snake_case(rel_name) + "_id"
        else:
            tgt_field  = to_camel_case(tgt_name)
            tgt_fk_col = fk_col_name(tgt_name)
            
        src_field  = to_camel_case(src_name)
        src_fk_col = fk_col_name(src_name)

        # ── MANY_TO_ONE: src=Muchos → tgt=Uno (R-R2) ─────────────────────────
        if cardinality == "MANY_TO_ONE":
            # FK en la tabla SOURCE (el lado Many tiene la FK)
            # Regla 1: La nulabilidad la determina el extremo referenciado (tgt)
            nullable_sql  = tgt_bounds[0] == 0
            nullable_java = "true" if nullable_sql else "false"
            
            # Regla 4: ON DELETE SET NULL solo si permite NULL
            if is_composition:
                on_delete = "ON DELETE CASCADE"
            else:
                on_delete = "ON DELETE SET NULL" if nullable_sql else "ON DELETE RESTRICT"

            # Regla 5: Cascade y orphanRemoval
            cascade_types  = "{CascadeType.ALL}" if is_composition else "{CascadeType.PERSIST, CascadeType.MERGE}"
            orphan_removal = "true" if is_composition else "false"

            sql_fk[src_id].append({
                "col":       tgt_fk_col,
                "ref_table": tgt_tbl,
                "ref_sql_type": pk_info[tgt_id]["sql_type"],
                "nullable":  nullable_sql,
                "unique":    False,
                "on_delete": on_delete,
            })

            # JPA source: @ManyToOne  (propietario de la FK)
            jpa_fields[src_id].append({
                "kind":       "MANY_TO_ONE",
                "target":     tgt_name,
                "field":      tgt_field,
                "fk_col":     tgt_fk_col,
                "nullable":   nullable_java,
                "cascade":    "",  # El lado Many no propaga CASCADE al Padre normalmente
                "orphan":     "",
            })

            # JPA target: @OneToMany inverse  (mappedBy = nombre del campo en source)
            jpa_fields[tgt_id].append({
                "kind":        "ONE_TO_MANY_INVERSE",
                "target":      src_name,
                "field":       src_field + "List",
                "mapped_by":   tgt_field,
                "cascade":     cascade_types,
                "orphan":      orphan_removal,
            })

        # ── ONE_TO_MANY: src=Uno → tgt=Muchos (R-R3) ─────────────────────────
        elif cardinality == "ONE_TO_MANY":
            # FK en la tabla TARGET (el lado Many tiene la FK)
            # Regla 1: La nulabilidad la determina el extremo referenciado (src)
            nullable_sql  = src_bounds[0] == 0
            nullable_java = "true" if nullable_sql else "false"
            
            if is_composition:
                on_delete = "ON DELETE CASCADE"
            else:
                on_delete = "ON DELETE SET NULL" if nullable_sql else "ON DELETE RESTRICT"
                
            cascade_types  = "{CascadeType.ALL}" if is_composition else "{CascadeType.PERSIST, CascadeType.MERGE}"
            orphan_removal = "true" if is_composition else "false"

            sql_fk[tgt_id].append({
                "col":       src_fk_col,
                "ref_table": src_tbl,
                "ref_sql_type": pk_info[src_id]["sql_type"],
                "nullable":  nullable_sql,
                "unique":    False,
                "on_delete": on_delete,
            })

            # JPA source: @OneToMany inverse  (no posee la FK)
            # mappedBy = nombre del campo @ManyToOne en TARGET (campo que apunta a SOURCE)
            jpa_fields[src_id].append({
                "kind":       "ONE_TO_MANY_INVERSE",
                "target":     tgt_name,
                "field":      tgt_field + "List",
                "mapped_by":  src_field,   # R-R9: campo en target que apunta a source
                "cascade":    cascade_types,
                "orphan":     orphan_removal,
            })

            # JPA target: @ManyToOne  (propietario de la FK)
            jpa_fields[tgt_id].append({
                "kind":      "MANY_TO_ONE",
                "target":    src_name,
                "field":     src_field,
                "fk_col":    src_fk_col,
                "nullable":  nullable_java,
                "cascade":   "",  # Regla 5: El lado Many no propaga CASCADE al Padre normalmente
                "orphan":    "",
            })

        # ── ONE_TO_ONE: src owner (R-R4) ──────────────────────────────────────
        elif cardinality == "ONE_TO_ONE":
            # Regla 1: La nulabilidad la determina el extremo referenciado (tgt)
            nullable_sql  = tgt_bounds[0] == 0
            nullable_java = "true" if nullable_sql else "false"
            
            if is_composition:
                on_delete = "ON DELETE CASCADE"
            else:
                on_delete = "ON DELETE SET NULL" if nullable_sql else "ON DELETE RESTRICT"
                
            cascade_types = "{CascadeType.ALL}" if is_composition else "{CascadeType.PERSIST, CascadeType.MERGE}"

            sql_fk[src_id].append({
                "col":       tgt_fk_col,
                "ref_table": tgt_tbl,
                "ref_sql_type": pk_info[tgt_id]["sql_type"],
                "nullable":  nullable_sql,
                "unique":    True,
                "on_delete": on_delete,
            })

            # JPA source: @OneToOne owner
            jpa_fields[src_id].append({
                "kind":     "ONE_TO_ONE_OWNER",
                "target":   tgt_name,
                "field":    tgt_field,
                "fk_col":   tgt_fk_col,
                "nullable": nullable_java,
                "cascade":  f"cascade = {cascade_types}",
            })

            # JPA target: @OneToOne inverse
            jpa_fields[tgt_id].append({
                "kind":      "ONE_TO_ONE_INVERSE",
                "target":    src_name,
                "field":     src_field,
                "mapped_by": tgt_field,  # R-R9: campo en source
            })

        # ── MANY_TO_MANY: tabla intermedia (R-R5) ────────────────────────────
        elif cardinality == "MANY_TO_MANY":
            # Regla 10: Usa el nombre de la relación para la tabla si está disponible
            if rel_name:
                j_name = to_snake_case(rel_name)
            else:
                j_name = "_".join(sorted([src_tbl, tgt_tbl]))
                
            if j_name not in junction_seen:
                junction_seen.add(j_name)
                junction_tables.append({
                    "name":      j_name,
                    "src_tbl":   src_tbl,
                    "tgt_tbl":   tgt_tbl,
                    "src_name":  src_name,
                    "tgt_name":  tgt_name,
                    "src_sql_type": pk_info[src_id]["sql_type"],
                    "tgt_sql_type": pk_info[tgt_id]["sql_type"],
                })

            # JPA source: @ManyToMany owner
            jpa_fields[src_id].append({
                "kind":    "MANY_TO_MANY_OWNER",
                "target":  tgt_name,
                "field":   tgt_field + "List",
                "join_table": j_name,
                "src_fk":  src_fk_col,
                "tgt_fk":  tgt_fk_col,
            })

            # JPA target: @ManyToMany inverse
            jpa_fields[tgt_id].append({
                "kind":      "MANY_TO_MANY_INVERSE",
                "target":    src_name,
                "field":     src_field + "List",
                "mapped_by": tgt_field + "List",  # R-R9: campo en source
            })

    return class_by_id, parent_map, parent_is_abstract, jpa_fields, sql_fk, junction_tables, pk_info


# ─────────────────────────────────────────────────────────────────────────────
# Dispatcher (compatible con llamadas estáticas e instanciadas)
# ─────────────────────────────────────────────────────────────────────────────

class _GenerateAllDispatcher:
    def __get__(self, instance, owner):
        if instance is not None:
            def _inst(semantic_data=None, diagram_name=None):
                d = semantic_data if semantic_data is not None else instance.semantic_data
                n = diagram_name  if diagram_name  is not None else instance.diagram_name
                return owner._execute_generate_all(d, n)
            return _inst
        else:
            def _cls(semantic_data, diagram_name="Diagrama UML"):
                return owner._execute_generate_all(semantic_data, diagram_name)
            return _cls


# ─────────────────────────────────────────────────────────────────────────────
# Motor principal
# ─────────────────────────────────────────────────────────────────────────────

class BackendCodeGenerator:
    """
    Transforma el metamodelo semántico UML 2.5 en:
      1. Java 17 / Spring Boot 3.x — Entities, Repositories, Controllers
      2. PostgreSQL 14+ DDL — schema.sql

    El UML es la única fuente de verdad: solo se generan columnas/campos/FKs
    que están explícitamente en el diagrama.

    Uso estático (desde views.py):
        BackendCodeGenerator.generate_all(diagram.semantic_data, diagram.name)

    Uso instanciado (tests):
        gen = BackendCodeGenerator(data, name)
        gen.generate_spring_boot_code()
        gen.generate_sql()
    """

    def __init__(self, semantic_data: Optional[dict] = None, diagram_name: str = "Diagrama UML"):
        self.semantic_data = semantic_data or {}
        self.diagram_name  = diagram_name
        self.classes       = self.semantic_data.get("classes", [])
        self.relationships = self.semantic_data.get("relationships", [])

    generate_all = _GenerateAllDispatcher()

    @classmethod
    def _execute_generate_all(cls, semantic_data: dict, diagram_name: str = "Diagrama UML") -> dict:
        classes       = semantic_data.get("classes", [])
        relationships = semantic_data.get("relationships", [])
        return {
            "diagram_name":        diagram_name,
            "classes_count":       len(classes),
            "relationships_count": len(relationships),
            "spring_boot":         cls._gen_spring_boot(classes, relationships, diagram_name),
            "sql":                 cls._gen_sql(classes, relationships, diagram_name),
        }

    def generate_spring_boot_code(self) -> str:
        return self._gen_spring_boot(self.classes, self.relationships, self.diagram_name)

    def generate_sql(self) -> str:
        return self._gen_sql(self.classes, self.relationships, self.diagram_name)

    # ═════════════════════════════════════════════════════════════════════════
    # GENERADOR SPRING BOOT / JAVA
    # ═════════════════════════════════════════════════════════════════════════

    @classmethod
    def _gen_spring_boot(cls, classes: List[dict], relationships: List[dict], diagram_name: str) -> str:
        if not classes:
            return (
                "// No hay clases definidas en el diagrama.\n"
                "// Agrega al menos una clase al lienzo UML y vuelve a generar.\n"
            )

        (class_by_id, parent_map, parent_is_abstract,
         jpa_fields, sql_fk, junction_tables, pk_info) = _preanalyze_relationships(classes, relationships)

        sections: List[str] = []

        # ── Encabezado ──────────────────────────────────────────────────────
        sections.append(
            "// ==============================================================================\n"
            f"// Generado por UMLForge — Diagrama: {diagram_name}\n"
            "// Stack: Java 17+ | Spring Boot 3.x | Jakarta Persistence | Spring Data JPA\n"
            "// Separador de archivos: '// --- NombreClase.java ---'\n"
            "// =============================================================================="
        )

        # ── application.properties ──────────────────────────────────────────
        sections.append(cls._gen_application_properties(diagram_name))

        # ── pom.xml (fragmento de dependencias) ─────────────────────────────
        sections.append(cls._gen_pom_xml())

        # ── Entidades JPA ───────────────────────────────────────────────────
        for uml_class in classes:
            cid        = uml_class.get("id", "")
            class_name = to_pascal_case(uml_class.get("name", "Entidad"))
            is_abstract = uml_class.get("is_abstract", False)
            attributes  = uml_class.get("attributes", [])
            methods     = uml_class.get("methods", [])
            parent_name = parent_map.get(cid)
            parent_abstract = parent_is_abstract.get(cid, False)
            tbl = table_name_for(class_name)

            lines: List[str] = []
            lines.append(f"// --- {class_name}.java ---")
            lines.append("package com.example.model;\n")

            # Importaciones
            lines.append("import jakarta.persistence.*;")
            lines.append("import java.io.Serializable;")
            # Solo importar tipos usados
            attr_types = {attr.get("type", "") for attr in attributes}
            rel_ret_types = {m.get("return_type", "") for m in methods}
            all_types = attr_types | rel_ret_types
            if any(_is_uuid_type(t) for t in all_types):
                lines.append("import java.util.UUID;")
            if any(map_java_type(t) in ("LocalDate",)       for t in all_types if t):
                lines.append("import java.time.LocalDate;")
            if any(map_java_type(t) in ("LocalDateTime",)   for t in all_types if t):
                lines.append("import java.time.LocalDateTime;")
            if any(map_java_type(t) in ("BigDecimal",)      for t in all_types if t):
                lines.append("import java.math.BigDecimal;")
            # Importar List si hay relaciones o colecciones
            fields_for_class = jpa_fields.get(cid, [])
            has_collections = any(f["kind"] in ("ONE_TO_MANY_INVERSE", "MANY_TO_MANY_OWNER", "MANY_TO_MANY_INVERSE")
                                  for f in fields_for_class)
            if has_collections:
                lines.append("import java.util.List;")
                lines.append("import java.util.ArrayList;")
            lines.append("import lombok.Getter;")
            lines.append("import lombok.Setter;")
            lines.append("import lombok.NoArgsConstructor;")
            
            # Import Jackson para evitar recursión (Regla 13)
            if jpa_fields.get(cid):
                lines.append("import com.fasterxml.jackson.annotation.JsonIgnore;\n")
            else:
                lines.append("\n")

            # ── Declaración de clase ──────────────────────────────────────
            if is_abstract:
                # R-C2: abstracta → @MappedSuperclass
                lines.append("@MappedSuperclass")
                lines.append("@Getter @Setter @NoArgsConstructor")
                lines.append(f"public abstract class {class_name} implements Serializable {{")
            else:
                lines.append("@Entity")
                lines.append(f'@Table(name = "{tbl}")')
                lines.append("@Getter @Setter @NoArgsConstructor")
                if parent_name:
                    lines.append(f"public class {class_name} extends {parent_name} implements Serializable {{")
                else:
                    lines.append(f"public class {class_name} implements Serializable {{")

            # ── ID primario (R-C3, R-C4, R-C5) ──────────────────────────
            # Se declara si: no tiene padre, O si hereda de clase abstracta
            # (la abstracta NO tiene @Id en JPA, así que el hijo concreto lo necesita)
            my_pk = pk_info.get(cid, {})
            pk_java = my_pk.get("java_type", "Long")
            pk_name = my_pk.get("name", "id")
            
            if not parent_name or parent_abstract:
                lines.append("")
                if not my_pk.get("is_custom"):
                    lines.append("    // ID técnico implícito generado por UMLForge")
                lines.append("    @Id")
                
                if my_pk.get("strategy") == "IDENTITY":
                    lines.append("    @GeneratedValue(strategy = GenerationType.IDENTITY)")
                elif my_pk.get("strategy") == "UUID":
                    lines.append("    @GeneratedValue(strategy = GenerationType.UUID)")
                
                lines.append(f"    private {pk_java} {pk_name};")

            # ── Atributos propios (R-T01…R-T13) ──────────────────────────
            for attr in attributes:
                attr_raw   = attr.get("name", "campo")
                attr_java  = to_camel_case(attr_raw)
                if attr_java.lower() == "id":
                    continue   # ya declarado arriba
                java_type = map_java_type(attr.get("type", "string"))
                col_name  = to_snake_case(attr_raw)
                lines.append("")
                lines.append(f'    @Column(name = "{col_name}")')
                lines.append(f"    private {java_type} {attr_java};")

            # ── Campos JPA de relaciones ──────────────────────────────────
            for jf in fields_for_class:
                kind   = jf["kind"]
                target = jf["target"]
                field  = jf["field"]
                lines.append("")

                if kind == "MANY_TO_ONE":
                    cascade_ann = f", {jf['cascade']}" if jf.get("cascade") else ""
                    lines.append(f"    @ManyToOne(optional = {jf['nullable']}{cascade_ann})")
                    lines.append(f'    @JoinColumn(name = "{jf["fk_col"]}", nullable = {jf["nullable"]})')
                    lines.append(f"    private {target} {field};")

                elif kind == "ONE_TO_MANY_INVERSE":
                    lines.append("    @JsonIgnore  // Regla 13: Evita recursión infinita en JSON")
                    lines.append(f'    @OneToMany(mappedBy = "{jf["mapped_by"]}", cascade = {jf["cascade"]}, orphanRemoval = {jf["orphan"]})')
                    lines.append(f"    private List<{target}> {field} = new ArrayList<>();")

                elif kind == "ONE_TO_ONE_OWNER":
                    cascade_ann = f", {jf['cascade']}" if jf.get("cascade") else ""
                    lines.append(f"    @OneToOne(optional = {jf['nullable']}{cascade_ann})")
                    lines.append(f'    @JoinColumn(name = "{jf["fk_col"]}", nullable = {jf["nullable"]}, unique = true)')
                    lines.append(f"    private {target} {field};")

                elif kind == "ONE_TO_ONE_INVERSE":
                    lines.append("    @JsonIgnore")
                    lines.append(f'    @OneToOne(mappedBy = "{jf["mapped_by"]}")')
                    lines.append(f"    private {target} {field};")

                elif kind == "MANY_TO_MANY_OWNER":
                    lines.append(f"    @ManyToMany")
                    lines.append(f"    @JoinTable(")
                    lines.append(f'        name = "{jf["join_table"]}",')
                    lines.append(f'        joinColumns        = @JoinColumn(name = "{jf["src_fk"]}"),')
                    lines.append(f'        inverseJoinColumns = @JoinColumn(name = "{jf["tgt_fk"]}")')
                    lines.append(f"    )")
                    lines.append(f"    private List<{target}> {field} = new ArrayList<>();")

                elif kind == "MANY_TO_MANY_INVERSE":
                    lines.append("    @JsonIgnore")
                    lines.append(f'    @ManyToMany(mappedBy = "{jf["mapped_by"]}")')
                    lines.append(f"    private List<{target}> {field} = new ArrayList<>();")

            # ── Stubs de métodos UML (Regla 12) ───────────────────────────
            if methods:
                lines.append("")
                lines.append("    // ── Métodos UML — implementar lógica de negocio ──")
                for method in methods:
                    m_java   = to_camel_case(method.get("name", "operacion"))
                    raw_ret  = method.get("return_type", "void") or "void"
                    m_ret    = map_java_type(raw_ret) if raw_ret.lower() != "void" else "void"
                    
                    params = method.get("parameters", [])
                    param_strs = []
                    for p in params:
                        p_name = to_camel_case(p.get("name", "param"))
                        p_type = map_java_type(p.get("type", "string"))
                        param_strs.append(f"{p_type} {p_name}")
                    
                    p_str = ", ".join(param_strs)
                    
                    lines.append(f"    public {m_ret} {m_java}({p_str}) {{")
                    if m_ret == "void":
                        lines.append("        // TODO: implementar")
                    elif m_ret in ("Boolean",):
                        lines.append("        return false;")
                    elif m_ret in ("Integer", "Long", "Float", "Double"):
                        lines.append("        return 0;")
                    else:
                        lines.append("        return null;")
                    lines.append("    }")

            lines.append("}")
            sections.append("\n".join(lines))

            # ── Repository y Controller (solo clases concretas — R-C6) ───
            if not is_abstract:
                my_pk = pk_info.get(cid, {})
                pk_jtype = my_pk.get("java_type", "Long")
                pk_jname = my_pk.get("name", "id")
                sections.append(cls._gen_repository(class_name, pk_jtype))
                sections.append(cls._gen_controller(class_name, pk_jtype, pk_jname))

        return "\n\n".join(sections).strip() + "\n"

    # ── Generadores de archivos de soporte ───────────────────────────────────

    @classmethod
    def _gen_application_properties(cls, diagram_name: str) -> str:
        app_name = to_snake_case(diagram_name) or "app"
        return "\n".join([
            "// --- application.properties ---",
            f"spring.application.name={app_name}",
            "",
            "# Variables de entorno — configúralas en tu servidor o archivo .env",
            "spring.datasource.url=jdbc:postgresql://localhost:5432/${DB_NAME:mi_base_datos}",
            "spring.datasource.username=${DB_USER:postgres}",
            "spring.datasource.password=${DB_PASS:changeme}",
            "spring.datasource.driver-class-name=org.postgresql.Driver",
            "",
            "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
            "spring.jpa.hibernate.ddl-auto=validate",
            "spring.jpa.show-sql=false",
            "spring.jpa.properties.hibernate.format_sql=true",
            "spring.jackson.serialization.write-dates-as-timestamps=false",
        ])

    @classmethod
    def _gen_pom_xml(cls) -> str:
        return "\n".join([
            "<!-- --- pom.xml (fragmento de dependencias) --- -->",
            "<dependencies>",
            "    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>",
            "    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>",
            "    <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><scope>runtime</scope></dependency>",
            "    <dependency><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId><optional>true</optional></dependency>",
            "    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>",
            "</dependencies>",
        ])

    @classmethod
    def _gen_repository(cls, class_name: str, pk_type: str = "Long") -> str:
        return "\n".join([
            f"// --- {class_name}Repository.java ---",
            "package com.example.repository;\n",
            f"import com.example.model.{class_name};",
            "import org.springframework.data.jpa.repository.JpaRepository;",
            "import org.springframework.stereotype.Repository;\n",
            "@Repository",
            f"public interface {class_name}Repository extends JpaRepository<{class_name}, {pk_type}> {{",
            "    // findAll(), findById(), save(), deleteById() → generados automáticamente",
            "}",
        ])

    @classmethod
    def _gen_controller(cls, class_name: str, pk_type: str = "Long", pk_name: str = "id") -> str:
        field    = to_camel_case(class_name)
        repo     = f"{field}Repository"
        tbl      = table_name_for(class_name)
        id_path  = "/{id}"
        setter_name = "set" + pk_name[0].upper() + pk_name[1:]
        return "\n".join([
            f"// --- {class_name}Controller.java ---",
            "package com.example.controller;\n",
            f"import com.example.model.{class_name};",
            f"import com.example.repository.{class_name}Repository;",
            "import org.springframework.http.ResponseEntity;",
            "import org.springframework.web.bind.annotation.*;",
            "import java.util.List;\n",
            "@RestController",
            f'@RequestMapping("/api/{tbl}")',
            f"public class {class_name}Controller {{",
            "",
            f"    private final {class_name}Repository {repo};",
            "",
            f"    public {class_name}Controller({class_name}Repository {repo}) {{",
            f"        this.{repo} = {repo};",
            "    }",
            "",
            f"    // GET  /api/{tbl}",
            "    @GetMapping",
            f"    public List<{class_name}> findAll() {{",
            f"        return {repo}.findAll();",
            "    }",
            "",
            f"    // GET  /api/{tbl}/:id",
            '    @GetMapping("/{id}")',
            f"    public ResponseEntity<{class_name}> findById(@PathVariable {pk_type} id) {{",
            f"        return {repo}.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());",
            "    }",
            "",
            f"    // POST /api/{tbl}",
            "    @PostMapping",
            f"    public {class_name} create(@RequestBody {class_name} entity) {{",
            f"        return {repo}.save(entity);",
            "    }",
            "",
            f"    // PUT  /api/{tbl}/:id",
            '    @PutMapping("/{id}")',
            f"    public ResponseEntity<{class_name}> update(@PathVariable {pk_type} id, @RequestBody {class_name} entity) {{",
            f"        if (!{repo}.existsById(id)) return ResponseEntity.notFound().build();",
            f"        entity.{setter_name}(id);",
            f"        return ResponseEntity.ok({repo}.save(entity));",
            "    }",
            "",
            f"    // DELETE /api/{tbl}/:id",
            '    @DeleteMapping("/{id}")',
            f"    public ResponseEntity<Void> delete(@PathVariable {pk_type} id) {{",
            f"        if (!{repo}.existsById(id)) return ResponseEntity.notFound().build();",
            f"        {repo}.deleteById(id);",
            "        return ResponseEntity.noContent().build();",
            "    }",
            "}",
        ])



    # ═════════════════════════════════════════════════════════════════════════
    # GENERADOR SQL DDL — PostgreSQL 14+
    # ═════════════════════════════════════════════════════════════════════════

    @classmethod
    def _gen_sql(cls, classes: List[dict], relationships: List[dict], diagram_name: str) -> str:
        if not classes:
            return (
                "-- No hay clases definidas en el diagrama.\n"
                "-- Agrega al menos una clase al lienzo UML y vuelve a generar.\n"
            )

        (class_by_id, parent_map, parent_is_abstract,
         jpa_fields, sql_fk, junction_tables, pk_info) = _preanalyze_relationships(classes, relationships)

        # ── Detectar si hay herencia (R-R1 / R-S3) ──────────────────────────
        has_inheritance = bool(parent_map)

        # ── Columnas heredadas para TABLE_PER_CLASS (solo si hay herencia) ──
        def get_inherited_attrs(cid: str, visited: Optional[Set[str]] = None) -> List[dict]:
            if not has_inheritance:
                return []
            visited = visited or set()
            if cid in visited:
                return []
            visited.add(cid)
            pid = None
            for rel in relationships:
                if rel.get("type") in ("inheritance", "generalization") and rel.get("source_id") == cid:
                    pid = rel.get("target_id")
                    break
            if not pid or pid not in class_by_id:
                return []
            parent_attrs = class_by_id[pid].get("attributes", [])
            return parent_attrs + get_inherited_attrs(pid, visited)

        # ── Detectar si se necesita pgcrypto (R-S5) ──────────────────────────
        needs_pgcrypto = any(
            _is_uuid_type(attr.get("type", ""))
            for cls_data in classes
            for attr in cls_data.get("attributes", [])
        )

        # ── Solo clases concretas tienen tabla (R-C2, R-R1) ─────────────────
        concrete = [c for c in classes if not c.get("is_abstract", False)]

        # ── Orden Topológico (Regla 12 / R-S1) ─────────────────────────
        table_to_id = {table_name_for(c.get("name", "")): c.get("id", "") for c in concrete}
        
        # Construir grafo de dependencias: cid -> conjunto de cids de los que depende
        deps = {c.get("id", ""): set() for c in concrete}
        for cid in deps.keys():
            for fk in sql_fk.get(cid, []):
                ref_id = table_to_id.get(fk["ref_table"])
                if ref_id and ref_id != cid: # Ignorar auto-referencias para el orden (se pueden crear)
                    deps[cid].add(ref_id)
        
        ordered = []
        remaining = set(deps.keys())
        
        while remaining:
            # Nodos sin dependencias pendientes
            ready = {cid for cid in remaining if not (deps[cid] & remaining)}
            if not ready:
                # Ciclo detectado: forzar resolución rompiendo el ciclo 
                # (TODO: Idealmente se separaría la FK en un ALTER TABLE ADD CONSTRAINT posterior)
                ready = {list(remaining)[0]}
            
            # Ordenar para determinismo
            for cid in sorted(list(ready)):
                ordered.append(next(c for c in concrete if c.get("id") == cid))
                remaining.remove(cid)

        lines: List[str] = []
        lines.append("-- ==============================================================================")
        lines.append(f"-- PostgreSQL DDL — UMLForge — Diagrama: {diagram_name}")
        lines.append("-- Dialecto: PostgreSQL 14+")
        if has_inheritance:
            lines.append("-- Estrategia de herencia: TABLE_PER_CLASS")
        lines.append("-- Ejecutar: psql -U usuario -d base_datos -f schema.sql")
        lines.append("-- ==============================================================================")
        lines.append("")

        if needs_pgcrypto:
            lines.append("-- Extensión necesaria para tipo UUID (solo se carga si algún atributo usa UUID)")
            lines.append("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
            lines.append("")

        for uml_class in ordered:
            cid        = uml_class.get("id", "")
            class_name = uml_class.get("name", "tabla")
            tbl        = table_name_for(class_name)
            own_attrs  = uml_class.get("attributes", [])
            inherited  = get_inherited_attrs(cid)

            lines.append(f"-- Tabla: {tbl}  (clase UML: {class_name})")
            lines.append(f"CREATE TABLE IF NOT EXISTS {tbl} (")

            col_lines: List[str] = []
            
            # Usar definición exacta de PK (Regla 9)
            my_pk = pk_info.get(cid, {})
            sql_def = my_pk.get("sql_def", "BIGSERIAL PRIMARY KEY")
            pk_name = my_pk.get("name", "id")
            
            if not my_pk.get("is_custom"):
                col_lines.append(f"    -- ID técnico implícito generado por UMLForge")
            col_lines.append(f"    {pk_name} {sql_def}")

            # Atributos heredados del padre (solo en TABLE_PER_CLASS — R-S3)
            for attr in inherited:
                attr_name = to_snake_case(attr.get("name", "campo"))
                if attr_name == "id":
                    continue
                sql_t = map_sql_type(attr.get("type", "string"))
                if sql_t:
                    col_lines.append(f"    {attr_name} {sql_t}")

            # Atributos propios (R-S2: solo los del UML)
            for attr in own_attrs:
                attr_name = to_snake_case(attr.get("name", "campo"))
                if attr_name == "id":
                    continue
                sql_t = map_sql_type(attr.get("type", "string"))
                if sql_t:
                    col_lines.append(f"    {attr_name} {sql_t}")

            # FKs derivadas de las relaciones (R-R2, R-R3, R-R4)
            for fk in sql_fk.get(cid, []):
                fk_col   = fk["col"]
                ref_tbl  = fk["ref_table"]
                ref_sql_type = fk.get("ref_sql_type", "BIGINT")
                unique   = " UNIQUE" if fk.get("unique") else ""
                not_null = "" if fk.get("nullable", True) else " NOT NULL"
                on_del   = fk["on_delete"]
                cname    = f"fk_{tbl}_{fk_col}"
                col_lines.append(f"    {fk_col} {ref_sql_type}{not_null}{unique}")
                col_lines.append(f"    CONSTRAINT {cname} FOREIGN KEY ({fk_col}) REFERENCES {ref_tbl}(id) {on_del}")

            # Formatear: todas las líneas excepto la última llevan coma
            for i, col in enumerate(col_lines):
                suffix = "," if i < len(col_lines) - 1 else ""
                lines.append(col + suffix)

            lines.append(");")
            lines.append("")

        # ── Tablas intermedias N:M (al final — R-S1) ─────────────────────────
        for junc in junction_tables:
            j_name  = junc["name"]
            s_tbl   = junc["src_tbl"]
            t_tbl   = junc["tgt_tbl"]
            s_name  = junc["src_name"]
            t_name  = junc["tgt_name"]
            s_fk    = fk_col_name(s_name)
            t_fk    = fk_col_name(t_name)
            s_type  = junc.get("src_sql_type", "BIGINT")
            t_type  = junc.get("tgt_sql_type", "BIGINT")
            lines.append(f"-- Tabla intermedia N:M: {s_name} ↔ {t_name}")
            lines.append(f"CREATE TABLE IF NOT EXISTS {j_name} (")
            lines.append(f"    {s_fk} {s_type} NOT NULL,")
            lines.append(f"    {t_fk} {t_type} NOT NULL,")
            lines.append(f"    CONSTRAINT fk_{j_name}_{s_fk} FOREIGN KEY ({s_fk}) REFERENCES {s_tbl}(id) ON DELETE CASCADE,")
            lines.append(f"    CONSTRAINT fk_{j_name}_{t_fk} FOREIGN KEY ({t_fk}) REFERENCES {t_tbl}(id) ON DELETE CASCADE,")
            lines.append(f"    CONSTRAINT pk_{j_name} PRIMARY KEY ({s_fk}, {t_fk})")
            lines.append(");")
            lines.append("")

        return "\n".join(lines).strip() + "\n"
