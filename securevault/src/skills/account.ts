/**
 * Account Skill
 * Banking account operations via Generic OAuth2 adapter
 */

import type { SkillDefinition, SkillAction } from '../types/index.js';

const actions: SkillAction[] = [
  {
    name: 'getBalance',
    description: 'Get account balance',
    parameters: [
      { name: 'accountId', type: 'string', required: false, description: 'Account ID (uses default if not provided)' },
    ],
    requiredAdapter: 'generic_oauth',
  },
  {
    name: 'transfer',
    description: 'Transfer funds between accounts',
    parameters: [
      { name: 'toAccount', type: 'string', required: true, description: 'Destination account ID' },
      { name: 'amount', type: 'number', required: true, description: 'Amount to transfer' },
      { name: 'currency', type: 'string', required: true, description: 'Currency code' },
      { name: 'reference', type: 'string', required: false, description: 'Transfer reference/memo' },
    ],
    requiredAdapter: 'generic_oauth',
  },
  {
    name: 'getTransactions',
    description: 'Get transaction history',
    parameters: [
      { name: 'accountId', type: 'string', required: false, description: 'Account ID' },
      { name: 'limit', type: 'number', required: false, description: 'Max transactions to return' },
      { name: 'fromDate', type: 'string', required: false, description: 'Start date (ISO 8601)' },
      { name: 'toDate', type: 'string', required: false, description: 'End date (ISO 8601)' },
    ],
    requiredAdapter: 'generic_oauth',
  },
  {
    name: 'getAccountInfo',
    description: 'Get account information',
    parameters: [],
    requiredAdapter: 'generic_oauth',
  },
];

export const accountSkill: SkillDefinition = {
  name: 'account',
  description: 'Banking account operations via OAuth2-protected APIs',
  actions,
  validateAction(action: string, params: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const skillAction = actions.find((a) => a.name === action);

    if (!skillAction) {
      return { valid: false, errors: [`Unknown action: ${action}`] };
    }

    for (const param of skillAction.parameters) {
      if (param.required && (params[param.name] === undefined || params[param.name] === null)) {
        errors.push(`Missing required parameter: ${param.name}`);
      }
      if (params[param.name] !== undefined && param.type === 'number' && typeof params[param.name] !== 'number') {
        errors.push(`Parameter ${param.name} must be a number`);
      }
      if (params[param.name] !== undefined && param.type === 'string' && typeof params[param.name] !== 'string') {
        errors.push(`Parameter ${param.name} must be a string`);
      }
    }

    return { valid: errors.length === 0, errors };
  },
};

export default accountSkill;
