from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.users.models import User
from apps.users.serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer


# GET /users/        — list all users in current tenant DB
# POST /users/       — create a new user in current tenant DB
class UserListCreateView(APIView):

    def get_permissions(self):
        # list requires users.view; create requires users.manage
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('users.manage')]
        return [IsAuthenticated(), HasPermission('users.view')]

    def get(self, request):
        users = User.objects.all().order_by('created_at')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


# GET    /users/{id}/ — retrieve a single user
# PUT    /users/{id}/ — update a single user
# DELETE /users/{id}/ — delete a single user
class UserDetailView(APIView):

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('users.view')]
        return [IsAuthenticated(), HasPermission('users.manage')]

    def get_user(self, user_id):
        return get_object_or_404(User, pk=user_id)

    def get(self, request, user_id):
        user = self.get_user(user_id)
        serializer = UserSerializer(user)
        return Response(serializer.data)

    def put(self, request, user_id):
        # self-modification via admin endpoint is not allowed — use PUT /auth/me/ instead
        if str(request.user.id) == str(user_id):
            return Response(
                {'detail': 'Use PUT /auth/me/ to update your own profile.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        user = self.get_user(user_id)
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        # guard: do not allow deactivating the last active tenant admin
        if (
            serializer.validated_data.get('is_active') is False
            and user.is_tenant_admin
            and not User.objects.filter(is_tenant_admin=True, is_active=True).exclude(pk=user.pk).exists()
        ):
            return Response(
                {'detail': 'Cannot deactivate the last active tenant admin.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        updated_user = serializer.save()
        return Response(UserSerializer(updated_user).data)

    def delete(self, request, user_id):
        # self-deletion is not allowed
        if str(request.user.id) == str(user_id):
            return Response(
                {'detail': 'You cannot delete your own account.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        user = self.get_user(user_id)
        # guard: do not allow deleting the last active tenant admin
        if (
            user.is_tenant_admin
            and not User.objects.filter(is_tenant_admin=True, is_active=True).exclude(pk=user.pk).exists()
        ):
            return Response(
                {'detail': 'Cannot delete the last active tenant admin.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
