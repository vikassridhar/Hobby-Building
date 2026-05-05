/**
 * Payment Skill
 * Card payments, balance checks, and refunds
 */

import type { SkillDefinition, SkillAction } from '../types/index.js';

const actions: SkillAction[] = [
  {
    name: 'payWithCard',
    description: 'Charge a card using Stripe',
    parameters: [
      { name: 'amount', type: 'number', required: true, description: 'Amount to charge' },
      { name: 'currency', type: 'string', required: false, description: 'Currency code (default: USD)' },
      { name: 'description', type: 'string', required: false, description: 'Payment description' },
    ],
    requiredAdapter: 'stripe',
  },
  {
    name: 'getCardBalance',
    description: 'Get balance for a Stripe customer or card',
    parameters: [
      { name: 'customerId', type: 'string', required: false, description: 'Stripe customer ID (uses secret if not provided)' },
    ],
    requiredAdapter: 'stripe',
  },
  {
    name: 'refundCharge',
    description: 'Refund a previous charge',
    parameters: [
      { name: 'chargeId', type: 'string', required: true, description: 'Charge ID to refund' },
      { name: 'amount', type: 'number', required: false, description: 'Partial refund amount' },
    ],
    requiredAdapter: 'stripe',
  },
];

export const paymentSkill: SkillDefinition = {
  name: 'payment',
  description: 'Card payment operations via Stripe',
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

export default paymentSkill;
