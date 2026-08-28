const BASE_URL = "https://api.sleeper.app/v1";

export interface SleeperClientOptions {
  timeoutMs?: number;
  maxRetries?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class SleeperRequestError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly status: number | null,
  ) {
    super(message);
  }
}

/**
 * Thin transport wrapper: timeout + bounded retry with jitter. No caching —
 * each sync run is a single sequential pass, so there's nothing to
 * coalesce/dedupe within a run, and stale-while-revalidate doesn't apply to
 * a script that runs once and exits.
 */
export class SleeperClient {
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: SleeperClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseUrl = options.baseUrl ?? BASE_URL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async get<T = unknown>(path: string): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.getOnce<T>(path);
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          const backoff = 250 * 2 ** attempt + Math.random() * 100;
          await sleep(backoff);
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async getOnce<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(`${this.baseUrl}${path}`, { signal: controller.signal });
      if (!res.ok) {
        throw new SleeperRequestError(`Sleeper request failed: ${res.status} ${res.statusText}`, path, res.status);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
