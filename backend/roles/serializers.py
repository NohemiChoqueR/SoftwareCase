from rest_framework import serializers
from .models import Role, RolePermission, PERMISSIONS

class PermissionSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()

class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.ListField(
        child=serializers.ChoiceField(choices=[p[0] for p in PERMISSIONS]),
        required=False,
        write_only=True
    )

    class Meta:
        model = Role
        fields = ('id', 'name', 'description', 'permissions', 'created_at')
        read_only_fields = ('id', 'created_at')

    def validate(self, attrs):
        user = self.context['request'].user
        name = attrs.get('name')
        
        if name:
            qs = Role.objects.filter(name=name, user=user)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"name": "Ya tienes un rol con este nombre."})
        
        return attrs

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # instance.permissions es el RelatedManager hacia RolePermission
        ret['permissions'] = [rp.permission for rp in instance.permissions.all()]
        return ret

    def create(self, validated_data):
        permissions_data = validated_data.pop('permissions', [])
        user = self.context['request'].user
        role = Role.objects.create(user=user, **validated_data)
        
        for perm in permissions_data:
            RolePermission.objects.create(role=role, permission=perm)
            
        return role

    def update(self, instance, validated_data):
        permissions_data = validated_data.pop('permissions', None)
        
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.save()

        if permissions_data is not None:
            # Recreate permissions
            instance.permissions.all().delete()
            for perm in permissions_data:
                RolePermission.objects.create(role=instance, permission=perm)
                
        return instance
