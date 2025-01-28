from django.urls import include, path

# Include API URLs
urlpatterns = [
    path("api/", include("my_plugin.api.urls")),
]
