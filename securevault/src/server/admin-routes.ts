/**
 * Admin API Routes
 * Dashboard, config management, approval rules, audit export
 */

import type { FastifyInstance } from 'fastify';
import type { VaultConfig } from '../types/index.js';
import {
  listSecrets,
  listTasks,
  listPendingApprovals,
  listAuditLogs,
  logAudit,
} from '../storage/vault-storage.js';

// Runtime mutable state for approval rules
export interface ApprovalRules {
  autoExecuteEnabled: boolean;
  autoExecuteMaxAmount: number;
  autoExecuteCurrency: string;
  whitelistMerchants: string[];
  blacklistMerchants: string[];
  perActionRules: Record<string, { autoApprove: boolean; maxAmount: number }>;
  tradingPositionLimit: number;
  tradingSellRequiresApproval: boolean;
}

let currentRules: ApprovalRules = {
  autoExecuteEnabled: false,
  autoExecuteMaxAmount: 100,
  autoExecuteCurrency: 'USD',
  whitelistMerchants: [],
  blacklistMerchants: [],
  perActionRules: {
    payment: { autoApprove: false, maxAmount: 500 },
    trade: { autoApprove: false, maxAmount: 100 },
    transfer: { autoApprove: false, maxAmount: 1000 },
  },
  tradingPositionLimit: 25,
  tradingSellRequiresApproval: true,
};

const startTime = Date.now();

export function getApprovalRules(): ApprovalRules {
  return { ...currentRules };
}

export function updateApprovalRules(rules: Partial<ApprovalRules>): ApprovalRules {
  currentRules = { ...currentRules, ...rules };
  logAudit({
    timestamp: new Date().toISOString(),
    action: 'config_changed',
    severity: 'info',
    actor: 'admin',
    targetType: 'config',
    details: { updatedFields: Object.keys(rules) },
    success: true,
  });
  return { ...currentRules };
}

export async function registerAdminRoutes(app: FastifyInstance, config: VaultConfig): Promise<void> {
  const authenticate = (app as any).authenticate.bind(app);

  // ─── GET /admin — Serve SPA ───
  app.get('/admin', async (_req, reply) => {
    const { getAdminHtml } = await import('./admin-ui.js');
    reply.type('text/html').send(getAdminHtml());
  });

  // ─── GET /api/admin/status — Server stats ───
  app.get('/api/admin/status', { preHandler: [authenticate] }, async () => {
    const tasks = listTasks({ limit: 1000 });
    const approvals = listPendingApprovals();
    const secrets = listSecrets({ limit: 1000 });

    const tasksByStatus: Record<string, number> = {};
    for (const t of tasks.data) {
      tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    }

    return {
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: '1.0.0',
      nodeEnv: config.nodeEnv,
      tradingMode: config.tradingMode,
      totalSecrets: secrets.total,
      totalTasks: tasks.total,
      pendingApprovals: approvals.length,
      tasksByStatus,
    };
  });

  // ─── GET /api/admin/audit — Paginated + filtered audit ───
  app.get('/api/admin/audit', { preHandler: [authenticate] }, async (req) => {
    const query = req.query as {
      action?: string;
      targetId?: string;
      severity?: string;
      success?: string;
      startDate?: string;
      endDate?: string;
      limit?: string;
      offset?: string;
    };

    const result = listAuditLogs({
      action: query.action,
      targetId: query.targetId,
      severity: query.severity,
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    // Client-side date filtering if startDate/endDate provided
    let filtered = result.data;
    if (query.startDate) {
      const start = new Date(query.startDate).getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= start);
    }
    if (query.endDate) {
      const end = new Date(query.endDate).getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= end);
    }
    if (query.success !== undefined) {
      const successVal = query.success === 'true';
      filtered = filtered.filter((e) => e.success === successVal);
    }

    return {
      data: filtered,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      hasMore: result.hasMore,
    };
  });

  // ─── GET /api/admin/audit/export — CSV export ───
  app.get('/api/admin/audit/export', { preHandler: [authenticate] }, async (req, reply) => {
    const query = req.query as { action?: string; severity?: string; startDate?: string; endDate?: string };
    const result = listAuditLogs({ limit: 10000, offset: 0 });

    let filtered = result.data;
    if (query.startDate) {
      const start = new Date(query.startDate).getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= start);
    }
    if (query.endDate) {
      const end = new Date(query.endDate).getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= end);
    }

    const header = 'id,timestamp,action,severity,actor,targetId,targetType,success,errorMessage\n';
    const rows = filtered.map((e) =>
      `"${e.id}","${e.timestamp}","${e.action}","${e.severity}","${e.actor}","${e.targetId || ''}","${e.targetType || ''}",${e.success},"${(e.errorMessage || '').replace(/"/g, '""')}"`
    ).join('\n');

    reply.type('text/csv');
    reply.header('Content-Disposition', 'attachment; filename=securevault-audit.csv');
    return header + rows;
  });

  // ─── GET /api/admin/config — Redacted config ───
  app.get('/api/admin/config', { preHandler: [authenticate] }, async () => ({
    nodeEnv: config.nodeEnv,
    gatewayPort: config.gatewayPort,
    gatewayHost: config.gatewayHost,
    tradingMode: config.tradingMode,
    tradeApprovalThreshold: config.tradeApprovalThreshold,
    tradeMaxPositionPercent: config.tradeMaxPositionPercent,
    autoExecuteEnabled: config.autoExecuteEnabled,
    autoExecuteMaxAmount: config.autoExecuteMaxAmount,
    autoExecuteCurrency: config.autoExecuteCurrency,
    riskTimezone: config.riskTimezone,
    tlsEnabled: !!(config.tlsCertPath && config.tlsKeyPath),
    telegramConfigured: !!(config.telegramBotToken && config.telegramUserId),
    masterKeySet: !!config.masterKey,
  }));

  // ─── PUT /api/admin/config — Update config ───
  app.put('/api/admin/config', { preHandler: [authenticate] }, async (req, _reply) => {
    const body = req.body as {
      tradingMode?: 'paper' | 'live';
      tradeApprovalThreshold?: number;
      tradeMaxPositionPercent?: number;
      riskTimezone?: string;
    };

    if (body.tradingMode) config.tradingMode = body.tradingMode;
    if (body.tradeApprovalThreshold !== undefined) config.tradeApprovalThreshold = body.tradeApprovalThreshold;
    if (body.tradeMaxPositionPercent !== undefined) config.tradeMaxPositionPercent = body.tradeMaxPositionPercent;
    if (body.riskTimezone) config.riskTimezone = body.riskTimezone;

    logAudit({
      timestamp: new Date().toISOString(),
      action: 'config_changed',
      severity: 'warning',
      actor: 'admin',
      targetType: 'config',
      details: body,
      success: true,
    });

    return { success: true, message: 'Config updated' };
  });

  // ─── GET /api/admin/rules ───
  app.get('/api/admin/rules', { preHandler: [authenticate] }, async () => getApprovalRules());

  // ─── PUT /api/admin/rules ───
  app.put('/api/admin/rules', { preHandler: [authenticate] }, async (req) => {
    const body = req.body as Partial<ApprovalRules>;
    return updateApprovalRules(body);
  });

  // ─── GET /api/admin/profiles — List all service profiles ───
  app.get('/api/admin/profiles', { preHandler: [authenticate] }, async (req) => {
    const query = req.query as { adapterType?: string };
    const { listProfiles } = await import('../storage/vault-storage.js');
    return listProfiles({ adapterType: query.adapterType });
  });

  // ─── POST /api/admin/profiles — Create a profile ───
  app.post('/api/admin/profiles', { preHandler: [authenticate] }, async (req, reply) => {
    const body = req.body as { name?: string; adapterType?: string; secretId?: string; config?: object; enabled?: boolean; isDefault?: boolean };
    if (!body.name || !body.adapterType || !body.secretId) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'name, adapterType, and secretId required' });
    }
    const { serviceRegistry } = await import('../services/service-registry.js');
    const profile = serviceRegistry.registerProfile({
      name: body.name,
      adapterType: body.adapterType as any,
      secretId: body.secretId,
      config: body.config as Record<string, unknown> | undefined,
      enabled: body.enabled,
      isDefault: body.isDefault,
    });
    return reply.status(201).send(profile);
  });

  // ─── GET /api/admin/profiles/:id ───
  app.get('/api/admin/profiles/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { getProfileById } = await import('../storage/vault-storage.js');
    const profile = getProfileById(id);
    if (!profile) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Profile not found' });
    return profile;
  });

  // ─── PUT /api/admin/profiles/:id ───
  app.put('/api/admin/profiles/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { name?: string; config?: object; enabled?: boolean; isDefault?: boolean };
    const { updateProfile } = await import('../storage/vault-storage.js');
    const updated = updateProfile(id, body as any);
    if (!updated) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Profile not found' });
    return updated;
  });

  // ─── DELETE /api/admin/profiles/:id ───
  app.delete('/api/admin/profiles/:id', { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { deleteProfile } = await import('../storage/vault-storage.js');
    const ok = deleteProfile(id);
    if (!ok) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Profile not found' });
    return { success: true };
  });

  // ─── POST /api/admin/profiles/:id/test — Test connection ───
  app.post('/api/admin/profiles/:id/test', { preHandler: [authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const { serviceRegistry } = await import('../services/service-registry.js');
    return serviceRegistry.testProfile(id);
  });
}
