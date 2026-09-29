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


class DiagramGenerateBackendView(APIView):
    """
    Genera el código backend (Django models.py, SQL DDL, FastAPI) a partir del metamodelo UML 2.5.
    Valida el permiso RBAC 'GENERATE_BACKEND' en el proyecto correspondiente.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from .codegen import BackendCodeGenerator

        diagram = get_object_or_404(Diagram.objects.select_related('project'), pk=pk)

        # Validar permiso de proyecto GENERATE_BACKEND
        if not user_has_project_permission(request.user, diagram.project, 'GENERATE_BACKEND'):
            raise PermissionDenied("No tienes el permiso 'GENERATE_BACKEND' para generar código de este proyecto.")

        generated = BackendCodeGenerator.generate_all(
            diagram.semantic_data or {},
            diagram_name=diagram.name
        )

        return Response({
            "diagram_id": diagram.id,
            "diagram_name": diagram.name,
            **generated
        }, status=status.HTTP_200_OK)


import io
import zipfile
import re
from django.http import HttpResponse

class DiagramDownloadZipView(APIView):
    """
    Empaqueta el código generado en un archivo ZIP descargable con la estructura
    estándar de un proyecto Spring Boot y Maven.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from .codegen import BackendCodeGenerator

        diagram = get_object_or_404(Diagram.objects.select_related('project'), pk=pk)

        # Validar permiso de proyecto GENERATE_BACKEND
        if not user_has_project_permission(request.user, diagram.project, 'GENERATE_BACKEND'):
            raise PermissionDenied("No tienes el permiso 'GENERATE_BACKEND' para descargar código de este proyecto.")

        generated = BackendCodeGenerator.generate_all(
            diagram.semantic_data or {},
            diagram_name=diagram.name
        )

        spring_boot_content = generated.get("spring_boot", "")
        sql_content = generated.get("sql", "")

        # Crear archivo ZIP en memoria
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            
            # --- 1. schema.sql ---
            zip_file.writestr("src/main/resources/schema.sql", sql_content)
            
            # --- 2. Parsear los archivos Java/properties a partir del string generado ---
            # El motor usa el separador: // --- NombreArchivo ---
            parts = re.split(r'// ---\s*(.+?)\s*---', spring_boot_content)
            
            for i in range(1, len(parts), 2):
                filename = parts[i].strip()
                file_content = parts[i+1].lstrip('\n')
                
                if filename == "pom.xml":
                    zip_file.writestr("pom.xml", file_content)
                elif filename == "application.properties":
                    zip_file.writestr("src/main/resources/application.properties", file_content)
                elif filename.endswith("Controller.java"):
                    zip_file.writestr(f"src/main/java/com/example/controller/{filename}", file_content)
                elif filename.endswith("Repository.java"):
                    zip_file.writestr(f"src/main/java/com/example/repository/{filename}", file_content)
                elif filename.endswith(".java"):
                    zip_file.writestr(f"src/main/java/com/example/model/{filename}", file_content)

            # --- 3. Agregar clase principal Application.java ---
            app_java = (
                "package com.example;\n\n"
                "import org.springframework.boot.SpringApplication;\n"
                "import org.springframework.boot.autoconfigure.SpringBootApplication;\n\n"
                "@SpringBootApplication\n"
                "public class Application {\n"
                "    public static void main(String[] args) {\n"
                "        SpringApplication.run(Application.class, args);\n"
                "    }\n"
                "}\n"
            )
            zip_file.writestr("src/main/java/com/example/Application.java", app_java)

        zip_buffer.seek(0)

        response = HttpResponse(zip_buffer, content_type='application/zip')
        filename_safe = re.sub(r'[^a-zA-Z0-9_-]', '_', diagram.name) or "proyecto"
        response['Content-Disposition'] = f'attachment; filename={filename_safe}_backend.zip'
        return response

