from django.contrib import admin
from .models import Invitation

@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'guest_email', 'role', 'status', 'created_by', 'created_at')
    list_filter = ('status', 'project')
    search_fields = ('guest_email', 'project__name')
