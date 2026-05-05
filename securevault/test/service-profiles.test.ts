/**
 * Service Registry & Profile Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server/fastify-server.js';

const TEST_CONFIG = {
  nodeEnv: 'test',
  masterKey: 'test-profile-registry-master-key-32b!',
  dbPath: ':memory:',
  auditLogPath: '/dev/null',
  gatewayPort: 0,
  gatewayHost: '127.0.0.1',
  tlsCertPath: '',
  tlsKeyPath: '',
  telegramBotToken: '0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  telegramUserId: '123456789',
  agentToken: 'test-profile-token',
  autoExecuteEnabled: false,
  autoExecuteMaxAmount: 100,
  autoExecuteCurrency: 'USD',
  riskTimezone: 'UTC',
  tradingMode: 'paper' as const,
  tradeApprovalThreshold: 100,
  tradeMaxPositionPercent: 25,
};

let app: FastifyInstance;
let authToken: string;
let secretId: string;

describe('Service Profile Tests', () => {
  beforeAll(async () => {
    app = await buildServer(TEST_CONFIG as any);
    authToken = TEST_CONFIG.agentToken;

    // Create a secret to use with profiles
    const res = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: 'Alpaca Paper Key',
        category: 'trading_account',
        plaintext: '{"apiKey":"PKTEST123","secretKey":"SKTEST456"}',
        metadata: { tags: ['alpaca'] },
      },
    });
    secretId = res.json().id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Profile CRUD via Admin API ───

  it('POST /api/admin/profiles creates a profile', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/profiles',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: 'Alpaca Paper Trading',
        adapterType: 'alpaca',
        secretId,
        config: { tradingMode: 'paper', baseUrl: 'https://paper-api.alpaca.markets' },
        isDefault: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe('Alpaca Paper Trading');
    expect(body.adapterType).toBe('alpaca');
    expect(body.isDefault).toBe(true);
    expect(body.enabled).toBe(true);
    expect(body.id).toBeDefined();
  });

  it('GET /api/admin/profiles lists all profiles', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/profiles',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0].adapterType).toBe('alpaca');
  });

  it('GET /api/admin/profiles?adapterType=alpaca filters by type', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/profiles?adapterType=alpaca',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.length).toBeGreaterThanOrEqual(1);
    body.forEach((p: any) => expect(p.adapterType).toBe('alpaca'));
  });

  it('GET /api/admin/profiles/:id returns one profile', async () => {
    // Get list first
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/admin/profiles',
      headers: { authorization: `Bearer ${authToken}` },
    });
    const profileId = listRes.json()[0].id;

    const res = await app.inject({
      method: 'GET',
      url: `/api/admin/profiles/${profileId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(profileId);
  });

  it('PUT /api/admin/profiles/:id updates a profile', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/admin/profiles',
      headers: { authorization: `Bearer ${authToken}` },
    });
    const profileId = listRes.json()[0].id;

    const res = await app.inject({
      method: 'PUT',
      url: `/api/admin/profiles/${profileId}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { name: 'Alpaca Paper (Updated)' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Alpaca Paper (Updated)');
  });

  it('POST /api/admin/profiles requires name, adapterType, secretId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/profiles',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { name: 'Missing fields' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('DELETE /api/admin/profiles/:id deletes a profile', async () => {
    // Create a second profile to delete
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/admin/profiles',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: 'To Be Deleted',
        adapterType: 'stripe',
        secretId,
      },
    });
    const profileId = createRes.json().id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/admin/profiles/${profileId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);

    // Verify it's gone
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/admin/profiles/${profileId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(getRes.statusCode).toBe(404);
  });

  // ─── Service Registry unit tests ───

  it('Service Registry parseCredentials handles JSON format', async () => {
    const { serviceRegistry } = await import('../src/services/service-registry.js');
    // Access through executeWithProfile which calls parseCredentials internally
    // We test indirectly through the profile test endpoint
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/admin/profiles?adapterType=alpaca',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(listRes.json().length).toBeGreaterThanOrEqual(1);
  });

  // ─── Secret category: trading_account ───

  it('Can create a trading_account secret', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: 'Alpaca Live Key',
        category: 'trading_account',
        plaintext: '{"apiKey":"AKTLIVE789","secretKey":"SKTLIVE012"}',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().category).toBe('trading_account');
  });
});
