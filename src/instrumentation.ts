// Sentry is imported inside NEXT_RUNTIME === "nodejs" guards: Next.js inlines
// NEXT_RUNTIME at build time, so the Edge Runtime variant of this file
// dead-code-eliminates the import entirely. On the Node side,
// `serverExternalPackages` in next.config.ts keeps the bundler from tracing
// Sentry's OpenTelemetry deps (diagnostics_channel, etc.), which stall Turbopack.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled: process.env.NODE_ENV === "production",
    });
  }
}

export async function onRequestError(
  err: Error,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/node");
    Sentry.captureException(err, {
      extra: {
        path: request.path,
        method: request.method,
        routerKind: context.routerKind,
        routePath: context.routePath,
        routeType: context.routeType,
      },
    });
  }
}
