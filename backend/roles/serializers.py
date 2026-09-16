from rest_framework import serializers
from .models import Role, RolePermission, PERMISSIONS

class PermissionSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()

class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SlugRelatedField(
        many=True,
        slug_field='permission',
        queryset=RolePermission.objects.none() # It's read-only for now, but we override create/update
    )
    
    # Accept a list of string permissions on write
    permissions_list = serializers.ListField(
        child=serializers.ChoiceField(choices=[p[0] for p in PERMISSIONS]),
        write_only=True
    )

    class Meta:
        model = Role
        fields = ('id', 'name', 'description', 'permissions', 'permissions_list', 'created_at')
        read_only_fields = ('id', 'permissions', 'created_at')

    def create(self, validated_data):
        permissions_data = validated_data.pop('permissions_list', [])
        user = self.context['request'].user
        role = Role.objects.create(user=user, **validated_data)
        
        for perm in permissions_data:
            RolePermission.objects.create(role=role, permission=perm)
            
        return role

    def update(self, instance, validated_data):
        permissions_data = validated_data.pop('permissions_list', None)
        
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.save()

        if permissions_data is not None:
            # Recreate permissions
            instance.permissions.all().delete()
            for perm in permissions_data:
                RolePermission.objects.create(role=instance, permission=perm)
                
        return instance
