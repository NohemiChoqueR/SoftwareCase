from rest_framework import serializers
from .models import Invitation
from roles.models import Role

class InvitationCreateSerializer(serializers.Serializer):
    role_id = serializers.IntegerField(required=True)
    expires_in_days = serializers.IntegerField(required=False, default=7, min_value=1, max_value=60)

    def validate_role_id(self, value):
        if not Role.objects.filter(id=value).exists():
            raise serializers.ValidationError("El rol seleccionado no existe.")
        return value


class PublicInvitationDetailSerializer(serializers.ModelSerializer):
    project_id = serializers.IntegerField(source='project.id', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    project_description = serializers.CharField(source='project.description', read_only=True)
    role_id = serializers.IntegerField(source='role.id', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)
    inviter_email = serializers.EmailField(source='created_by.email', read_only=True)
    inviter_name = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invitation
        fields = (
            'token',
            'project_id',
            'project_name',
            'project_description',
            'role_id',
            'role_name',
            'inviter_email',
            'inviter_name',
            'status',
            'is_expired',
            'expires_at'
        )

    def get_inviter_name(self, obj):
        full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return full_name if full_name else obj.created_by.email


class InvitationSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invitation
        fields = (
            'id',
            'project',
            'role',
            'role_name',
            'token',
            'status',
            'created_by',
            'created_by_email',
            'created_at',
            'expires_at',
            'is_expired'
        )
        read_only_fields = ('id', 'project', 'token', 'created_by', 'created_at', 'status')
