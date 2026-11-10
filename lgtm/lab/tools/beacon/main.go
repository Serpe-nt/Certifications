// Command beacon publishes the lab's check tokens in all three signals, as
// lgtm/docs/plan/02-lab-contract.md ("Check tokens") describes:
//
//   - log:    one JSON log line per log slot and interval, with the
//     attribute "slot" and the body {"slot": ..., "payload": {"token": ...}}
//   - metric: the gauge lab_beacon_value{slot="metric-..."} whose value is
//     the decimal token
//   - span:   one trace per span slot and interval, a root span beacon.tick
//     with a child span beacon.slot carrying beacon.slot and beacon.token
//
// Configuration comes from the environment:
//
//	LAB_SEED                      the lab seed, 16 hex characters (required)
//	OTEL_EXPORTER_OTLP_ENDPOINT   OTLP over HTTP, for example http://otel-gateway.otel.svc:4318
//	BEACON_INTERVAL               how often to publish (Go duration, default 1m)
//	BEACON_HTTP_ADDR              health endpoint address (default :8080)
//	BEACON_MEMORY_LIMIT           container memory limit in bytes; the Go
//	                              runtime keeps its heap under 90% of it
//
// The beacon writes only start, stop and error lines to standard output, so
// the cluster's log collector does not store a second copy of the tokens.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"runtime/debug"
	"strconv"
	"sync/atomic"
	"syscall"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	otellog "go.opentelemetry.io/otel/log"
	"go.opentelemetry.io/otel/metric"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/trace"
)

// version is set at build time with -ldflags "-X main.version=...".
var version = "dev"

const scopeName = "lab-tools/beacon"

// Queue sizes bound the memory the beacon uses while the gateway is away:
// when a queue is full, new records are dropped instead of kept.
const (
	queueSize = 2048
	batchSize = 512
)

type config struct {
	seed        string
	interval    time.Duration
	httpAddr    string
	memoryLimit int64
}

func loadConfig() (config, error) {
	c := config{interval: time.Minute, httpAddr: ":8080"}
	c.seed = NormaliseSeed(os.Getenv("LAB_SEED"))
	if !ValidSeed(c.seed) {
		return c, errors.New("LAB_SEED must be 16 hexadecimal characters")
	}
	if v := os.Getenv("BEACON_INTERVAL"); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil || d < time.Second {
			return c, fmt.Errorf("BEACON_INTERVAL %q is not a duration of at least 1s", v)
		}
		c.interval = d
	}
	if v := os.Getenv("BEACON_HTTP_ADDR"); v != "" {
		c.httpAddr = v
	}
	if v := os.Getenv("BEACON_MEMORY_LIMIT"); v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err != nil || n <= 0 {
			return c, fmt.Errorf("BEACON_MEMORY_LIMIT %q is not a number of bytes", v)
		}
		c.memoryLimit = n
	}
	return c, nil
}

// telemetry holds the three SDK providers.
type telemetry struct {
	traces  *sdktrace.TracerProvider
	metrics *sdkmetric.MeterProvider
	logs    *sdklog.LoggerProvider
}

func newTelemetry(ctx context.Context, interval time.Duration) (*telemetry, error) {
	// Explicit attributes come last, so service.name and service.namespace
	// stay what the lab contract says even if the environment sets others.
	res, err := resource.New(ctx,
		resource.WithFromEnv(),
		resource.WithTelemetrySDK(),
		resource.WithAttributes(
			attribute.String("service.name", "beacon"),
			attribute.String("service.namespace", "lab-tools"),
			attribute.String("service.version", version),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("resource: %w", err)
	}

	// The exporters read OTEL_EXPORTER_OTLP_ENDPOINT and retry failed exports
	// with back-off (on by default).
	traceExp, err := otlptracehttp.New(ctx)
	if err != nil {
		return nil, fmt.Errorf("trace exporter: %w", err)
	}
	metricExp, err := otlpmetrichttp.New(ctx)
	if err != nil {
		return nil, fmt.Errorf("metric exporter: %w", err)
	}
	logExp, err := otlploghttp.New(ctx)
	if err != nil {
		return nil, fmt.Errorf("log exporter: %w", err)
	}

	return &telemetry{
		traces: sdktrace.NewTracerProvider(
			sdktrace.WithResource(res),
			sdktrace.WithSampler(sdktrace.AlwaysSample()),
			sdktrace.WithBatcher(traceExp,
				sdktrace.WithMaxQueueSize(queueSize),
				sdktrace.WithMaxExportBatchSize(batchSize)),
		),
		// The gauge is read and exported once per interval.
		metrics: sdkmetric.NewMeterProvider(
			sdkmetric.WithResource(res),
			sdkmetric.WithReader(sdkmetric.NewPeriodicReader(metricExp, sdkmetric.WithInterval(interval))),
		),
		logs: sdklog.NewLoggerProvider(
			sdklog.WithResource(res),
			sdklog.WithProcessor(sdklog.NewBatchProcessor(logExp,
				sdklog.WithMaxQueueSize(queueSize),
				sdklog.WithExportMaxBatchSize(batchSize))),
		),
	}, nil
}

// shutdown flushes what is queued, giving up when ctx ends.
func (t *telemetry) shutdown(ctx context.Context) {
	if err := t.traces.Shutdown(ctx); err != nil {
		log.Printf("trace provider shutdown: %v", err)
	}
	if err := t.metrics.Shutdown(ctx); err != nil {
		log.Printf("meter provider shutdown: %v", err)
	}
	if err := t.logs.Shutdown(ctx); err != nil {
		log.Printf("logger provider shutdown: %v", err)
	}
}

// beacon publishes the tokens of every slot.
type beacon struct {
	logSlots    []Slot
	metricSlots []Slot
	spanSlots   []Slot
	tracer      trace.Tracer
	logger      otellog.Logger
	lastTick    atomic.Int64 // Unix nanoseconds of the last finished tick
	ticks       atomic.Int64
}

func newBeacon(seed string, t *telemetry) (*beacon, error) {
	b := &beacon{
		logSlots:    SlotTokens(seed, "log"),
		metricSlots: SlotTokens(seed, "metric"),
		spanSlots:   SlotTokens(seed, "span"),
		tracer:      t.traces.Tracer(scopeName, trace.WithInstrumentationVersion(version)),
		logger:      t.logs.Logger(scopeName, otellog.WithInstrumentationVersion(version)),
	}
	// Tokens never change while the beacon runs: one observable gauge reports
	// every metric slot each time the reader collects.
	meter := t.metrics.Meter(scopeName, metric.WithInstrumentationVersion(version))
	_, err := meter.Int64ObservableGauge("lab_beacon_value",
		metric.WithDescription("Check token of a metric slot of the lab's lessons (lab contract, Check tokens)."),
		metric.WithInt64Callback(func(_ context.Context, o metric.Int64Observer) error {
			for _, s := range b.metricSlots {
				v, _ := strconv.ParseInt(s.Token, 10, 64)
				o.Observe(v, metric.WithAttributes(attribute.String("slot", s.ID)))
			}
			return nil
		}))
	if err != nil {
		return nil, fmt.Errorf("gauge: %w", err)
	}
	return b, nil
}

type logBody struct {
	Msg     string `json:"msg"`
	Slot    string `json:"slot"`
	Payload struct {
		Token string `json:"token"`
	} `json:"payload"`
}

// tick emits one log record per log slot and one trace per span slot.
func (b *beacon) tick(ctx context.Context) {
	now := time.Now()
	for _, s := range b.logSlots {
		body := logBody{Msg: "beacon token", Slot: s.ID}
		body.Payload.Token = s.Token
		line, _ := json.Marshal(body)
		var r otellog.Record
		r.SetTimestamp(now)
		r.SetObservedTimestamp(now)
		r.SetSeverity(otellog.SeverityInfo)
		r.SetSeverityText("INFO")
		r.SetBody(attribute.StringValue(string(line)))
		r.AddAttributes(attribute.String("slot", s.ID))
		b.logger.Emit(ctx, r)
	}
	for _, s := range b.spanSlots {
		tickCtx, root := b.tracer.Start(ctx, "beacon.tick", trace.WithNewRoot(),
			trace.WithAttributes(attribute.String("beacon.slot", s.ID)))
		_, child := b.tracer.Start(tickCtx, "beacon.slot",
			trace.WithAttributes(
				attribute.String("beacon.slot", s.ID),
				attribute.String("beacon.token", s.Token),
			))
		child.End()
		root.End()
	}
	b.ticks.Add(1)
	b.lastTick.Store(time.Now().UnixNano())
}

func (b *beacon) run(ctx context.Context, interval time.Duration) {
	b.tick(ctx)
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			b.tick(ctx)
		}
	}
}

// healthHandler answers 200 while ticks keep coming, 503 when the loop has
// stalled for three intervals. The body shows the heap, to watch the memory
// while the gateway is away.
func (b *beacon) healthHandler(interval time.Duration) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		last := time.Unix(0, b.lastTick.Load())
		healthy := time.Since(last) < 3*interval
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		w.Header().Set("Content-Type", "application/json")
		if !healthy {
			w.WriteHeader(http.StatusServiceUnavailable)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"healthy":    healthy,
			"version":    version,
			"ticks":      b.ticks.Load(),
			"last_tick":  last.UTC().Format(time.RFC3339),
			"slots":      len(b.logSlots) + len(b.metricSlots) + len(b.spanSlots),
			"heap_bytes": m.HeapAlloc,
			"sys_bytes":  m.Sys,
		})
	}
}

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC)
	cfg, err := loadConfig()
	if err != nil {
		log.Fatalf("beacon: %v", err)
	}
	if cfg.memoryLimit > 0 {
		debug.SetMemoryLimit(cfg.memoryLimit / 10 * 9)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()

	// Export errors (the gateway is away) are logged, at most one line per
	// signal and export attempt; the SDK keeps running.
	otel.SetErrorHandler(otel.ErrorHandlerFunc(func(err error) { log.Printf("otel: %v", err) }))

	tel, err := newTelemetry(ctx, cfg.interval)
	if err != nil {
		log.Fatalf("beacon: %v", err)
	}
	b, err := newBeacon(cfg.seed, tel)
	if err != nil {
		log.Fatalf("beacon: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", b.healthHandler(cfg.interval))
	srv := &http.Server{Addr: cfg.httpAddr, Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("beacon: health endpoint: %v", err)
		}
	}()

	log.Printf("beacon %s started: %d log, %d metric and %d span slots every %s, OTLP to %s",
		version, len(b.logSlots), len(b.metricSlots), len(b.spanSlots), cfg.interval,
		os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"))
	b.run(ctx, cfg.interval)

	log.Printf("beacon: stopping, flushing what is queued (at most 10s)")
	done, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(done)
	tel.shutdown(done)
	log.Printf("beacon: stopped after %d ticks", b.ticks.Load())
}
