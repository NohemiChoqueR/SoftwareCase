from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, NotFound
from django.shortcuts import get_object_or_404

from proyectos.models import Project
from .models import Diagram
from .serializers import (
    DiagramListSerializer,
    DiagramDetailSerializer,
    DiagramCreateSerializer,
    DiagramMutationRequestSerializer,
    DiagramBatchMutationRequestSerializer,
)
from .permissions import HasDiagramProjectPermission, user_has_project_permission
from .services import UMLMutationEngine


class ProjectDiagramListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_project(self) -> Project:
        project_id = self.kwargs.get('project_pk')
        project = get_object_or_404(Project, id=project_id)
        return project

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DiagramCreateSerializer
        return DiagramListSerializer

    def get_queryset(self):
        project = self.get_project()
        # Verificar permiso VIEW_MODEL
        if not user_has_project_permission(self.request.user, project, 'VIEW_MODEL'):
            raise PermissionDenied("No tienes permiso para ver los diagramas de este proyecto.")
        return Diagram.objects.filter(project=project)

    def perform_create(self, serializer):
        project = self.get_project()
        # Verificar permiso EDIT_MODEL
        if not user_has_project_permission(self.request.user, project, 'EDIT_MODEL'):
            raise PermissionDenied("No tienes permiso para crear diagramas en este proyecto.")
        serializer.save(project=project, created_by=self.request.user)


class DiagramDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Diagram.objects.select_related('project', 'created_by')
    serializer_class = DiagramDetailSerializer
    permission_classes = [IsAuthenticated, HasDiagramProjectPermission]

    def perform_destroy(self, instance):
        if not user_has_project_permission(self.request.user, instance.project, 'EDIT_MODEL'):
            raise PermissionDenied("No tienes permiso para eliminar este diagrama.")
        instance.delete()


class DiagramMutationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        diagram = get_object_or_404(Diagram.objects.select_related('project'), pk=pk)

        # Verificar permiso de edición en el proyecto
        if not user_has_project_permission(request.user, diagram.project, 'EDIT_MODEL'):
            raise PermissionDenied("No tienes permiso para modificar este diagrama UML.")

        data = request.data
        # Soporte para mutación individual o por lote (batch)
        if 'mutations' in data:
            serializer = DiagramBatchMutationRequestSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            result = UMLMutationEngine.apply_batch(diagram, serializer.validated_data['mutations'])
        else:
            serializer = DiagramMutationRequestSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            result = UMLMutationEngine.apply_mutation(
                diagram,
                serializer.validated_data['action'],
                serializer.validated_data['payload']
            )

        # Difundir mutación por WebSocket a todos los colaboradores conectados al diagrama
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            if channel_layer:
                sender_email = getattr(request.user, 'email', '')
                sender_id = getattr(request.user, 'id', None)
                async_to_sync(channel_layer.group_send)(
                    f"diagram_{diagram.id}",
                    {
                        'type': 'diagram_mutation',
                        'action': serializer.validated_data.get('action') or 'BATCH_MUTATE',
                        'payload': serializer.validated_data.get('payload') or serializer.validated_data.get('mutations'),
                        'version': result.get('version'),
                        'sender_id': sender_id,
                        'sender_email': sender_email,
                    }
                )
        except Exception:
            pass

        return Response(result, status=status.HTTP_200_OK)
