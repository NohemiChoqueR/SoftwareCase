from rest_framework import serializers
from .models import Invitation
from proyectos.models import Project, Collaborator
from roles.models import Role

class InvitationSerializer(serializers.ModelSerializer):
    project_name = serializers.ReadOnlyField(source='project.name')
    role_name = serializers.ReadOnlyField(source='role.name')
    created_by_email = serializers.ReadOnlyField(source='created_by.email')

    class Meta:
        model = Invitation
        fields = ('id', 'project', 'project_name', 'role', 'role_name', 'guest_email', 'status', 'created_by_email', 'created_at')
        read_only_fields = ('id', 'status', 'created_by_email', 'created_at', 'project_name', 'role_name')

    def validate(self, attrs):
        project = attrs.get('project')
        guest_email = attrs.get('guest_email')
        request = self.context.get('request')
        user = request.user

        # 1. El que invita debe ser el dueño del proyecto
        if project.owner != user:
            raise serializers.ValidationError({"project": "No tienes permiso para invitar colaboradores a este proyecto."})
            
        # 2. No se puede invitar a sí mismo
        if guest_email == user.email:
            raise serializers.ValidationError({"guest_email": "No puedes invitarte a ti mismo."})

        # 3. Validar si ya es colaborador
        if Collaborator.objects.filter(project=project, user__email=guest_email).exists():
            raise serializers.ValidationError({"guest_email": "El usuario ya es colaborador en este proyecto."})

        # 4. Validar si ya existe una invitación PENDING para este correo en este proyecto
        if Invitation.objects.filter(project=project, guest_email=guest_email, status='PENDING').exists():
            raise serializers.ValidationError({"guest_email": "Ya hay una invitación pendiente para este correo."})

        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)
