/**
 * Admin UI API Tests
 * Tests admin dashboard endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server/fastify-server.js';

const TEST_CONFIG = {
  nodeEnv: 'test',
  masterKey: 'test-admin-ui-master-key-32bytes!',
  dbPath: ':memory:',
  auditLogPath: '/dev/null',
  gatewayPort: 0,
  gatewayHost: '127.0.0.1',
  tlsCertPath: '',
  tlsKeyPath: '',
  telegramBotToken: '0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  telegramUserId: '123456789',
  agentToken: 'test-admin-token',
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

describe('Admin UI API Tests', () => {
  beforeAll(async () => {
    app = await buildServer(TEST_CONFIG as any);
    authToken = TEST_CONFIG.agentToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── GET /admin — HTML page ───
  it('GET /admin returns HTML', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/admin',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('SecureVault Admin');
    expect(response.body).toContain('<script>');
    expect(response.body).toContain('dashboard');
    expect(response.body).toContain('secrets');
    expect(response.body).toContain('audit');
    expect(response.body).toContain('settings');
    expect(response.body).toContain('rules');
  });

  // ─── GET /api/admin/status ───
  it('GET /api/admin/status returns 401 without auth', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/status',
    });

    expect(response.statusCode).toBe(401);
  });

  it('GET /api/admin/status returns server stats', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/status',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('totalSecrets');
    expect(body).toHaveProperty('totalTasks');
    expect(body).toHaveProperty('pendingApprovals');
    expect(body).toHaveProperty('tradingMode');
    expect(body.tradingMode).toBe('paper');
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  // ─── GET /api/admin/config ───
  it('GET /api/admin/config returns redacted config', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/config',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.tradingMode).toBe('paper');
    expect(body.tradeApprovalThreshold).toBe(100);
    expect(body.tradeMaxPositionPercent).toBe(25);
    expect(body.nodeEnv).toBe('test');
    expect(body.masterKeySet).toBe(true);
    // Should NOT expose actual master key
    expect(body).not.toHaveProperty('masterKey');
  });

  // ─── PUT /api/admin/config ───
  it('PUT /api/admin/config updates config', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/admin/config',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        tradeApprovalThreshold: 500,
        tradeMaxPositionPercent: 30,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);

    // Verify the change persisted
    const configRes = await app.inject({
      method: 'GET',
      url: '/api/admin/config',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(configRes.json().tradeApprovalThreshold).toBe(500);
    expect(configRes.json().tradeMaxPositionPercent).toBe(30);
  });

  // ─── GET /api/admin/rules ───
  it('GET /api/admin/rules returns default rules', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/rules',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('autoExecuteEnabled');
    expect(body).toHaveProperty('autoExecuteMaxAmount');
    expect(body).toHaveProperty('perActionRules');
    expect(body).toHaveProperty('tradingPositionLimit');
    expect(body).toHaveProperty('tradingSellRequiresApproval');
    expect(body.perActionRules).toHaveProperty('payment');
    expect(body.perActionRules).toHaveProperty('trade');
    expect(body.perActionRules).toHaveProperty('transfer');
  });

  // ─── PUT /api/admin/rules ───
  it('PUT /api/admin/rules updates rules', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/admin/rules',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        autoExecuteEnabled: true,
        autoExecuteMaxAmount: 250,
        tradingSellRequiresApproval: false,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.autoExecuteEnabled).toBe(true);
    expect(body.autoExecuteMaxAmount).toBe(250);
    expect(body.tradingSellRequiresApproval).toBe(false);
  });

  // ─── GET /api/admin/audit ───
  it('GET /api/admin/audit returns paginated audit log', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/audit?limit=10',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('hasMore');
    expect(Array.isArray(body.data)).toBe(true);
  });

  // ─── GET /api/admin/audit/export ───
  it('GET /api/admin/audit/export returns CSV', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/audit/export',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('securevault-audit.csv');
    expect(response.body).toContain('id,timestamp,action');
  });

  // ─── Dashboard HTML has all 5 tabs ───
  it('Dashboard HTML contains all tab navigation', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/admin',
    });
    const html = response.body;

    // All 5 tabs
    expect(html).toContain('data-page="dashboard"');
    expect(html).toContain('data-page="secrets"');
    expect(html).toContain('data-page="rules"');
    expect(html).toContain('data-page="audit"');
    expect(html).toContain('data-page="settings"');

    // All page containers
    expect(html).toContain('id="page-dashboard"');
    expect(html).toContain('id="page-secrets"');
    expect(html).toContain('id="page-rules"');
    expect(html).toContain('id="page-audit"');
    expect(html).toContain('id="page-settings"');

    // Key UI elements
    expect(html).toContain('statsGrid');
    expect(html).toContain('secretsTable');
    expect(html).toContain('auditTable');
    expect(html).toContain('auditFilterAction');
    expect(html).toContain('cfgTradingMode');
  });

  // ─── Dashboard HTML has dark theme ───
  it('Dashboard HTML uses dark theme', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/admin',
    });
    expect(response.body).toContain('--bg:#0a0a0a');
    expect(response.body).toContain('--surface:#141414');
  });
});
