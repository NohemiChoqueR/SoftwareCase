from rest_framework.permissions import BasePermission, SAFE_METHODS
from proyectos.models import Collaborator


def user_has_project_permission(user, project, required_permission):
    """
    Verifica si un usuario tiene un permiso específico en un proyecto:
    1. El propietario del proyecto tiene todos los permisos.
    2. Un colaborador tiene el permiso si su rol asignado lo incluye.
    """
    if not user or not user.is_authenticated:
        return False
    if project.owner_id == user.id:
        return True
    
    try:
        collab = Collaborator.objects.select_related('role').get(project=project, user=user)
        return collab.role.permissions.filter(permission=required_permission).exists()
    except Collaborator.DoesNotExist:
        return False


class HasDiagramProjectPermission(BasePermission):
    """
    Control de acceso basado en roles para operaciones sobre diagramas de un proyecto:
    - Métodos seguros (GET, HEAD, OPTIONS): Requiere permiso 'VIEW_MODEL' o ser owner.
    - Métodos de modificación (POST, PUT, PATCH, DELETE): Requiere permiso 'EDIT_MODEL' o ser owner.
    """
    def has_object_permission(self, request, view, obj):
        project = getattr(obj, 'project', obj)
        required_perm = 'VIEW_MODEL' if request.method in SAFE_METHODS else 'EDIT_MODEL'
        return user_has_project_permission(request.user, project, required_perm)
