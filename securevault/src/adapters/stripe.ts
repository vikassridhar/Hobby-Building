/**
 * Stripe Adapter
 * Card payments via Stripe API
 */

import type {
  ServiceAdapter,
  AdapterConfig,
  AdapterExecuteOptions,
  AdapterResult,
  AdapterType,
} from '../types/index.js';

interface StripeResponse {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  client_secret?: string;
  balance?: number;
  email?: string;
  error?: { message?: string; type?: string };
  [key: string]: unknown;
}

export class StripeAdapter implements ServiceAdapter {
  readonly type: AdapterType = 'stripe';
  readonly name = 'Stripe';

  private apiKey: string = '';
  private apiVersion: string = '2024-06-20';
  private baseUrl: string = 'https://api.stripe.com/v1';

  validateConfig(config: AdapterConfig): boolean {
    if (!config.credentials.apiKey) {
      throw new Error('Stripe adapter requires credentials.apiKey');
    }
    this.apiKey = config.credentials.apiKey;
    this.apiVersion = (config.options?.apiVersion as string) || this.apiVersion;
    this.baseUrl = (config.options?.baseUrl as string) || this.baseUrl;
    return true;
  }

  async execute(options: AdapterExecuteOptions): Promise<AdapterResult> {
    const { action, payload, secretPlaintext } = options;

    try {
      switch (action) {
        case 'payWithCard':
          return await this.payWithCard(payload, secretPlaintext);
        case 'getCardBalance':
          return await this.getCardBalance(payload, secretPlaintext);
        case 'createCustomer':
          return await this.createCustomer(payload);
        case 'refundCharge':
          return await this.refundCharge(payload);
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

  private async payWithCard(
    payload: Record<string, unknown>,
    secretPlaintext: string
  ): Promise<AdapterResult> {
    const amount = payload.amount as number;
    const currency = (payload.currency as string) || 'usd';
    const description = payload.description as string;

    if (!amount || amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }

    const paymentMethod = secretPlaintext;

    const body = new URLSearchParams({
      amount: Math.round(amount * 100).toString(),
      currency: currency.toLowerCase(),
      'payment_method': paymentMethod,
      confirm: 'true',
      ...(description ? { description } : {}),
    });

    const response = await fetch(`${this.baseUrl}/payment_intents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': this.apiVersion,
      },
      body,
    });

    const data = await response.json() as StripeResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `Stripe error: ${response.status}`,
        rawResponse: JSON.stringify(data),
      };
    }

    return {
      success: true,
      data: {
        paymentIntentId: data.id,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        clientSecret: data.client_secret,
      },
      rawResponse: JSON.stringify(data),
    };
  }

  private async getCardBalance(
    _payload: Record<string, unknown>,
    secretPlaintext: string
  ): Promise<AdapterResult> {
    const customerId = secretPlaintext;

    const response = await fetch(`${this.baseUrl}/customers/${customerId}/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Stripe-Version': this.apiVersion,
      },
    });

    const data = await response.json() as StripeResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `Stripe error: ${response.status}`,
        rawResponse: JSON.stringify(data),
      };
    }

    return {
      success: true,
      data: {
        balance: data.balance,
        currency: data.currency,
      },
      rawResponse: JSON.stringify(data),
    };
  }

  private async createCustomer(payload: Record<string, unknown>): Promise<AdapterResult> {
    const email = payload.email as string;
    const name = payload.name as string;

    const body = new URLSearchParams({
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
    });

    const response = await fetch(`${this.baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': this.apiVersion,
      },
      body,
    });

    const data = await response.json() as StripeResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `Stripe error: ${response.status}`,
        rawResponse: JSON.stringify(data),
      };
    }

    return {
      success: true,
      data: { customerId: data.id, email: data.email },
      rawResponse: JSON.stringify(data),
    };
  }

  private async refundCharge(payload: Record<string, unknown>): Promise<AdapterResult> {
    const chargeId = payload.chargeId as string;
    const amount = payload.amount as number;

    if (!chargeId) {
      return { success: false, error: 'chargeId is required' };
    }

    const body = new URLSearchParams({
      charge: chargeId,
      ...(amount ? { amount: Math.round(amount * 100).toString() } : {}),
    });

    const response = await fetch(`${this.baseUrl}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': this.apiVersion,
      },
      body,
    });

    const data = await response.json() as StripeResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `Stripe error: ${response.status}`,
        rawResponse: JSON.stringify(data),
      };
    }

    return {
      success: true,
      data: { refundId: data.id, status: data.status, amount: data.amount },
      rawResponse: JSON.stringify(data),
    };
  }
}

export default new StripeAdapter();
