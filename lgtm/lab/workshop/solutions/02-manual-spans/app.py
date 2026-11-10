"""The workshop service, solution 02: manual spans and attributes.

The service of solution 01 with spans and attributes of its own, made with the
OpenTelemetry API. The agent (opentelemetry-instrument) still sets up the SDK.

The learner instruments it by hand in the OpenTelemetry modules (m07, m08) and
with a Prometheus client library in module m03. The finished state after each
lesson group is in solutions/. How to run it: lgtm/lab/docs/workshop.md.

Endpoints:
    GET  /                 what this service offers
    GET  /healthz          liveness
    GET  /products         lists the shop's products (an outgoing HTTP call)
    GET  /inventory/<sku>  stock of one product (a local SQLite query)
    GET  /compute?n=20     a CPU-bound computation; each step up in n (0 to 38)
                           takes about 1.6 times as long
    POST /checkout         {"sku": ..., "quantity": ...}: reserve stock, read
                           the price from the shop, charge, store the order;
                           fails now and then on purpose
"""

import logging
import os
import random
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager

import requests
from flask import Flask, jsonify, request
from opentelemetry import trace

SHOP_URL = os.environ.get("SHOP_URL", "http://shop.lab.k8s.local").rstrip("/")
DB_PATH = os.environ.get("WORKSHOP_DB", "workshop.db")
# Share of charges that fail on purpose, for the error path.
FAIL_RATE = float(os.environ.get("WORKSHOP_FAIL_RATE", "0.1"))
HOST = os.environ.get("WORKSHOP_HOST", "127.0.0.1")
PORT = int(os.environ.get("WORKSHOP_PORT", "8000"))

# The shop's product ids (lgtm/lab/demo/src/postgresql/init.sql).
SKUS = [
    "OLJCESPC7Z", "66VCHSJNUP", "1YMWWN1N4O", "L9ECAV7KIM", "2ZYFJ3GM2N",
    "0PUK6V6EV0", "LS4PSXUNUM", "9SIQT8TOJO", "6E92ZMYYFZ", "HQTGWGPNH4",
]
INITIAL_STOCK = 500

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("workshop")

app = Flask(__name__)
# The API only: which SDK, exporter and sampler run behind it is the agent's job.
tracer = trace.get_tracer("workshop")
db_lock = threading.Lock()


class PaymentError(Exception):
    """The charge was declined (on purpose, WORKSHOP_FAIL_RATE of the time)."""


@contextmanager
def db():
    """A cursor in a transaction that commits on success; always closed.

    Queries go through a cursor (not Connection.execute), the DB-API way that
    database instrumentation libraries trace."""
    conn = sqlite3.connect(DB_PATH)
    try:
        with conn:
            yield conn.cursor()
    finally:
        conn.close()


def init_db():
    """Start every run with a full stock and no orders."""
    with db() as cur:
        cur.execute("DROP TABLE IF EXISTS inventory")
        cur.execute("DROP TABLE IF EXISTS orders")
        cur.execute("CREATE TABLE inventory (sku TEXT PRIMARY KEY, stock INTEGER NOT NULL)")
        cur.execute(
            "CREATE TABLE orders (id TEXT PRIMARY KEY, sku TEXT NOT NULL, quantity INTEGER NOT NULL,"
            " total_usd REAL NOT NULL, created REAL NOT NULL)"
        )
        cur.executemany("INSERT INTO inventory VALUES (?, ?)", [(s, INITIAL_STOCK) for s in SKUS])


def shop_product(sku):
    """Read one product from the shop's API."""
    response = requests.get(f"{SHOP_URL}/api/products/{sku}", timeout=5)
    response.raise_for_status()
    return response.json()


def price_of(product):
    price = product.get("priceUsd") or {}
    return price.get("units", 0) + price.get("nanos", 0) / 1e9


def fibonacci(n):
    """Deliberately slow: the work grows quickly with n."""
    return n if n < 2 else fibonacci(n - 1) + fibonacci(n - 2)


def charge(total):
    """Pretend to charge a card: a short wait, and sometimes a decline."""
    # An exception that leaves the with block is recorded as a span event and
    # sets the span's status to Error.
    with tracer.start_as_current_span("checkout.charge") as span:
        span.set_attribute("workshop.order.total_usd", round(total, 2))
        time.sleep(random.uniform(0.01, 0.05))
        if random.random() < FAIL_RATE:
            raise PaymentError(f"card declined for {total:.2f} USD")


@app.get("/")
def index():
    return jsonify(
        service="workshop",
        endpoints=["/healthz", "/products", "/inventory/<sku>", "/compute?n=20", "POST /checkout"],
        skus=SKUS,
    )


@app.get("/healthz")
def healthz():
    return jsonify(status="ok")


@app.get("/products")
def products():
    try:
        response = requests.get(f"{SHOP_URL}/api/products", timeout=5)
        response.raise_for_status()
    except requests.RequestException as err:
        log.warning("shop unavailable: %s", err)
        return jsonify(error="shop unavailable", detail=str(err)), 502
    items = [{"id": p["id"], "name": p["name"], "price_usd": round(price_of(p), 2)} for p in response.json()]
    return jsonify(count=len(items), products=items)


@app.get("/inventory/<sku>")
def inventory(sku):
    with db() as cur:
        row = cur.execute("SELECT stock FROM inventory WHERE sku = ?", (sku,)).fetchone()
    if row is None:
        return jsonify(error="unknown sku", sku=sku), 404
    return jsonify(sku=sku, stock=row[0])


@app.get("/compute")
def compute():
    n = request.args.get("n", default=20, type=int)
    if not 0 <= n <= 38:
        return jsonify(error="n must be between 0 and 38"), 400
    trace.get_current_span().set_attribute("workshop.compute.n", n)
    started = time.perf_counter()
    with tracer.start_as_current_span("fibonacci") as span:
        result = fibonacci(n)
        span.set_attribute("workshop.compute.result", result)
    return jsonify(n=n, result=result, seconds=round(time.perf_counter() - started, 4))


@app.post("/checkout")
def checkout():
    body = request.get_json(silent=True) or {}
    sku = body.get("sku")
    quantity = body.get("quantity", 1)
    # Attributes on the server span the Flask instrumentation started.
    server_span = trace.get_current_span()
    server_span.set_attribute("workshop.sku", str(sku))
    server_span.set_attribute("workshop.quantity", quantity if isinstance(quantity, int) else -1)
    if sku not in SKUS or not isinstance(quantity, int) or not 1 <= quantity <= 10:
        return jsonify(error="send a known sku and a quantity from 1 to 10"), 400

    # Reserve the stock first, so two checkouts cannot sell the same item.
    with tracer.start_as_current_span("checkout.reserve") as span, db_lock, db() as cur:
        stock = cur.execute("SELECT stock FROM inventory WHERE sku = ?", (sku,)).fetchone()[0]
        span.set_attribute("workshop.stock.before", stock)
        if stock < quantity:
            span.add_event("out of stock")
            return jsonify(error="out of stock", sku=sku, stock=stock), 409
        cur.execute("UPDATE inventory SET stock = stock - ? WHERE sku = ?", (quantity, sku))
        span.add_event("stock reserved", {"workshop.stock.after": stock - quantity})

    try:
        product = shop_product(sku)
        total = price_of(product) * quantity
        charge(total)
    except (requests.RequestException, PaymentError) as err:
        # Give the reserved stock back.
        with db_lock, db() as cur:
            cur.execute("UPDATE inventory SET stock = stock + ? WHERE sku = ?", (quantity, sku))
        if isinstance(err, PaymentError):
            log.error("checkout failed: %s", err)
            return jsonify(error="payment declined", detail=str(err)), 500
        log.warning("shop unavailable: %s", err)
        return jsonify(error="shop unavailable", detail=str(err)), 502

    order_id = uuid.uuid4().hex[:12]
    with tracer.start_as_current_span("checkout.store"), db_lock, db() as cur:
        cur.execute(
            "INSERT INTO orders VALUES (?, ?, ?, ?, ?)", (order_id, sku, quantity, total, time.time())
        )
    server_span.set_attribute("workshop.order.id", order_id)
    log.info("order %s placed: %d x %s for %.2f USD", order_id, quantity, sku, total)
    return jsonify(order_id=order_id, sku=sku, quantity=quantity, total_usd=round(total, 2)), 201


if __name__ == "__main__":
    init_db()
    log.info("workshop listening on http://%s:%d, shop at %s", HOST, PORT, SHOP_URL)
    app.run(host=HOST, port=PORT, threaded=True)
