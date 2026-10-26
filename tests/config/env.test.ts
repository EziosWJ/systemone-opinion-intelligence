import { describe, expect, it } from 'vitest';
import { env, resolveMswEnabled, withBasePath } from '../../src/config/env';

describe('environment config', () => {
  it('uses safe defaults and knows when it runs under tests', () => {
    expect(env.basePath).toBe('/');
    expect(env.apiBaseUrl).toBe('/api');
    expect(env.isTest).toBe(true);
    expect(typeof env.enableMsw).toBe('boolean');
  });

  it('enables MSW by default only in development and honours explicit overrides', () => {
    expect(resolveMswEnabled(undefined, true)).toBe(true);
    expect(resolveMswEnabled(undefined, false)).toBe(false);
    expect(resolveMswEnabled('false', true)).toBe(false);
    expect(resolveMswEnabled('0', true)).toBe(false);
    expect(resolveMswEnabled('true', false)).toBe(true);
    expect(resolveMswEnabled('on', false)).toBe(true);
    expect(resolveMswEnabled('yes', false)).toBe(true);
  });

  it('prefixes public assets with the configured base path', () => {
    expect(withBasePath('/mockServiceWorker.js')).toBe('/mockServiceWorker.js');
    expect(withBasePath('mockServiceWorker.js')).toBe('/mockServiceWorker.js');
  });
});
