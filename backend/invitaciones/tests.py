from datetime import timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from proyectos.models import Project, Collaborator
from roles.models import Role, RolePermission
from invitaciones.models import Invitation

User = get_user_model()

class InvitationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Propietario del proyecto
        self.owner = User.objects.create_user(
            email='owner@example.com',
            password='Password123!',
            first_name='Owner',
            last_name='User'
        )

        # Invitado
        self.invitee = User.objects.create_user(
            email='invitee@example.com',
            password='Password123!',
            first_name='Invitee',
            last_name='User'
        )

        # Usuario ajeno
        self.stranger = User.objects.create_user(
            email='stranger@example.com',
            password='Password123!'
        )

        # Rol de prueba
        self.role = Role.objects.create(name='Desarrollador', user=self.owner)
        RolePermission.objects.create(role=self.role, permission='VIEW_PROJECT')
        RolePermission.objects.create(role=self.role, permission='VIEW_MODEL')

        # Proyecto de prueba
        self.project = Project.objects.create(
            name='Sistema de Ventas',
            description='Proyecto de prueba',
            owner=self.owner
        )

    def test_owner_can_create_invitation(self):
        self.client.force_authenticate(user=self.owner)
        url = f'/api/proyectos/{self.project.id}/invitaciones/'
        payload = {'role_id': self.role.id, 'expires_in_days': 5}
        response = self.client.post(url, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['status'], 'PENDING')
        self.assertTrue(Invitation.objects.filter(token=response.data['token']).exists())

    def test_stranger_cannot_create_invitation(self):
        self.client.force_authenticate(user=self.stranger)
        url = f'/api/proyectos/{self.project.id}/invitaciones/'
        payload = {'role_id': self.role.id}
        response = self.client.post(url, payload)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_public_invitation_detail_without_auth(self):
        invitation = Invitation.objects.create(
            project=self.project,
            role=self.role,
            created_by=self.owner
        )
        url = f'/api/invitaciones/{invitation.token}/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['project_name'], self.project.name)
        self.assertEqual(response.data['role_name'], self.role.name)
        self.assertEqual(response.data['inviter_email'], self.owner.email)
        self.assertEqual(response.data['status'], 'PENDING')

    def test_accept_invitation_creates_collaborator(self):
        invitation = Invitation.objects.create(
            project=self.project,
            role=self.role,
            created_by=self.owner
        )
        self.client.force_authenticate(user=self.invitee)
        url = f'/api/invitaciones/{invitation.token}/aceptar/'
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, 'ACCEPTED')

        # Verificar que se creó el colaborador
        self.assertTrue(Collaborator.objects.filter(
            project=self.project,
            user=self.invitee,
            role=self.role
        ).exists())

    def test_owner_cannot_accept_own_invitation(self):
        invitation = Invitation.objects.create(
            project=self.project,
            role=self.role,
            created_by=self.owner
        )
        self.client.force_authenticate(user=self.owner)
        url = f'/api/invitaciones/{invitation.token}/aceptar/'
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('propietario', response.data['detail'].lower())

    def test_reject_invitation(self):
        invitation = Invitation.objects.create(
            project=self.project,
            role=self.role,
            created_by=self.owner
        )
        self.client.force_authenticate(user=self.invitee)
        url = f'/api/invitaciones/{invitation.token}/rechazar/'
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, 'REJECTED')
        self.assertFalse(Collaborator.objects.filter(project=self.project, user=self.invitee).exists())

    def test_cancel_invitation_by_owner(self):
        invitation = Invitation.objects.create(
            project=self.project,
            role=self.role,
            created_by=self.owner
        )
        self.client.force_authenticate(user=self.owner)
        url = f'/api/invitaciones/{invitation.token}/cancelar/'
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, 'CANCELLED')

    def test_expired_invitation_cannot_be_accepted(self):
        invitation = Invitation.objects.create(
            project=self.project,
            role=self.role,
            created_by=self.owner,
            expires_at=timezone.now() - timedelta(days=1)
        )
        self.client.force_authenticate(user=self.invitee)
        url = f'/api/invitaciones/{invitation.token}/aceptar/'
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, 'EXPIRED')
