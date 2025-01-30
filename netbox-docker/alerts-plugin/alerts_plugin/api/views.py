from rest_framework.permissions import DjangoObjectPermissions
import requests
from rest_framework.response import Response
from rest_framework.views import APIView
from dcim.models import Device  # Import NetBox's Device model
from django.conf import settings


class FetchDeviceStatusAPIView(APIView):
    """
    API endpoint to fetch device status from an external API with optional filters.
    """

    permission_classes = [DjangoObjectPermissions]  # Enforce NetBox object permissions

    def get_queryset(self):
        """
        Required for DjangoObjectPermissions. Return the devices the user has access to.
        """
        return Device.objects.all()

    def get(self, request, *args, **kwargs):
        # Ensure user has `view_device` permission
        if not request.user.has_perm("dcim.view_device"):
            return Response({"error": "Permission denied"}, status=403)

        device_filter = request.query_params.get("filter", "")
        external_api_url = settings.PLUGINS_CONFIG.get("alerts_plugin", {}).get("EXTERNAL_API_URL")
        if not external_api_url:
            return Response({"error": "External API URL is not configured"}, status=500)
        full_url = f"{external_api_url}/?filter={device_filter}"

        try:
            # Fetch JSON from the external API
            response = requests.get(full_url, timeout=10)
            response.raise_for_status()

            # Return the JSON response
            return Response(response.json())

        except requests.exceptions.RequestException as e:
            # Return an error response in case of failure
            return Response({"error": str(e)}, status=500)
