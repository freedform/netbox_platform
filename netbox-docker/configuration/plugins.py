# Add your plugins and plugin settings here.
# Of course uncomment this file out.

# To learn how to build images with your required plugins
# See https://github.com/netbox-community/netbox-docker/wiki/Using-Netbox-Plugins

PLUGINS = [
    "nextbox_ui_plugin",
    "endpoints_plugin",
]

PLUGINS_CONFIG = {
    "nextbox_ui_plugin": {
        "dynamic_update_enable": True,
        "dynamic_update_interval": 5,
        "nb_endpoints_url": "http://netbox.local:8000/api/plugins/endpoints_plugin/get-data",
        "alerts_device_base_url": "https://someurl.com/alerts?filter=(value=replace_to_name)",
        "interface_bw_base_url": "https://some_monitoring.com?device=device_name&inteface=interface_name)",
    },
    "endpoints_plugin": {
        "alerts": "http://elk_alerts:8888",
        "bw": "http://interface_utilization:7777",
        "ifdata": "http://interface_data:6666",
    },
}
