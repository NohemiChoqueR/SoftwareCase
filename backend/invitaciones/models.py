from django.db import models
from django.conf import settings
from proyectos.models import Project
from roles.models import Role

class Invitation(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pendiente'),
        ('ACCEPTED', 'Aceptada'),
        ('REJECTED', 'Rechazada'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='invitations')
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='invitations')
    guest_email = models.EmailField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_invitations')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('project', 'guest_email')

    def __str__(self):
        return f"Invitación a {self.guest_email} para {self.project.name} ({self.role.name}) - {self.status}"
