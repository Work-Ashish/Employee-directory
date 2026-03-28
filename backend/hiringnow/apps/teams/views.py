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
from apps.teams.services import sync_all_teams


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
        queryset = Team.objects.select_related('department', 'lead').order_by('name')

        # Non-admin and non-manager users see teams they lead OR belong to
        # Users with teams.manage permission can see all teams
        user = request.user
        from apps.rbac.services import user_has_permission
        if not getattr(user, 'is_tenant_admin', False) and not user_has_permission(user, 'teams.manage'):
            from django.db.models import Q
            employee_profile = getattr(user, 'employee_profile', None)
            filters = Q(lead__user=user) | Q(members__employee__user=user)
            if employee_profile:
                filters |= Q(lead_id=employee_profile.id) | Q(members__employee_id=employee_profile.id)
            if getattr(user, 'email', None):
                filters |= Q(lead__email__iexact=user.email) | Q(members__employee__email__iexact=user.email)
            queryset = queryset.filter(
                filters
            ).distinct()

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
            # lead_id and department_id are already the Django FK column names,
            # so setattr works directly for these.
            setattr(team, field, value)

        team.save()

        return Response(TeamSerializer(team).data)

    def delete(self, request, pk):
        team = self._get_team(pk)
        team.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# -- Team Members --------------------------------------------------------------

class TeamMemberView(APIView):
    """
    POST   /teams/{id}/members/  -- add a member to the team
    DELETE /teams/{id}/members/  -- remove a member from the team
    GET    /teams/{id}/members/  -- list team members
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAuthenticated(), HasPermission('teams.manage')]

    def _get_team(self, pk):
        return get_object_or_404(Team, pk=pk)

    def get(self, request, pk):
        team = self._get_team(pk)
        members = TeamMember.objects.filter(team=team).select_related(
            'employee', 'employee__user'
        )
        data = [{
            'id': str(m.id),
            'employee_id': str(m.employee_id),
            'name': f"{m.employee.first_name} {m.employee.last_name}",
            'email': m.employee.email,
            'designation': m.employee.designation or '',
            'role': m.role,
        } for m in members]
        return Response(data)

    def post(self, request, pk):
        team = self._get_team(pk)
        employee_id = request.data.get('employee_id')
        if not employee_id:
            return Response(
                {'error': 'employee_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        employee = get_object_or_404(Employee, pk=employee_id)
        member, created = TeamMember.objects.get_or_create(
            team=team,
            employee=employee,
            defaults={'role': request.data.get('role', '')},
        )
        if not created:
            return Response(
                {'error': 'Employee is already a member of this team'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            TeamMemberSerializer(member).data,
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, pk):
        team = self._get_team(pk)
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response(
                {'error': 'employee_id query param is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        member = get_object_or_404(TeamMember, team=team, employee_id=employee_id)
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# -- Sync Teams from Hierarchy -------------------------------------------------

class SyncTeamsFromHierarchyView(APIView):
    """
    POST /teams/sync-from-hierarchy/
    Auto-create teams from the employee reporting_to hierarchy.
    Each manager with direct reports gets a Team; reports become members.
    """

    def get_permissions(self):
        return [IsAuthenticated(), HasPermission('teams.manage')]

    def post(self, request):
        summary = sync_all_teams()
        return Response(summary)


# -- Org Chart -----------------------------------------------------------------

class OrgChartView(APIView):
    """
    GET /teams/org-chart/  -- hierarchical employee -> manager tree
    """

    def get_permissions(self):
        return [IsAuthenticated()]

    def get(self, request):
        employees = Employee.objects.select_related('reporting_to').values(
            'id', 'first_name', 'last_name', 'designation',
            'department', 'reporting_to_id', 'employee_code',
            'email', 'phone',
        )

        # Build adjacency list: manager_id -> [children]
        children_map = defaultdict(list)
        nodes = {}

        for emp in employees:
            emp_id = str(emp['id'])
            nodes[emp_id] = {
                'id': emp_id,
                'first_name': emp['first_name'],
                'last_name': emp['last_name'],
                'name': f"{emp['first_name']} {emp['last_name']}",
                'designation': emp['designation'] or '',
                'department': emp['department'] or '',
                'employee_code': emp['employee_code'] or '',
                'email': emp['email'] or '',
                'phone': emp['phone'] or '',
                'reporting_to': str(emp['reporting_to_id']) if emp['reporting_to_id'] else None,
                'children': [],
            }
            parent_id = str(emp['reporting_to_id']) if emp['reporting_to_id'] else None
            children_map[parent_id].append(emp_id)

        def build_tree(parent_id, visited=None):
            if visited is None:
                visited = set()
            tree = []
            for child_id in children_map.get(parent_id, []):
                if child_id in visited:
                    continue  # prevent circular reference infinite recursion
                visited.add(child_id)
                node = nodes[child_id]
                node['children'] = build_tree(child_id, visited)
                tree.append(node)
            return tree

        # Root nodes are employees with no manager
        roots = build_tree(None)

        return Response({'org_chart': roots})
