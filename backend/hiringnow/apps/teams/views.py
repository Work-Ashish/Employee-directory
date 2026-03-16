from collections import defaultdict

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rbac.permissions import HasPermission
from apps.employees.models import Employee
from apps.teams.models import Team, TeamMember
from apps.teams.serializers import (
    TeamSerializer,
    TeamCreateSerializer,
    TeamUpdateSerializer,
    TeamMemberSerializer,
)


# -- Team List / Create -------------------------------------------------------

class TeamListCreateView(APIView):
    """
    GET  /teams/  -- list teams (with members count)
    POST /teams/  -- create a new team
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), HasPermission('teams.manage')]
        return [IsAuthenticated(), HasPermission('teams.view')]

    def get(self, request):
        queryset = Team.objects.select_related('department', 'lead')

        # Non-admin users can only see teams they belong to
        user = request.user
        if not getattr(user, 'is_tenant_admin', False):
            queryset = queryset.filter(members__employee__user=user)

        # -- Filters
        department_id = request.query_params.get('department_id')
        if department_id:
            queryset = queryset.filter(department_id=department_id)

        # -- Pagination
        try:
            page = max(int(request.query_params.get('page', 1)), 1)
            limit = min(int(request.query_params.get('limit', 50)), 100)
        except (TypeError, ValueError):
            page, limit = 1, 50

        total = queryset.count()
        start = (page - 1) * limit
        page_qs = queryset[start:start + limit]

        return Response({
            'results': TeamSerializer(page_qs, many=True).data,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit if total > 0 else 1,
        })

    def post(self, request):
        serializer = TeamCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        team = serializer.save()
        return Response(
            TeamSerializer(team).data,
            status=status.HTTP_201_CREATED,
        )


# -- Team Detail ---------------------------------------------------------------

class TeamDetailView(APIView):
    """
    GET    /teams/{id}/  -- retrieve a team with its members
    PUT    /teams/{id}/  -- update a team
    DELETE /teams/{id}/  -- delete a team
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), HasPermission('teams.view')]
        return [IsAuthenticated(), HasPermission('teams.manage')]

    def _get_team(self, pk):
        return get_object_or_404(
            Team.objects.select_related('department', 'lead'),
            pk=pk,
        )

    def get(self, request, pk):
        team = self._get_team(pk)
        data = TeamSerializer(team).data
        members = TeamMember.objects.filter(team=team).select_related('employee')
        data['members'] = TeamMemberSerializer(members, many=True).data
        return Response(data)

    def put(self, request, pk):
        team = self._get_team(pk)
        serializer = TeamUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(team, field, value)
        team.save()

        return Response(TeamSerializer(team).data)

    def delete(self, request, pk):
        team = self._get_team(pk)
        team.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# -- Org Chart -----------------------------------------------------------------

class OrgChartView(APIView):
    """
    GET /teams/org-chart/  -- hierarchical employee -> manager tree
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('teams.view')]

    def get(self, request):
        employees = Employee.objects.select_related('reporting_to').values(
            'id', 'first_name', 'last_name', 'designation',
            'department', 'reporting_to_id',
        )

        # Build adjacency list: manager_id -> [children]
        children_map = defaultdict(list)
        nodes = {}

        for emp in employees:
            emp_id = str(emp['id'])
            nodes[emp_id] = {
                'id': emp_id,
                'name': f"{emp['first_name']} {emp['last_name']}",
                'designation': emp['designation'],
                'department': emp['department'],
                'children': [],
            }
            parent_id = str(emp['reporting_to_id']) if emp['reporting_to_id'] else None
            children_map[parent_id].append(emp_id)

        def build_tree(parent_id):
            tree = []
            for child_id in children_map.get(parent_id, []):
                node = nodes[child_id]
                node['children'] = build_tree(child_id)
                tree.append(node)
            return tree

        # Root nodes are employees with no manager
        roots = build_tree(None)

        return Response({'org_chart': roots})
