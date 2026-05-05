/**
 * Task Utilities
 * Re-exports task creation, risk assessment, and approval flow
 * to avoid circular dependencies in gateway-router
 */

import { createTask as _createTask, updateTaskStatus, getTaskById } from '../storage/vault-storage.js';
import { assessRisk as _assessRisk } from '../utils/risk.js';
import { createApprovalRequest as _createApprovalRequest } from '../utils/approval-flow.js';
import type { Task, TaskInput, RiskAssessment, VaultConfig, ApprovalRequest } from '../types/index.js';

export function createTask(input: TaskInput): Task {
  return _createTask(input);
}

export function assessRisk(task: Task, config: VaultConfig): RiskAssessment {
  return _assessRisk(task, config);
}

export async function createApprovalRequest(
  task: Task,
  risk: RiskAssessment,
  config: VaultConfig
): Promise<ApprovalRequest> {
  return _createApprovalRequest(task, risk, config);
}

export { updateTaskStatus, getTaskById };

export default {
  createTask,
  assessRisk,
  createApprovalRequest,
  updateTaskStatus,
  getTaskById,
};
