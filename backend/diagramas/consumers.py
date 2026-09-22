import json
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from diagramas.models import Diagram
from diagramas.permissions import user_has_project_permission

User = get_user_model()


class DiagramConsumer(AsyncJsonWebsocketConsumer):
    """
    Consumidor WebSocket para sincronización colaborativa de diagramas UML en tiempo real.
    Permite que múltiples navegadores observen mutaciones instantáneas y presencia.
    """

    async def connect(self):
        self.diagram_id = self.scope['url_route']['kwargs']['diagram_id']
        self.room_group_name = f"diagram_{self.diagram_id}"

        # 1. Extraer JWT token de query string (?token=...)
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]

        if not token:
            await self.close(code=4001)
            return

        # 2. Validar usuario autenticado
        user = await self.authenticate_token(token)
        if not user:
            await self.close(code=4002)
            return

        # 3. Validar permisos RBAC de lectura sobre el proyecto del diagrama
        has_access = await self.check_diagram_access(user, self.diagram_id)
        if not has_access:
            await self.close(code=4003)
            return

        self.user = user

        # 4. Unir el canal al grupo del diagrama
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # 5. Notificar presencia de entrada al grupo
        user_name = f"{self.user.first_name} {self.user.last_name}".strip() or self.user.email
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence_event',
                'event': 'user_joined',
                'user': {
                    'id': self.user.id,
                    'email': self.user.email,
                    'nombre': user_name,
                }
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name') and hasattr(self, 'user'):
            # Notificar salida al grupo
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'presence_event',
                    'event': 'user_left',
                    'user': {
                        'id': self.user.id,
                        'email': self.user.email,
                    }
                }
            )
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive_json(self, content):
        """
        Manejo de mensajes recibidos directamente del cliente.
        """
        msg_type = content.get('type')
        if msg_type == 'ping':
            await self.send_json({'type': 'pong'})

    async def diagram_mutation(self, event):
        """
        Difunde una mutación ocurrida en el diagrama a los navegadores suscritos.
        """
        await self.send_json({
            'type': 'diagram_mutation',
            'action': event.get('action'),
            'payload': event.get('payload'),
            'version': event.get('version'),
            'sender_id': event.get('sender_id'),
            'sender_email': event.get('sender_email'),
        })

    async def presence_event(self, event):
        """
        Transmite eventos de presencia (unirse / salir) a los clientes.
        """
        await self.send_json({
            'type': 'presence_event',
            'event': event.get('event'),
            'user': event.get('user'),
        })

    @database_sync_to_async
    def authenticate_token(self, token_str):
        try:
            token = AccessToken(token_str)
            user_id = token.get('user_id')
            return User.objects.get(id=user_id, is_active=True)
        except Exception:
            return None

    @database_sync_to_async
    def check_diagram_access(self, user, diagram_id):
        try:
            diagram = Diagram.objects.select_related('project').get(id=diagram_id)
            return user_has_project_permission(user, diagram.project, 'VIEW_MODEL')
        except Diagram.DoesNotExist:
            return False
