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

        # Fetch the external API URL from NetBox settings
        external_api_url = settings.PLUGINS_CONFIG.get("alerts_plugin", {}).get("alerts_url", "").rstrip("/")
        if not external_api_url:
            return Response({"error": "External API URL is not configured"}, status=500)

        # Get filter parameter and sanitize it
        device_filter = request.query_params.get("filter", "").strip()

        # Construct the API URL dynamically
        full_url = f"{external_api_url}/?filter={device_filter}" if device_filter else external_api_url

        try:
            # Fetch JSON from the external API
            response = requests.get(full_url, timeout=10)
            response.raise_for_status()

            # Return the JSON response
            return Response(response.json())

        except requests.exceptions.ConnectionError:
            return Response({"error": "Failed to connect to the external API"}, status=502)
        except requests.exceptions.Timeout:
            return Response({"error": "The external API request timed out"}, status=504)
        except requests.exceptions.RequestException as e:
            return Response({"error": f"API request failed: {str(e)}"}, status=500)
