/**
 * Generic OAuth2 Adapter
 * Banking APIs and other OAuth2-protected services
 */

import type {
  ServiceAdapter,
  AdapterConfig,
  AdapterExecuteOptions,
  AdapterResult,
  AdapterType,
} from '../types/index.js';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
}

export class GenericOAuthAdapter implements ServiceAdapter {
  readonly type: AdapterType = 'generic_oauth';
  readonly name = 'Generic OAuth2';

  private clientId: string = '';
  private clientSecret: string = '';
  private tokenUrl: string = '';
  private apiBaseUrl: string = '';
  private accessToken: string = '';
  private refreshToken: string = '';
  private tokenExpiresAt: number = 0;

  validateConfig(config: AdapterConfig): boolean {
    if (!config.credentials.clientId || !config.credentials.clientSecret) {
      throw new Error('OAuth adapter requires clientId and clientSecret');
    }
    if (!config.options?.tokenUrl || !config.options?.apiBaseUrl) {
      throw new Error('OAuth adapter requires options.tokenUrl and options.apiBaseUrl');
    }

    this.clientId = config.credentials.clientId;
    this.clientSecret = config.credentials.clientSecret;
    this.tokenUrl = config.options.tokenUrl as string;
    this.apiBaseUrl = config.options.apiBaseUrl as string;
    this.accessToken = config.credentials.accessToken || '';
    this.refreshToken = config.credentials.refreshToken || '';
    return true;
  }

  async execute(options: AdapterExecuteOptions): Promise<AdapterResult> {
    const { action, payload, secretPlaintext } = options;

    // secretPlaintext can be used as an override access token
    if (secretPlaintext && !secretPlaintext.includes(' ')) {
      this.accessToken = secretPlaintext;
    }

    try {
      // Ensure token is valid before executing
      await this.ensureValidToken();

      switch (action) {
        case 'getBalance':
          return await this.getBalance(payload);
        case 'transfer':
          return await this.transfer(payload);
        case 'getTransactions':
          return await this.getTransactions(payload);
        case 'getAccountInfo':
          return await this.getAccountInfo();
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

  private async ensureValidToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return; // Token still valid (with 1 min buffer)
    }

    if (this.refreshToken) {
      await this.refreshAccessToken();
    } else {
      throw new Error('No valid access token and no refresh token available');
    }
  }

  private async refreshAccessToken(): Promise<void> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = await response.json() as TokenResponse;

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${data.error || response.statusText}`);
    }

    this.accessToken = data.access_token;
    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }
    if (data.expires_in) {
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    }
  }

  private async apiCall(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: Record<string, unknown>): Promise<unknown> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${JSON.stringify(data)}`);
    }

    return data;
  }

  private async getBalance(payload: Record<string, unknown>): Promise<AdapterResult> {
    const accountId = payload.accountId as string;
    const endpoint = accountId ? `/accounts/${accountId}/balance` : '/accounts/balance';

    const data = await this.apiCall(endpoint);

    return {
      success: true,
      data,
      rawResponse: JSON.stringify(data),
    };
  }

  private async transfer(payload: Record<string, unknown>): Promise<AdapterResult> {
    const toAccount = payload.toAccount as string;
    const amount = payload.amount as number;
    const currency = payload.currency as string;
    const reference = payload.reference as string;

    if (!toAccount || !amount || !currency) {
      return { success: false, error: 'toAccount, amount, and currency are required' };
    }

    const data = await this.apiCall('/transfers', 'POST', {
      to_account: toAccount,
      amount,
      currency,
      reference,
    });

    return {
      success: true,
      data,
      rawResponse: JSON.stringify(data),
    };
  }

  private async getTransactions(payload: Record<string, unknown>): Promise<AdapterResult> {
    const accountId = payload.accountId as string;
    const limit = payload.limit as number || 50;
    const fromDate = payload.fromDate as string;
    const toDate = payload.toDate as string;

    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);

    const endpoint = accountId
      ? `/accounts/${accountId}/transactions?${params.toString()}`
      : `/transactions?${params.toString()}`;

    const data = await this.apiCall(endpoint);

    return {
      success: true,
      data,
      rawResponse: JSON.stringify(data),
    };
  }

  private async getAccountInfo(): Promise<AdapterResult> {
    const data = await this.apiCall('/accounts');

    return {
      success: true,
      data,
      rawResponse: JSON.stringify(data),
    };
  }
}

export default new GenericOAuthAdapter();
