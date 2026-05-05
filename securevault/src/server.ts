/**
 * SecureVault Entry Point
 * Loads config, starts server and Telegram bot
 */

import 'dotenv/config';
import { startServer } from './server/fastify-server.js';
import { startBot } from './bot/telegram-bot.js';
import type { VaultConfig } from './types/index.js';

function loadConfig(): VaultConfig {
  const required = ['VAULT_MASTER_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_USER_ID', 'SECUREVAULT_AGENT_TOKEN'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    masterKey: process.env.VAULT_MASTER_KEY!,
    dbPath: process.env.VAULT_DB_PATH || './data/vault.db',
    auditLogPath: process.env.AUDIT_LOG_PATH || './data/audit.log',
    gatewayPort: parseInt(process.env.GATEWAY_PORT || '8443', 10),
    gatewayHost: process.env.GATEWAY_HOST || '0.0.0.0',
    tlsCertPath: process.env.TLS_CERT_PATH || '',
    tlsKeyPath: process.env.TLS_KEY_PATH || '',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN!,
    telegramUserId: process.env.TELEGRAM_USER_ID!,
    agentToken: process.env.SECUREVAULT_AGENT_TOKEN!,
    autoExecuteEnabled: process.env.AUTO_EXECUTE_ENABLED === 'true',
    autoExecuteMaxAmount: parseInt(process.env.AUTO_EXECUTE_MAX_AMOUNT || '100', 10),
    autoExecuteCurrency: process.env.AUTO_EXECUTE_CURRENCY || 'USD',
    riskTimezone: process.env.RISK_TIMEZONE || 'UTC',
    tradingMode: (process.env.TRADING_MODE as 'paper' | 'live') || 'paper',
    tradeApprovalThreshold: parseInt(process.env.TRADE_APPROVAL_THRESHOLD || '100', 10),
    tradeMaxPositionPercent: parseInt(process.env.TRADE_MAX_POSITION_PERCENT || '25', 10),
  };
}

async function main(): Promise<void> {
  const config = loadConfig();

  // Ensure data directory exists
  const { mkdirSync } = await import('fs');
  const { dirname } = await import('path');
  try {
    mkdirSync(dirname(config.dbPath), { recursive: true });
  } catch {
    // ignore
  }

  // Start server and bot in parallel
  await Promise.all([startServer(config), startBot(config)]);

  console.log('SecureVault is running');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
