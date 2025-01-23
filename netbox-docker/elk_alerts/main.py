import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs


class WebRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        query_components = parse_qs(urlparse(self.path).query)
        device_filter = query_components.get("filter", [])
        result = {
            "core_sw_1": "ok",
            "core_sw_2": "error",
            "dist_sw_1": "ok",
            "dist_sw_2": "warning",
            "edge_ro_1": "ok",
            "edge_ro_2": "ok",
        }
        if device_filter:
            device_filter = device_filter[0].split(",")
            result = {k: v for k, v in result.items() if k in device_filter}
        self.wfile.write(json.dumps(result).encode("utf-8"))


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8888), WebRequestHandler)
    server.serve_forever()
