from django.http import JsonResponse


# simple health check endpoint
def health(request):
    return JsonResponse({'status': 'ok'})