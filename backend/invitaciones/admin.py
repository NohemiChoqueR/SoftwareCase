from django.contrib import admin
from .models import Invitation

@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ('project', 'role', 'token', 'status', 'created_by', 'created_at', 'expires_at')
    list_filter = ('status', 'created_at', 'expires_at')
    search_fields = ('project__name', 'created_by__email', 'token')
