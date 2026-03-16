from rest_framework.renderers import JSONRenderer


# wraps every API response in the standard envelope: {data, error, meta}
class StandardJSONRenderer(JSONRenderer):

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get('response') if renderer_context else None
        status_code = response.status_code if response else 200

        # 204 No Content — no body at all
        if status_code == 204:
            return b''

        # already wrapped by the paginator — pass through as-is
        if isinstance(data, dict) and 'data' in data and 'error' in data and 'meta' in data:
            wrapped = data

        # error response — move payload into error key
        elif status_code >= 400:
            wrapped = {
                'data': None,
                'error': data,
                'meta': {},
            }

        # success response — move payload into data key
        else:
            wrapped = {
                'data': data,
                'error': None,
                'meta': {},
            }

        return super().render(wrapped, accepted_media_type, renderer_context)
