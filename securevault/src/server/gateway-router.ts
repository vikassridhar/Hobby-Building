/**
 * Gateway API Router
 * Routes requests to the appropriate adapter and skill
 */

import type { FastifyInstance } from 'fastify';
import type { VaultConfig, ApiError, AdapterConfig } from '../types/index.js';
import {
  createGatewayRequest,
  getGatewayRequestById,
  updateGatewayRequestStatus,
  listGatewayRequests,
  getTaskById,
  updateTaskStatus,
  getSecretWithDecryption,
  logAudit,
} from '../storage/vault-storage.js';
import { executeWithAdapter } from '../adapters/index.js';
import { findSkillForAction } from '../skills/index.js';

export async function registerGatewayRoutes(app: FastifyInstance, config: VaultConfig): Promise<void> {
  // ─── POST /api/tasks — Create task with purpose and authorized actions ───
  app.post('/api/tasks/v2', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const body = req.body as {
      type: string;
      priority?: string;
      description: string;
      secretId: string;
      parameters?: object;
      requestedBy: string;
      maxRetries?: number;
      purpose?: string;
      authorizedActions?: string[];
    };

    if (!body.type || !body.description || !body.secretId) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'type, description, and secretId required',
        code: 'MISSING_FIELDS',
      } as ApiError);
    }

    const { createTask, assessRisk, createApprovalRequest } = await import('../utils/task-utils.js');

    const task = createTask({
      type: body.type as any,
      priority: body.priority as any,
      description: body.description,
      secretId: body.secretId,
      parameters: {
        ...((body.parameters || {}) as any),
        purpose: body.purpose,
        authorizedActions: body.authorizedActions,
      },
      requestedBy: body.requestedBy,
      maxRetries: body.maxRetries,
    });

    const risk = assessRisk(task, config);
    const approval = await createApprovalRequest(task, risk, config);

    // Re-fetch task to get updated status from approval flow
    const updatedTask = getTaskById(task.id) || task;

    logAudit({
      timestamp: new Date().toISOString(),
      action: 'task_created',
      severity: 'info',
      actor: 'agent',
      targetId: task.id,
      targetType: 'task',
      details: { type: task.type, riskScore: risk.score, autoApproved: approval.autoApproved },
      success: true,
    });

    return reply.status(201).send({
      task: updatedTask,
      approval,
      message: approval.autoApproved ? 'Task auto-approved' : approval.status === 'rejected' ? 'Task blocked by risk engine' : 'Approval request sent via Telegram',
    });
  });

  // ─── GET /api/tasks/:id — Get task status ───
  app.get('/api/tasks/v2/:id', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = getTaskById(id);
    if (!task) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Task not found',
        code: 'TASK_NOT_FOUND',
      } as ApiError);
    }

    // Include related gateway requests
    const gatewayRequests = listGatewayRequests({ taskId: id, limit: 100 });

    return { ...task, gatewayRequests: gatewayRequests.data };
  });

  // ─── POST /api/tasks/:id/complete — Mark task complete ───
  app.post('/api/tasks/v2/:id/complete', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { result?: object; errorMessage?: string };

    const task = getTaskById(id);
    if (!task) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Task not found',
        code: 'TASK_NOT_FOUND',
      } as ApiError);
    }

    const now = new Date().toISOString();
    const updated = updateTaskStatus(id, 'completed', {
      executedAt: now,
      result: body.result
        ? {
            success: true,
            ...body.result,
            executedAt: now,
          }
        : undefined,
      errorMessage: body.errorMessage,
    });

    logAudit({
      timestamp: now,
      action: 'task_executed',
      severity: 'info',
      actor: 'agent',
      targetId: id,
      targetType: 'task',
      success: !body.errorMessage,
      errorMessage: body.errorMessage,
    });

    return updated;
  });

  // ─── POST /api/gateway/request — Execute request under task scope ───
  app.post('/api/gateway/request', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const body = req.body as {
      taskId: string;
      adapterType: string;
      action: string;
      payload?: object;
      adapterConfig?: AdapterConfig;
    };

    if (!body.taskId || !body.adapterType || !body.action) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'taskId, adapterType, and action required',
        code: 'MISSING_FIELDS',
      } as ApiError);
    }

    // Verify task exists and is approved
    const task = getTaskById(body.taskId);
    if (!task) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Task not found',
        code: 'TASK_NOT_FOUND',
      } as ApiError);
    }

    if (task.status !== 'approved' && task.status !== 'executing') {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Task status is ${task.status} — must be approved before executing gateway requests`,
        code: 'TASK_NOT_APPROVED',
      } as ApiError);
    }

    // Validate action against task's authorized actions
    const authorizedActions = task.parameters.authorizedActions as string[] | undefined;
    if (authorizedActions && !authorizedActions.includes(body.action)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Action ${body.action} not authorized for this task`,
        code: 'ACTION_NOT_AUTHORIZED',
      } as ApiError);
    }

    // Validate action against skill definition
    const skill = findSkillForAction(body.action);
    if (!skill) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: `Unknown action: ${body.action}`,
        code: 'UNKNOWN_ACTION',
      } as ApiError);
    }

    const validation = skill.validateAction(body.action, (body.payload || {}) as Record<string, unknown>);
    if (!validation.valid) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: validation.errors.join(', '),
        code: 'INVALID_PARAMETERS',
      } as ApiError);
    }

    // Get secret for adapter
    const secretResult = getSecretWithDecryption(task.secretId);
    if (!secretResult) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Secret not found for task',
        code: 'SECRET_NOT_FOUND',
      } as ApiError);
    }

    // Create gateway request record
    const gatewayRequest = createGatewayRequest({
      taskId: body.taskId,
      adapterType: body.adapterType as any,
      action: body.action,
      payload: (body.payload || {}) as Record<string, unknown>,
    });

    // Update task to executing
    updateTaskStatus(body.taskId, 'executing');

    logAudit({
      timestamp: new Date().toISOString(),
      action: 'gateway_request_created',
      severity: 'info',
      actor: 'agent',
      targetId: gatewayRequest.id,
      targetType: 'gateway_request',
      details: { taskId: body.taskId, adapterType: body.adapterType, action: body.action },
      success: true,
    });

    // Execute via adapter
    const adapterConfig = body.adapterConfig || {
      type: body.adapterType as any,
      name: body.adapterType,
      enabled: true,
      credentials: {},
    };

    const result = await executeWithAdapter(
      body.adapterType as any,
      adapterConfig,
      {
        action: body.action,
        payload: (body.payload || {}) as Record<string, unknown>,
        secretPlaintext: secretResult.plaintext,
      }
    );

    // Update gateway request with result
    const finalStatus = result.success ? 'completed' : 'failed';
    updateGatewayRequestStatus(gatewayRequest.id, finalStatus, {
      result: result.data,
      errorMessage: result.error,
    });

    logAudit({
      timestamp: new Date().toISOString(),
      action: result.success ? 'gateway_request_executed' : 'gateway_request_failed',
      severity: result.success ? 'info' : 'warning',
      actor: 'agent',
      targetId: gatewayRequest.id,
      targetType: 'gateway_request',
      details: { taskId: body.taskId, adapterType: body.adapterType, action: body.action },
      success: result.success,
      errorMessage: result.error,
    });

    return reply.status(201).send({
      gatewayRequest: {
        ...gatewayRequest,
        status: finalStatus,
        result: result.data,
        errorMessage: result.error,
      },
      adapterResult: result,
    });
  });

  // ─── GET /api/gateway/request/:id — Check request status ───
  app.get('/api/gateway/request/:id', { preHandler: [(app as any).authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const request = getGatewayRequestById(id);
    if (!request) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Gateway request not found',
        code: 'GATEWAY_REQUEST_NOT_FOUND',
      } as ApiError);
    }
    return request;
  });

  // ─── GET /api/gateway/requests — List gateway requests ───
  app.get('/api/gateway/requests', { preHandler: [(app as any).authenticate] }, async (req) => {
    const query = req.query as { taskId?: string; status?: string; limit?: string; offset?: string };
    return listGatewayRequests({
      taskId: query.taskId,
      status: query.status as any,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  });

  // ─── GET /audit/log — Immutable audit trail ───
  app.get('/audit/log', { preHandler: [(app as any).authenticate] }, async (req) => {
    const { listAuditLogs } = await import('../storage/vault-storage.js');
    const query = req.query as { action?: string; targetId?: string; severity?: string; limit?: string; offset?: string };
    return listAuditLogs({
      action: query.action,
      targetId: query.targetId,
      severity: query.severity,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  });
}

export default { registerGatewayRoutes };
