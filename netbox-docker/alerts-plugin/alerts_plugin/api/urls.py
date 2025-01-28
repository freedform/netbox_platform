from django.urls import path
from .views import FetchDeviceStatusAPIView

urlpatterns = [
    path("fetch-device-status/", FetchDeviceStatusAPIView.as_view(), name="fetch_device_status"),
]
