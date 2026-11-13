# L6: the shop's Kafka advertises a name with its namespace

Status: accepted by worker L6 on 2026-11-13.

## Context

Both pods of the collector gateway (namespace `otel`) logged `Error scraping metrics` from the
receiver `kafka_metrics` about four times a minute. The receiver starts from
`kafka.shop.svc:9092`, which resolves, and the broker answers with the address it advertises,
`kafka:9092` (`KAFKA_ADVERTISED_LISTENERS` in `lgtm/lab/demo/chart/templates/datastores.yaml`).
A Kafka client connects to the advertised address for everything after the first request.
`kafka` is a short Service name, which resolves only inside the namespace `shop`.

Kafka 4.3's broker reference says of `advertised.listeners`: it "Specifies the listener addresses
that the Kafka brokers will advertise to clients and other brokers"
(https://kafka.apache.org/43/configuration/broker-configs/, read on 2026-11-13).

## Options

1. Change the gateway: give its pods a DNS search domain for `shop`, so `kafka` resolves there.
   It hides the wrong address in one client and leaves it wrong for any other client outside
   `shop`, for example a practice Collector in a lesson namespace.
2. Change the broker (chosen): advertise `kafka.<namespace>.svc:9092`. It resolves in every
   namespace, including `shop`, so the shop's own clients (checkout, fraud-detection, still
   configured with `kafka:9092` as their bootstrap address) work as before.

## Decision

The shop chart advertises `PLAINTEXT://kafka.{{ .Release.Namespace }}.svc:9092`. The gateway's
address `kafka.shop.svc:9092` is already in the same form and stays. The Docker Compose file of
the demo keeps `kafka:9092`: there every service shares one network and the short name resolves.
