/**
 * Telegram Approval Bot
 * Handles approval requests, callback buttons, and state management
 */

import { Telegraf, Markup } from 'telegraf';
import type { Context } from 'telegraf';
import type { VaultConfig, ApprovalRequest, Task } from '../types/index.js';
import {
  getApprovalById,
  updateApprovalStatus,
  updateApprovalMessage,
  updateTaskStatus,
  getTaskById,
  logAudit,
} from '../storage/vault-storage.js';

let bot: Telegraf<Context> | null = null;
const pendingCallbacks = new Map<string, { messageId: number; chatId: number }>();

// ─── Wizard state for guided flows ───
const wizardState = new Map<string, Record<string, any>>();

// Telegraf keyboard helper (bypasses strict HideableKBtn typing)
function kb(buttons: string[][], opts?: { one_time_keyboard?: boolean }): any {
  return Markup.keyboard(buttons as any, opts as any).resize();
}

/** Escape text for Telegram HTML parse_mode */
function htmlEscape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function userId(ctx: Context): string {
  return ctx.from?.id.toString() || 'unknown';
}

function isAuthorized(ctx: Context, config: VaultConfig): boolean {
  const uid = ctx.from?.id.toString();
  if (config.telegramUserId && uid !== config.telegramUserId) {
    ctx.reply('⛔ Unauthorized');
    return false;
  }
  return true;
}

async function findAlpacaSecret(): Promise<{ config: any; plaintext: string } | null> {
  const { listSecrets, getSecretWithDecryption } = await import('../storage/vault-storage.js');
  const secrets = listSecrets({ category: 'api_key', limit: 100 });
  const match = secrets.data.find((s: any) =>
    s.name?.toLowerCase().includes('alpaca') ||
    s.metadata?.issuer?.toLowerCase().includes('alpaca') ||
    s.metadata?.tags?.some((t: string) => t.toLowerCase() === 'alpaca')
  );
  if (!match) return null;
  const decrypted = getSecretWithDecryption(match.id);
  if (!decrypted) return null;
  return {
    config: { type: 'alpaca', name: 'Alpaca', enabled: true, credentials: { apiKey: decrypted.plaintext, secretKey: decrypted.plaintext }, options: { tradingMode: 'paper' } },
    plaintext: decrypted.plaintext,
  };
}

async function executeTradeCommand(ctx: Context, config: VaultConfig, symbol: string, qty: number, side: string): Promise<void> {
  try {
    const alpaca = await findAlpacaSecret();
    if (!alpaca) { await ctx.reply('⚠️ No Alpaca credentials in vault. Use /addsecret first.'); return; }

    // Get quote for cost estimate
    const { executeWithAdapter } = await import('../adapters/index.js');
    const quoteResult = await executeWithAdapter('alpaca', alpaca.config, {
      action: 'getMarketData', payload: { symbol }, secretPlaintext: alpaca.plaintext,
    });
    let estimatedCost = 'N/A';
    if (quoteResult.success && quoteResult.data) {
      const q = quoteResult.data as any;
      estimatedCost = '$' + (q.midPrice * qty).toFixed(2);
    }

    const { createTask, assessRisk, createApprovalRequest } = await import('../utils/task-utils.js');
    const task = createTask({
      type: 'trade', priority: side === 'SELL' ? 'high' : 'normal',
      description: `${side} ${qty} ${symbol}`,
      secretId: 'alpaca-trade',
      parameters: { symbol, side, quantity: qty, orderType: 'MKT', tif: 'DAY', estimatedCost },
      requestedBy: 'telegram',
    });

    const risk = assessRisk(task, config);
    // SELL always requires approval
    if (side === 'SELL' && risk.recommendation === 'auto_approve') {
      risk.recommendation = 'request_approval';
      risk.reason = 'SELL orders always require manual approval';
    }
    const approval = await createApprovalRequest(task, risk, config);

    const sideEmoji = side === 'BUY' ? '🟢' : '🔴';
    const msg = `${sideEmoji} *Trade ${approval.autoApproved ? 'Auto-Approved' : 'Pending Approval'}*\n\n` +
      `${side} ${qty} ${symbol}\nEst. Cost: ${estimatedCost}\nRisk: ${risk.score}/100\n` +
      (approval.autoApproved ? '' : '\n⏳ Awaiting your approval...');
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (err) {
    await ctx.reply('❌ Trade failed: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Initialize and return the Telegram bot instance
 */
export function initBot(config: VaultConfig): Telegraf<Context> {
  if (!config.telegramBotToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }

  bot = new Telegraf(config.telegramBotToken);

  // Start command — verify user
  bot.command('start', async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (config.telegramUserId && userId !== config.telegramUserId) {
      await ctx.reply('⛔ Unauthorized. This bot is private.');
      logAudit({
        timestamp: new Date().toISOString(),
        action: 'auth_failure',
        severity: 'warning',
        actor: userId || 'unknown',
        details: { reason: 'unauthorized_telegram_start' },
        success: false,
      });
      return;
    }

    await ctx.reply(
      '🔐 *SecureVault Approval Bot*\n\n' +
      'You will receive approval requests here.\n' +
      'Use /pending to see current requests.',
      { parse_mode: 'Markdown' }
    );
  });

  // List pending approvals
  bot.command('pending', async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (config.telegramUserId && userId !== config.telegramUserId) {
      await ctx.reply('⛔ Unauthorized');
      return;
    }

    const { listPendingApprovals } = await import('../storage/vault-storage.js');
    const pending = listPendingApprovals();

    if (pending.length === 0) {
      await ctx.reply('✅ No pending approval requests.');
      return;
    }

    for (const approval of pending.slice(0, 5)) {
      await sendApprovalPrompt(ctx.chat.id, approval);
    }
  });

  // Portfolio snapshot command
  bot.command('portfolio', async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (config.telegramUserId && userId !== config.telegramUserId) {
      await ctx.reply('⛔ Unauthorized');
      return;
    }
    await handlePortfolioRequest(ctx.chat.id);
  });

  // View Portfolio button callback (from trade approval messages)
  bot.action(/view_portfolio:(.+)/, async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (config.telegramUserId && userId !== config.telegramUserId) {
      await ctx.answerCbQuery('⛔ Unauthorized');
      return;
    }
    await ctx.answerCbQuery('📊 Loading portfolio...');
    await handlePortfolioRequest(ctx.chat?.id || parseInt(config.telegramUserId));
  });

  // ─── Setup & Secret Commands ───

  bot.command('setup', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    await ctx.reply(
      '🛠 *Setup Wizard*\n\nLet\'s add your first secret.\nWhat type of secret?',
      {
        parse_mode: 'Markdown',
        ...kb([['🔑 API Key', '💳 Credit Card'], ['🏦 Bank Account', '📈 Trading Account'], ['❌ Cancel']], { one_time_keyboard: true }),
      }
    );
    wizardState.set(userId(ctx), { step: 'setup_type' });
  });

  bot.command('addsecret', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    await ctx.reply(
      '🔒 *Add Secret*\n\nSelect the type:',
      {
        parse_mode: 'Markdown',
        ...kb([['🔑 API Key', '💳 Credit Card'], ['🏦 Bank Account', '📈 Trading Account'], ['❌ Cancel']], { one_time_keyboard: true }),
      }
    );
    wizardState.set(userId(ctx), { step: 'secret_type' });
  });

  bot.command('listsecrets', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    const { listSecrets } = await import('../storage/vault-storage.js');
    const result = listSecrets({ limit: 50 });
    if (result.data.length === 0) {
      await ctx.reply('📭 No secrets stored yet. Use /addsecret to add one.');
      return;
    }
    const lines = result.data.map((s: any) => {
      const last4 = s.metadata?.lastFour || '••••';
      const statusIcon = s.status === 'active' ? '✅' : '❌';
      return `${statusIcon} \`${s.id.slice(0, 8)}…\` ${s.category} — ${s.name} (${last4})`;
    });
    await ctx.reply('🔐 *Stored Secrets:*\n\n' + lines.join('\n'), { parse_mode: 'Markdown' });
  });

  bot.command('deletesecret', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    const parts = ctx.message.text.split(' ');
    const secretId = parts[1];
    if (!secretId) {
      await ctx.reply('Usage: /deletesecret <id>\nUse /listsecrets to find the ID.');
      return;
    }
    wizardState.set(userId(ctx), { step: 'delete_confirm', secretId });
    await ctx.reply(
      '⚠️ Are you sure you want to delete this secret? This cannot be undone.\nType DELETE to confirm, or /cancel to abort.',
      kb([['DELETE', '/cancel']], { one_time_keyboard: true })
    );
  });

  // ─── Config Commands ───

  bot.command('setthreshold', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    const parts = ctx.message.text.split(' ');
    const amount = parseFloat(parts[1]);
    if (isNaN(amount) || amount < 0) {
      await ctx.reply('Usage: /setthreshold <amount>\nExample: /setthreshold 250');
      return;
    }
    config.tradeApprovalThreshold = amount;
    logAudit({
      timestamp: new Date().toISOString(), action: 'config_changed', severity: 'info',
      actor: 'telegram', targetType: 'config', details: { tradeApprovalThreshold: amount }, success: true,
    });
    await ctx.reply(`✅ Auto-approve threshold set to $${amount}`);
  });

  bot.command('tradingmode', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    const parts = ctx.message.text.split(' ');
    const mode = parts[1]?.toLowerCase();
    if (!mode || !['paper', 'live'].includes(mode)) {
      await ctx.reply('Usage: /tradingmode <paper|live>');
      return;
    }
    if (mode === 'live') {
      wizardState.set(userId(ctx), { step: 'live_confirm' });
      await ctx.reply(
        '🔴 *WARNING: LIVE TRADING MODE*\n\nReal money will be used. Type CONFIRM to enable live trading, or /cancel to abort.',
        { parse_mode: 'Markdown', ...kb([['CONFIRM', '/cancel']], { one_time_keyboard: true }) }
      );
      return;
    }
    config.tradingMode = 'paper';
    logAudit({
      timestamp: new Date().toISOString(), action: 'config_changed', severity: 'warning',
      actor: 'telegram', targetType: 'config', details: { tradingMode: 'paper' }, success: true,
    });
    await ctx.reply('📝 Switched to paper trading mode');
  });

  bot.command('addrule', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    await ctx.reply(
      '📋 *Add Approval Rule*\n\nSelect the action type:',
      {
        parse_mode: 'Markdown',
        ...kb([['💳 Payment', '📈 Trade', '💸 Transfer'], ['❌ Cancel']], { one_time_keyboard: true }),
      }
    );
    wizardState.set(userId(ctx), { step: 'rule_type' });
  });

  bot.command('listrules', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    const { getApprovalRules } = await import('../server/admin-routes.js');
    const rules = getApprovalRules();
    let msg = '📋 *Approval Rules*\n\n';
    msg += `Auto-Execute: ${rules.autoExecuteEnabled ? '✅ ON' : '❌ OFF'}\n`;
    msg += `Max Amount: $${rules.autoExecuteMaxAmount} ${rules.autoExecuteCurrency}\n\n`;
    msg += '*Per-Action:*\n';
    for (const [action, rule] of Object.entries(rules.perActionRules)) {
      const r = rule as any;
      msg += `  • ${action}: ${r.autoApprove ? 'auto' : 'manual'} (max $${r.maxAmount})\n`;
    }
    msg += `\n*Trading:*\n`;
    msg += `  • Position limit: ${rules.tradingPositionLimit}%\n`;
    msg += `  • SELL requires approval: ${rules.tradingSellRequiresApproval ? '✅' : '❌'}`;
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.command('audit', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    const parts = ctx.message.text.split(' ');
    const n = Math.min(parseInt(parts[1]) || 10, 50);
    const { listAuditLogs } = await import('../storage/vault-storage.js');
    const result = listAuditLogs({ limit: n });
    if (result.data.length === 0) {
      await ctx.reply('📭 No audit entries found.');
      return;
    }
    const lines = result.data.map((e: any) => {
      const icon = e.success ? '✅' : '❌';
      const time = new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${icon} ${time} ${e.action} — ${e.actor}${e.targetId ? ' → ' + e.targetId.slice(0, 8) : ''}`;
    });
    await ctx.reply(`📋 *Last ${result.data.length} Audit Entries:*\n\n` + lines.join('\n'), { parse_mode: 'Markdown' });
  });

  // ─── Trade Commands ───

  bot.command('buy', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    const parts = ctx.message.text.split(' ');
    const symbol = parts[1]?.toUpperCase();
    const qty = parseInt(parts[2]);
    if (!symbol || !qty || qty <= 0) {
      await ctx.reply('Usage: /buy <SYMBOL> <QTY>\nExample: /buy AAPL 5');
      return;
    }
    await executeTradeCommand(ctx, config, symbol, qty, 'BUY');
  });

  bot.command('sell', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    const parts = ctx.message.text.split(' ');
    const symbol = parts[1]?.toUpperCase();
    const qty = parseInt(parts[2]);
    if (!symbol || !qty || qty <= 0) {
      await ctx.reply('Usage: /sell <SYMBOL> <QTY>\nExample: /sell AAPL 5');
      return;
    }
    await executeTradeCommand(ctx, config, symbol, qty, 'SELL');
  });

  bot.command('quote', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    const parts = ctx.message.text.split(' ');
    const symbol = parts[1]?.toUpperCase();
    if (!symbol) {
      await ctx.reply('Usage: /quote <SYMBOL>\nExample: /quote AAPL');
      return;
    }
    try {
      const { executeWithAdapter } = await import('../adapters/index.js');
      const secret = await findAlpacaSecret();
      if (!secret) { await ctx.reply('⚠️ No Alpaca credentials in vault. Add via /addsecret'); return; }
      const result = await executeWithAdapter('alpaca', secret.config, {
        action: 'getMarketData', payload: { symbol }, secretPlaintext: secret.plaintext,
      });
      if (!result.success) { await ctx.reply('❌ ' + (result.error || 'Failed to get quote')); return; }
      const d = result.data as any;
      await ctx.reply(
        `📊 *${symbol} Quote*\n\nBid: $${d.bidPrice?.toFixed(2)} (${d.bidSize})\nAsk: $${d.askPrice?.toFixed(2)} (${d.askSize})\nSpread: $${d.spread?.toFixed(4)}\nMid: $${d.midPrice?.toFixed(2)}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await ctx.reply('❌ Failed to get quote. ' + (err instanceof Error ? err.message : String(err)));
    }
  });

  bot.command('status', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    const { listTasks, listSecrets } = await import('../storage/vault-storage.js');
    const { listPendingApprovals } = await import('../storage/vault-storage.js');
    const tasks = listTasks({ limit: 1000 });
    const pending = listPendingApprovals();
    const secrets = listSecrets({ limit: 1000 });
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    await ctx.reply(
      `🔐 *SecureVault Status*\n\n` +
      `Uptime: ${h}h ${m}m\n` +
      `Mode: ${config.tradingMode}\n` +
      `Secrets: ${secrets.total}\n` +
      `Tasks: ${tasks.total}\n` +
      `Pending Approvals: ${pending.length}\n` +
      `Threshold: $${config.tradeApprovalThreshold}`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('approveall', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    const { listPendingApprovals } = await import('../storage/vault-storage.js');
    const pending = listPendingApprovals();
    if (pending.length === 0) { await ctx.reply('✅ No pending approvals.'); return; }
    let count = 0;
    for (const approval of pending) {
      const now = new Date().toISOString();
      updateApprovalStatus(approval.id, 'approved', ctx.from?.id.toString() || 'telegram', now);
      const task = getTaskById(approval.taskId);
      if (task) updateTaskStatus(task.id, 'approved', { approvedAt: now, approvedBy: ctx.from?.id.toString() });
      count++;
    }
    logAudit({ timestamp: new Date().toISOString(), action: 'task_approved', severity: 'warning',
      actor: ctx.from?.id.toString() || 'telegram', targetType: 'approval', details: { bulkApproved: count }, success: true });
    await ctx.reply(`✅ Approved ${count} pending requests`);
  });

  // ─── Profile Commands ───

  bot.command('profiles', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    const { listProfiles } = await import('../storage/vault-storage.js');
    const profiles = listProfiles();
    if (profiles.length === 0) {
      await ctx.reply('📭 No service profiles configured. Use /addprofile to create one.');
      return;
    }
    const lines = profiles.map((p: any) => {
      const defIcon = p.isDefault ? '⭐' : ' ';
      const statusIcon = p.enabled ? '✅' : '❌';
      return `${defIcon}${statusIcon} \`${p.id.slice(0, 10)}…\` ${p.name} (${p.adapterType})`;
    });
    await ctx.reply('📋 *Service Profiles:*\n\n' + lines.join('\n'), { parse_mode: 'Markdown' });
  });

  bot.command('addprofile', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    await ctx.reply(
      '🔌 *Add Service Profile*\n\nSelect the adapter type:',
      {
        parse_mode: 'Markdown',
        ...kb([['📈 Alpaca', '💳 Stripe'], ['🏦 IBKR', '🔄 Wise'], ['🏦 Revolut', '🔗 Plaid'], ['❌ Cancel']]),
      }
    );
    wizardState.set(userId(ctx), { step: 'profile_adapter' });
  });

  bot.command('testprofile', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    const parts = ctx.message.text.split(' ');
    const profileId = parts[1];
    if (!profileId) {
      await ctx.reply('Usage: /testprofile <id>\nUse /profiles to list IDs.');
      return;
    }
    await ctx.reply('🔄 Testing connection...');
    const { serviceRegistry } = await import('../services/service-registry.js');
    const result = await serviceRegistry.testProfile(profileId);
    if (result.success) {
      await ctx.reply(`✅ Connection successful!\n\nResponse: ${JSON.stringify(result.data, null, 2).slice(0, 500)}`);
    } else {
      await ctx.reply(`❌ Connection failed: ${result.error}`);
    }
  });

  bot.command('defaultprofile', async (ctx) => {
    if (!isAuthorized(ctx, config)) return;
    const parts = ctx.message.text.split(' ');
    const profileId = parts[1];
    if (!profileId) {
      await ctx.reply('Usage: /defaultprofile <id>\nUse /profiles to list IDs.');
      return;
    }
    const { serviceRegistry } = await import('../services/service-registry.js');
    serviceRegistry.setDefault(profileId);
    await ctx.reply(`⭐ Set ${profileId} as default for its adapter type.`);
  });

  bot.command('cancel', async (ctx) => {
    wizardState.delete(userId(ctx));
    await ctx.reply('❌ Cancelled.', Markup.removeKeyboard());
  });

  // ─── Wizard: Handle text input for guided flows ───

  bot.on('text', async (ctx) => {
    const state = wizardState.get(userId(ctx));
    if (!state) return; // not in a wizard flow

    try {
      switch (state.step) {
        case 'setup_type':
        case 'secret_type': {
          const typeMap: Record<string, string> = {
            '🔑 API Key': 'api_key', '💳 Credit Card': 'credit_card',
            '🏦 Bank Account': 'bank_account', '📈 Trading Account': 'note',
          };
          const category = typeMap[ctx.message.text];
          if (!category) { wizardState.delete(userId(ctx)); await ctx.reply('Cancelled.', Markup.removeKeyboard()); return; }
          wizardState.set(userId(ctx), { ...state, step: 'secret_label', category });
          await ctx.reply('Enter a label/name for this secret:', Markup.removeKeyboard());
          return;
        }
        case 'secret_label': {
          if (!ctx.message.text.trim()) { await ctx.reply('Label cannot be empty. Try again:'); return; }
          wizardState.set(userId(ctx), { ...state, step: 'secret_value', label: ctx.message.text.trim() });
          await ctx.reply('Enter the secret value (plaintext):\n⚠️ This will be encrypted before storage.');
          return;
        }
        case 'secret_value': {
          if (!ctx.message.text.trim()) { await ctx.reply('Value cannot be empty. Try again:'); return; }
          const { category, label } = state as any;
          wizardState.set(userId(ctx), { ...state, step: 'secret_confirm', value: ctx.message.text.trim() });
          await ctx.reply(
            `📋 <b>Confirm Secret</b>\n\nType: ${htmlEscape(category)}\nLabel: ${htmlEscape(label)}\nValue: ${'•'.repeat(Math.min(ctx.message.text.trim().length, 8))}\n\nType CONFIRM to save, or /cancel to abort.`,
            { parse_mode: 'HTML', ...kb([['CONFIRM', '/cancel']], { one_time_keyboard: true }) }
          );
          return;
        }
        case 'secret_confirm': {
          if (ctx.message.text !== 'CONFIRM') { wizardState.delete(userId(ctx)); await ctx.reply('Cancelled.', Markup.removeKeyboard()); return; }
          const { category, label, value } = state as any;
          const { createSecret } = await import('../storage/vault-storage.js');
          const secret = createSecret({ name: label, category, plaintext: value });
          wizardState.delete(userId(ctx));
          logAudit({ timestamp: new Date().toISOString(), action: 'secret_created', severity: 'info',
            actor: 'telegram', targetId: secret.id, targetType: 'secret', details: { category }, success: true });
          await ctx.reply(
            `✅ <b>Secret Created</b>\n\nID: <code>${htmlEscape(secret.id.slice(0, 12))}…</code>\nName: ${htmlEscape(secret.name)}\nCategory: ${secret.category}`,
            { parse_mode: 'HTML', ...Markup.removeKeyboard() }
          );
          return;
        }
        case 'delete_confirm': {
          if (ctx.message.text !== 'DELETE') { wizardState.delete(userId(ctx)); await ctx.reply('Cancelled.', Markup.removeKeyboard()); return; }
          const { secretId } = state as any;
          const { deleteSecret } = await import('../storage/vault-storage.js');
          const ok = deleteSecret(secretId);
          wizardState.delete(userId(ctx));
          if (ok) {
            logAudit({ timestamp: new Date().toISOString(), action: 'secret_deleted', severity: 'warning',
              actor: 'telegram', targetId: secretId, targetType: 'secret', success: true });
            await ctx.reply('✅ Secret deleted.', Markup.removeKeyboard());
          } else {
            await ctx.reply('❌ Secret not found.', Markup.removeKeyboard());
          }
          return;
        }
        case 'live_confirm': {
          if (ctx.message.text !== 'CONFIRM') { wizardState.delete(userId(ctx)); await ctx.reply('Cancelled. Staying in paper mode.', Markup.removeKeyboard()); return; }
          config.tradingMode = 'live';
          wizardState.delete(userId(ctx));
          logAudit({ timestamp: new Date().toISOString(), action: 'config_changed', severity: 'critical',
            actor: 'telegram', targetType: 'config', details: { tradingMode: 'live' }, success: true });
          await ctx.reply('🔴 *LIVE TRADING ENABLED*\nReal money is now at risk.', { parse_mode: 'Markdown', ...Markup.removeKeyboard() });
          return;
        }
        case 'rule_type': {
          const ruleMap: Record<string, string> = { '💳 Payment': 'payment', '📈 Trade': 'trade', '💸 Transfer': 'transfer' };
          const actionType = ruleMap[ctx.message.text];
          if (!actionType) { wizardState.delete(userId(ctx)); await ctx.reply('Cancelled.', Markup.removeKeyboard()); return; }
          wizardState.set(userId(ctx), { ...state, step: 'rule_auto', actionType });
          await ctx.reply(
            `Auto-approve ${actionType} actions?`,
            kb([['✅ Yes, auto-approve', '❌ No, require approval']], { one_time_keyboard: true })
          );
          return;
        }
        case 'rule_auto': {
          const { actionType } = state as any;
          const autoApprove = ctx.message.text.includes('auto-approve');
          wizardState.set(userId(ctx), { ...state, step: 'rule_amount', actionType, autoApprove });
          await ctx.reply(
            `Max amount for ${actionType} (in USD):\nType a number or "none" for no limit.`,
            Markup.removeKeyboard()
          );
          return;
        }
        case 'rule_amount': {
          const { actionType, autoApprove } = state as any;
          const maxAmount = ctx.message.text === 'none' ? 999999 : (parseFloat(ctx.message.text) || 0);
          const { updateApprovalRules } = await import('../server/admin-routes.js');
          await updateApprovalRules({
            perActionRules: { [actionType]: { autoApprove, maxAmount } },
          });
          wizardState.delete(userId(ctx));
          await ctx.reply(
            `✅ *Rule Updated*\n\n${actionType}: ${autoApprove ? 'auto-approve' : 'manual'} (max $${maxAmount})`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // ─── Profile wizard steps ───
        case 'profile_adapter': {
          const adapterMap: Record<string, string> = {
            '📈 Alpaca': 'alpaca', '💳 Stripe': 'stripe',
            '🏦 IBKR': 'ibkr', '🔄 Wise': 'wise',
            '🏦 Revolut': 'revolut', '🔗 Plaid': 'plaid',
          };
          const adapterType = adapterMap[ctx.message.text];
          if (!adapterType) { wizardState.delete(userId(ctx)); await ctx.reply('Cancelled.', Markup.removeKeyboard()); return; }
          wizardState.set(userId(ctx), { ...state, step: 'profile_name', adapterType });
          await ctx.reply('Enter a name for this profile:\nExample: "Alpaca Paper Trading"', Markup.removeKeyboard());
          return;
        }
        case 'profile_name': {
          const name = ctx.message.text.trim();
          if (!name) { await ctx.reply('Name cannot be empty. Try again:'); return; }
          wizardState.set(userId(ctx), { ...state, step: 'profile_secret', profileName: name });
          const { listSecrets } = await import('../storage/vault-storage.js');
          const secrets = listSecrets({ category: 'api_key', limit: 50 });
          const tradingSecrets = listSecrets({ category: 'trading_account', limit: 50 });
          const all = [...secrets.data, ...tradingSecrets.data];
          if (all.length === 0) {
            await ctx.reply('No API keys or trading accounts found. Use /addsecret to create one first, then /addprofile again.');
            wizardState.delete(userId(ctx));
            return;
          }
          const buttons = all.slice(0, 8).map((s: any) => [`🔑 ${s.name} (${s.id.slice(0, 8)})`]);
          buttons.push(['❌ Cancel']);
          await ctx.reply('Select the secret to use for this profile:', kb(buttons, { one_time_keyboard: true }));
          return;
        }
        case 'profile_secret': {
          const text = ctx.message.text;
          if (text === '❌ Cancel') { wizardState.delete(userId(ctx)); await ctx.reply('Cancelled.', Markup.removeKeyboard()); return; }
          // Extract secret ID from button text like "🔑 Name (abc12345)"
          const match = text.match(/\(([a-f0-9]{8})/);
          if (!match) { wizardState.delete(userId(ctx)); await ctx.reply('Invalid selection. Try /addprofile again.', Markup.removeKeyboard()); return; }
          const secretPrefix = match[1];
          const { listSecrets } = await import('../storage/vault-storage.js');
          const allSecrets = [...listSecrets({ limit: 100 }).data];
          const secret = allSecrets.find((s: any) => s.id.startsWith(secretPrefix));
          if (!secret) { wizardState.delete(userId(ctx)); await ctx.reply('Secret not found.', Markup.removeKeyboard()); return; }
          const { adapterType, profileName } = state as any;
          // Auto-detect Alpaca and set paper/live config
          const defaultConfigs: Record<string, Record<string, unknown>> = {
            alpaca: { tradingMode: 'paper', baseUrl: 'https://paper-api.alpaca.markets' },
            stripe: { apiVersion: '2024-06-20' },
          };
          const profileConfig = defaultConfigs[adapterType] || {};
          const { serviceRegistry } = await import('../services/service-registry.js');
          const profile = serviceRegistry.registerProfile({
            name: profileName,
            adapterType,
            secretId: secret.id,
            config: profileConfig,
            isDefault: true,
          });
          wizardState.delete(userId(ctx));
          await ctx.reply(
            `✅ <b>Profile Created</b>\n\nID: <code>${htmlEscape(profile.id.slice(0, 12))}…</code>\nName: ${htmlEscape(profile.name)}\nAdapter: ${profile.adapterType}\nSecret: ${htmlEscape(secret.name)}\n\nUse /testprofile ${profile.id} to test the connection.`,
            { parse_mode: 'HTML', ...Markup.removeKeyboard() }
          );
          return;
        }
      }
    } catch (err) {
      wizardState.delete(userId(ctx));
      await ctx.reply('❌ Error: ' + (err instanceof Error ? err.message : String(err)), Markup.removeKeyboard());
    }
  });

  // Handle approval callbacks
  bot.action(/approve:(.+)/, async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (config.telegramUserId && userId !== config.telegramUserId) {
      await ctx.answerCbQuery('⛔ Unauthorized');
      return;
    }

    const approvalId = ctx.match[1];
    const approval = getApprovalById(approvalId);

    if (!approval) {
      await ctx.answerCbQuery('❌ Request not found');
      return;
    }

    if (approval.status !== 'pending') {
      await ctx.answerCbQuery(`Already ${approval.status}`);
      return;
    }

    const now = new Date().toISOString();
    const updated = updateApprovalStatus(approvalId, 'approved', userId || 'unknown', now);

    if (updated) {
      // Update task status
      const task = getTaskById(approval.taskId);
      if (task) {
        updateTaskStatus(task.id, 'approved', { approvedAt: now, approvedBy: userId });
      }

      // Edit message to show approved
      await ctx.editMessageText(
        formatApprovedMessage(approval, ctx.from?.username || userId || 'User'),
        { parse_mode: 'Markdown' }
      );
      await ctx.answerCbQuery('✅ Approved');

      logAudit({
        timestamp: now,
        action: 'approval_responded',
        severity: 'info',
        actor: userId || 'unknown',
        targetId: approvalId,
        targetType: 'approval',
        details: { response: 'approved', taskId: approval.taskId },
        success: true,
      });
    }
  });

  bot.action(/reject:(.+)/, async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (config.telegramUserId && userId !== config.telegramUserId) {
      await ctx.answerCbQuery('⛔ Unauthorized');
      return;
    }

    const approvalId = ctx.match[1];
    const approval = getApprovalById(approvalId);

    if (!approval) {
      await ctx.answerCbQuery('❌ Request not found');
      return;
    }

    if (approval.status !== 'pending') {
      await ctx.answerCbQuery(`Already ${approval.status}`);
      return;
    }

    const now = new Date().toISOString();
    const updated = updateApprovalStatus(approvalId, 'rejected', userId || 'unknown', now);

    if (updated) {
      // Update task status
      const task = getTaskById(approval.taskId);
      if (task) {
        updateTaskStatus(task.id, 'rejected', { approvedAt: now, approvedBy: userId });
      }

      await ctx.editMessageText(
        formatRejectedMessage(approval, ctx.from?.username || userId || 'User'),
        { parse_mode: 'Markdown' }
      );
      await ctx.answerCbQuery('❌ Rejected');

      logAudit({
        timestamp: now,
        action: 'approval_responded',
        severity: 'warning',
        actor: userId || 'unknown',
        targetId: approvalId,
        targetType: 'approval',
        details: { response: 'rejected', taskId: approval.taskId },
        success: true,
      });
    }
  });

  // Error handling
  bot.catch((err: unknown) => {
    console.error('Bot error:', err);
    logAudit({
      timestamp: new Date().toISOString(),
      action: 'system_stop',
      severity: 'critical',
      actor: 'telegram_bot',
      details: { error: err instanceof Error ? err.message : String(err) },
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  });

  return bot;
}

/**
 * Send an approval request message to the configured Telegram user
 */
export async function sendApprovalRequest(approval: ApprovalRequest, task: Task, config: VaultConfig): Promise<void> {
  if (!bot) throw new Error('Bot not initialized');

  const chatId = parseInt(config.telegramUserId);
  if (isNaN(chatId)) {
    console.error('Invalid TELEGRAM_USER_ID');
    return;
  }

  const message = formatApprovalMessage(approval, task);
  const buttons = [
    Markup.button.callback('✅ Approve', `approve:${approval.id}`),
    Markup.button.callback('❌ Reject', `reject:${approval.id}`),
  ];

  // Add [View Portfolio] button for trade approvals
  if (task.type === 'trade') {
    buttons.push(Markup.button.callback('📊 View Portfolio', `view_portfolio:${approval.id}`));
  }

  const keyboard = Markup.inlineKeyboard(buttons);

  try {
    const sent = await bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });

    updateApprovalMessage(approval.id, sent.message_id, chatId);
    pendingCallbacks.set(approval.id, { messageId: sent.message_id, chatId });
  } catch (err) {
    console.error('Failed to send approval request:', err);
    logAudit({
      timestamp: new Date().toISOString(),
      action: 'approval_requested',
      severity: 'warning',
      actor: 'system',
      targetId: approval.id,
      targetType: 'approval',
      details: { taskId: task.id },
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Send approval prompt to a specific chat (used by /pending command)
 */
async function sendApprovalPrompt(chatId: number, approval: ApprovalRequest): Promise<void> {
  if (!bot) return;

  const task = getTaskById(approval.taskId);
  if (!task) return;

  const message = formatApprovalMessage(approval, task);
  const buttons = [
    Markup.button.callback('✅ Approve', `approve:${approval.id}`),
    Markup.button.callback('❌ Reject', `reject:${approval.id}`),
  ];

  if (task.type === 'trade') {
    buttons.push(Markup.button.callback('📊 View Portfolio', `view_portfolio:${approval.id}`));
  }

  const keyboard = Markup.inlineKeyboard(buttons);

  try {
    const sent = await bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
    updateApprovalMessage(approval.id, sent.message_id, chatId);
  } catch (err) {
    console.error('Failed to send approval prompt:', err);
  }
}

/**
 * Start the bot (launch polling)
 */
export async function startBot(config: VaultConfig): Promise<void> {
  const instance = initBot(config);
  await instance.launch();
  console.log('Telegram bot started');

  // Graceful shutdown
  process.once('SIGINT', () => instance.stop('SIGINT'));
  process.once('SIGTERM', () => instance.stop('SIGTERM'));
}

/**
 * Stop the bot
 */
export function stopBot(): void {
  if (bot) {
    bot.stop();
    bot = null;
  }
}

// ─── Message Formatters ───

function formatApprovalMessage(approval: ApprovalRequest, task: Task): string {
  const riskEmoji = approval.riskScore > 70 ? '🔴' : approval.riskScore > 40 ? '🟡' : '🟢';
  const flags = approval.riskFlags.length > 0
    ? '\n⚠️ *Risk Flags:*\n' + approval.riskFlags.map(f => `  • ${f.message}`).join('\n')
    : '';

  // Trade-specific formatting
  if (task.type === 'trade') {
    return formatTradeApprovalMessage(approval, task, riskEmoji, flags);
  }

  return (
    `🔐 *Approval Request*\n\n` +
    `*Task:* ${task.type}\n` +
    `*Description:* ${task.description}\n` +
    `*Amount:* ${task.parameters.amount || 'N/A'} ${task.parameters.currency || ''}\n` +
    `*Priority:* ${task.priority}\n\n` +
    `${riskEmoji} *Risk Score:* ${approval.riskScore}/100` +
    flags +
    `\n\n_Expires: ${new Date(approval.expiresAt).toLocaleString()}_`
  );
}

function formatTradeApprovalMessage(
  approval: ApprovalRequest,
  task: Task,
  riskEmoji: string,
  flags: string
): string {
  const params = task.parameters;
  const symbol = (params.symbol as string) || 'N/A';
  const side = ((params.side as string) || 'N/A').toUpperCase();
  const quantity = params.quantity as number | undefined;
  const orderType = ((params.orderType as string) || 'MKT').toUpperCase();
  const price = params.price as number | undefined;
  const sideEmoji = side === 'BUY' ? '🟢' : '🔴';

  // Estimate cost
  const estimatedCost = quantity && price ? quantity * price : quantity ? `~$${quantity} shares @ market` : 'N/A';

  return (
    `${sideEmoji} *TRADE APPROVAL REQUEST*\n\n` +
    `*Symbol:* ${symbol}\n` +
    `*Action:* ${side} ${quantity || '?'} shares\n` +
    `*Order Type:* ${orderType}${price ? ` @ $${price.toFixed(2)}` : ''}\n` +
    `*Estimated Cost:* ${typeof estimatedCost === 'number' ? `$${estimatedCost.toFixed(2)}` : estimatedCost}\n` +
    `*Time in Force:* ${((params.tif as string) || 'DAY').toUpperCase()}\n\n` +
    `*Portfolio Allocation:* ${params.currentAllocation ? `${params.currentAllocation}% → ${params.projectedAllocation}%` : 'Not available'}\n` +
    `*Priority:* ${task.priority}\n\n` +
    `${riskEmoji} *Risk Score:* ${approval.riskScore}/100` +
    flags +
    `\n\n_${side === 'SELL' ? '⚠️ SELL orders always require approval' : ''}_` +
    `\n_Expires: ${new Date(approval.expiresAt).toLocaleString()}_`
  );
}

function formatApprovedMessage(_approval: ApprovalRequest, user: string): string {
  return (
    `✅ *APPROVED*\n\n` +
    `Request approved by ${user}\n` +
    `_at ${new Date().toLocaleString()}_`
  );
}

function formatRejectedMessage(_approval: ApprovalRequest, user: string): string {
  return (
    `❌ *REJECTED*\n\n` +
    `Request rejected by ${user}\n` +
    `_at ${new Date().toLocaleString()}_`
  );
}

// ─── Portfolio Helper ───

async function handlePortfolioRequest(chatId: number): Promise<void> {
  if (!bot) return;

  try {
    const { executeWithAdapter } = await import('../adapters/index.js');
    const { listSecrets } = await import('../storage/vault-storage.js');

    // Find an Alpaca secret in the vault
    const secrets = listSecrets({ category: 'api_key', limit: 100 });
    const alpacaSecret = secrets.data.find((s: any) =>
      s.name?.toLowerCase().includes('alpaca') ||
      s.metadata?.issuer?.toLowerCase().includes('alpaca') ||
      s.metadata?.tags?.some((t: string) => t.toLowerCase() === 'alpaca')
    );

    if (!alpacaSecret) {
      await bot.telegram.sendMessage(chatId, '⚠️ No Alpaca API credentials found in vault. Store your API key as a secret with tag "alpaca".');
      return;
    }

    const { getSecretWithDecryption } = await import('../storage/vault-storage.js');
    const secretResult = getSecretWithDecryption(alpacaSecret.id);
    if (!secretResult) {
      await bot.telegram.sendMessage(chatId, '⚠️ Failed to decrypt Alpaca credentials.');
      return;
    }

    const result = await executeWithAdapter(
      'alpaca',
      {
        type: 'alpaca',
        name: 'Alpaca',
        enabled: true,
        credentials: { apiKey: secretResult.plaintext, secretKey: secretResult.plaintext },
      },
      { action: 'getPortfolio', payload: {}, secretPlaintext: secretResult.plaintext }
    );

    if (!result.success || !result.data) {
      await bot.telegram.sendMessage(chatId, `❌ Failed to fetch portfolio: ${result.error || 'Unknown error'}`);
      return;
    }

    const data = result.data as any;
    const acct = data.account;
    const positions = (data.positions || []) as any[];

    let msg = `📊 *Portfolio Snapshot*\n\n`;
    msg += `*Value:* $${acct.portfolioValue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    msg += `*Cash:* $${acct.cash?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    msg += `*Buying Power:* $${acct.buyingPower?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    msg += `*Positions:* ${data.positionCount}\n\n`;

    if (positions.length > 0) {
      msg += `*Holdings:*\n`;
      for (const pos of positions.slice(0, 10)) {
        const plEmoji = pos.unrealizedPLPercent >= 0 ? '📈' : '📉';
        msg += `  • ${pos.symbol}: ${pos.qty} shares ($${pos.marketValue?.toFixed(2)}) — ${pos.allocationPercent?.toFixed(1)}% ${plEmoji} ${pos.unrealizedPLPercent >= 0 ? '+' : ''}${pos.unrealizedPLPercent?.toFixed(2)}%\n`;
      }
    } else {
      msg += `_No open positions_`;
    }

    await bot.telegram.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('Portfolio request failed:', err);
    await bot.telegram.sendMessage(chatId, '❌ Failed to fetch portfolio. Check server logs.');
  }
}

export default {
  initBot,
  startBot,
  stopBot,
  sendApprovalRequest,
};
