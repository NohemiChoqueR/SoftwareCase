from django.urls import path
from .views import (
    PublicInvitationDetailView,
    AcceptInvitationView,
    RejectInvitationView,
    CancelInvitationView,
)

urlpatterns = [
    path('<uuid:token>/', PublicInvitationDetailView.as_view(), name='invitation-detail'),
    path('<uuid:token>/aceptar/', AcceptInvitationView.as_view(), name='invitation-accept'),
    path('<uuid:token>/rechazar/', RejectInvitationView.as_view(), name='invitation-reject'),
    path('<uuid:token>/cancelar/', CancelInvitationView.as_view(), name='invitation-cancel'),
]
