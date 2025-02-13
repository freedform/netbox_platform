from django.urls import include, path

# Include API URLs
urlpatterns = [
    path("api/", include("endpoints_plugin.api.urls")),
]
