/**
 * Risk Assessment Engine
 * Computes risk scores and flags for tasks before approval
 */

import type { Task, RiskAssessment, VaultConfig } from '../types/index.js';

export function assessRisk(task: Task, config: VaultConfig): RiskAssessment {
  const flags: RiskAssessment['flags'] = [];
  let score = 0;

  const amount = task.parameters.amount || 0;
  const currency = task.parameters.currency || 'USD';

  // Amount-based risk
  if (amount > 10000) {
    score += 40;
    flags.push({ code: 'HIGH_AMOUNT', severity: 'high', message: `Amount ${amount} ${currency} exceeds $10,000` });
  } else if (amount > 1000) {
    score += 20;
    flags.push({ code: 'MEDIUM_AMOUNT', severity: 'medium', message: `Amount ${amount} ${currency} exceeds $1,000` });
  } else if (amount > 0) {
    score += 5;
  }

  // Task type risk
  const highRiskTypes = ['crypto_transfer', 'trade'];
  const mediumRiskTypes = ['bank_transfer', 'card_payment'];
  if (highRiskTypes.includes(task.type)) {
    score += 25;
    flags.push({ code: 'HIGH_RISK_TYPE', severity: 'high', message: `${task.type} is a high-risk operation` });
  } else if (mediumRiskTypes.includes(task.type)) {
    score += 10;
    flags.push({ code: 'MEDIUM_RISK_TYPE', severity: 'medium', message: `${task.type} requires caution` });
  }

  // Priority risk
  if (task.priority === 'critical') {
    score += 15;
    flags.push({ code: 'CRITICAL_PRIORITY', severity: 'high', message: 'Critical priority task' });
  }

  // Time-based risk (outside business hours in configured timezone)
  const hour = new Date().getHours();
  if (hour < 7 || hour > 22) {
    score += 10;
    flags.push({ code: 'OFF_HOURS', severity: 'medium', message: 'Request outside typical hours (7AM-10PM)' });
  }

  // Auto-approve logic
  let recommendation: RiskAssessment['recommendation'];
  let reason: string;

  if (config.autoExecuteEnabled && amount <= config.autoExecuteMaxAmount && currency === config.autoExecuteCurrency && score < 20) {
    recommendation = 'auto_approve';
    reason = `Amount ${amount} ${currency} below auto-execute threshold (${config.autoExecuteMaxAmount} ${config.autoExecuteCurrency})`;
  } else if (score >= 70) {
    recommendation = 'block';
    reason = `Risk score ${score} too high — requires manual review`;
  } else {
    recommendation = 'request_approval';
    reason = `Risk score ${score} — human approval required`;
  }

  return {
    score: Math.min(score, 100),
    flags,
    recommendation,
    reason,
  };
}

export default { assessRisk };
