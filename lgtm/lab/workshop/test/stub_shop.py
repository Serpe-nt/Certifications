"""A stand-in for the shop's product API, for testing the workshop service
without the lab. Standard library only. It answers GET /api/products and
GET /api/products/<id> like the shop's frontend, and prints the trace context
and baggage headers it receives, to show propagation.

    python stub_shop.py [port]      default port 8080
"""

import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SKUS = [
    "OLJCESPC7Z", "66VCHSJNUP", "1YMWWN1N4O", "L9ECAV7KIM", "2ZYFJ3GM2N",
    "0PUK6V6EV0", "LS4PSXUNUM", "9SIQT8TOJO", "6E92ZMYYFZ", "HQTGWGPNH4",
]
PRODUCTS = {
    sku: {"id": sku, "name": f"Product {sku}", "priceUsd": {"currencyCode": "USD", "units": 10 + i, "nanos": 500000000}}
    for i, sku in enumerate(SKUS)
}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        print(
            f"GET {self.path} traceparent={self.headers.get('traceparent', '-')}"
            f" baggage={self.headers.get('baggage', '-')}",
            flush=True,
        )
        if self.path == "/api/products":
            self.reply(200, list(PRODUCTS.values()))
        elif self.path.startswith("/api/products/") and self.path.rsplit("/", 1)[1] in PRODUCTS:
            self.reply(200, PRODUCTS[self.path.rsplit("/", 1)[1]])
        else:
            self.reply(404, {"error": "not found"})

    def reply(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
