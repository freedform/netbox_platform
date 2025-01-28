from netbox.plugins import PluginConfig


class AlertsPlugin(PluginConfig):
    name = "alerts_plugin"
    verbose_name = "Alerts Plugin"
    version = "1.0.0"
    description = "A plugin that fetches JSON data from an external API."
    author = "My Name"
    base_url = "alerts_plugin"  # This defines the plugin's URL namespace
    required_settings = []
    default_settings = {}


config = AlertsPlugin
