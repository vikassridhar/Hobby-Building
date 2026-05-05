/**
 * SecureVault Smoke Tests
 * Verifies Phase 1 end-to-end: server startup, API routes, health check
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server/fastify-server.js';
import { closeStorage } from '../src/storage/vault-storage.js';

const TEST_CONFIG = {
  nodeEnv: 'test',
  masterKey: 'test-master-key-for-smoke-tests-32b!',
  dbPath: ':memory:',
  auditLogPath: '/dev/null',
  gatewayPort: 0, // let OS assign
  gatewayHost: '127.0.0.1',
  tlsCertPath: '',
  tlsKeyPath: '',
  telegramBotToken: '0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  telegramUserId: '123456789',
  agentToken: 'test-agent-token-smoke',
  autoExecuteEnabled: false,
  autoExecuteMaxAmount: 100,
  autoExecuteCurrency: 'USD',
  riskTimezone: 'UTC',
};

let app: FastifyInstance;
let authToken: string;

describe('SecureVault Smoke Tests', () => {
  beforeAll(async () => {
    app = await buildServer(TEST_CONFIG as any);
    authToken = TEST_CONFIG.agentToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('GET /api/secrets returns 401 without auth', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/secrets',
    });

    expect(response.statusCode).toBe(401);
  });

  it('GET /api/secrets returns paginated result with auth', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/secrets',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('pageSize');
    expect(body).toHaveProperty('hasMore');
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('POST /api/secrets creates a secret', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: 'Test API Key',
        category: 'api_key',
        plaintext: 'sk-test-1234567890',
        metadata: { issuer: 'test', tags: ['smoke'] },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('id');
    expect(body.name).toBe('Test API Key');
    expect(body.category).toBe('api_key');
    expect(body.status).toBe('active');
  });

  it('POST /api/tasks creates a task', async () => {
    // First create a secret to reference
    const secretRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: 'Task Test Secret',
        category: 'api_key',
        plaintext: 'sk-task-test-key',
      },
    });
    const secretId = secretRes.json().id;

    const response = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        type: 'api_call',
        priority: 'normal',
        description: 'Smoke test task',
        secretId,
        parameters: { endpoint: '/test' },
        requestedBy: 'smoke-test',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('task');
    expect(body.task.type).toBe('api_call');
    expect(body.task.status).toBe('pending');
    expect(body.task.secretId).toBe(secretId);
  });

  it('GET /api/tasks lists tasks', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/tasks',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('data');
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/tasks/:id returns 404 for unknown task', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/tasks/nonexistent-id',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('GET /audit/log returns audit entries', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/audit/log',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
  });

  it('POST /api/secrets without required fields returns 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { name: 'incomplete' },
    });

    expect(response.statusCode).toBe(400);
  });
});
