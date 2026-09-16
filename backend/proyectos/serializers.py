from rest_framework import serializers
from .models import Project, Collaborator
from roles.serializers import RoleSerializer

class CollaboratorSerializer(serializers.ModelSerializer):
    user_email = serializers.ReadOnlyField(source='user.email')
    role_name = serializers.ReadOnlyField(source='role.name')

    class Meta:
        model = Collaborator
        fields = ('id', 'project', 'user', 'user_email', 'role', 'role_name', 'joined_at')
        read_only_fields = ('id', 'project', 'user', 'user_email', 'role_name', 'joined_at')

class ProjectSerializer(serializers.ModelSerializer):
    owner_email = serializers.ReadOnlyField(source='owner.email')
    
    class Meta:
        model = Project
        fields = ('id', 'name', 'description', 'owner', 'owner_email', 'created_at', 'updated_at')
        read_only_fields = ('id', 'owner', 'owner_email', 'created_at', 'updated_at')

    def create(self, validated_data):
        user = self.context['request'].user
        return Project.objects.create(owner=user, **validated_data)
