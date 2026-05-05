/**
 * Integration Tests for SecureVault
 * Tests vault CRUD, approval flow, and gateway routing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server/fastify-server.js';
import {
  initStorage,
  closeStorage,
  createSecret,
  getSecretById,
  listSecrets,
  updateSecret,
  deleteSecret,
  revokeSecret,
  createTask,
  getTaskById,
  updateTaskStatus,
  listTasks,
  createApproval,
  updateApprovalStatus,
  logAudit,
  listAuditLogs,
  createGatewayRequest,
  getGatewayRequestById,
  updateGatewayRequestStatus,
  listGatewayRequests,
} from '../src/storage/vault-storage.js';
import type { VaultConfig } from '../src/types/index.js';

const testConfig: VaultConfig = {
  nodeEnv: 'test',
  masterKey: 'test-master-key-32-chars-long!!',
  dbPath: ':memory:',
  auditLogPath: ':memory:',
  gatewayPort: 9999,
  gatewayHost: '127.0.0.1',
  tlsCertPath: '',
  tlsKeyPath: '',
  telegramBotToken: '',
  telegramUserId: '',
  agentToken: 'test-agent-token',
  autoExecuteEnabled: true,
  autoExecuteMaxAmount: 1000,
  autoExecuteCurrency: 'USD',
  riskTimezone: 'UTC',
};

let app: Awaited<ReturnType<typeof buildServer>>;
const authHeader = { authorization: 'Bearer test-agent-token' };

beforeAll(async () => {
  initStorage({ dbPath: testConfig.dbPath, masterKey: testConfig.masterKey });
  app = await buildServer(testConfig);
});

afterAll(async () => {
  if (app) await app.close();
  closeStorage();
});

// ─── Vault CRUD Tests ───

describe('Vault CRUD', () => {
  it('should create a secret', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Test API Key',
        category: 'api_key',
        plaintext: 'sk-test-12345',
        metadata: { issuer: 'Stripe', tags: ['test'] },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Test API Key');
    expect(body.category).toBe('api_key');
  });

  it('should list secrets', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'List Test Secret',
        category: 'password',
        plaintext: 'secret123',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/secrets',
      headers: authHeader,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('should get a secret by ID', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Get Test Secret',
        category: 'note',
        plaintext: 'my-note-content',
      },
    });
    const created = JSON.parse(createRes.body);

    const response = await app.inject({
      method: 'GET',
      url: `/api/secrets/${created.id}`,
      headers: authHeader,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.id).toBe(created.id);
    expect(body.plaintext).toBe('my-note-content');
  });

  it('should update a secret', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Update Test',
        category: 'note',
        plaintext: 'original',
      },
    });
    const created = JSON.parse(createRes.body);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/secrets/${created.id}`,
      headers: authHeader,
      payload: { name: 'Updated Name', metadata: { tags: ['updated'] } },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.name).toBe('Updated Name');
    expect(body.metadata.tags).toContain('updated');
  });

  it('should revoke a secret', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Revoke Test',
        category: 'api_key',
        plaintext: 'key-to-revoke',
      },
    });
    const created = JSON.parse(createRes.body);

    const response = await app.inject({
      method: 'POST',
      url: `/api/secrets/${created.id}/revoke`,
      headers: authHeader,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('revoked');
  });

  it('should delete a secret', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Delete Test',
        category: 'password',
        plaintext: 'delete-me',
      },
    });
    const created = JSON.parse(createRes.body);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/secrets/${created.id}`,
      headers: authHeader,
    });

    expect(response.statusCode).toBe(204);
  });
});

// ─── Approval Flow Tests ───

describe('Approval Flow', () => {
  it('should create a task and approval', async () => {
    const secretRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Payment Card',
        category: 'credit_card',
        plaintext: 'pm_test_123',
      },
    });
    const secret = JSON.parse(secretRes.body);

    const response = await app.inject({
      method: 'POST',
      url: '/api/tasks/v2',
      headers: authHeader,
      payload: {
        type: 'card_payment',
        description: 'Test payment',
        secretId: secret.id,
        requestedBy: 'test-agent',
        parameters: { amount: 50, currency: 'USD' },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.task).toBeDefined();
    expect(body.task.id).toBeDefined();
    // With autoExecuteEnabled=true and amount=50 < maxAmount=1000, task is auto-approved
    expect(body.task.status).toBe('approved');
    expect(body.approval.autoApproved).toBe(true);
  });

  it('should get task status', async () => {
    const secretRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Task Status Card',
        category: 'credit_card',
        plaintext: 'pm_test_456',
      },
    });
    const secret = JSON.parse(secretRes.body);

    const taskRes = await app.inject({
      method: 'POST',
      url: '/api/tasks/v2',
      headers: authHeader,
      payload: {
        type: 'card_payment',
        description: 'Status test',
        secretId: secret.id,
        requestedBy: 'test-agent',
      },
    });
    const task = JSON.parse(taskRes.body).task;

    const response = await app.inject({
      method: 'GET',
      url: `/api/tasks/v2/${task.id}`,
      headers: authHeader,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.id).toBe(task.id);
    expect(body.status).toBeDefined();
  });

  it('should mark task complete', async () => {
    const secretRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Complete Card',
        category: 'credit_card',
        plaintext: 'pm_test_789',
      },
    });
    const secret = JSON.parse(secretRes.body);

    const taskRes = await app.inject({
      method: 'POST',
      url: '/api/tasks/v2',
      headers: authHeader,
      payload: {
        type: 'card_payment',
        description: 'Complete test',
        secretId: secret.id,
        requestedBy: 'test-agent',
      },
    });
    const task = JSON.parse(taskRes.body).task;

    await updateTaskStatus(task.id, 'approved', { approvedAt: new Date().toISOString(), approvedBy: 'test' });

    const response = await app.inject({
      method: 'POST',
      url: `/api/tasks/v2/${task.id}/complete`,
      headers: authHeader,
      payload: {
        result: { transactionId: 'txn_123', amount: 100 },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('completed');
    expect(body.result).toBeDefined();
  });

  it('should reject unauthorized task completion', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/tasks/nonexistent/complete',
      headers: authHeader,
      payload: {},
    });

    expect(response.statusCode).toBe(404);
  });
});

// ─── Gateway Routing Tests ───

describe('Gateway Routing', () => {
  it('should create a gateway request', async () => {
    const secretRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Gateway Card',
        category: 'credit_card',
        plaintext: 'pm_test_gateway',
      },
    });
    const secret = JSON.parse(secretRes.body);

    const taskRes = await app.inject({
      method: 'POST',
      url: '/api/tasks/v2',
      headers: authHeader,
      payload: {
        type: 'card_payment',
        description: 'Gateway test',
        secretId: secret.id,
        requestedBy: 'test-agent',
        parameters: { authorizedActions: ['payWithCard'] },
      },
    });
    const task = JSON.parse(taskRes.body).task;

    await updateTaskStatus(task.id, 'approved', { approvedAt: new Date().toISOString(), approvedBy: 'test' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/gateway/request',
      headers: authHeader,
      payload: {
        taskId: task.id,
        adapterType: 'stripe',
        action: 'payWithCard',
        payload: { amount: 50, currency: 'USD' },
        adapterConfig: {
          type: 'stripe',
          name: 'Stripe Test',
          enabled: true,
          credentials: { apiKey: 'sk_test_mock' },
        },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.gatewayRequest).toBeDefined();
    expect(body.gatewayRequest.id).toBeDefined();
    expect(body.adapterResult).toBeDefined();
  });

  it('should reject gateway request for unapproved task', async () => {
    const secretRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Unapproved Card',
        category: 'credit_card',
        plaintext: 'pm_test_unapproved',
      },
    });
    const secret = JSON.parse(secretRes.body);

    // Use direct storage to create task without triggering approval flow
    const task = createTask({
      type: 'card_payment',
      description: 'Unapproved test',
      secretId: secret.id,
      requestedBy: 'test-agent',
      parameters: { amount: 50000, currency: 'USD' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/gateway/request',
      headers: authHeader,
      payload: {
        taskId: task.id,
        adapterType: 'stripe',
        action: 'payWithCard',
        payload: { amount: 50000, currency: 'USD' },
        adapterConfig: {
          type: 'stripe',
          name: 'Stripe Test',
          enabled: true,
          credentials: { apiKey: 'sk_test_mock' },
        },
      },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.code).toBe('TASK_NOT_APPROVED');
  });

  it('should reject unauthorized action', async () => {
    const secretRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Auth Card',
        category: 'credit_card',
        plaintext: 'pm_test_auth',
      },
    });
    const secret = JSON.parse(secretRes.body);

    // Use direct storage to create task without triggering approval flow
    const task = createTask({
      type: 'card_payment',
      description: 'Auth test',
      secretId: secret.id,
      requestedBy: 'test-agent',
      parameters: { authorizedActions: ['getCardBalance'], amount: 50000, currency: 'USD' },
    });

    await updateTaskStatus(task.id, 'approved', { approvedAt: new Date().toISOString(), approvedBy: 'test' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/gateway/request',
      headers: authHeader,
      payload: {
        taskId: task.id,
        adapterType: 'stripe',
        action: 'payWithCard',
        payload: { amount: 50000, currency: 'USD' },
        adapterConfig: {
          type: 'stripe',
          name: 'Stripe Test',
          enabled: true,
          credentials: { apiKey: 'sk_test_mock' },
        },
      },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.code).toBe('ACTION_NOT_AUTHORIZED');
  });

  it('should get gateway request status', async () => {
    const secretRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Gateway Status Secret',
        category: 'api_key',
        plaintext: 'key-for-gateway-status',
      },
    });
    const secret = JSON.parse(secretRes.body);

    const taskRes = await app.inject({
      method: 'POST',
      url: '/api/tasks/v2',
      headers: authHeader,
      payload: {
        type: 'api_call',
        description: 'Gateway status test',
        secretId: secret.id,
        requestedBy: 'test-agent',
      },
    });
    const task = JSON.parse(taskRes.body).task;

    const request = createGatewayRequest({
      taskId: task.id,
      adapterType: 'stripe',
      action: 'payWithCard',
      payload: { amount: 100 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/gateway/request/${request.id}`,
      headers: authHeader,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.id).toBe(request.id);
    expect(body.status).toBe('pending');
  });

  it('should list gateway requests', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/gateway/requests',
      headers: authHeader,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeInstanceOf(Array);
  });
});

// ─── Audit Trail Tests ───

describe('Audit Trail', () => {
  it('should return audit logs', async () => {
    logAudit({
      timestamp: new Date().toISOString(),
      action: 'secret_created',
      severity: 'info',
      actor: 'test',
      targetId: 'test-id',
      targetType: 'secret',
      success: true,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/audit/log',
      headers: authHeader,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('should filter audit logs by action', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/audit/log?action=secret_created',
      headers: authHeader,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.every((log: any) => log.action === 'secret_created')).toBe(true);
  });
});

// ─── Auth Tests ───

describe('Authentication', () => {
  it('should reject requests without auth', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/secrets',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should reject invalid tokens', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/secrets',
      headers: { authorization: 'Bearer wrong-token' },
    });

    expect(response.statusCode).toBe(401);
  });
});
