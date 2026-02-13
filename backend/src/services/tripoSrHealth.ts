import { isTripoSrAvailable } from './tripoSrClient';

interface TripoSrHealthStatus {
  available: boolean;
  lastCheckedAt: Date | null;
  lastError: string | null;
  lastLatencyMs: number | null;
}

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const HEALTHCHECK_INTERVAL_MS = Number(process.env.TRIPOSR_HEALTHCHECK_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
const HEALTHCHECK_STALE_MS = HEALTHCHECK_INTERVAL_MS * 2;

let monitorTimer: NodeJS.Timeout | null = null;
const status: TripoSrHealthStatus = {
  available: false,
  lastCheckedAt: null,
  lastError: null,
  lastLatencyMs: null,
};

function updateStatus(next: Partial<TripoSrHealthStatus>) {
  Object.assign(status, next);
}

export async function runTripoSrHealthCheck(): Promise<TripoSrHealthStatus> {
  const start = Date.now();
  try {
    const available = await isTripoSrAvailable();
    updateStatus({
      available,
      lastCheckedAt: new Date(),
      lastError: null,
      lastLatencyMs: Date.now() - start,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown TripoSR health error';
    updateStatus({
      available: false,
      lastCheckedAt: new Date(),
      lastError: message,
      lastLatencyMs: Date.now() - start,
    });
  }

  return { ...status };
}

export function getTripoSrHealthStatus(): TripoSrHealthStatus {
  return { ...status };
}

export async function getTripoSrAvailability(): Promise<TripoSrHealthStatus> {
  if (!status.lastCheckedAt || Date.now() - status.lastCheckedAt.getTime() > HEALTHCHECK_STALE_MS) {
    return runTripoSrHealthCheck();
  }

  return { ...status };
}

export function startTripoSrHealthMonitor(): void {
  if (monitorTimer) return;

  console.log('[TripoSR] Starting health monitor...');
  runTripoSrHealthCheck().catch((err) => {
    const message = err instanceof Error ? err.message : err;
    console.warn('[TripoSR] Initial health check failed:', message);
  });

  monitorTimer = setInterval(() => {
    runTripoSrHealthCheck().catch((err) => {
      const message = err instanceof Error ? err.message : err;
      console.warn('[TripoSR] Health check failed:', message);
    });
  }, HEALTHCHECK_INTERVAL_MS);
}

export function stopTripoSrHealthMonitor(): void {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}
