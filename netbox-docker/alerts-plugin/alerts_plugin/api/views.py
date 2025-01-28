import requests
from rest_framework.response import Response
from rest_framework.views import APIView


class FetchDeviceStatusAPIView(APIView):
    """
    API endpoint to fetch device status from an external API with optional filters.
    """

    def get(self, request, *args, **kwargs):
        # Get the filter parameter
        device_filter = request.query_params.get("filter", "")
        # Construct the external API URL
        external_api_url = f"http://netbox.local:8888/?filter={device_filter}"

        try:
            # Fetch JSON from the external API
            response = requests.get(external_api_url, timeout=10)
            response.raise_for_status()

            # Return the JSON response
            return Response(response.json())

        except requests.exceptions.RequestException as e:
            # Return an error response in case of failure
            return Response({"error": str(e)}, status=500)
