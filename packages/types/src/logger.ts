/**
 * Pluggable logger contract. Every package that currently calls
 * `console.warn` / `console.error` should be migrated to import
 * `getLogger()` and route through this instead, so Phase 7's
 * Sentry / OTel sink can swap the global without touching call sites.
 *
 * Why a global instead of DI?
 *   - Most callers are deep inside libraries (reducers, adapters)
 *     where threading a logger argument through every signature is
 *     noise.
 *   - The logger doesn't hold state worth isolating per-test; tests
 *     can `setLogger(stubLogger)` in beforeEach if they need to
 *     assert against emitted events.
 *
 * Levels follow the standard syslog ordering. Methods take a free-form
 * `message` plus an optional structured `context` bag — keep keys
 * small and stable so a downstream sink can index them.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
  /** Create a child logger that adds default context to every record. */
  child(defaults: LogContext): Logger;
}

class ConsoleLogger implements Logger {
  constructor(private readonly defaults: LogContext = {}) {}

  debug(message: string, context?: LogContext): void {
    if (typeof console === "undefined") return;
    // debug intentionally drops to no-op in prod-style consoles to keep
    // signal high; switch to console.debug if you want it visible.
    if (typeof console.debug === "function") {
      console.debug(this._format(message), this._merge(context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (typeof console === "undefined") return;
    console.info(this._format(message), this._merge(context));
  }

  warn(message: string, context?: LogContext): void {
    if (typeof console === "undefined") return;
    console.warn(this._format(message), this._merge(context));
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    if (typeof console === "undefined") return;
    console.error(this._format(message), error, this._merge(context));
  }

  child(defaults: LogContext): Logger {
    return new ConsoleLogger({ ...this.defaults, ...defaults });
  }

  private _format(message: string): string {
    return message;
  }

  private _merge(context: LogContext | undefined): LogContext {
    if (!context) return this.defaults;
    return { ...this.defaults, ...context };
  }
}

let currentLogger: Logger = new ConsoleLogger();

/** Swap the active logger. Phase 7 calls this from Sentry init. */
export function setLogger(logger: Logger): void {
  currentLogger = logger;
}

/** Get the active logger. Always safe to call. */
export function getLogger(): Logger {
  return currentLogger;
}

/** Reset to the default console logger. Tests use this in afterEach. */
export function resetLogger(): void {
  currentLogger = new ConsoleLogger();
}
