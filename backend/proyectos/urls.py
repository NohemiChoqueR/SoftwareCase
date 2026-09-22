from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, CollaboratorViewSet
from diagramas.views import ProjectDiagramListCreateView

router = DefaultRouter()
router.register(r'', ProjectViewSet, basename='projects')
router.register(r'(?P<project_pk>\d+)/collaborators', CollaboratorViewSet, basename='project-collaborators')

urlpatterns = [
    path('<int:project_pk>/diagramas/', ProjectDiagramListCreateView.as_view(), name='project-diagrams'),
    path('', include(router.urls)),
]
