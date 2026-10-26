function normalizeBasePath(value: string | undefined): string {
  const segment = (value ?? '/').trim().replace(/^\/+|\/+$/g, '');
  return segment ? '/' + segment : '/';
}

export function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

/** MSW is opt-out: development defaults on, production defaults off. */
export function resolveMswEnabled(value: string | undefined, isDevelopment: boolean): boolean {
  return parseBoolean(value, isDevelopment);
}

export const env = Object.freeze({
  basePath: normalizeBasePath(import.meta.env.VITE_BASE_PATH),
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.trim() || '/api',
  enableMsw: resolveMswEnabled(import.meta.env.VITE_ENABLE_MSW, import.meta.env.DEV),
  isTest: import.meta.env.MODE === 'test',
});

/** Prefix a public asset path with the configured deployment base path. */
export function withBasePath(path: string): string {
  const suffix = path.startsWith('/') ? path : '/' + path;
  return env.basePath === '/' ? suffix : env.basePath + suffix;
}
