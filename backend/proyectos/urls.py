from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, CollaboratorViewSet
from invitaciones.views import ProjectInvitationListCreateView

router = DefaultRouter()
router.register(r'', ProjectViewSet, basename='projects')
router.register(r'(?P<project_pk>\d+)/collaborators', CollaboratorViewSet, basename='project-collaborators')

urlpatterns = [
    path('<int:project_pk>/invitaciones/', ProjectInvitationListCreateView.as_view(), name='project-invitations'),
    path('', include(router.urls)),
]
