from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, CollaboratorViewSet

router = DefaultRouter()
router.register(r'', ProjectViewSet, basename='projects')
router.register(r'(?P<project_pk>\d+)/collaborators', CollaboratorViewSet, basename='project-collaborators')

urlpatterns = [
    path('', include(router.urls)),
]
