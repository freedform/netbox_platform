# Add your plugins and plugin settings here.
# Of course uncomment this file out.

# To learn how to build images with your required plugins
# See https://github.com/netbox-community/netbox-docker/wiki/Using-Netbox-Plugins

PLUGINS = [
    "nextbox_ui_plugin",
    "alerts_plugin",
]

PLUGINS_CONFIG = {
    "nextbox_ui_plugin": {
        "alerts_enable": True,
        "alerts_url": "http://netbox.local:8000/api/plugins/alerts_plugin/fetch-device-status",
        "alerts_polling_interval": 5,
        "alerts_device_base_url": "https://someurl.com/alerts?filter=(value=replace_to_name)",
        "interface_bw_base_url": "https://some_monitoring.com?device=device_name&inteface=interface_name)"
    },
    "alerts_plugin": {
        "alerts": "http://elk_alerts:8888"
    }
}
