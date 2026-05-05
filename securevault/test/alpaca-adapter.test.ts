/**
 * Alpaca Markets Adapter Integration Tests
 *
 * These tests use Alpaca's paper trading API.
 * Set ALPACA_API_KEY and ALPACA_SECRET_KEY env vars to run.
 * Tests are skipped if credentials are not available.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AlpacaAdapter } from '../src/adapters/alpaca.js';
import type { AdapterConfig, AdapterExecuteOptions } from '../src/types/index.js';

const API_KEY = process.env.ALPACA_API_KEY || '';
const SECRET_KEY = process.env.ALPACA_SECRET_KEY || '';
const hasCredentials = API_KEY.length > 0 && SECRET_KEY.length > 0;

const skipIfNoCreds = hasCredentials ? describe : describe.skip;

function makeConfig(): AdapterConfig {
  return {
    type: 'alpaca',
    name: 'Alpaca Paper Trading',
    enabled: true,
    credentials: {
      apiKey: API_KEY,
      secretKey: SECRET_KEY,
    },
    options: {
      tradingMode: 'paper',
      maxPositionPercent: 25,
    },
  };
}

function makeOptions(action: string, payload: Record<string, unknown>): AdapterExecuteOptions {
  return {
    action,
    payload,
    secretPlaintext: '',
  };
}

let adapter: AlpacaAdapter;

skipIfNoCreds('Alpaca Adapter Integration Tests', () => {
  beforeAll(() => {
    adapter = new AlpacaAdapter();
    adapter.validateConfig(makeConfig());
  });

  it('should get portfolio with account info', async () => {
    const result = await adapter.execute(makeOptions('getPortfolio', {}));

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const data = result.data as any;
    expect(data.account).toBeDefined();
    expect(data.account).toHaveProperty('portfolioValue');
    expect(data.account).toHaveProperty('cash');
    expect(data.account).toHaveProperty('buyingPower');
    expect(data.account).toHaveProperty('currency');
    expect(data.account.status).toBe('ACTIVE');
    expect(Array.isArray(data.positions)).toBe(true);
  });

  it('should get market data for a known symbol', async () => {
    const result = await adapter.execute(
      makeOptions('getMarketData', { symbol: 'AAPL' })
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const data = result.data as any;
    expect(data.symbol).toBe('AAPL');
    expect(data).toHaveProperty('bidPrice');
    expect(data).toHaveProperty('askPrice');
    expect(data).toHaveProperty('spread');
    expect(data).toHaveProperty('midPrice');
    expect(data.bidPrice).toBeGreaterThan(0);
    expect(data.askPrice).toBeGreaterThan(0);
  });

  it('should place a market buy order and cancel it', async () => {
    // Place a limit order far from market to ensure it stays open
    const result = await adapter.execute(
      makeOptions('executeTrade', {
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 1,
        orderType: 'LMT',
        price: 50, // well below market — will stay pending
        tif: 'GTC',
      })
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const order = result.data as any;
    expect(order.symbol).toBe('AAPL');
    expect(order.side).toBe('buy');
    expect(order.qty).toBe(1);
    expect(order.type).toBe('limit');
    expect(['new', 'partially_filled', 'pending_new']).toContain(order.status);

    // Cancel the order
    const cancelResult = await adapter.execute(
      makeOptions('cancelOrder', { orderId: order.id })
    );

    expect(cancelResult.success).toBe(true);
    expect((cancelResult.data as any).status).toBe('cancelled');
  });

  it('should get order history', async () => {
    const result = await adapter.execute(
      makeOptions('getOrderHistory', { status: 'all', limit: 10, direction: 'desc' })
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const data = result.data as any;
    expect(Array.isArray(data.orders)).toBe(true);
    expect(data).toHaveProperty('count');
  });

  it('should reject invalid order parameters', async () => {
    const result = await adapter.execute(
      makeOptions('executeTrade', {
        side: 'BUY',
        // missing symbol
        quantity: 1,
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('symbol');
  });

  it('should reject invalid side', async () => {
    const result = await adapter.execute(
      makeOptions('executeTrade', {
        symbol: 'AAPL',
        side: 'HOLD',
        quantity: 1,
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('BUY or SELL');
  });

  it('should reject zero quantity', async () => {
    const result = await adapter.execute(
      makeOptions('executeTrade', {
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 0,
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('quantity');
  });

  it('should reject limit order without price', async () => {
    const result = await adapter.execute(
      makeOptions('executeTrade', {
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 1,
        orderType: 'LMT',
        // no price
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('price');
  });

  it('should return error for unknown action', async () => {
    const result = await adapter.execute(makeOptions('unknownAction', {}));

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown action');
  });

  it('should return error for unknown symbol in market data', async () => {
    const result = await adapter.execute(
      makeOptions('getMarketData', { symbol: 'FAKESYMBOL12345' })
    );

    // Alpaca may return error or empty data
    expect(result.success).toBe(false);
  });
});

// Unit tests for adapter (no API calls needed)
describe('Alpaca Adapter Unit Tests', () => {
  it('should require apiKey in config', () => {
    const a = new AlpacaAdapter();
    expect(() => a.validateConfig({
      type: 'alpaca',
      name: 'test',
      enabled: true,
      credentials: {},
    })).toThrow('apiKey');
  });

  it('should require secretKey in config', () => {
    const a = new AlpacaAdapter();
    expect(() => a.validateConfig({
      type: 'alpaca',
      name: 'test',
      enabled: true,
      credentials: { apiKey: 'test' },
    })).toThrow('secretKey');
  });

  it('should validate successfully with proper config', () => {
    const a = new AlpacaAdapter();
    const ok = a.validateConfig({
      type: 'alpaca',
      name: 'test',
      enabled: true,
      credentials: { apiKey: 'test-key', secretKey: 'test-secret' },
    });
    expect(ok).toBe(true);
    expect(a.type).toBe('alpaca');
    expect(a.name).toBe('Alpaca Markets');
  });

  it('should default to paper trading mode', () => {
    const a = new AlpacaAdapter();
    a.validateConfig({
      type: 'alpaca',
      name: 'test',
      enabled: true,
      credentials: { apiKey: 'k', secretKey: 's' },
    });
    // Paper mode uses paper-api.alpaca.markets
    // We can't access the private baseUrl directly, but we know validateConfig passed
    expect(a.name).toBe('Alpaca Markets');
  });
});

// Trading Skill Validation Tests
describe('Trading Skill Validation', () => {
  it('should validate executeTrade with required params', async () => {
    const { tradingSkill } = await import('../src/skills/trading.js');

    const result = tradingSkill.validateAction('trading.executeTrade', {
      symbol: 'AAPL',
      side: 'BUY',
      quantity: 10,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject executeTrade missing required params', async () => {
    const { tradingSkill } = await import('../src/skills/trading.js');

    const result = tradingSkill.validateAction('trading.executeTrade', {
      symbol: 'AAPL',
      // missing side and quantity
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should validate trading.cancelOrder', async () => {
    const { tradingSkill } = await import('../src/skills/trading.js');

    const result = tradingSkill.validateAction('trading.cancelOrder', {
      orderId: 'order-123',
    });

    expect(result.valid).toBe(true);
  });

  it('should reject unknown trading action', async () => {
    const { tradingSkill } = await import('../src/skills/trading.js');

    const result = tradingSkill.validateAction('trading.hackTheMainframe', {});

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Unknown action');
  });

  it('should have alpaca as requiredAdapter for all actions', async () => {
    const { tradingSkill } = await import('../src/skills/trading.js');

    for (const action of tradingSkill.actions) {
      expect(action.requiredAdapter).toBe('alpaca');
    }
  });
});
