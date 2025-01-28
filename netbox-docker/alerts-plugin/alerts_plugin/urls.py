from django.urls import include, path

# Include API URLs
urlpatterns = [
    path("api/", include("alerts_plugin.api.urls")),
]
