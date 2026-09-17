from datetime import timedelta
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Invitation
from .serializers import (
    InvitationSerializer,
    InvitationCreateSerializer,
    PublicInvitationDetailSerializer
)
from proyectos.models import Project, Collaborator
from roles.models import Role


def user_can_manage_members(user, project):
    if project.owner == user:
        return True
    return Collaborator.objects.filter(
        project=project,
        user=user,
        role__permissions__permission='MANAGE_MEMBERS'
    ).exists()


class ProjectInvitationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_project(self, project_pk):
        return get_object_or_404(Project, pk=project_pk)

    def get(self, request, project_pk):
        project = self.get_project(project_pk)
        if not user_can_manage_members(request.user, project):
            raise PermissionDenied("No tienes permisos para ver las invitaciones de este proyecto.")

        invitations = Invitation.objects.filter(project=project)
        # Actualizar expirados automáticamente si aplica
        for inv in invitations:
            inv.check_and_update_expired()

        serializer = InvitationSerializer(invitations, many=True)
        return Response(serializer.data)

    def post(self, request, project_pk):
        project = self.get_project(project_pk)
        if not user_can_manage_members(request.user, project):
            raise PermissionDenied("No tienes permisos para invitar colaboradores a este proyecto.")

        serializer = InvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        role = get_object_or_404(Role, pk=serializer.validated_data['role_id'])
        expires_in_days = serializer.validated_data.get('expires_in_days', 7)
        expires_at = timezone.now() + timedelta(days=expires_in_days)

        invitation = Invitation.objects.create(
            project=project,
            role=role,
            created_by=request.user,
            expires_at=expires_at
        )

        return Response(InvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)


class PublicInvitationDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        invitation = get_object_or_404(Invitation, token=token)
        invitation.check_and_update_expired()
        serializer = PublicInvitationDetailSerializer(invitation)
        return Response(serializer.data)


class AcceptInvitationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        invitation = get_object_or_404(Invitation, token=token)
        invitation.check_and_update_expired()

        if invitation.status != 'PENDING':
            return Response(
                {"detail": f"La invitación no está disponible (estado actual: {invitation.get_status_display()})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        project = invitation.project
        user = request.user

        if project.owner == user:
            return Response(
                {"detail": "Ya eres el propietario de este proyecto."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if Collaborator.objects.filter(project=project, user=user).exists():
            return Response(
                {"detail": "Ya eres colaborador de este proyecto."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Crear colaborador y marcar invitación como aceptada
        Collaborator.objects.create(
            project=project,
            user=user,
            role=invitation.role
        )

        invitation.status = 'ACCEPTED'
        invitation.save(update_fields=['status'])

        return Response({
            "detail": f"Te has unido exitosamente al proyecto '{project.name}' con el rol '{invitation.role.name}'.",
            "project_id": project.id
        }, status=status.HTTP_200_OK)


class RejectInvitationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        invitation = get_object_or_404(Invitation, token=token)
        invitation.check_and_update_expired()

        if invitation.status != 'PENDING':
            return Response(
                {"detail": f"La invitación no está pendiente (estado actual: {invitation.get_status_display()})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        invitation.status = 'REJECTED'
        invitation.save(update_fields=['status'])

        return Response({"detail": "Has rechazado la invitación."}, status=status.HTTP_200_OK)


class CancelInvitationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        invitation = get_object_or_404(Invitation, token=token)
        invitation.check_and_update_expired()

        if invitation.created_by != request.user and invitation.project.owner != request.user:
            raise PermissionDenied("No tienes permisos para cancelar esta invitación.")

        if invitation.status != 'PENDING':
            return Response(
                {"detail": f"La invitación no puede ser cancelada porque ya fue procesada (estado: {invitation.get_status_display()})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        invitation.status = 'CANCELLED'
        invitation.save(update_fields=['status'])

        return Response({"detail": "La invitación ha sido cancelada correctamente."}, status=status.HTTP_200_OK)
