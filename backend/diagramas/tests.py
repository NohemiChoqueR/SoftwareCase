from django.test import TestCase
from diagramas.codegen import BackendCodeGenerator


class BackendCodeGeneratorTestCase(TestCase):
    """
    Suite de pruebas para verificar todas las reglas formales de generación.
    Cubre los 6 bugs identificados en el análisis arquitectónico.
    """

    def setUp(self):
        """
        Diagrama E-Commerce con:
          - Persona (abstracta)  → base de Cliente
          - Cliente (concreto)   extiende Persona
          - Mascota (concreto)   — relación 0..* con Cliente (un Cliente tiene muchas Mascotas)
          - Orden (concreto)     — composición N:1 hacia Cliente (Orden pertenece a Cliente)
          - Producto (concreto)  — relación N:M con Orden
        """
        self.sample_semantic_data = {
            "classes": [
                {
                    "id": "c1",
                    "name": "Persona",
                    "is_abstract": True,
                    "attributes": [
                        {"name": "nombre",           "type": "String"},
                        {"name": "email",            "type": "String"},
                        {"name": "fecha_nacimiento", "type": "date"},   # R-T08: date → DATE
                    ],
                    "methods": [
                        {"name": "getFullName", "return_type": "String"},
                    ],
                },
                {
                    "id": "c2",
                    "name": "Cliente",
                    "is_abstract": False,
                    "attributes": [
                        {"name": "saldo",  "type": "decimal"},
                        {"name": "activo", "type": "boolean"},
                    ],
                    "methods": [],
                },
                {
                    "id": "c3",
                    "name": "Mascota",
                    "is_abstract": False,
                    "attributes": [
                        {"name": "nombre",    "type": "String"},
                        {"name": "especie",   "type": "String"},
                        {"name": "fecha_nac", "type": "date"},   # debe mapearse a DATE, no TIMESTAMP
                    ],
                    "methods": [],
                },
                {
                    "id": "c4",
                    "name": "Orden",
                    "is_abstract": False,
                    "attributes": [
                        {"name": "numero_orden",  "type": "String"},
                        {"name": "total",         "type": "decimal"},
                        {"name": "fecha_creacion","type": "datetime"},  # R-T09: datetime → TIMESTAMP
                    ],
                    "methods": [],
                },
                {
                    "id": "c5",
                    "name": "Producto",
                    "is_abstract": False,
                    "attributes": [
                        {"name": "nombre", "type": "String"},
                        {"name": "precio", "type": "decimal"},
                    ],
                    "methods": [],
                },
            ],
            "relationships": [
                # R-R1: Cliente hereda de Persona (abstracta)
                {
                    "id": "r1",
                    "type": "inheritance",
                    "source_id": "c2",  # hijo
                    "target_id": "c1",  # padre abstracto
                },
                # R-R3 ONE_TO_MANY: Cliente(1) → Mascota(0..*) — bug crítico
                # FK debe ir en tabla mascotas, @ManyToOne en Mascota, @OneToMany en Cliente
                {
                    "id": "r2",
                    "type": "association",
                    "source_id": "c2",  # Cliente (uno)
                    "target_id": "c3",  # Mascota (muchos)
                    "source_multiplicity": "1",
                    "target_multiplicity": "0..*",
                },
                # R-R2 MANY_TO_ONE: Orden(*) → Cliente(1) — composición
                {
                    "id": "r3",
                    "type": "composition",
                    "source_id": "c4",  # Orden (muchos)
                    "target_id": "c2",  # Cliente (uno)
                    "source_multiplicity": "*",
                    "target_multiplicity": "1",
                },
                # R-R5 MANY_TO_MANY: Orden(*) ↔ Producto(*)
                {
                    "id": "r4",
                    "type": "association",
                    "source_id": "c4",  # Orden
                    "target_id": "c5",  # Producto
                    "source_multiplicity": "*",
                    "target_multiplicity": "*",
                },
            ],
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Test 1: Estructura básica del resultado
    # ─────────────────────────────────────────────────────────────────────────
    def test_codegen_produces_spring_boot_and_sql(self):
        generator = BackendCodeGenerator(self.sample_semantic_data, diagram_name="E-Commerce")
        result = generator.generate_all()

        self.assertIn("spring_boot", result)
        self.assertIn("sql", result)
        self.assertNotIn("fastapi", result)
        self.assertEqual(result["classes_count"], 5)
        self.assertEqual(result["relationships_count"], 4)

    # ─────────────────────────────────────────────────────────────────────────
    # Test 2: Clases concretas y abstractas (R-C1, R-C2)
    # ─────────────────────────────────────────────────────────────────────────
    def test_abstract_class_generates_mapped_superclass(self):
        code = BackendCodeGenerator(self.sample_semantic_data).generate_spring_boot_code()
        # Persona abstracta → @MappedSuperclass, sin @Entity ni @Table
        self.assertIn("@MappedSuperclass", code)
        self.assertIn("public abstract class Persona", code)
        self.assertNotIn('@Table(name = "personas")', code)

    def test_concrete_class_inheriting_generates_extends(self):
        code = BackendCodeGenerator(self.sample_semantic_data).generate_spring_boot_code()
        # Cliente hereda de Persona (abstracta) → declara @Id propio (R-C4)
        self.assertIn("public class Cliente extends Persona", code)
        self.assertIn('@Table(name = "clientes")', code)

    # ─────────────────────────────────────────────────────────────────────────
    # Test 3: BUG #1 — ONE_TO_MANY: FK en tabla Many + @ManyToOne en clase Many
    # ─────────────────────────────────────────────────────────────────────────
    def test_one_to_many_generates_manytoone_in_target_class(self):
        """
        Relación Cliente(1) → Mascota(0..*):
        - Mascota DEBE tener @ManyToOne + @JoinColumn(cliente_id)
        - Cliente DEBE tener @OneToMany(mappedBy="cliente")
        Bug: antes Mascota no recibía ningún campo JPA de esta relación.
        """
        code = BackendCodeGenerator(self.sample_semantic_data).generate_spring_boot_code()
        # Mascota debe tener el @ManyToOne hacia Cliente
        self.assertIn("@ManyToOne", code)
        self.assertIn('@JoinColumn(name = "cliente_id"', code)
        self.assertIn("private Cliente cliente;", code)
        # Cliente debe tener la colección inversa
        self.assertIn('@OneToMany(mappedBy = "cliente"', code)
        self.assertIn("private List<Mascota> mascotaList", code)

    def test_one_to_many_generates_fk_in_target_sql_table(self):
        """
        FK cliente_id debe estar en la tabla mascotas, NO en clientes.
        Bug: antes la FK no se generaba en ninguna tabla.
        """
        sql = BackendCodeGenerator(self.sample_semantic_data).generate_sql()
        # FK en mascotas
        self.assertIn("cliente_id BIGINT", sql)
        self.assertIn("FOREIGN KEY (cliente_id) REFERENCES clientes(id)", sql)
        # La FK debe aparecer DENTRO del bloque de mascotas (verificar contexto)
        idx_mascotas = sql.find("CREATE TABLE IF NOT EXISTS mascotas")
        idx_fk       = sql.find("cliente_id BIGINT")
        self.assertGreater(idx_fk, idx_mascotas, "FK cliente_id debe estar en tabla mascotas")

    # ─────────────────────────────────────────────────────────────────────────
    # Test 4: MANY_TO_ONE — composición Orden→Cliente
    # ─────────────────────────────────────────────────────────────────────────
    def test_many_to_one_composition_generates_correct_jpa(self):
        """
        Orden(*) → Cliente(1): composición
        - Orden tiene @ManyToOne + ON DELETE CASCADE
        - Cliente tiene @OneToMany inverso
        """
        code = BackendCodeGenerator(self.sample_semantic_data).generate_spring_boot_code()
        # El mappedBy del inverso en Cliente apunta al campo "cliente" en Orden
        self.assertIn('@OneToMany(mappedBy = "cliente"', code)
        self.assertIn("cascade = {CascadeType.ALL}", code)  # composición

    def test_many_to_one_generates_fk_in_source_table(self):
        """FK de Orden→Cliente debe estar en tabla ordenes (el lado Muchos)."""
        sql = BackendCodeGenerator(self.sample_semantic_data).generate_sql()
        self.assertIn("FOREIGN KEY (cliente_id) REFERENCES clientes(id)", sql)
        self.assertIn("ON DELETE CASCADE", sql)  # composición

    # ─────────────────────────────────────────────────────────────────────────
    # Test 5: MANY_TO_MANY — Orden ↔ Producto
    # ─────────────────────────────────────────────────────────────────────────
    def test_many_to_many_generates_both_sides_jpa(self):
        code = BackendCodeGenerator(self.sample_semantic_data).generate_spring_boot_code()
        # Orden (owner): @ManyToMany + @JoinTable
        self.assertIn("@ManyToMany", code)
        self.assertIn("@JoinTable", code)
        # Producto (inverse): @ManyToMany(mappedBy)
        self.assertIn("@ManyToMany(mappedBy =", code)
        # El mappedBy apunta al campo en Orden (productoList o similar)
        self.assertIn("productoList", code)

    def test_many_to_many_generates_junction_table(self):
        sql = BackendCodeGenerator(self.sample_semantic_data).generate_sql()
        # Tabla intermedia debe existir con PK compuesta
        self.assertIn("PRIMARY KEY (", sql)
        # La tabla intermedia debe contener ambas FK
        self.assertIn("orden_id BIGINT NOT NULL", sql)
        self.assertIn("producto_id BIGINT NOT NULL", sql)
        # La columna producto_id NO debe aparecer como FK directa en ordenes
        # (verificar que solo aparece en la tabla intermedia)
        idx_ordenes = sql.find("CREATE TABLE IF NOT EXISTS ordens")
        idx_junction = sql.find("Tabla intermedia N:M")
        idx_prod_fk  = sql.find("producto_id BIGINT NOT NULL")
        # La FK de producto debe estar en la tabla intermedia, no dentro de ordenes
        self.assertGreater(idx_prod_fk, idx_junction,
                           "producto_id solo debe aparecer en la tabla intermedia N:M")


    # ─────────────────────────────────────────────────────────────────────────
    # Test 6: BUG #3 — Mapeo de tipos EXACTO (no por subcadena)
    # ─────────────────────────────────────────────────────────────────────────
    def test_date_type_maps_to_date_not_timestamp(self):
        """
        fecha_nac: date → debe ser DATE (LocalDate), NO TIMESTAMP.
        Bug: coincidencia por subcadena podría confundir "date" con "datetime".
        """
        sql  = BackendCodeGenerator(self.sample_semantic_data).generate_sql()
        code = BackendCodeGenerator(self.sample_semantic_data).generate_spring_boot_code()
        self.assertIn("fecha_nac DATE", sql)
        self.assertIn("private LocalDate fechaNac", code)

    def test_datetime_type_maps_to_timestamp(self):
        """fecha_creacion: datetime → TIMESTAMP WITHOUT TIME ZONE."""
        sql = BackendCodeGenerator(self.sample_semantic_data).generate_sql()
        self.assertIn("fecha_creacion TIMESTAMP WITHOUT TIME ZONE", sql)

    def test_decimal_type_maps_to_numeric(self):
        """decimal → NUMERIC(19, 2)."""
        sql = BackendCodeGenerator(self.sample_semantic_data).generate_sql()
        self.assertIn("NUMERIC(19, 2)", sql)

    # ─────────────────────────────────────────────────────────────────────────
    # Test 7: BUG #4 — Sin columnas extras no declaradas en UML
    # ─────────────────────────────────────────────────────────────────────────
    def test_no_auto_added_audit_columns(self):
        """
        created_at / updated_at NO deben generarse si no están en el UML.
        Bug: el generador anterior los agregaba incondicionalmente.
        """
        sql = BackendCodeGenerator(self.sample_semantic_data).generate_sql()
        self.assertNotIn("created_at", sql)
        self.assertNotIn("updated_at", sql)

    def test_no_pgcrypto_without_uuid(self):
        """pgcrypto solo se añade si algún atributo usa tipo UUID."""
        sql = BackendCodeGenerator(self.sample_semantic_data).generate_sql()
        self.assertNotIn("pgcrypto", sql)

    def test_pgcrypto_added_when_uuid_present(self):
        data = {
            "classes": [{
                "id": "x1", "name": "Token", "is_abstract": False,
                "attributes": [{"name": "token_id", "type": "uuid"}],
                "methods": [],
            }],
            "relationships": [],
        }
        sql = BackendCodeGenerator(data).generate_sql()
        self.assertIn("pgcrypto", sql)
        self.assertIn("UUID DEFAULT gen_random_uuid()", sql)

    # ─────────────────────────────────────────────────────────────────────────
    # Test 8: BUG #5 — TABLE_PER_CLASS solo cuando hay herencia
    # ─────────────────────────────────────────────────────────────────────────
    def test_table_per_class_comment_only_with_inheritance(self):
        sql_with_inheritance = BackendCodeGenerator(self.sample_semantic_data).generate_sql()
        self.assertIn("TABLE_PER_CLASS", sql_with_inheritance)

        data_no_inheritance = {
            "classes": [
                {"id": "a1", "name": "Cita", "is_abstract": False,
                 "attributes": [{"name": "fecha", "type": "date"}], "methods": []},
            ],
            "relationships": [],
        }
        sql_no_inheritance = BackendCodeGenerator(data_no_inheritance).generate_sql()
        self.assertNotIn("TABLE_PER_CLASS", sql_no_inheritance)

    def test_abstract_parent_columns_inherited_in_child_table(self):
        """
        Columnas de Persona abstracta (nombre, email) deben aparecer
        en la tabla clientes (TABLE_PER_CLASS — R-S3).
        """
        sql = BackendCodeGenerator(self.sample_semantic_data).generate_sql()
        idx_clientes = sql.find("CREATE TABLE IF NOT EXISTS clientes")
        idx_nombre   = sql.find("nombre VARCHAR(255)", idx_clientes)
        self.assertGreater(idx_clientes, -1)
        self.assertGreater(idx_nombre, idx_clientes,
                           "La columna 'nombre' del padre abstracto debe estar en la tabla clientes")

    # ─────────────────────────────────────────────────────────────────────────
    # Test 9: Repositories y Controllers generados (R-C6)
    # ─────────────────────────────────────────────────────────────────────────
    def test_repositories_generated_for_concrete_classes(self):
        code = BackendCodeGenerator(self.sample_semantic_data).generate_spring_boot_code()
        self.assertIn("public interface ClienteRepository extends JpaRepository<Cliente, Long>", code)
        self.assertIn("public interface MascotaRepository extends JpaRepository<Mascota, Long>", code)
        self.assertNotIn("PersonaRepository", code)  # abstracta no tiene repository

    def test_controllers_have_crud_endpoints(self):
        code = BackendCodeGenerator(self.sample_semantic_data).generate_spring_boot_code()
        self.assertIn("@GetMapping", code)
        self.assertIn("@PostMapping", code)
        self.assertIn("@PutMapping", code)
        self.assertIn("@DeleteMapping", code)
        self.assertIn('@RequestMapping("/api/clientes")', code)
