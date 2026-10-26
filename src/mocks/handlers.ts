import { http, HttpResponse } from 'msw';
import { env } from '../config/env';
/** Foundation-only endpoint. Do not fabricate business entities before seed data implementation. */
export const handlers = [
  http.get(`${env.apiBaseUrl}/meta`, () => HttpResponse.json({
    app: 'systemone-opinion-intelligence',
    mode: 'mock',
    phase: 'foundation',
    dataReady: false,
  })),
];
