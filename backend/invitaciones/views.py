from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Invitation
from .serializers import InvitationSerializer
from proyectos.models import Collaborator

class InvitationViewSet(viewsets.ModelViewSet):
    serializer_class = InvitationSerializer
    permission_classes = [IsAuthenticated]
    queryset = Invitation.objects.all()

    def get_queryset(self):
        # Para listar, si la petición viene sin filtros adicionales, 
        # devolvemos las invitaciones que el usuario ha ENVIADO.
        return Invitation.objects.filter(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Retorna las invitaciones pendientes enviadas al correo del usuario autenticado.
        """
        invitations = Invitation.objects.filter(
            guest_email=request.user.email,
            status='PENDING'
        )
        serializer = self.get_serializer(invitations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """
        Acepta una invitación pendiente.
        """
        try:
            invitation = Invitation.objects.get(pk=pk, guest_email=request.user.email, status='PENDING')
        except Invitation.DoesNotExist:
            return Response({"detail": "Invitación no encontrada o ya procesada."}, status=status.HTTP_404_NOT_FOUND)

        # Crear colaborador
        Collaborator.objects.create(
            project=invitation.project,
            user=request.user,
            role=invitation.role
        )
        
        # Actualizar estado de invitación
        invitation.status = 'ACCEPTED'
        invitation.save(update_fields=['status'])
        
        return Response({"detail": "Invitación aceptada. Ahora eres colaborador del proyecto."})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Rechaza una invitación pendiente.
        """
        try:
            invitation = Invitation.objects.get(pk=pk, guest_email=request.user.email, status='PENDING')
        except Invitation.DoesNotExist:
            return Response({"detail": "Invitación no encontrada o ya procesada."}, status=status.HTTP_404_NOT_FOUND)

        # Actualizar estado de invitación
        invitation.status = 'REJECTED'
        invitation.save(update_fields=['status'])
        
        return Response({"detail": "Invitación rechazada."})

    def perform_destroy(self, instance):
        # Solo el dueño puede cancelarla (eliminarla)
        if instance.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No tienes permiso para cancelar esta invitación.")
        instance.delete()
