# L2: Strimzi 1.3.1 runs the Kafka cluster `telemetry`

Status: accepted by worker L2 on 2026-11-09.

## Context

Mimir 3 (ingest storage) and Tempo 3 (required in microservices mode) write incoming data to
Kafka and read it back (overview, decision 5). The lab contract asks for an operator-managed
cluster `telemetry` in namespace `kafka`, KRaft mode, three brokers on the real cluster and one
on kind, small volumes, reachable at `telemetry-kafka-bootstrap.kafka.svc:9092` without
authentication. That bootstrap name is the naming pattern of Strimzi
(`<cluster>-kafka-bootstrap`).

## Facts checked on 2026-11-09

- Strimzi 1.3.1 (2026-11-04) is the current release. It "supports only Kubernetes 1.32 and
  newer", runs Apache Kafka 4.2.x and 4.3.x (4.3.2 is the newest image of the release), and
  since 1.0.0 serves only the `v1` API of its resources. Source:
  https://github.com/strimzi/strimzi-kafka-operator/releases/tag/1.3.1
- The changelog of the next release (1.4.0, unreleased on the day) adds Kafka 4.4.0 and drops
  4.2.x; 1.3.0 made cert-manager integration early access and requires Kubernetes 1.32+.
  Source: https://github.com/strimzi/strimzi-kafka-operator/blob/main/CHANGELOG.md
- The chart is published as `oci://quay.io/strimzi-helm/strimzi-kafka-operator`. Source:
  `packaging/helm-charts/helm3/strimzi-kafka-operator/README.md` at tag 1.3.1.
- A KRaft cluster is a `KafkaNodePool` (roles `controller` and `broker`, `kraftMetadata:
  shared` on the volume) plus a `Kafka` resource with `version: 4.3.2` and
  `metadataVersion: 4.3-IV0`. Source: `packaging/examples/kafka/kafka-single-node.yaml` and
  `kafka-with-dual-role-nodes.yaml` at tag 1.3.1.

## Options

1. **Strimzi**: operator, CRDs for clusters, node pools, topics and users; the bootstrap name
   in the contract is its own.
2. A vendor operator (for example Confluent for Kubernetes): not examined further, because the
   contract's names and the course's lessons follow the open-source Kafka and Strimzi terms.
3. A plain StatefulSet of the Apache Kafka image: no operator, so no lessons on how an operator
   rolls brokers, and every listener, certificate and KRaft quorum setting by hand.
4. Redpanda: Kafka-compatible but not Kafka; Tempo's own Compose example uses it, but the
   course teaches Kafka's terms (brokers, partitions, consumer lag) on real Kafka.

## Decision

**Strimzi 1.3.1** (chart `strimzi-kafka-operator` 1.3.1, release `strimzi`, namespace `kafka`,
watching only `kafka`) running **Apache Kafka 4.3.2**:

- one `KafkaNodePool` `dual-role` with both roles: 3 nodes on the real cluster, 1 on kind;
  5 GiB per node on the lab StorageClass (2 GiB on kind); requests 1 GiB, limit 1.5 GiB,
  heap 768 MiB (768 MiB, 1 GiB and 512 MiB on kind);
- one listener `plain` on 9092, internal, no TLS, no authentication;
- replication factor 3 with `min.insync.replicas` 2 on the real cluster (1 and 1 on kind);
  24 hours of retention, because Mimir and Tempo move the data into S3 well before that;
- topic and user operators on, with small requests and limits.

Settings: `lgtm/lab/helm/platform/strimzi/kafka-cluster.yaml` and `kafka-cluster-kind.yaml`.

## Consequences

- Dual-role nodes save three controller pods. A lesson on scaling can split the roles into two
  pools later.
- The chart's CRDs are installed on the first install only. Upgrading Strimzi means applying
  the new CRDs first, as Strimzi's upgrade guide says.
- Topics are created by their clients (`auto.create.topics.enable: true`) or as `KafkaTopic`
  resources; card L3 decides which for Mimir and Tempo.
