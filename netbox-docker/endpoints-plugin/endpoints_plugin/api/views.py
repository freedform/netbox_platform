from rest_framework.permissions import DjangoObjectPermissions
import requests
from rest_framework.response import Response
from rest_framework.views import APIView
from dcim.models import Device  # Import NetBox's Device model
from django.conf import settings


class GetEndpointData(APIView):
    """
    API endpoint to fetch device status from multiple external APIs with optional filters.
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

        # Get the requested endpoint and filter
        endpoint_key = request.query_params.get("endpoint", "").strip()
        device_filter = request.query_params.get("filter", "").strip()

        # Get the external URLs from the plugin settings
        available_endpoints = settings.PLUGINS_CONFIG.get("endpoints_plugin", {})

        if not endpoint_key:
            return Response(
                {"error": "Missing 'endpoint' parameter. Available options: " + ", ".join(available_endpoints.keys())},
                status=400,
            )

        # Retrieve the selected external API URL
        external_api_url = available_endpoints.get(endpoint_key, "").rstrip("/")

        if not external_api_url:
            return Response({"error": f"Invalid endpoint '{endpoint_key}'"}, status=400)

        # Construct the full API URL
        full_url = f"{external_api_url}/?filter={device_filter}" if device_filter else external_api_url

        try:
            # Fetch JSON from the selected external API
            response = requests.get(full_url, timeout=10)
            response.raise_for_status()
            return Response(response.json())

        except requests.exceptions.ConnectionError:
            return Response({"error": f"Failed to connect to {external_api_url}"}, status=502)
        except requests.exceptions.Timeout:
            return Response({"error": f"Request to {external_api_url} timed out"}, status=504)
        except requests.exceptions.RequestException as e:
            return Response({"error": f"API request failed: {str(e)}"}, status=500)
