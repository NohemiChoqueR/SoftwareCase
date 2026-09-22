from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from .models import Project, Collaborator
from .serializers import ProjectSerializer, CollaboratorSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Muestra los proyectos donde el usuario es el propietario o es colaborador
        return Project.objects.filter(
            Q(owner=user) | Q(collaborators__user=user)
        ).distinct()

    def perform_destroy(self, instance):
        if instance.owner != self.request.user:
            raise PermissionDenied("Solo el propietario del proyecto puede eliminarlo.")
        instance.delete()

    @action(detail=True, methods=['get'])
    def invitaciones(self, request, pk=None):
        project = self.get_object()
        if project.owner != request.user:
            raise PermissionDenied("Solo el propietario puede ver las invitaciones del proyecto.")
        from invitaciones.models import Invitation
        from invitaciones.serializers import InvitationSerializer
        invitations = Invitation.objects.filter(project=project)
        serializer = InvitationSerializer(invitations, many=True)
        return Response(serializer.data)


class CollaboratorViewSet(viewsets.ReadOnlyModelViewSet):
    # Por ahora solo lectura para listar colaboradores dentro de un proyecto.
    # La adición se hará mediante el módulo de Invitaciones.
    serializer_class = CollaboratorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        project_id = self.kwargs.get('project_pk')
        if project_id:
            # Asegurar que el usuario tenga acceso al proyecto
            user = self.request.user
            has_access = Project.objects.filter(
                id=project_id
            ).filter(
                Q(owner=user) | Q(collaborators__user=user)
            ).exists()
            
            if has_access:
                return Collaborator.objects.filter(project_id=project_id)
        return Collaborator.objects.none()
