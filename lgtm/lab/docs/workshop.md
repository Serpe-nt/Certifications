# The workshop service

A small Python web service with no telemetry at all, which you instrument by hand: with the OpenTelemetry SDK in modules m07 and m08, and with the Prometheus client library in module m03. It runs on your PC, not in the cluster, and sends OTLP to the lab's collector gateway, so no image registry is involved. The finished state after each lesson group is in `lgtm/lab/workshop/solutions/`.

Why Flask, Python 3.14 and these package versions: `lgtm/docs/adr/d2-workshop-service.md`.

## What it does

A pretend back office for the shop. Every endpoint does something a trace can show.

| Endpoint | Does | What a trace shows |
|---|---|---|
| `GET /` | lists the endpoints and the SKUs | |
| `GET /healthz` | answers `{"status": "ok"}` | |
| `GET /products` | reads the product list from the shop (`GET <SHOP_URL>/api/products`) | an outgoing HTTP call; 502 when the shop is away |
| `GET /inventory/<sku>` | reads the stock of one product from a local SQLite file, through a DB-API cursor | a database query; 404 for an unknown SKU |
| `GET /compute?n=20` | computes a Fibonacci number the slow way; `n` from 0 to 38, each step up takes about 1.6 times as long (on the owner's PC `n=34` takes about 0.3 s, `n=36` about a second) | a CPU-bound span that can be made slow |
| `POST /checkout` | body `{"sku": "OLJCESPC7Z", "quantity": 2}`: reserves the stock in SQLite, reads the price from the shop, charges a pretend card, stores the order | several steps in one request; 409 when out of stock, 500 when the card is declined (10% of the time, `WORKSHOP_FAIL_RATE`), 502 when the shop is away |

The SKUs are the shop's product ids. The SQLite file (`workshop.db`) is created afresh with 500 items of each product every time the service starts.

## Run it

Everything below runs from `lgtm/lab/workshop`.

### With Python (Windows PowerShell or WSL)

You need Python 3.10 or newer (the images use 3.14).

```bash
python run.py
```

`run.py` creates a virtual environment `.venv` in the chosen folder on the first run, installs that folder's `requirements.txt`, and starts the service on http://127.0.0.1:8000. A solution runs the same way:

```bash
python run.py solutions/03-propagation
```

`run.py` prints the command it starts and every `OTEL_*`, `SHOP_*` and `WORKSHOP_*` setting it passes on. The settings come from three places, the later ones winning: `lab.env` (where the lab is), the folder's `workshop.env` (what this variant sends), and your own environment.

### With Docker

```bash
docker compose up --build
```

A solution, in PowerShell and in bash:

```powershell
$env:WORKSHOP_VARIANT="solutions/03-propagation"; docker compose up --build
```

```bash
WORKSHOP_VARIANT=solutions/03-propagation docker compose up --build
```

Remove the variable (`Remove-Item Env:WORKSHOP_VARIANT`, or `unset WORKSHOP_VARIANT`) to go back to the starting point. The service answers on http://127.0.0.1:8000 either way; `WORKSHOP_PORT` changes the host port.

### Make some traffic

```bash
python load.py                       # 2 requests a second until Ctrl+C
python load.py --rate 5 --duration 60
python load.py --slow                # the CPU work gets slow, for the slow-span lessons
```

`load.py` needs only the Python standard library. In Docker, `docker compose --profile load up --build` starts it beside the service.

## Where the telemetry goes

The lab's collector gateway takes OTLP over HTTP at the address `otlp` of the lab (lab contract, "Addresses in the browser"): the `lab-glue` chart routes `http://otlp.lab.k8s.local` (port 80, through the load balancer `lb` at 10.10.0.5 and the lab's Gateway) to Service `otel-gateway` in namespace `otel`, port 4318. The service calls the shop at `http://shop.lab.k8s.local`.

`lab.env` holds these settings:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://otlp.lab.k8s.local
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_SERVICE_NAME=workshop
OTEL_RESOURCE_ATTRIBUTES=service.namespace=workshop,deployment.environment.name=learner-pc
SHOP_URL=http://shop.lab.k8s.local
```

The SDK adds `/v1/traces`, `/v1/metrics` and `/v1/logs` to the endpoint. In Grafana the service shows up as `service_name="workshop"` in Loki and Mimir, and `resource.service.name = "workshop"` in Tempo.

### On Windows

Windows sends every `.k8s.local` name to the lab's DNS, so the names in `lab.env` resolve as they are. Nothing to set: `python run.py ...` works from PowerShell.

If you prefer to set the variables yourself rather than through `lab.env` (they win over it):

```powershell
$env:OTEL_EXPORTER_OTLP_ENDPOINT = "http://otlp.lab.k8s.local"
$env:OTEL_EXPORTER_OTLP_PROTOCOL = "http/protobuf"
$env:OTEL_SERVICE_NAME = "workshop"
$env:SHOP_URL = "http://shop.lab.k8s.local"
```

### In WSL

WSL does not use the lab's DNS: its `/etc/hosts` is kept by hand and knows `cluster-endpoint.k8s.local` but none of the `lab.k8s.local` names. Add the two names the service uses to `/etc/hosts` (the lab's reference page, `lgtm/lab/docs/reference.md`, gives the full line for every address):

```bash
echo "10.10.0.5 otlp.lab.k8s.local shop.lab.k8s.local" | sudo tee -a /etc/hosts
```

Then the settings in `lab.env` work unchanged:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://otlp.lab.k8s.local
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_SERVICE_NAME=workshop
export SHOP_URL=http://shop.lab.k8s.local
```

The lab's Gateway picks the backend by the host name, so `http://10.10.0.5` alone, without a name, does not reach the collector.

### In Docker

Containers do not use the Windows rule for `.k8s.local` either. `compose.yaml` maps the two names to the load balancer with `extra_hosts`; if your lab's load balancer has another address, set `LAB_LB_ADDRESS` before `docker compose up`.

### Without the lab

With no lab running, the service still answers: `/products` and `/checkout` return 502 because the shop is away, and the SDK logs that it cannot export. To see the telemetry on your PC instead, start a collector that prints what it gets, for example the one in `test/collector.yaml`, and point `OTEL_EXPORTER_OTLP_ENDPOINT` at it.

## The solutions

Each OpenTelemetry solution builds on the one before it, so the difference between two neighbours is one lesson. Compare them with `diff` (or your editor's compare view), for example:

```bash
diff solutions/02-manual-spans/app.py solutions/03-propagation/app.py
diff solutions/02-manual-spans/workshop.env solutions/03-propagation/workshop.env
```

| Folder | Lesson | What changes | What it sends |
|---|---|---|---|
| `.` (the starting point) | | | nothing |
| `solutions/prometheus-client` | m03 step 11, add a metric to a small service | the starting point plus the Prometheus client library: `workshop_http_requests_total`, `workshop_http_request_duration_seconds`, `workshop_checkouts_total{outcome}`, `workshop_inventory_stock{sku}` | no OTLP; serves `GET /metrics` in the Prometheus text format |
| `solutions/01-zero-code` | m07 step 7, zero-code instrumentation | `app.py` unchanged; `requirements.txt` adds the agent, the OTLP exporter and the Flask, requests and sqlite3 instrumentations; the command becomes `opentelemetry-instrument python app.py`; `OTEL_SEMCONV_STABILITY_OPT_IN=http,database` asks for the stable attribute names | traces: server spans, client spans to the shop, SQLite spans |
| `solutions/02-manual-spans` | m07 step 8, manual spans and attributes | a tracer from the API; spans `checkout.reserve`, `checkout.charge`, `checkout.store` and `fibonacci`; attributes `workshop.*`; span events; the declined charge recorded as an exception with status Error | traces |
| `solutions/03-propagation` | m07 step 9, propagation across services | the requests instrumentation switched off; calls to the shop in a client span of its own with the W3C `traceparent` and `baggage` headers injected by hand; baggage `workshop.customer.tier` from the `X-Customer-Tier` request header | traces that continue in the shop |
| `solutions/04-metrics` | m08 step 4, metrics in the workshop service | a meter; counter `workshop.checkouts{outcome}`, up-down counter `workshop.checkouts.active`, histogram `workshop.compute.duration`, observable gauge `workshop.inventory.stock`; metrics exporter on, every 15 seconds | traces and metrics |
| `solutions/05-logs` | m08 step 6, correlated logs | the logging instrumentation sends Python's log records over OTLP with the trace id and span id; log calls get attributes through `extra=` | traces, metrics and logs |

In Mimir, the OpenTelemetry metric names get Prometheus suffixes (lab contract, "Telemetry flow"): `workshop_checkouts_total`, `workshop_checkouts_active`, `workshop_compute_duration_seconds_bucket`, `workshop_inventory_stock`.

The Prometheus variant serves its metrics on your PC. A Prometheus server in the cluster would have to reach your PC to scrape them; module m03 decides whether its lab step reads the page directly or adds a scrape target.

## Testing the service and the solutions

```bash
bash test/run-solutions.sh
```

It runs the starting point and every solution twice, once from the Docker image and once with `python run.py` in a bare Python container, against a debug collector and a stand-in shop (`test/stub_shop.py`) that take the lab's names on a private Docker network. For each one it checks that the service answers and that the collector received exactly the signals the solution's name says, with the expected span names, attributes, metric names and log records. No host port is used.
