import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs


class WebRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "http://netbox.local:8000")  # !!! dynamic value
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        query_components = parse_qs(urlparse(self.path).query)
        device_filter = query_components.get("filter", [])

        result = {
            "core_sw_1": {
                "status": "error",
                "interfaces": {
                    "g0/3": "warning"
                },
                "alert_link": "https://sfdas/dsadsa"
            },
            # "dist_sw_1": {
            #     "status": "warning",
            #     "interfaces": {},
            #     "alert_link": "https://sfdas/dsadsa"
            # },
            "edge_ro_1": {
                "status": "warning",
                "interfaces": {
                    "g0/1": "error"
                },
                "alert_link": "https://sfdas/dsadsa"
            },
        }
        if device_filter:
            device_filter = device_filter[0].split(",")
            result = {k: v for k, v in result.items() if k in device_filter}
        self.wfile.write(json.dumps(result).encode("utf-8"))


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8888), WebRequestHandler)
    server.serve_forever()
