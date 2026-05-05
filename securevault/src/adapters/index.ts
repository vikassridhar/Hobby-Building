/**
 * Adapter Registry
 * Central registry for all service adapters
 */

import type { ServiceAdapter, AdapterType, AdapterConfig, AdapterExecuteOptions, AdapterResult } from '../types/index.js';
import stripeAdapter from './stripe.js';
import ibkrAdapter from './interactive_brokers.js';
import oauthAdapter from './generic_oauth.js';
import { AlpacaAdapter } from './alpaca.js';

// Singleton instances for non-profile adapters
const alpacaInstance = new AlpacaAdapter();

const adapters = new Map<AdapterType, ServiceAdapter>([
  ['stripe', stripeAdapter],
  ['ibkr', ibkrAdapter],
  ['generic_oauth', oauthAdapter],
  ['alpaca', alpacaInstance],
]);

export function registerAdapter(adapter: ServiceAdapter): void {
  adapters.set(adapter.type, adapter);
}

export function getAdapter(type: AdapterType): ServiceAdapter | undefined {
  return adapters.get(type);
}

export function listAdapters(): ServiceAdapter[] {
  return Array.from(adapters.values());
}

export function getAdapterTypes(): AdapterType[] {
  return Array.from(adapters.keys());
}

export async function executeWithAdapter(
  type: AdapterType,
  config: AdapterConfig,
  options: AdapterExecuteOptions
): Promise<AdapterResult> {
  const adapter = getAdapter(type);
  if (!adapter) {
    return {
      success: false,
      error: `No adapter registered for type: ${type}`,
    };
  }

  adapter.validateConfig(config);
  return adapter.execute(options);
}

export default {
  registerAdapter,
  getAdapter,
  listAdapters,
  getAdapterTypes,
  executeWithAdapter,
};
