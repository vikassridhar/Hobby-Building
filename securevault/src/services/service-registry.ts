/**
 * Service Registry
 * Central registry for service profiles — bridges profiles to adapters with decrypted credentials
 */

import type {
  AdapterType,
  ServiceProfile,
  ServiceProfileInput,
  AdapterResult,
  AdapterConfig,
} from '../types/index.js';
import {
  createProfile,
  getProfileById,
  listProfiles,
  updateProfile,
  deleteProfile,
  getDefaultProfile,
  getSecretWithDecryption,
  logAudit,
} from '../storage/vault-storage.js';
import { getAdapter } from '../adapters/index.js';

class ServiceRegistry {
  /**
   * Register a new service profile
   */
  registerProfile(input: ServiceProfileInput): ServiceProfile {
    const profile = createProfile(input);
    logAudit({
      timestamp: new Date().toISOString(),
      action: 'config_changed',
      severity: 'info',
      actor: 'system',
      targetId: profile.id,
      targetType: 'config',
      details: { action: 'profile_created', adapterType: input.adapterType, name: input.name },
      success: true,
    });
    return profile;
  }

  /**
   * Get all profiles, optionally filtered by adapter type
   */
  getAll(adapterType?: AdapterType): ServiceProfile[] {
    return listProfiles({ adapterType });
  }

  /**
   * Get a single profile by ID
   */
  get(profileId: string): ServiceProfile | null {
    return getProfileById(profileId);
  }

  /**
   * Get the default profile for an adapter type
   */
  getDefault(adapterType: AdapterType): ServiceProfile | null {
    return getDefaultProfile(adapterType);
  }

  /**
   * Update a profile
   */
  update(profileId: string, updates: Partial<Pick<ServiceProfile, 'name' | 'config' | 'enabled' | 'isDefault'>>): ServiceProfile | null {
    return updateProfile(profileId, updates);
  }

  /**
   * Delete a profile
   */
  remove(profileId: string): boolean {
    return deleteProfile(profileId);
  }

  /**
   * Set a profile as default for its adapter type
   */
  setDefault(profileId: string): void {
    updateProfile(profileId, { isDefault: true });
  }

  /**
   * Execute an action using a profile's adapter with decrypted credentials
   * This is the main entry point for running adapter actions through the registry
   */
  async executeWithProfile(
    profileId: string,
    action: string,
    payload: Record<string, unknown>,
  ): Promise<AdapterResult> {
    const profile = getProfileById(profileId);
    if (!profile) {
      return { success: false, error: `Profile not found: ${profileId}` };
    }

    if (!profile.enabled) {
      return { success: false, error: `Profile "${profile.name}" is disabled` };
    }

    // Decrypt the secret
    const secretResult = getSecretWithDecryption(profile.secretId);
    if (!secretResult) {
      return { success: false, error: `Failed to decrypt secret for profile "${profile.name}"` };
    }

    // Get the adapter
    const adapter = getAdapter(profile.adapterType);
    if (!adapter) {
      return { success: false, error: `No adapter registered for type: ${profile.adapterType}` };
    }

    // Build adapter config from profile
    const adapterConfig: AdapterConfig = {
      type: profile.adapterType,
      name: profile.name,
      enabled: true,
      credentials: this.parseCredentials(secretResult.plaintext),
      options: {
        ...profile.config,
        tradingMode: profile.config.tradingMode || 'paper',
        maxPositionPercent: profile.config.maxPositionPercent || 25,
      },
    };

    // Validate and execute
    try {
      adapter.validateConfig(adapterConfig);
    } catch (err) {
      return { success: false, error: `Config validation failed: ${err instanceof Error ? err.message : String(err)}` };
    }

    return adapter.execute({
      action,
      payload,
      secretPlaintext: secretResult.plaintext,
    });
  }

  /**
   * Test a profile's connection by executing a safe read-only action
   */
  async testProfile(profileId: string): Promise<AdapterResult> {
    const profile = getProfileById(profileId);
    if (!profile) {
      return { success: false, error: `Profile not found: ${profileId}` };
    }

    // Use a read-only action based on adapter type
    const testActions: Record<string, string> = {
      alpaca: 'getPortfolio',
      stripe: 'getCardBalance',
      ibkr: 'getPortfolio',
      generic_oauth: 'getTokenInfo',
      custom: 'ping',
    };

    const testAction = testActions[profile.adapterType] || 'getPortfolio';
    return this.executeWithProfile(profileId, testAction, {});
  }

  /**
   * Parse secret plaintext into credentials object
   * Supports JSON format: {"apiKey": "...", "secretKey": "..."}
   * Or plain string (used as apiKey)
   */
  private parseCredentials(plaintext: string): Record<string, string> {
    try {
      const parsed = JSON.parse(plaintext);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, string>;
      }
    } catch {
      // Not JSON — treat as single API key
    }

    // Check for key:secret format
    if (plaintext.includes(':')) {
      const [apiKey, secretKey] = plaintext.split(':', 2);
      return { apiKey, secretKey };
    }

    return { apiKey: plaintext };
  }
}

// Singleton
export const serviceRegistry = new ServiceRegistry();
export default serviceRegistry;
