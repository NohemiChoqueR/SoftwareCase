from django.urls import path
from .views import DiagramDetailView, DiagramMutationView

urlpatterns = [
    path('<int:pk>/', DiagramDetailView.as_view(), name='diagram-detail'),
    path('<int:pk>/mutations/', DiagramMutationView.as_view(), name='diagram-mutations'),
]
