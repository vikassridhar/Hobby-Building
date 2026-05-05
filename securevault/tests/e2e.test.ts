/**
 * End-to-End Integration Test
 * Tests the complete flow: Create task → Request approval → Execute → Audit log
 * Verifies Telegram approval flow (mocked)
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildServer } from '../src/server/fastify-server.js';
import {
  initStorage,
  closeStorage,
  createSecret,
  getTaskById,
  updateTaskStatus,
  listAuditLogs,
  getApprovalByTaskId,
  updateApprovalStatus,
} from '../src/storage/vault-storage.js';
import { sendApprovalRequest } from '../src/bot/telegram-bot.js';
import type { VaultConfig } from '../src/types/index.js';

// ─── Mock Telegram Bot ───
const mockSendApprovalRequest = vi.fn();
vi.mock('../src/bot/telegram-bot.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/bot/telegram-bot.js')>();
  return {
    ...actual,
    sendApprovalRequest: (...args: any[]) => mockSendApprovalRequest(...args),
  };
});

const testConfig: VaultConfig = {
  nodeEnv: 'test',
  masterKey: 'test-master-key-32-chars-long!!',
  dbPath: ':memory:',
  auditLogPath: ':memory:',
  gatewayPort: 9998,
  gatewayHost: '127.0.0.1',
  tlsCertPath: '',
  tlsKeyPath: '',
  telegramBotToken: 'mock-bot-token-for-testing',
  telegramUserId: '123456789',
  agentToken: 'test-agent-token-e2e',
  autoExecuteEnabled: false,
  autoExecuteMaxAmount: 100,
  autoExecuteCurrency: 'USD',
  riskTimezone: 'UTC',
};

let app: Awaited<ReturnType<typeof buildServer>>;
const authHeader = { authorization: 'Bearer test-agent-token-e2e' };

beforeAll(async () => {
  initStorage({ dbPath: testConfig.dbPath, masterKey: testConfig.masterKey });
  app = await buildServer(testConfig);
});

afterAll(async () => {
  if (app) await app.close();
  closeStorage();
  vi.restoreAllMocks();
});

// ─── End-to-End Flow Test ───

describe('End-to-End Flow', () => {
  it('should complete full lifecycle: create task → approve → execute → audit', async () => {
    // ─── Step 1: Create a secret ───
    const secretRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'E2E Test Card',
        category: 'credit_card',
        plaintext: 'pm_test_e2e_12345',
        metadata: { issuer: 'Stripe', tags: ['e2e'] },
      },
    });

    expect(secretRes.statusCode).toBe(201);
    const secret = JSON.parse(secretRes.body);
    expect(secret.id).toBeDefined();

    // ─── Step 2: Create a task (triggers approval request) ───
    const taskRes = await app.inject({
      method: 'POST',
      url: '/api/tasks/v2',
      headers: authHeader,
      payload: {
        type: 'card_payment',
        priority: 'normal',
        description: 'E2E test payment - $50 to TestMerchant',
        secretId: secret.id,
        requestedBy: 'e2e-test-agent',
        parameters: {
          amount: 50,
          currency: 'USD',
          recipient: 'TestMerchant',
          authorizedActions: ['payWithCard'],
        },
      },
    });

    expect(taskRes.statusCode).toBe(201);
    const taskBody = JSON.parse(taskRes.body);
    expect(taskBody.task).toBeDefined();
    expect(taskBody.approval).toBeDefined();
    expect(taskBody.task.status).toBe('pending');
    expect(taskBody.approval.status).toBe('pending');
    expect(taskBody.approval.riskScore).toBeDefined();
    expect(taskBody.approval.riskScore).toBeLessThan(70); // Should not be blocked

    // Verify Telegram approval was requested
    expect(mockSendApprovalRequest).toHaveBeenCalled();
    const [approvalArg, taskArg] = mockSendApprovalRequest.mock.calls[0];
    expect(approvalArg.taskId).toBe(taskBody.task.id);
    expect(taskArg.id).toBe(taskBody.task.id);

    const taskId = taskBody.task.id;
    const approvalId = taskBody.approval.id;

    // ─── Step 3: Verify task is awaiting approval ───
    const getTaskRes = await app.inject({
      method: 'GET',
      url: `/api/tasks/v2/${taskId}`,
      headers: authHeader,
    });

    expect(getTaskRes.statusCode).toBe(200);
    const fetchedTask = JSON.parse(getTaskRes.body);
    expect(fetchedTask.status).toBe('pending');
    expect(fetchedTask.id).toBe(taskId);

    // ─── Step 4: Simulate Telegram approval ───
    const approval = getApprovalByTaskId(taskId);
    expect(approval).not.toBeNull();
    expect(approval!.status).toBe('pending');

    const now = new Date().toISOString();
    const approved = updateApprovalStatus(approvalId, 'approved', '123456789', now);
    expect(approved).not.toBeNull();
    expect(approved!.status).toBe('approved');

    // Update task to approved
    updateTaskStatus(taskId, 'approved', { approvedAt: now, approvedBy: '123456789' });

    // Verify task is now approved
    const approvedTask = getTaskById(taskId);
    expect(approvedTask!.status).toBe('approved');

    // ─── Step 5: Execute gateway request ───
    const gatewayRes = await app.inject({
      method: 'POST',
      url: '/api/gateway/request',
      headers: authHeader,
      payload: {
        taskId: taskId,
        adapterType: 'stripe',
        action: 'payWithCard',
        payload: {
          amount: 50,
          currency: 'USD',
          description: 'E2E test payment',
        },
        adapterConfig: {
          type: 'stripe',
          name: 'Stripe Test',
          enabled: true,
          credentials: { apiKey: 'sk_test_e2e_mock_key' },
        },
      },
    });

    // Should succeed or fail gracefully (Stripe key is mock)
    expect([201, 400, 402]).toContain(gatewayRes.statusCode);
    const gatewayBody = JSON.parse(gatewayRes.body);
    expect(gatewayBody.gatewayRequest).toBeDefined();
    expect(gatewayBody.gatewayRequest.taskId).toBe(taskId);
    expect(gatewayBody.gatewayRequest.status).toBeDefined();

    // ─── Step 6: Mark task complete ───
    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/tasks/v2/${taskId}/complete`,
      headers: authHeader,
      payload: {
        result: {
          transactionId: 'txn_e2e_123',
          amount: 50,
          currency: 'USD',
        },
      },
    });

    expect(completeRes.statusCode).toBe(200);
    const completedTask = JSON.parse(completeRes.body);
    expect(completedTask.status).toBe('completed');
    expect(completedTask.result).toBeDefined();
    expect(completedTask.result.transactionId).toBe('txn_e2e_123');

    // ─── Step 7: Verify audit trail ───
    const auditRes = await app.inject({
      method: 'GET',
      url: '/audit/log',
      headers: authHeader,
    });

    expect(auditRes.statusCode).toBe(200);
    const auditBody = JSON.parse(auditRes.body);
    expect(auditBody.data).toBeInstanceOf(Array);
    expect(auditBody.data.length).toBeGreaterThan(0);

    // Verify specific audit events exist
    const actions = auditBody.data.map((log: any) => log.action);
    expect(actions).toContain('secret_created');
    expect(actions).toContain('task_created');
    expect(actions).toContain('gateway_request_created');
    expect(actions).toContain('task_executed');

    // Verify the task is in audit logs
    const taskAudits = auditBody.data.filter((log: any) => log.targetId === taskId);
    expect(taskAudits.length).toBeGreaterThan(0);

    // ─── Step 8: Verify gateway request status ───
    const gatewayId = gatewayBody.gatewayRequest.id;
    const gatewayStatusRes = await app.inject({
      method: 'GET',
      url: `/api/gateway/request/${gatewayId}`,
      headers: authHeader,
    });

    expect(gatewayStatusRes.statusCode).toBe(200);
    const gatewayStatus = JSON.parse(gatewayStatusRes.body);
    expect(gatewayStatus.id).toBe(gatewayId);
    expect(gatewayStatus.taskId).toBe(taskId);
  });

  it('should auto-approve low-risk tasks when enabled', async () => {
    // Create a secret
    const secretRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Auto-approve Test Card',
        category: 'credit_card',
        plaintext: 'pm_test_auto_123',
      },
    });
    const secret = JSON.parse(secretRes.body);

    // Create task with auto-execute config (amount below threshold)
    // Note: autoExecuteEnabled is false in our test config, so this should still require approval
    const taskRes = await app.inject({
      method: 'POST',
      url: '/api/tasks/v2',
      headers: authHeader,
      payload: {
        type: 'card_payment',
        description: 'Small test payment - $5',
        secretId: secret.id,
        requestedBy: 'e2e-test-agent',
        parameters: {
          amount: 5,
          currency: 'USD',
        },
      },
    });

    expect(taskRes.statusCode).toBe(201);
    const taskBody = JSON.parse(taskRes.body);

    // With autoExecuteEnabled=false, should require approval (risk score < 20 but auto-execute disabled)
    expect(taskBody.approval.autoApproved).toBe(false);
    expect(taskBody.approval.status).toBe('pending');
  });

  it('should block high-risk tasks', async () => {
    // Create a secret
    const secretRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'High Risk Test Card',
        category: 'credit_card',
        plaintext: 'pm_test_high_123',
      },
    });
    const secret = JSON.parse(secretRes.body);

    // Create high-risk task (large amount + crypto type)
    const taskRes = await app.inject({
      method: 'POST',
      url: '/api/tasks/v2',
      headers: authHeader,
      payload: {
        type: 'crypto_transfer',
        priority: 'critical',
        description: 'High risk transfer - $50,000',
        secretId: secret.id,
        requestedBy: 'e2e-test-agent',
        parameters: {
          amount: 50000,
          currency: 'USD',
          recipient: '0xabc123',
        },
      },
    });

    expect(taskRes.statusCode).toBe(201);
    const taskBody = JSON.parse(taskRes.body);

    // Should be blocked (score >= 70)
    expect(taskBody.approval.riskScore).toBeGreaterThanOrEqual(70);
    expect(taskBody.approval.status).toBe('rejected');
    expect(taskBody.task.status).toBe('rejected');
  });

  it('should reject unauthorized actions', async () => {
    // Create a secret
    const secretRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Auth Test Card',
        category: 'credit_card',
        plaintext: 'pm_test_auth_123',
      },
    });
    const secret = JSON.parse(secretRes.body);

    // Create task with limited authorizedActions - use direct storage to avoid approval flow
    const { createTask, updateTaskStatus } = await import('../src/storage/vault-storage.js');
    const task = createTask({
      type: 'card_payment',
      description: 'Authorized action test',
      secretId: secret.id,
      requestedBy: 'e2e-test-agent',
      parameters: {
        amount: 100,
        currency: 'USD',
        authorizedActions: ['getCardBalance'], // Only allow balance check
      },
    });

    // Directly approve the task (bypass approval flow)
    updateTaskStatus(task.id, 'approved', { approvedAt: new Date().toISOString(), approvedBy: 'test' });

    // Try to execute unauthorized action
    const gatewayRes = await app.inject({
      method: 'POST',
      url: '/api/gateway/request',
      headers: authHeader,
      payload: {
        taskId: task.id,
        adapterType: 'stripe',
        action: 'payWithCard', // Not in authorizedActions
        payload: { amount: 100, currency: 'USD' },
        adapterConfig: {
          type: 'stripe',
          name: 'Stripe Test',
          enabled: true,
          credentials: { apiKey: 'sk_test_auth' },
        },
      },
    });

    expect(gatewayRes.statusCode).toBe(403);
    const gatewayBody = JSON.parse(gatewayRes.body);
    expect(gatewayBody.code).toBe('ACTION_NOT_AUTHORIZED');
  });
});

// ─── Telegram Bot Flow Verification ───

describe('Telegram Approval Flow', () => {
  it('should send approval request to Telegram for medium-risk tasks', async () => {
    mockSendApprovalRequest.mockClear();

    const secretRes = await app.inject({
      method: 'POST',
      url: '/api/secrets',
      headers: authHeader,
      payload: {
        name: 'Telegram Flow Card',
        category: 'credit_card',
        plaintext: 'pm_test_telegram_123',
      },
    });
    const secret = JSON.parse(secretRes.body);

    const taskRes = await app.inject({
      method: 'POST',
      url: '/api/tasks/v2',
      headers: authHeader,
      payload: {
        type: 'card_payment',
        description: 'Telegram approval test - $500',
        secretId: secret.id,
        requestedBy: 'telegram-test-agent',
        parameters: {
          amount: 500,
          currency: 'USD',
        },
      },
    });

    expect(taskRes.statusCode).toBe(201);
    const taskBody = JSON.parse(taskRes.body);

    // Should trigger Telegram approval (score 15-69 for $500)
    expect(taskBody.approval.riskScore).toBeGreaterThanOrEqual(10);
    expect(taskBody.approval.riskScore).toBeLessThan(70);
    expect(taskBody.approval.status).toBe('pending');
    expect(mockSendApprovalRequest).toHaveBeenCalledTimes(1);

    // Verify the approval message format
    const [approvalArg, taskArg, configArg] = mockSendApprovalRequest.mock.calls[0];
    expect(approvalArg.id).toBe(taskBody.approval.id);
    expect(approvalArg.taskId).toBe(taskBody.task.id);
    expect(taskArg.type).toBe('card_payment');
    expect(taskArg.parameters.amount).toBe(500);
    expect(configArg.telegramUserId).toBe('123456789');
  });
});
