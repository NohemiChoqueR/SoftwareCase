from rest_framework import viewsets, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from .models import Role, PERMISSIONS
from .serializers import RoleSerializer

class PermissionListView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Filtrar VIEW_HISTORY de la UI temporalmente
        available_permissions = [
            {"code": p[0], "name": p[1]} 
            for p in PERMISSIONS 
            if p[0] != 'VIEW_HISTORY'
        ]
        return Response(available_permissions)


class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Cada usuario solo ve y administra sus propios roles creados
        return Role.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        # Lógica: Impedir eliminación si está asignado a un colaborador
        if instance.collaborator_assignments.exists():
            raise ValidationError("No se puede eliminar un rol que está asignado a colaboradores.")
        
        instance.delete()
