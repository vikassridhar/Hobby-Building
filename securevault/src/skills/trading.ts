/**
 * Trading Skill
 * Stock trading operations via Alpaca Markets
 * Supports paper and live trading with human-in-the-loop approval
 */

import type { SkillDefinition, SkillAction } from '../types/index.js';

const actions: SkillAction[] = [
  {
    name: 'trading.executeTrade',
    description: 'Execute a stock trade (buy or sell) via Alpaca',
    parameters: [
      { name: 'symbol', type: 'string', required: true, description: 'Stock symbol (e.g., AAPL)' },
      { name: 'side', type: 'enum', required: true, description: 'BUY or SELL', enumValues: ['BUY', 'SELL'] },
      { name: 'quantity', type: 'number', required: true, description: 'Number of shares' },
      { name: 'orderType', type: 'enum', required: false, description: 'Order type (default: MKT)', enumValues: ['MKT', 'LMT', 'STP', 'STOP_LIMIT'] },
      { name: 'price', type: 'number', required: false, description: 'Limit or stop price (required for LMT/STP/STOP_LIMIT)' },
      { name: 'tif', type: 'enum', required: false, description: 'Time in force (default: DAY)', enumValues: ['DAY', 'GTC', 'IOC', 'OPG', 'CLS'] },
    ],
    requiredAdapter: 'alpaca',
  },
  {
    name: 'trading.getPortfolio',
    description: 'Get portfolio summary with positions and allocation',
    parameters: [],
    requiredAdapter: 'alpaca',
  },
  {
    name: 'trading.getOrderHistory',
    description: 'List recent orders with status',
    parameters: [
      { name: 'status', type: 'string', required: false, description: 'Filter by status (open, closed, all). Default: all' },
      { name: 'limit', type: 'number', required: false, description: 'Max orders to return (default: 50)' },
      { name: 'direction', type: 'string', required: false, description: 'Sort direction: asc or desc (default: desc)' },
    ],
    requiredAdapter: 'alpaca',
  },
  {
    name: 'trading.cancelOrder',
    description: 'Cancel a pending order',
    parameters: [
      { name: 'orderId', type: 'string', required: true, description: 'Alpaca order ID to cancel' },
    ],
    requiredAdapter: 'alpaca',
  },
];

export const tradingSkill: SkillDefinition = {
  name: 'trading',
  description: 'Stock trading operations via Alpaca Markets (paper and live)',
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
      if (params[param.name] !== undefined && param.type === 'enum' && param.enumValues && !param.enumValues.includes(String(params[param.name]))) {
        errors.push(`Parameter ${param.name} must be one of: ${param.enumValues.join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors };
  },
};

export default tradingSkill;
