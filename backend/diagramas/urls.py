from django.urls import path
from .views import DiagramDetailView, DiagramMutationView, DiagramGenerateBackendView, DiagramDownloadZipView

urlpatterns = [
    path('<int:pk>/', DiagramDetailView.as_view(), name='diagram-detail'),
    path('<int:pk>/mutations/', DiagramMutationView.as_view(), name='diagram-mutations'),
    path('<int:pk>/generate-backend/', DiagramGenerateBackendView.as_view(), name='diagram-generate-backend'),
    path('<int:pk>/download-backend/', DiagramDownloadZipView.as_view(), name='diagram-download-backend'),
]

