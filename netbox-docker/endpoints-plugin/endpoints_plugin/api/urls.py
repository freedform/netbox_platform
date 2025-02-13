from django.urls import path
from .views import GetEndpointData

urlpatterns = [
    path("get-data/", GetEndpointData.as_view(), name="get_data"),
]
