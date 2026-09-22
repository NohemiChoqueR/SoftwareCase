from django.db import models
from django.conf import settings
from proyectos.models import Project


def default_semantic_data():
    return {
        "classes": [],
        "relationships": [],
    }


def default_visual_data():
    return {
        "nodes": {},
        "connections": {},
        "viewport": {"x": 0, "y": 0, "zoom": 1.0},
    }


class Diagram(models.Model):
    DIAGRAM_TYPE_CHOICES = [
        ('CLASS', 'Diagrama de Clases UML 2.5'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='diagrams')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    diagram_type = models.CharField(max_length=50, choices=DIAGRAM_TYPE_CHOICES, default='CLASS')
    version = models.PositiveIntegerField(default=1, help_text='Control de versión incremental para concurrencia')
    
    # Separación estricta entre semántica UML y presentación gráfica
    semantic_data = models.JSONField(default=default_semantic_data, blank=True)
    visual_data = models.JSONField(default=default_visual_data, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_diagrams'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.name} ({self.project.name} - v{self.version})"
