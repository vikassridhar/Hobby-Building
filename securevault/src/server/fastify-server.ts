/**
 * SecureVault Fastify Server
 * TLS, helmet, rate limiting, auth middleware, and API routes
 */

import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { readFileSync } from 'fs';
import type { VaultConfig, ApiError, SecretStatus } from '../types/index.js';
import {
  initStorage,
  closeStorage,
  createSecret,
  getSecretWithDecryption,
  listSecrets,
  updateSecret,
  deleteSecret,
  revokeSecret,
  createTask,
  getTaskById,
  listTasks,
  logAudit,
} from '../storage/vault-storage.js';
import { compareTokens } from '../crypto/vault-crypto.js';
import { registerGatewayRoutes } from './gateway-router.js';
import { registerAdminRoutes } from './admin-routes.js';

let config: VaultConfig;
let agentTokenHash: string;

export async function buildServer(cfg: VaultConfig): Promise<FastifyInstance> {
  config = cfg;
  agentTokenHash = cfg.agentToken;

  // Initialize storage only if not already initialized
  try {
    initStorage({ dbPath: cfg.dbPath, masterKey: cfg.masterKey });
  } catch {
    // Storage may already be initialized
  }

  const httpsOptions = cfg.tlsCertPath && cfg.tlsKeyPath
    ? {
        https: {
          key: readFileSync(cfg.tlsKeyPath),
          cert: readFileSync(cfg.tlsCertPath),
        },
      }
    : {};

  const app = Fastify({
    logger: {
      level: cfg.nodeEnv === 'development' ? 'debug' : 'warn',
    },
    ...httpsOptions,
  });

  // Security plugins
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry in ${context.after}`,
      code: 'RATE_LIMITED',
    }),
  });

  // Auth decorator
  app.decorate('authenticate', async function (req: FastifyRequest, reply: FastifyReply) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
        code: 'AUTH_MISSING',
      } as ApiError);
    }

    const token = authHeader.slice(7);
    if (!compareTokens(token, agentTokenHash)) {
      logAudit({
        timestamp: new Date().toISOString(),
        action: 'auth_failure',
        severity: 'warning',
        actor: req.ip || 'unknown',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { reason: 'invalid_token' },
        success: false,
      });
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid agent token',
        code: 'AUTH_INVALID',
      } as ApiError);
    }

    logAudit({
      timestamp: new Date().toISOString(),
      action: 'auth_success',
      severity: 'info',
      actor: 'agent',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });
  });

  const authenticate = (app as any).authenticate.bind(app);

  // ─── Health ───
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // ─── Secrets API ───
  app.post('/api/secrets', { preHandler: [authenticate] }, async (req, reply) => {
    const body = req.body as { name: string; category: string; plaintext: string; metadata?: object; expiresAt?: string };
    if (!body.name || !body.category || !body.plaintext) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'name, category, and plaintext required', code: 'MISSING_FIELDS' });
    }

    const secret = createSecret({
      name: body.name,
      category: body.category as any,
      plaintext: body.plaintext,
      metadata: body.metadata,
      expiresAt: body.expiresAt,
    });

    logAudit({
      timestamp: new Date().toISOString(),
      action: 'secret_created',
      severity: 'info',
      actor: 'agent',
      targetId: secret.id,
      targetType: 'secret',
      details: { category: secret.category },
      success: true,
    });

    return reply.status(201).send({ id: secret.id, name: secret.name, category: secret.category, status: secret.status, createdAt: secret.createdAt });
  });

  app.get('/api/secrets', { preHandler: [authenticate] }, async (req) => {
    const query = req.query as { category?: string; status?: string; limit?: string; offset?: string };
    return listSecrets({
      category: query.category as any,
      status: query.status as any,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  });

  app.get('/api/secrets/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = getSecretWithDecryption(id);
    if (!result) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Secret not found', code: 'SECRET_NOT_FOUND' });

    logAudit({
      timestamp: new Date().toISOString(),
      action: 'secret_read',
      severity: 'info',
      actor: 'agent',
      targetId: id,
      targetType: 'secret',
      success: true,
    });

    return { id: result.secret.id, name: result.secret.name, category: result.secret.category, plaintext: result.plaintext, metadata: result.secret.metadata };
  });

  app.patch('/api/secrets/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Partial<{ name: string; metadata: object; status: string; expiresAt: string }>;
    const updated = updateSecret(id, body as Partial<{ name: string; metadata: object; status: SecretStatus; expiresAt: string }>);
    if (!updated) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Secret not found', code: 'SECRET_NOT_FOUND' });

    logAudit({
      timestamp: new Date().toISOString(),
      action: 'secret_updated',
      severity: 'info',
      actor: 'agent',
      targetId: id,
      targetType: 'secret',
      success: true,
    });

    return updated;
  });

  app.delete('/api/secrets/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const success = deleteSecret(id);
    if (!success) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Secret not found', code: 'SECRET_NOT_FOUND' });

    logAudit({
      timestamp: new Date().toISOString(),
      action: 'secret_deleted',
      severity: 'warning',
      actor: 'agent',
      targetId: id,
      targetType: 'secret',
      success: true,
    });

    return reply.status(204).send();
  });

  app.post('/api/secrets/:id/revoke', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const revoked = revokeSecret(id);
    if (!revoked) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Secret not found', code: 'SECRET_NOT_FOUND' });

    logAudit({
      timestamp: new Date().toISOString(),
      action: 'secret_revoked',
      severity: 'warning',
      actor: 'agent',
      targetId: id,
      targetType: 'secret',
      success: true,
    });

    return revoked;
  });

  // ─── Tasks API ───
  app.post('/api/tasks', { preHandler: [authenticate] }, async (req, reply) => {
    const body = req.body as { type: string; priority?: string; description: string; secretId: string; parameters?: object; requestedBy: string; maxRetries?: number };
    if (!body.type || !body.description || !body.secretId) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'type, description, and secretId required', code: 'MISSING_FIELDS' });
    }

    const task = createTask({
      type: body.type as any,
      priority: body.priority as any,
      description: body.description,
      secretId: body.secretId,
      parameters: body.parameters as any,
      requestedBy: body.requestedBy,
      maxRetries: body.maxRetries,
    });

    logAudit({
      timestamp: new Date().toISOString(),
      action: 'task_created',
      severity: 'info',
      actor: 'agent',
      targetId: task.id,
      targetType: 'task',
      details: { type: task.type },
      success: true,
    });

    return reply.status(201).send({ task, message: 'Task created' });
  });

  app.get('/api/tasks', { preHandler: [authenticate] }, async (req) => {
    const query = req.query as { status?: string; secretId?: string; limit?: string; offset?: string };
    return listTasks({
      status: query.status as any,
      secretId: query.secretId,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
  });

  app.get('/api/tasks/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = getTaskById(id);
    if (!task) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Task not found', code: 'TASK_NOT_FOUND' });
    return task;
  });

  // ─── Admin Routes (Phase 2.5) ───
  await registerAdminRoutes(app, config);

  // ─── Gateway Routes (Phase 2) ───
  await registerGatewayRoutes(app, config);

  // ─── Audit Logs API ───
  app.get('/api/audit', { preHandler: [authenticate] }, async (req) => {
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

  // Graceful shutdown
  app.addHook('onClose', async () => {
    closeStorage();
  });

  return app;
}

export async function startServer(cfg: VaultConfig): Promise<void> {
  const app = await buildServer(cfg);
  const protocol = cfg.tlsCertPath ? 'https' : 'http';
  await app.listen({ port: cfg.gatewayPort, host: cfg.gatewayHost });
  app.log.info(`SecureVault running on ${protocol}://${cfg.gatewayHost}:${cfg.gatewayPort}`);
}
