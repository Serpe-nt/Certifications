// Container health probe: exits 0 when /healthz answers 200.
const port = /:(\d+)$/.exec(process.env.ADDR ?? ':8080')?.[1] ?? '8080';
try {
  const res = await fetch(`http://127.0.0.1:${port}/healthz`, { signal: AbortSignal.timeout(2500) });
  process.exit(res.ok ? 0 : 1);
} catch {
  process.exit(1);
}
