import { env, withBasePath } from '../config/env';

/**
 * Starts MSW only when explicitly enabled (development default, production off).
 * The worker intercepts requests in the browser; mock data stays in memory.
 */
export async function enableMocking(): Promise<void> {
  if (!env.enableMsw) return;
  const { worker } = await import('./browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: withBasePath('/mockServiceWorker.js') },
    quiet: true,
  });
}
