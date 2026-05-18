import { appEnv } from '../config/env';

type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

const QUEUE_KEY = 'abel_analytics_events_v1';

export function trackEvent(name: string, props: AnalyticsProps = {}): void {
  if (!appEnv.analyticsEnabled) return;

  const event = {
    name,
    props,
    release: appEnv.release,
    createdAt: new Date().toISOString(),
  };

  try {
    const existing = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as unknown[];
    existing.push(event);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(existing.slice(-250)));
  } catch {
    // Analytics must never affect app behavior.
  }
}

export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', event => {
    trackEvent('global_error', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
    });
  });

  window.addEventListener('unhandledrejection', event => {
    trackEvent('unhandled_rejection', {
      reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
    });
  });
}
