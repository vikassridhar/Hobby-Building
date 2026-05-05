/**
 * Alpaca Markets Trading Adapter
 * Paper and live trading via Alpaca REST API
 * Supports: executeTrade, getPortfolio, getOrderHistory, cancelOrder, getMarketData
 */

import type {
  ServiceAdapter,
  AdapterConfig,
  AdapterExecuteOptions,
  AdapterResult,
  AdapterType,
} from '../types/index.js';

// ─── Alpaca API Types ───

interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  buying_power: string;
  shorting_enabled: boolean;
  pattern_day_trader: boolean;
  trade_suspended_by_user: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
}

interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  avg_entry_price: string;
  qty: string;
  qty_available: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  replaced_at: string | null;
  replaced_by: string | null;
  replaces: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  qty: string;
  filled_qty: string;
  filled_avg_price: string | null;
  order_class: string;
  order_type: string;
  type: string;
  side: string;
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  status: string;
  extended_hours: boolean;
  legs: AlpacaOrder[] | null;
  trail_percent: string | null;
  trail_price: string | null;
  hwm: string | null;
}

interface AlpacaQuote {
  symbol: string;
  ask_exchange: string;
  ask_price: string;
  ask_size: number;
  bid_exchange: string;
  bid_price: string;
  bid_size: number;
  timestamp: string;
}

interface AlpacaErrorBody {
  code: number;
  message: string;
}

// ─── Adapter Implementation ───

export class AlpacaAdapter implements ServiceAdapter {
  readonly type: AdapterType = 'alpaca';
  readonly name = 'Alpaca Markets';

  private apiKey: string = '';
  private secretKey: string = '';
  private tradingMode: 'paper' | 'live' = 'paper';
  private maxPositionPercent: number = 25;

  private get tradingBaseUrl(): string {
    return this.tradingMode === 'live'
      ? 'https://api.alpaca.markets'
      : 'https://paper-api.alpaca.markets';
  }

  private get dataBaseUrl(): string {
    return 'https://data.alpaca.markets';
  }

  private get headers(): Record<string, string> {
    return {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.secretKey,
      'Content-Type': 'application/json',
    };
  }

  validateConfig(config: AdapterConfig): boolean {
    if (!config.credentials.apiKey || !config.credentials.secretKey) {
      throw new Error('Alpaca adapter requires credentials.apiKey and credentials.secretKey');
    }
    this.apiKey = config.credentials.apiKey;
    this.secretKey = config.credentials.secretKey;
    this.tradingMode = (config.options?.tradingMode as 'paper' | 'live') || 'paper';
    this.maxPositionPercent = (config.options?.maxPositionPercent as number) || 25;
    return true;
  }

  async execute(options: AdapterExecuteOptions): Promise<AdapterResult> {
    // secretPlaintext is JSON with { apiKey, secretKey } or the vault holds the API key
    // and the secretKey comes from adapter config credentials
    const { action, payload } = options;

    try {
      switch (action) {
        case 'executeTrade':
          return await this.executeTrade(payload);
        case 'getPortfolio':
          return await this.getPortfolio();
        case 'getOrderHistory':
          return await this.getOrderHistory(payload);
        case 'cancelOrder':
          return await this.cancelOrder(payload);
        case 'getMarketData':
          return await this.getMarketData(payload);
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        rawResponse: err instanceof Error ? err.stack : String(err),
      };
    }
  }

  // ─── Trading Actions ───

  private async executeTrade(payload: Record<string, unknown>): Promise<AdapterResult> {
    const symbol = payload.symbol as string;
    const side = (payload.side as string)?.toUpperCase();
    const qty = payload.quantity as number;
    const orderType = (payload.orderType as string)?.toUpperCase() || 'MKT';
    const limitPrice = payload.price as number | undefined;
    const tif = (payload.tif as string)?.toUpperCase() || 'DAY';

    // Validate required params
    if (!symbol) return { success: false, error: 'symbol is required' };
    if (!side || !['BUY', 'SELL'].includes(side)) {
      return { success: false, error: 'side must be BUY or SELL' };
    }
    if (!qty || qty <= 0) return { success: false, error: 'quantity must be > 0' };
    if (!['MKT', 'LMT', 'STP', 'STOP_LIMIT'].includes(orderType)) {
      return { success: false, error: `Invalid orderType: ${orderType}` };
    }
    if ((orderType === 'LMT' || orderType === 'STOP_LIMIT') && !limitPrice) {
      return { success: false, error: 'price is required for limit orders' };
    }

    // Position sizing validation (for BUY orders)
    if (side === 'BUY') {
      const sizingCheck = await this.validatePositionSizing(symbol, qty, orderType === 'LMT' || orderType === 'STOP_LIMIT' ? limitPrice! : undefined);
      if (!sizingCheck.ok) {
        return { success: false, error: sizingCheck.reason };
      }
    }

    // Build order payload
    const orderPayload: Record<string, unknown> = {
      symbol: symbol.toUpperCase(),
      side: side.toLowerCase(),
      qty: Math.floor(qty).toString(),
      type: orderType === 'MKT' ? 'market' : orderType === 'LMT' ? 'limit' : orderType === 'STP' ? 'stop' : 'stop_limit',
      time_in_force: tif.toLowerCase(),
    };

    if (limitPrice !== undefined) {
      if (orderType === 'LMT' || orderType === 'STOP_LIMIT') {
        orderPayload.limit_price = limitPrice.toString();
      }
      if (orderType === 'STP' || orderType === 'STOP_LIMIT') {
        orderPayload.stop_price = limitPrice.toString();
      }
    }

    const response = await fetch(`${this.tradingBaseUrl}/v2/orders`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(orderPayload),
    });

    const data = await response.json() as AlpacaOrder | AlpacaErrorBody;

    if (!response.ok) {
      const errMsg = this.extractErrorMessage(data, response.status);
      return {
        success: false,
        error: errMsg,
        rawResponse: JSON.stringify(data),
      };
    }

    const order = data as AlpacaOrder;
    return {
      success: true,
      data: this.formatOrder(order),
      rawResponse: JSON.stringify(order),
    };
  }

  private async getPortfolio(): Promise<AdapterResult> {
    // Fetch account and positions in parallel
    const [accountRes, positionsRes] = await Promise.all([
      fetch(`${this.tradingBaseUrl}/v2/account`, { headers: this.headers }),
      fetch(`${this.tradingBaseUrl}/v2/positions`, { headers: this.headers }),
    ]);

    if (!accountRes.ok) {
      const errBody = await accountRes.json().catch(() => ({ message: `HTTP ${accountRes.status}` })) as AlpacaErrorBody;
      return { success: false, error: this.extractErrorMessage(errBody, accountRes.status), rawResponse: JSON.stringify(errBody) };
    }

    const account = await accountRes.json() as AlpacaAccount;
    const positions = positionsRes.ok ? await positionsRes.json() as AlpacaPosition[] : [];

    // Calculate allocation percentages
    const totalValue = parseFloat(account.portfolio_value);
    const positionsWithAllocation = positions.map((pos) => ({
      symbol: pos.symbol,
      qty: parseFloat(pos.qty),
      side: pos.side,
      avgEntryPrice: parseFloat(pos.avg_entry_price),
      currentPrice: parseFloat(pos.current_price),
      marketValue: parseFloat(pos.market_value),
      unrealizedPL: parseFloat(pos.unrealized_pl),
      unrealizedPLPercent: parseFloat(pos.unrealized_plpc),
      allocationPercent: totalValue > 0 ? (parseFloat(pos.market_value) / totalValue * 100) : 0,
    }));

    return {
      success: true,
      data: {
        account: {
          id: account.id,
          status: account.status,
          currency: account.currency,
          cash: parseFloat(account.cash),
          portfolioValue: parseFloat(account.portfolio_value),
          equity: parseFloat(account.equity),
          buyingPower: parseFloat(account.buying_power),
          patternDayTrader: account.pattern_day_trader,
          tradingBlocked: account.trading_blocked,
        },
        positions: positionsWithAllocation,
        positionCount: positionsWithAllocation.length,
        totalAllocation: positionsWithAllocation.reduce((sum, p) => sum + p.allocationPercent, 0),
      },
    };
  }

  private async getOrderHistory(payload: Record<string, unknown>): Promise<AdapterResult> {
    const status = (payload.status as string) || 'all';
    const limit = Math.min((payload.limit as number) || 50, 500);
    const direction = (payload.direction as string) || 'desc';

    const params = new URLSearchParams({
      status,
      limit: limit.toString(),
      direction,
      nested: 'true',
    });

    const after = payload.after as string;
    const until = payload.until as string;
    if (after) params.set('after', after);
    if (until) params.set('until', until);

    const response = await fetch(`${this.tradingBaseUrl}/v2/orders?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({ message: `HTTP ${response.status}` })) as AlpacaErrorBody;
      return { success: false, error: this.extractErrorMessage(errBody, response.status) };
    }

    const orders = await response.json() as AlpacaOrder[];

    return {
      success: true,
      data: {
        orders: orders.map((o) => this.formatOrder(o)),
        count: orders.length,
      },
    };
  }

  private async cancelOrder(payload: Record<string, unknown>): Promise<AdapterResult> {
    const orderId = payload.orderId as string;
    if (!orderId) return { success: false, error: 'orderId is required' };

    const response = await fetch(`${this.tradingBaseUrl}/v2/orders/${orderId}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    // 204 means successfully cancelled
    if (response.status === 204) {
      return { success: true, data: { orderId, status: 'cancelled' } };
    }

    // 404 means order already gone
    if (response.status === 404) {
      return { success: false, error: 'Order not found or already filled/cancelled' };
    }

    const errBody = await response.json().catch(() => ({ message: `HTTP ${response.status}` })) as AlpacaErrorBody;
    return { success: false, error: this.extractErrorMessage(errBody, response.status), rawResponse: JSON.stringify(errBody) };
  }

  private async getMarketData(payload: Record<string, unknown>): Promise<AdapterResult> {
    const symbol = payload.symbol as string;
    const feed = (payload.feed as string) || 'iex';

    if (!symbol) return { success: false, error: 'symbol is required' };

    const params = new URLSearchParams({
      symbols: symbol.toUpperCase(),
      feed,
    });

    const response = await fetch(`${this.dataBaseUrl}/v2/stocks/quotes/latest?${params}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({ message: `HTTP ${response.status}` })) as AlpacaErrorBody;
      return { success: false, error: this.extractErrorMessage(errBody, response.status) };
    }

    const data = await response.json() as { quotes: Record<string, AlpacaQuote> };
    const quote = data.quotes[symbol.toUpperCase()];

    if (!quote) {
      return { success: false, error: `No quote data for ${symbol}` };
    }

    return {
      success: true,
      data: {
        symbol: quote.symbol,
        bidPrice: parseFloat(quote.bid_price),
        bidSize: quote.bid_size,
        askPrice: parseFloat(quote.ask_price),
        askSize: quote.ask_size,
        spread: parseFloat(quote.ask_price) - parseFloat(quote.bid_price),
        midPrice: (parseFloat(quote.ask_price) + parseFloat(quote.bid_price)) / 2,
        timestamp: quote.timestamp,
      },
    };
  }

  // ─── Helpers ───

  private async validatePositionSizing(
    symbol: string,
    qty: number,
    limitPrice?: number
  ): Promise<{ ok: boolean; reason?: string }> {
    // Get current portfolio
    const accountRes = await fetch(`${this.tradingBaseUrl}/v2/account`, { headers: this.headers });
    if (!accountRes.ok) {
      return { ok: true }; // If we can't check, allow the trade — Alpaca will reject if needed
    }
    const account = await accountRes.json() as AlpacaAccount;
    const portfolioValue = parseFloat(account.portfolio_value);

    // Get current price for market orders
    let estimatedCost: number;
    if (limitPrice) {
      estimatedCost = qty * limitPrice;
    } else {
      // Try to get latest quote
      const quoteRes = await fetch(
        `${this.dataBaseUrl}/v2/stocks/quotes/latest?symbols=${symbol.toUpperCase()}&feed=iex`,
        { headers: this.headers }
      );
      if (!quoteRes.ok) {
        return { ok: true }; // Can't verify, let it through
      }
      const quoteData = await quoteRes.json() as { quotes: Record<string, AlpacaQuote> };
      const quote = quoteData.quotes[symbol.toUpperCase()];
      if (!quote) return { ok: true };
      const midPrice = (parseFloat(quote.ask_price) + parseFloat(quote.bid_price)) / 2;
      estimatedCost = qty * midPrice;
    }

    const costPercent = (estimatedCost / portfolioValue) * 100;

    // Check existing position
    let existingAllocation = 0;
    try {
      const posRes = await fetch(`${this.tradingBaseUrl}/v2/positions/${symbol.toUpperCase()}`, { headers: this.headers });
      if (posRes.ok) {
        const pos = await posRes.json() as AlpacaPosition;
        existingAllocation = (parseFloat(pos.market_value) / portfolioValue) * 100;
      }
    } catch {
      // No existing position
    }

    const totalAllocation = existingAllocation + costPercent;
    if (totalAllocation > this.maxPositionPercent) {
      return {
        ok: false,
        reason: `Trade would result in ${totalAllocation.toFixed(1)}% allocation for ${symbol} (max: ${this.maxPositionPercent}%). ` +
          `Existing: ${existingAllocation.toFixed(1)}%, New: ${costPercent.toFixed(1)}%`,
      };
    }

    return { ok: true };
  }

  private extractErrorMessage(body: unknown, statusCode: number): string {
    const err = body as Partial<AlpacaErrorBody>;
    if (err.message) {
      // Map common Alpaca error codes
      if (err.message.includes('insufficient')) return 'Insufficient funds for this trade';
      if (err.message.includes('is not valid') || err.message.includes('not found')) return `Invalid symbol or parameter: ${err.message}`;
      if (err.message.includes('market is not open')) return 'Market is currently closed';
      if (err.message.includes('rate limit') || statusCode === 429) return 'Alpaca API rate limit exceeded — please retry in a few seconds';
      return err.message;
    }
    return `Alpaca API error: HTTP ${statusCode}`;
  }

  private formatOrder(order: AlpacaOrder): Record<string, unknown> {
    return {
      id: order.id,
      clientOrderId: order.client_order_id,
      symbol: order.symbol,
      side: order.side,
      qty: parseFloat(order.qty),
      filledQty: parseFloat(order.filled_qty),
      filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
      type: order.type,
      orderClass: order.order_class,
      timeInForce: order.time_in_force,
      limitPrice: order.limit_price ? parseFloat(order.limit_price) : null,
      stopPrice: order.stop_price ? parseFloat(order.stop_price) : null,
      status: order.status,
      createdAt: order.created_at,
      submittedAt: order.submitted_at,
      filledAt: order.filled_at,
      extendedHours: order.extended_hours,
    };
  }
}

// AlpacaAdapter is exported as a named export from the class declaration
