import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from proyectos.models import Project
from roles.models import Role

def default_expiration():
    return timezone.now() + timedelta(days=7)

class Invitation(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pendiente'),
        ('ACCEPTED', 'Aceptada'),
        ('REJECTED', 'Rechazada'),
        ('CANCELLED', 'Cancelada'),
        ('EXPIRED', 'Expirada'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='invitations')
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='invitations')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_invitations')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=default_expiration)

    class Meta:
        ordering = ['-created_at']

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def check_and_update_expired(self):
        if self.status == 'PENDING' and self.is_expired:
            self.status = 'EXPIRED'
            self.save(update_fields=['status'])
            return True
        return False

    def __str__(self):
        return f"Invitación a {self.project.name} ({self.role.name}) - {self.status}"
