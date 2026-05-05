/**
 * SQLite Vault Storage
 * CRUD operations for secrets, tasks, approvals, and audit logs
 * All secret data encrypted at rest via vault-crypto
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type {
  Secret,
  SecretInput,
  SecretCategory,
  SecretStatus,
  Task,
  TaskStatus,
  ApprovalRequest,
  RequestStatus,
  AuditLogEntry,
  PaginatedResult,
  GatewayRequest,
} from '../types/index.js';
import { encryptSecret, decryptSecret } from '../crypto/vault-crypto.js';

let db: Database.Database | null = null;
let masterKey: string | null = null;

export interface StorageInitOptions {
  dbPath: string;
  masterKey: string;
}

/**
 * Initialize the SQLite database with schema
 */
export function initStorage(options: StorageInitOptions): Database.Database {
  masterKey = options.masterKey;
  db = new Database(options.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS secrets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      encrypted_data TEXT NOT NULL,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      expires_at TEXT,
      last_accessed_at TEXT,
      access_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_secrets_category ON secrets(category);
    CREATE INDEX IF NOT EXISTS idx_secrets_status ON secrets(status);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'pending',
      description TEXT NOT NULL,
      secret_id TEXT NOT NULL,
      parameters TEXT,
      requested_at TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      approved_at TEXT,
      approved_by TEXT,
      executed_at TEXT,
      result TEXT,
      error_message TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      FOREIGN KEY (secret_id) REFERENCES secrets(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_secret ON tasks(secret_id);

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      requested_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      approved_at TEXT,
      rejected_at TEXT,
      responded_by TEXT,
      message_id INTEGER,
      chat_id INTEGER,
      risk_score INTEGER NOT NULL DEFAULT 0,
      risk_flags TEXT,
      auto_approved INTEGER NOT NULL DEFAULT 0,
      auto_approve_reason TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
    CREATE INDEX IF NOT EXISTS idx_approvals_task ON approvals(task_id);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      actor TEXT NOT NULL,
      target_id TEXT,
      target_type TEXT,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      success INTEGER NOT NULL DEFAULT 1,
      error_message TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_id);

    CREATE TABLE IF NOT EXISTS gateway_requests (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      adapter_type TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      executed_at TEXT,
      result TEXT,
      error_message TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE INDEX IF NOT EXISTS idx_gateway_task ON gateway_requests(task_id);
    CREATE INDEX IF NOT EXISTS idx_gateway_status ON gateway_requests(status);

    CREATE TABLE IF NOT EXISTS service_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      adapter_type TEXT NOT NULL,
      secret_id TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (secret_id) REFERENCES secrets(id)
    );

    CREATE INDEX IF NOT EXISTS idx_profiles_adapter ON service_profiles(adapter_type);
    CREATE INDEX IF NOT EXISTS idx_profiles_default ON service_profiles(is_default);
  `);

  return db;
}

function getDb(): Database.Database {
  if (!db) throw new Error('Storage not initialized. Call initStorage() first.');
  return db;
}

function getKey(): string {
  if (!masterKey) throw new Error('Master key not set. Call initStorage() first.');
  return masterKey;
}

// ─── Secrets ───

export function createSecret(input: SecretInput): Secret {
  const key = getKey();
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  const encrypted = encryptSecret(input, key);
  // encryptedData already contains salt + ciphertext from encryptSecret
  // No additional prefixing needed

  const secret: Secret = {
    id,
    name: input.name,
    category: input.category,
    encryptedData: encrypted.encryptedData,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    status: 'active',
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
    expiresAt: input.expiresAt,
    accessCount: 0,
  };

  db.prepare(`
    INSERT INTO secrets (id, name, category, encrypted_data, iv, auth_tag, status, metadata, created_at, updated_at, expires_at, access_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    secret.id,
    secret.name,
    secret.category,
    secret.encryptedData,
    secret.iv,
    secret.authTag,
    secret.status,
    JSON.stringify(secret.metadata),
    secret.createdAt,
    secret.updatedAt,
    secret.expiresAt || null,
    secret.accessCount
  );

  return secret;
}

export function getSecretById(id: string): Secret | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM secrets WHERE id = ?').get(id) as SecretRow | undefined;
  if (!row) return null;
  return rowToSecret(row);
}

export function getSecretWithDecryption(id: string): { secret: Secret; plaintext: string } | null {
  const key = getKey();
  const secret = getSecretById(id);
  if (!secret) return null;

  const plaintext = decryptSecret(
    {
      encryptedData: secret.encryptedData,
      iv: secret.iv,
      authTag: secret.authTag,
    },
    key
  );

  // Update access stats
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE secrets SET last_accessed_at = ?, access_count = access_count + 1 WHERE id = ?')
    .run(now, id);

  secret.lastAccessedAt = now;
  secret.accessCount += 1;

  return { secret, plaintext };
}

export function listSecrets(options?: { category?: SecretCategory; status?: SecretStatus; limit?: number; offset?: number }): PaginatedResult<Secret> {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.category) {
    conditions.push('category = ?');
    params.push(options.category);
  }
  if (options?.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM secrets ${whereClause}`).get(...params) as { total: number };

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  params.push(limit, offset);

  const rows = db.prepare(`SELECT * FROM secrets ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params) as SecretRow[];

  return {
    data: rows.map(rowToSecret),
    total: countRow.total,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    hasMore: offset + rows.length < countRow.total,
  };
}

export function updateSecret(id: string, updates: Partial<Pick<Secret, 'name' | 'metadata' | 'status' | 'expiresAt'>>): Secret | null {
  const db = getDb();
  const secret = getSecretById(id);
  if (!secret) return null;

  const now = new Date().toISOString();
  const newName = updates.name ?? secret.name;
  const newStatus = updates.status ?? secret.status;
  const newMetadata = updates.metadata ? { ...secret.metadata, ...updates.metadata } : secret.metadata;
  const newExpires = updates.expiresAt ?? secret.expiresAt;

  db.prepare(`
    UPDATE secrets SET name = ?, status = ?, metadata = ?, expires_at = ?, updated_at = ? WHERE id = ?
  `).run(newName, newStatus, JSON.stringify(newMetadata), newExpires || null, now, id);

  return { ...secret, name: newName, status: newStatus, metadata: newMetadata, expiresAt: newExpires, updatedAt: now };
}

export function deleteSecret(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM secrets WHERE id = ?').run(id);
  return result.changes > 0;
}

export function revokeSecret(id: string): Secret | null {
  return updateSecret(id, { status: 'revoked' });
}

// ─── Tasks ───

export interface TaskInput {
  type: Task['type'];
  priority?: Task['priority'];
  description: string;
  secretId: string;
  parameters?: Task['parameters'];
  requestedBy: string;
  maxRetries?: number;
}

export function createTask(input: TaskInput): Task {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  const task: Task = {
    id,
    type: input.type,
    priority: input.priority || 'normal',
    status: 'pending',
    description: input.description,
    secretId: input.secretId,
    parameters: input.parameters || {},
    requestedAt: now,
    requestedBy: input.requestedBy,
    retryCount: 0,
    maxRetries: input.maxRetries ?? 3,
  };

  db.prepare(`
    INSERT INTO tasks (id, type, priority, status, description, secret_id, parameters, requested_at, requested_by, retry_count, max_retries)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.id,
    task.type,
    task.priority,
    task.status,
    task.description,
    task.secretId,
    JSON.stringify(task.parameters),
    task.requestedAt,
    task.requestedBy,
    task.retryCount,
    task.maxRetries
  );

  return task;
}

export function getTaskById(id: string): Task | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
  if (!row) return null;
  return rowToTask(row);
}

export function updateTaskStatus(
  id: string,
  status: TaskStatus,
  extra?: Partial<Pick<Task, 'approvedAt' | 'approvedBy' | 'executedAt' | 'result' | 'errorMessage' | 'retryCount'>>
): Task | null {
  const db = getDb();
  const task = getTaskById(id);
  if (!task) return null;

  const updates: string[] = ['status = ?'];
  const params: (string | number | null)[] = [status];

  if (extra?.approvedAt !== undefined) { updates.push('approved_at = ?'); params.push(extra.approvedAt); }
  if (extra?.approvedBy !== undefined) { updates.push('approved_by = ?'); params.push(extra.approvedBy); }
  if (extra?.executedAt !== undefined) { updates.push('executed_at = ?'); params.push(extra.executedAt); }
  if (extra?.result !== undefined) { updates.push('result = ?'); params.push(JSON.stringify(extra.result)); }
  if (extra?.errorMessage !== undefined) { updates.push('error_message = ?'); params.push(extra.errorMessage); }
  if (extra?.retryCount !== undefined) { updates.push('retry_count = ?'); params.push(extra.retryCount); }

  params.push(id);
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  return getTaskById(id);
}

export function listTasks(options?: { status?: TaskStatus; secretId?: string; limit?: number; offset?: number }): PaginatedResult<Task> {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.status) { conditions.push('status = ?'); params.push(options.status); }
  if (options?.secretId) { conditions.push('secret_id = ?'); params.push(options.secretId); }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM tasks ${whereClause}`).get(...params) as { total: number };

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  params.push(limit, offset);

  const rows = db.prepare(`SELECT * FROM tasks ${whereClause} ORDER BY requested_at DESC LIMIT ? OFFSET ?`).all(...params) as TaskRow[];

  return {
    data: rows.map(rowToTask),
    total: countRow.total,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    hasMore: offset + rows.length < countRow.total,
  };
}

// ─── Approvals ───

export function createApproval(approval: Omit<ApprovalRequest, 'id'>): ApprovalRequest {
  const db = getDb();
  const id = uuidv4();

  const req: ApprovalRequest = { ...approval, id };

  db.prepare(`
    INSERT INTO approvals (id, task_id, status, requested_at, expires_at, approved_at, rejected_at, responded_by, message_id, chat_id, risk_score, risk_flags, auto_approved, auto_approve_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.id,
    req.taskId,
    req.status,
    req.requestedAt,
    req.expiresAt,
    req.approvedAt || null,
    req.rejectedAt || null,
    req.respondedBy || null,
    req.messageId || null,
    req.chatId || null,
    req.riskScore,
    JSON.stringify(req.riskFlags),
    req.autoApproved ? 1 : 0,
    req.autoApproveReason || null
  );

  return req;
}

export function getApprovalById(id: string): ApprovalRequest | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as ApprovalRow | undefined;
  if (!row) return null;
  return rowToApproval(row);
}

export function getApprovalByTaskId(taskId: string): ApprovalRequest | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM approvals WHERE task_id = ? ORDER BY requested_at DESC LIMIT 1').get(taskId) as ApprovalRow | undefined;
  if (!row) return null;
  return rowToApproval(row);
}

export function updateApprovalStatus(
  id: string,
  status: RequestStatus,
  respondedBy: string,
  respondedAt: string
): ApprovalRequest | null {
  const db = getDb();
  const approval = getApprovalById(id);
  if (!approval) return null;

  const approvedAt = status === 'approved' ? respondedAt : approval.approvedAt;
  const rejectedAt = status === 'rejected' ? respondedAt : approval.rejectedAt;

  db.prepare(`
    UPDATE approvals SET status = ?, responded_by = ?, approved_at = ?, rejected_at = ? WHERE id = ?
  `).run(status, respondedBy, approvedAt || null, rejectedAt || null, id);

  return getApprovalById(id);
}

export function updateApprovalMessage(id: string, messageId: number, chatId: number): void {
  const db = getDb();
  db.prepare('UPDATE approvals SET message_id = ?, chat_id = ? WHERE id = ?').run(messageId, chatId, id);
}

export function listPendingApprovals(): ApprovalRequest[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM approvals WHERE status = 'pending' ORDER BY requested_at DESC").all() as ApprovalRow[];
  return rows.map(rowToApproval);
}

// ─── Audit Logs ───

export function logAudit(entry: Omit<AuditLogEntry, 'id'>): AuditLogEntry {
  const db = getDb();
  const id = uuidv4();

  const fullEntry: AuditLogEntry = { ...entry, id };

  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, action, severity, actor, target_id, target_type, ip_address, user_agent, details, success, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    fullEntry.id,
    fullEntry.timestamp,
    fullEntry.action,
    fullEntry.severity,
    fullEntry.actor,
    fullEntry.targetId || null,
    fullEntry.targetType || null,
    fullEntry.ipAddress || null,
    fullEntry.userAgent || null,
    fullEntry.details ? JSON.stringify(fullEntry.details) : null,
    fullEntry.success ? 1 : 0,
    fullEntry.errorMessage || null
  );

  return fullEntry;
}

export function listAuditLogs(options?: { action?: string; targetId?: string; severity?: string; limit?: number; offset?: number }): PaginatedResult<AuditLogEntry> {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.action) { conditions.push('action = ?'); params.push(options.action); }
  if (options?.targetId) { conditions.push('target_id = ?'); params.push(options.targetId); }
  if (options?.severity) { conditions.push('severity = ?'); params.push(options.severity); }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`).get(...params) as { total: number };

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  params.push(limit, offset);

  const rows = db.prepare(`SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...params) as AuditRow[];

  return {
    data: rows.map(rowToAudit),
    total: countRow.total,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    hasMore: offset + rows.length < countRow.total,
  };
}

// ─── Row Mappers ───

interface SecretRow {
  id: string;
  name: string;
  category: string;
  encrypted_data: string;
  iv: string;
  auth_tag: string;
  status: string;
  metadata: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  last_accessed_at: string | null;
  access_count: number;
}

function rowToSecret(row: SecretRow): Secret {
  return {
    id: row.id,
    name: row.name,
    category: row.category as SecretCategory,
    encryptedData: row.encrypted_data,
    iv: row.iv,
    authTag: row.auth_tag,
    status: row.status as SecretStatus,
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at || undefined,
    lastAccessedAt: row.last_accessed_at || undefined,
    accessCount: row.access_count,
  };
}

interface TaskRow {
  id: string;
  type: string;
  priority: string;
  status: string;
  description: string;
  secret_id: string;
  parameters: string;
  requested_at: string;
  requested_by: string;
  approved_at: string | null;
  approved_by: string | null;
  executed_at: string | null;
  result: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    type: row.type as Task['type'],
    priority: row.priority as Task['priority'],
    status: row.status as TaskStatus,
    description: row.description,
    secretId: row.secret_id,
    parameters: row.parameters ? JSON.parse(row.parameters) : {},
    requestedAt: row.requested_at,
    requestedBy: row.requested_by,
    approvedAt: row.approved_at || undefined,
    approvedBy: row.approved_by || undefined,
    executedAt: row.executed_at || undefined,
    result: row.result ? JSON.parse(row.result) : undefined,
    errorMessage: row.error_message || undefined,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
  };
}

interface ApprovalRow {
  id: string;
  task_id: string;
  status: string;
  requested_at: string;
  expires_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  responded_by: string | null;
  message_id: number | null;
  chat_id: number | null;
  risk_score: number;
  risk_flags: string;
  auto_approved: number;
  auto_approve_reason: string | null;
}

function rowToApproval(row: ApprovalRow): ApprovalRequest {
  return {
    id: row.id,
    taskId: row.task_id,
    status: row.status as RequestStatus,
    requestedAt: row.requested_at,
    expiresAt: row.expires_at,
    approvedAt: row.approved_at || undefined,
    rejectedAt: row.rejected_at || undefined,
    respondedBy: row.responded_by || undefined,
    messageId: row.message_id || undefined,
    chatId: row.chat_id || undefined,
    riskScore: row.risk_score,
    riskFlags: row.risk_flags ? JSON.parse(row.risk_flags) : [],
    autoApproved: row.auto_approved === 1,
    autoApproveReason: row.auto_approve_reason || undefined,
  };
}

interface AuditRow {
  id: string;
  timestamp: string;
  action: string;
  severity: string;
  actor: string;
  target_id: string | null;
  target_type: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: string | null;
  success: number;
  error_message: string | null;
}

function rowToAudit(row: AuditRow): AuditLogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    action: row.action as AuditLogEntry['action'],
    severity: row.severity as AuditLogEntry['severity'],
    actor: row.actor,
    targetId: row.target_id || undefined,
    targetType: (row.target_type as AuditLogEntry['targetType']) || undefined,
    ipAddress: row.ip_address || undefined,
    userAgent: row.user_agent || undefined,
    details: row.details ? JSON.parse(row.details) : undefined,
    success: row.success === 1,
    errorMessage: row.error_message || undefined,
  };
}

// ─── Gateway Requests ───

export interface GatewayRequestInput {
  taskId: string;
  adapterType: GatewayRequest['adapterType'];
  action: string;
  payload: Record<string, unknown>;
}

export function createGatewayRequest(input: GatewayRequestInput): GatewayRequest {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  const request: GatewayRequest = {
    id,
    taskId: input.taskId,
    status: 'pending',
    adapterType: input.adapterType,
    action: input.action,
    payload: input.payload,
    createdAt: now,
  };

  db.prepare(`
    INSERT INTO gateway_requests (id, task_id, status, adapter_type, action, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    request.id,
    request.taskId,
    request.status,
    request.adapterType,
    request.action,
    JSON.stringify(request.payload),
    request.createdAt
  );

  return request;
}

export function getGatewayRequestById(id: string): GatewayRequest | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM gateway_requests WHERE id = ?').get(id) as GatewayRequestRow | undefined;
  if (!row) return null;
  return rowToGatewayRequest(row);
}

export function updateGatewayRequestStatus(
  id: string,
  status: GatewayRequest['status'],
  extra?: { result?: unknown; errorMessage?: string }
): GatewayRequest | null {
  const db = getDb();
  const request = getGatewayRequestById(id);
  if (!request) return null;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE gateway_requests SET status = ?, executed_at = ?, result = ?, error_message = ? WHERE id = ?
  `).run(
    status,
    now,
    extra?.result ? JSON.stringify(extra.result) : null,
    extra?.errorMessage || null,
    id
  );

  return getGatewayRequestById(id);
}

export function listGatewayRequests(options?: { taskId?: string; status?: GatewayRequest['status']; limit?: number; offset?: number }): PaginatedResult<GatewayRequest> {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.taskId) { conditions.push('task_id = ?'); params.push(options.taskId); }
  if (options?.status) { conditions.push('status = ?'); params.push(options.status); }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM gateway_requests ${whereClause}`).get(...params) as { total: number };

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  params.push(limit, offset);

  const rows = db.prepare(`SELECT * FROM gateway_requests ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params) as GatewayRequestRow[];

  return {
    data: rows.map(rowToGatewayRequest),
    total: countRow.total,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    hasMore: offset + rows.length < countRow.total,
  };
}

interface GatewayRequestRow {
  id: string;
  task_id: string;
  status: string;
  adapter_type: string;
  action: string;
  payload: string;
  created_at: string;
  executed_at: string | null;
  result: string | null;
  error_message: string | null;
}

function rowToGatewayRequest(row: GatewayRequestRow): GatewayRequest {
  return {
    id: row.id,
    taskId: row.task_id,
    status: row.status as GatewayRequest['status'],
    adapterType: row.adapter_type as GatewayRequest['adapterType'],
    action: row.action,
    payload: row.payload ? JSON.parse(row.payload) : {},
    createdAt: row.created_at,
    executedAt: row.executed_at || undefined,
    result: row.result ? JSON.parse(row.result) : undefined,
    errorMessage: row.error_message || undefined,
  };
}

// ─── Cleanup ───

export function closeStorage(): void {
  if (db) {
    db.close();
    db = null;
    masterKey = null;
  }
}

// ─── Service Profile CRUD ───

interface ProfileRow {
  id: string;
  name: string;
  adapter_type: string;
  secret_id: string;
  config: string;
  enabled: number;
  is_default: number;
  created_at: string;
  updated_at: string;
}

function rowToProfile(row: ProfileRow): import('../types/index.js').ServiceProfile {
  return {
    id: row.id,
    name: row.name,
    adapterType: row.adapter_type as import('../types/index.js').AdapterType,
    secretId: row.secret_id,
    config: JSON.parse(row.config || '{}'),
    enabled: row.enabled === 1,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createProfile(input: import('../types/index.js').ServiceProfileInput): import('../types/index.js').ServiceProfile {
  if (!db) throw new Error("Storage not initialized");
  const id = uuidv4();
  const now = new Date().toISOString();
  const isDefault = input.isDefault ? 1 : 0;

  // If this is set as default, unset other defaults for same adapter type
  if (isDefault) {
    db.prepare('UPDATE service_profiles SET is_default = 0 WHERE adapter_type = ?').run(input.adapterType);
  }

  db.prepare(`
    INSERT INTO service_profiles (id, name, adapter_type, secret_id, config, enabled, is_default, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, input.name, input.adapterType, input.secretId,
    JSON.stringify(input.config || {}),
    input.enabled !== false ? 1 : 0, isDefault, now, now
  );

  return getProfileById(id)!;
}

export function getProfileById(id: string): import('../types/index.js').ServiceProfile | null {
  if (!db) throw new Error("Storage not initialized");
  const row = db.prepare('SELECT * FROM service_profiles WHERE id = ?').get(id) as ProfileRow | undefined;
  return row ? rowToProfile(row) : null;
}

export function listProfiles(options?: { adapterType?: string; enabled?: boolean }): import('../types/index.js').ServiceProfile[] {
  if (!db) throw new Error("Storage not initialized");
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.adapterType) {
    conditions.push('adapter_type = ?');
    params.push(options.adapterType);
  }
  if (options?.enabled !== undefined) {
    conditions.push('enabled = ?');
    params.push(options.enabled ? 1 : 0);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const rows = db.prepare(`SELECT * FROM service_profiles ${where} ORDER BY created_at DESC`).all(...params) as ProfileRow[];
  return rows.map(rowToProfile);
}

export function updateProfile(id: string, updates: Partial<Pick<import('../types/index.js').ServiceProfile, 'name' | 'config' | 'enabled' | 'isDefault'>>): import('../types/index.js').ServiceProfile | null {
  if (!db) throw new Error("Storage not initialized");
  const existing = getProfileById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const setClauses: string[] = ['updated_at = ?'];
  const params: unknown[] = [now];

  if (updates.name !== undefined) { setClauses.push('name = ?'); params.push(updates.name); }
  if (updates.config !== undefined) { setClauses.push('config = ?'); params.push(JSON.stringify(updates.config)); }
  if (updates.enabled !== undefined) { setClauses.push('enabled = ?'); params.push(updates.enabled ? 1 : 0); }
  if (updates.isDefault !== undefined) {
    if (updates.isDefault) {
      db.prepare('UPDATE service_profiles SET is_default = 0 WHERE adapter_type = ?').run(existing.adapterType);
    }
    setClauses.push('is_default = ?'); params.push(updates.isDefault ? 1 : 0);
  }

  params.push(id);
  db.prepare(`UPDATE service_profiles SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
  return getProfileById(id);
}

export function deleteProfile(id: string): boolean {
  if (!db) throw new Error("Storage not initialized");
  const result = db.prepare('DELETE FROM service_profiles WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getDefaultProfile(adapterType: string): import('../types/index.js').ServiceProfile | null {
  if (!db) throw new Error("Storage not initialized");
  const row = db.prepare('SELECT * FROM service_profiles WHERE adapter_type = ? AND is_default = 1 AND enabled = 1').get(adapterType) as ProfileRow | undefined;
  return row ? rowToProfile(row) : null;
}

export default {
  initStorage,
  closeStorage,
  createSecret,
  getSecretById,
  getSecretWithDecryption,
  listSecrets,
  updateSecret,
  deleteSecret,
  revokeSecret,
  createTask,
  getTaskById,
  updateTaskStatus,
  listTasks,
  createApproval,
  getApprovalById,
  getApprovalByTaskId,
  updateApprovalStatus,
  updateApprovalMessage,
  listPendingApprovals,
  logAudit,
  listAuditLogs,
  createGatewayRequest,
  getGatewayRequestById,
  updateGatewayRequestStatus,
  listGatewayRequests,
  createProfile,
  getProfileById,
  listProfiles,
  updateProfile,
  deleteProfile,
  getDefaultProfile,
};
