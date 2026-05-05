/**
 * Approval Flow Orchestrator
 * Creates approval requests and handles auto-approval logic
 */

import type { Task, ApprovalRequest, RiskAssessment, VaultConfig } from '../types/index.js';
import { createApproval, updateTaskStatus } from '../storage/vault-storage.js';
import { sendApprovalRequest } from '../bot/telegram-bot.js';

export async function createApprovalRequest(
  task: Task,
  risk: RiskAssessment,
  config: VaultConfig
): Promise<ApprovalRequest> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 min expiry

  const approval = createApproval({
    taskId: task.id,
    status: risk.recommendation === 'auto_approve' ? 'approved' : risk.recommendation === 'block' ? 'rejected' : 'pending',
    requestedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    riskScore: risk.score,
    riskFlags: risk.flags,
    autoApproved: risk.recommendation === 'auto_approve',
    autoApproveReason: risk.recommendation === 'auto_approve' ? risk.reason : undefined,
  });

  if (risk.recommendation === 'auto_approve') {
    // Auto-approve: update task immediately
    updateTaskStatus(task.id, 'approved', {
      approvedAt: now.toISOString(),
      approvedBy: 'system_auto',
    });
  } else if (risk.recommendation === 'request_approval') {
    // Send Telegram approval request
    await sendApprovalRequest(approval, task, config);
  } else if (risk.recommendation === 'block') {
    // Block: update task and approval to rejected
    updateTaskStatus(task.id, 'rejected', {
      errorMessage: risk.reason,
    });
    // Also update approval to rejected status
    const { updateApprovalStatus } = await import('../storage/vault-storage.js');
    updateApprovalStatus(approval.id, 'rejected', 'system_risk_engine', now.toISOString());
  }

  return approval;
}

export default { createApprovalRequest };
