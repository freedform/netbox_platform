import json
import logging
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs


# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


class WebRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            result = {
                "core_sw_2": {
                    "g0/2": {
                        "in": { "min": "3 Gbit/s", "max": "6 Gbit/s", "avg": "3.5 Gbit/s",},
                        "out": { "min": "4 Gbit/s", "max": "7 Gbit/s", "avg": "6 Gbit/s",}
                    }
                },
                "dist_sw_1": {
                    "g0/2": {
                        "in": { "min": "4 Gbit/s", "max": "7 Gbit/s", "avg": "6 Gbit/s",},
                        "out": { "min": "3 Gbit/s", "max": "6 Gbit/s", "avg": "3.5 Gbit/s",},
                    }
                }
            }

            response_json = json.dumps(result)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response_json)))
            self.end_headers()
            self.wfile.write(response_json.encode("utf-8"))

            logging.info(f"Responded to request: {self.path}")

        except Exception as e:
            logging.error(f"Error handling request: {e}")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Internal Server Error"}).encode("utf-8"))

    def log_message(self, format, *args):
        """Disable default access logs (useful for clean Docker logs)."""
        return


def run_server(host="0.0.0.0", port=6666):
    server = HTTPServer((host, port), WebRequestHandler)
    logging.info(f"Starting server on {host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run_server()
