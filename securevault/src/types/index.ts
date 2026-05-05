/**
 * SecureVault Core Types
 * Defines all domain entities for secrets, tasks, requests, approvals, adapters, skills, and audit logs
 */

export type SecretCategory =
  | 'bank_account'
  | 'credit_card'
  | 'crypto_wallet'
  | 'api_key'
  | 'password'
  | 'note'
  | 'identity_document'
  | 'trading_account';

export type SecretStatus = 'active' | 'revoked' | 'expired';

export interface Secret {
  id: string;
  name: string;
  category: SecretCategory;
  encryptedData: string; // AES-256-GCM ciphertext
  iv: string; // initialization vector (hex)
  authTag: string; // GCM auth tag (hex)
  status: SecretStatus;
  metadata: SecretMetadata;
  createdAt: string; // ISO 8601
  updatedAt: string;
  expiresAt?: string;
  lastAccessedAt?: string;
  accessCount: number;
}

export interface SecretMetadata {
  issuer?: string; // bank name, card issuer, etc.
  lastFour?: string; // last 4 digits for cards/accounts
  currency?: string;
  country?: string;
  tags?: string[];
  notes?: string;
}

export interface SecretInput {
  name: string;
  category: SecretCategory;
  plaintext: string; // raw secret value — encrypted before storage
  metadata?: SecretMetadata;
  expiresAt?: string;
}

export type TaskType =
  | 'bank_transfer'
  | 'crypto_transfer'
  | 'card_payment'
  | 'bill_payment'
  | 'subscription_renewal'
  | 'api_call'
  | 'trade';

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export type TaskStatus =
  | 'pending'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Task {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  description: string;
  secretId: string; // references the secret to use
  parameters: TaskParameters;
  requestedAt: string;
  requestedBy: string; // agent or user identifier
  approvedAt?: string;
  approvedBy?: string;
  executedAt?: string;
  result?: TaskResult;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
}

export interface TaskParameters {
  amount?: number;
  currency?: string;
  recipient?: string;
  recipientAccount?: string;
  memo?: string;
  schedule?: string; // cron or ISO date for scheduled tasks
  [key: string]: unknown; // extensible for different task types
}

export interface TaskResult {
  success: boolean;
  transactionId?: string;
  receiptUrl?: string;
  confirmationCode?: string;
  rawResponse?: string;
  executedAt: string;
}

export type RequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export interface ApprovalRequest {
  id: string;
  taskId: string;
  status: RequestStatus;
  requestedAt: string;
  expiresAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  respondedBy?: string; // Telegram user ID or username
  messageId?: number; // Telegram message ID for the approval prompt
  chatId?: number; // Telegram chat ID
  riskScore: number; // 0-100 computed risk score
  riskFlags: RiskFlag[];
  autoApproved: boolean;
  autoApproveReason?: string;
}

export interface RiskFlag {
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

// ─── Gateway Request Types ───

export type GatewayRequestStatus =
  | 'pending'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface GatewayRequest {
  id: string;
  taskId: string;
  status: GatewayRequestStatus;
  adapterType: AdapterType;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
  executedAt?: string;
  result?: unknown;
  errorMessage?: string;
}

export type AdapterType = 'alpaca' | 'stripe' | 'ibkr' | 'revolut' | 'wise' | 'plaid' | 'generic_oauth' | 'custom';

export interface TaskInput {
  type: Task['type'];
  priority?: Task['priority'];
  description: string;
  secretId: string;
  parameters?: Task['parameters'];
  requestedBy: string;
  maxRetries?: number;
}

export interface GatewayRequestInput {
  taskId: string;
  adapterType: GatewayRequest['adapterType'];
  action: string;
  payload: Record<string, unknown>;
}

// ─── Service Adapter Types ───

export interface AdapterConfig {
  type: AdapterType;
  name: string;
  enabled: boolean;
  credentials: Record<string, string>;
  options?: Record<string, unknown>;
}

export interface AdapterExecuteOptions {
  action: string;
  payload: Record<string, unknown>;
  secretPlaintext: string; // decrypted secret for the adapter to use
}

export interface AdapterResult {
  success: boolean;
  data?: unknown;
  error?: string;
  rawResponse?: string;
}

export interface ServiceAdapter {
  readonly type: AdapterType;
  readonly name: string;
  validateConfig(config: AdapterConfig): boolean;
  execute(options: AdapterExecuteOptions): Promise<AdapterResult>;
}

// ─── Skill Types ───

export interface SkillAction {
  name: string;
  description: string;
  parameters: SkillParameter[];
  requiredAdapter?: AdapterType;
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required: boolean;
  description: string;
  enumValues?: string[];
}

export interface SkillDefinition {
  name: string;
  description: string;
  actions: SkillAction[];
  validateAction(action: string, params: Record<string, unknown>): { valid: boolean; errors: string[] };
}

// ─── Audit Types ───

export type AuditAction =
  | 'secret_created'
  | 'secret_read'
  | 'secret_updated'
  | 'secret_deleted'
  | 'secret_revoked'
  | 'task_created'
  | 'task_approved'
  | 'task_rejected'
  | 'task_executed'
  | 'task_failed'
  | 'task_cancelled'
  | 'approval_requested'
  | 'approval_responded'
  | 'gateway_request_created'
  | 'gateway_request_executed'
  | 'gateway_request_failed'
  | 'system_start'
  | 'system_stop'
  | 'config_changed'
  | 'auth_success'
  | 'auth_failure';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  severity: AuditSeverity;
  actor: string; // who performed the action
  targetId?: string; // secret ID, task ID, etc.
  targetType?: 'secret' | 'task' | 'approval' | 'gateway_request' | 'system' | 'config';
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

// ─── Service Profile Types ───

export interface ServiceProfile {
  id: string;
  name: string;
  adapterType: AdapterType;
  secretId: string;
  config: Record<string, unknown>;
  enabled: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceProfileInput {
  name: string;
  adapterType: AdapterType;
  secretId: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
  isDefault?: boolean;
}

export interface VaultConfig {
  nodeEnv: string;
  masterKey: string;
  dbPath: string;
  auditLogPath: string;
  gatewayPort: number;
  gatewayHost: string;
  tlsCertPath: string;
  tlsKeyPath: string;
  telegramBotToken: string;
  telegramUserId: string;
  agentToken: string;
  autoExecuteEnabled: boolean;
  autoExecuteMaxAmount: number;
  autoExecuteCurrency: string;
  riskTimezone: string;
  tradingMode: 'paper' | 'live';
  tradeApprovalThreshold: number;
  tradeMaxPositionPercent: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface RiskAssessment {
  score: number; // 0-100
  flags: RiskFlag[];
  recommendation: 'auto_approve' | 'request_approval' | 'block';
  reason: string;
}
