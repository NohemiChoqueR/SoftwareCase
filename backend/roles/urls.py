from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PermissionListView, RoleViewSet

router = DefaultRouter()
router.register(r'', RoleViewSet, basename='roles')

urlpatterns = [
    path('permissions/', PermissionListView.as_view(), name='permissions-list'),
    path('', include(router.urls)),
]
