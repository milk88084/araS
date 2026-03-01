import pino from "pino";

const level = process.env.LOG_LEVEL ?? "info";

export const logger = pino({
  level,
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino/file", options: { destination: 1 } }
      : undefined,
  serializers: pino.stdSerializers,
  base: { service: "repo-server" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const metricsState = {
  requestCount: 0,
  errorCount: 0,
  responseTimes: [] as number[],
};

export function recordMetric(durationMs: number, isError: boolean) {
  metricsState.requestCount++;
  if (isError) metricsState.errorCount++;
  metricsState.responseTimes.push(durationMs);

  if (metricsState.responseTimes.length > 1000) {
    metricsState.responseTimes = metricsState.responseTimes.slice(-500);
  }
}

export function getP95(): number {
  const sorted = [...metricsState.responseTimes].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[idx];
}

export function getErrorRate(): number {
  if (metricsState.requestCount === 0) return 0;
  return metricsState.errorCount / metricsState.requestCount;
}

const ERROR_RATE_WARN = 0.05;
const ERROR_RATE_CRITICAL = 0.01;
const P95_WARN_MS = 2000;
const P95_CRITICAL_MS = 1000;

export function checkAlerts() {
  const errorRate = getErrorRate();
  const p95 = getP95();

  if (errorRate > ERROR_RATE_WARN) {
    logger.warn({ errorRate }, "Error rate exceeds 5% threshold");
  }
  if (p95 > P95_WARN_MS) {
    logger.warn({ p95 }, "P95 latency exceeds 2000ms threshold");
  }
  if (errorRate > ERROR_RATE_CRITICAL) {
    logger.error({ errorRate }, "Error rate alert: exceeds 1% critical threshold");
  }
  if (p95 > P95_CRITICAL_MS) {
    logger.error({ p95 }, "P95 latency alert: exceeds 1000ms critical threshold");
  }
}
