/**
 * Interactive Brokers (IBKR) Adapter
 * Stock trading via IBKR Client Portal API
 */

import type {
  ServiceAdapter,
  AdapterConfig,
  AdapterExecuteOptions,
  AdapterResult,
  AdapterType,
} from '../types/index.js';

interface IBKRResponse {
  error?: string;
  order_id?: string;
  order_status?: string;
  conid?: number;
  [key: string]: unknown;
}

export class InteractiveBrokersAdapter implements ServiceAdapter {
  readonly type: AdapterType = 'ibkr';
  readonly name = 'Interactive Brokers';

  private baseUrl: string = 'https://localhost:5000/v1/api';
  private accountId: string = '';

  validateConfig(config: AdapterConfig): boolean {
    this.baseUrl = (config.options?.baseUrl as string) || this.baseUrl;
    this.accountId = config.credentials.accountId || '';
    return true;
  }

  async execute(options: AdapterExecuteOptions): Promise<AdapterResult> {
    const { action, payload } = options;

    try {
      switch (action) {
        case 'executeTrade':
          return await this.executeTrade(payload);
        case 'getPortfolio':
          return await this.getPortfolio();
        case 'getPositions':
          return await this.getPositions();
        case 'getAccountSummary':
          return await this.getAccountSummary();
        case 'cancelOrder':
          return await this.cancelOrder(payload);
        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
          };
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        rawResponse: JSON.stringify(err),
      };
    }
  }

  private async executeTrade(payload: Record<string, unknown>): Promise<AdapterResult> {
    const symbol = payload.symbol as string;
    const side = payload.side as 'BUY' | 'SELL';
    const quantity = payload.quantity as number;
    const orderType = (payload.orderType as string) || 'MKT';
    const price = payload.price as number | undefined;
    const tif = (payload.tif as string) || 'DAY';

    if (!symbol || !side || !quantity) {
      return { success: false, error: 'symbol, side, and quantity are required' };
    }

    const orderBody: Record<string, unknown> = {
      acctId: this.accountId,
      conid: await this.resolveConid(symbol),
      orderType,
      side,
      quantity,
      tif,
      ...(price && orderType !== 'MKT' ? { price } : {}),
    };

    const response = await fetch(`${this.baseUrl}/iserver/account/${this.accountId}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: [orderBody] }),
    });

    const data = await response.json() as IBKRResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `IBKR error: ${response.status}`,
        rawResponse: JSON.stringify(data),
      };
    }

    return {
      success: true,
      data: {
        orderId: data.order_id,
        status: data.order_status,
        symbol,
        side,
        quantity,
      },
      rawResponse: JSON.stringify(data),
    };
  }

  private async getPortfolio(): Promise<AdapterResult> {
    const response = await fetch(`${this.baseUrl}/portfolio/${this.accountId}/summary`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json() as IBKRResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `IBKR error: ${response.status}`,
        rawResponse: JSON.stringify(data),
      };
    }

    return {
      success: true,
      data: { accountId: this.accountId, summary: data },
      rawResponse: JSON.stringify(data),
    };
  }

  private async getPositions(): Promise<AdapterResult> {
    const response = await fetch(`${this.baseUrl}/portfolio/${this.accountId}/positions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json() as IBKRResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `IBKR error: ${response.status}`,
        rawResponse: JSON.stringify(data),
      };
    }

    return {
      success: true,
      data: { positions: data },
      rawResponse: JSON.stringify(data),
    };
  }

  private async getAccountSummary(): Promise<AdapterResult> {
    const response = await fetch(`${this.baseUrl}/portfolio/accounts`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json() as IBKRResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `IBKR error: ${response.status}`,
        rawResponse: JSON.stringify(data),
      };
    }

    return {
      success: true,
      data: { accounts: data },
      rawResponse: JSON.stringify(data),
    };
  }

  private async cancelOrder(payload: Record<string, unknown>): Promise<AdapterResult> {
    const orderId = payload.orderId as string;
    if (!orderId) {
      return { success: false, error: 'orderId is required' };
    }

    const response = await fetch(`${this.baseUrl}/iserver/account/${this.accountId}/order/${orderId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json() as IBKRResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `IBKR error: ${response.status}`,
        rawResponse: JSON.stringify(data),
      };
    }

    return {
      success: true,
      data: { orderId, cancelled: true },
      rawResponse: JSON.stringify(data),
    };
  }

  private async resolveConid(symbol: string): Promise<number> {
    const response = await fetch(`${this.baseUrl}/iserver/secdef/search?symbol=${encodeURIComponent(symbol)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json() as Array<{ conid?: number }>;

    if (!response.ok || !Array.isArray(data) || data.length === 0) {
      throw new Error(`Could not resolve conid for symbol: ${symbol}`);
    }

    return data[0].conid ?? 0;
  }
}

export default new InteractiveBrokersAdapter();
