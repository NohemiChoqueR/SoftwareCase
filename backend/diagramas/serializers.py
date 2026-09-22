from rest_framework import serializers
from .models import Diagram
from .permissions import user_has_project_permission


class DiagramListSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    class_count = serializers.SerializerMethodField()
    relationship_count = serializers.SerializerMethodField()

    class Meta:
        model = Diagram
        fields = [
            'id',
            'project',
            'name',
            'description',
            'diagram_type',
            'version',
            'created_by_email',
            'class_count',
            'relationship_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'project', 'version', 'created_at', 'updated_at']

    def get_class_count(self, obj) -> int:
        semantic = obj.semantic_data or {}
        classes = semantic.get('classes', [])
        return len(classes) if isinstance(classes, list) else 0

    def get_relationship_count(self, obj) -> int:
        semantic = obj.semantic_data or {}
        relationships = semantic.get('relationships', [])
        return len(relationships) if isinstance(relationships, list) else 0


class DiagramDetailSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    user_can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Diagram
        fields = [
            'id',
            'project',
            'name',
            'description',
            'diagram_type',
            'version',
            'semantic_data',
            'visual_data',
            'created_by_email',
            'user_can_edit',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'project', 'version', 'created_at', 'updated_at']

    def get_user_can_edit(self, obj) -> bool:
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return user_has_project_permission(request.user, obj.project, 'EDIT_MODEL')


class DiagramCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diagram
        fields = ['id', 'name', 'description', 'diagram_type']

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("El nombre del diagrama es obligatorio.")
        return name


class DiagramMutationRequestSerializer(serializers.Serializer):
    action = serializers.CharField(max_length=50)
    payload = serializers.DictField(required=True)


class DiagramBatchMutationRequestSerializer(serializers.Serializer):
    mutations = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
        help_text="Lista de mutaciones ordenadas a aplicar de forma secuencial y atómica"
    )
