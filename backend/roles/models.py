from django.db import models
from django.conf import settings

# Constantes de permisos
PERMISSIONS = [
    ('VIEW_PROJECT', 'Ver proyecto'),
    ('EDIT_PROJECT', 'Editar proyecto'),
    ('VIEW_MODEL', 'Ver modelo'),
    ('EDIT_MODEL', 'Editar modelo'),
    ('USE_AI', 'Usar IA'),
    ('VALIDATE_MODEL', 'Validar modelo'),
    ('GENERATE_BACKEND', 'Generar backend'),
    ('IMPORT_MODEL', 'Importar modelo'),
    ('EXPORT_MODEL', 'Exportar modelo'),
    ('MANAGE_MEMBERS', 'Gestionar miembros'),
    ('MANAGE_ROLES', 'Gestionar roles'),
    ('VIEW_HISTORY', 'Ver historial'), # Oculto en la UI temporalmente
]

class Role(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='roles')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'user')

    def __str__(self):
        return f"{self.name} ({self.user.email})"


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='permissions')
    permission = models.CharField(max_length=50, choices=PERMISSIONS)

    class Meta:
        unique_together = ('role', 'permission')

    def __str__(self):
        return f"{self.role.name} - {self.permission}"
