from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'per_page'
    max_page_size = 100

    # returns the standard envelope so the renderer passes it through unchanged
    def get_paginated_response(self, data):
        return Response({
            'data': data,
            'error': None,
            'meta': {
                'page': self.page.number,
                'per_page': self.get_page_size(self.request),
                'total': self.page.paginator.count,
                'total_pages': self.page.paginator.num_pages,
            },
        })

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'data': schema,
                'error': {'type': 'string', 'nullable': True},
                'meta': {
                    'type': 'object',
                    'properties': {
                        'page': {'type': 'integer'},
                        'per_page': {'type': 'integer'},
                        'total': {'type': 'integer'},
                        'total_pages': {'type': 'integer'},
                    },
                },
            },
        }
