# SecureVault Skill

Self-hosted financial action gateway with human-in-the-loop approval via Telegram.

## Description

SecureVault is a secure bridge between AI agents and financial services. It stores encrypted secrets, assesses risk on every action, and requires human approval via Telegram for high-risk operations before executing through service adapters (Stripe, Interactive Brokers, OAuth2 banking APIs).

## Installation

```bash
# Clone the project
cd securevault
npm install
npm run build
```

## Configuration

Set the required environment variables (see `.env.example`):

| Variable | Required | Description |
|---|---|---|
| `VAULT_MASTER_KEY` | Yes | 32-byte hex encryption key |
| `SECUREVAULT_AGENT_TOKEN` | Yes | Bearer token for API auth |
| `TELEGRAM_BOT_TOKEN` | Yes | From @BotFather |
| `TELEGRAM_USER_ID` | Yes | Your numeric Telegram user ID |

## Usage

### From AI Agent

The skill exposes these actions to the agent:

```
# Store a secret
securevault.store_secret(name, category, plaintext, metadata)

# Create a financial task
securevault.create_task(type, description, secretId, parameters, priority)

# Execute an approved task
securevault.execute_gateway(taskId, adapterType, action, payload)

# Check task status
securevault.get_task(taskId)

# List audit logs
securevault.audit_logs(action?, targetId?, limit?)
```

### Example Flow

```
User: "Pay my electricity bill of $120"

Agent:
1. securevault.create_task(
     type: "bill_payment",
     description: "Electricity bill - $120",
     secretId: "<bank-account-secret>",
     parameters: { amount: 120, currency: "USD", recipient: "PowerCo" },
     priority: "normal"
   )
   → Returns: { task, approval, riskScore }

2. If riskScore > threshold:
   → Telegram approval request sent to user
   → User approves via Telegram button

3. securevault.execute_gateway(
     taskId: task.id,
     adapterType: "generic_oauth",
     action: "transfer",
     payload: { toAccount: "PowerCo", amount: 120, currency: "USD" }
   )
   → Returns: { gatewayRequest, adapterResult }
```

## Security Model

- **Secrets**: AES-256-GCM encrypted at rest, scrypt key derivation
- **Auth**: Constant-time token comparison, rate limiting (100 req/min)
- **Transport**: Helmet.js headers, optional TLS
- **Approval**: Human-in-the-loop via Telegram for all high-risk tasks
- **Audit**: Immutable SQLite audit trail for every action
- **Auto-execute**: Only for amounts below configurable threshold

## Risk Scoring

| Factor | Score Impact |
|---|---|
| Amount > $10,000 | +40 (high) |
| Amount > $1,000 | +20 (medium) |
| Crypto/trade type | +25 (high) |
| Bank/card type | +10 (medium) |
| Critical priority | +15 |
| Off-hours (7PM-7AM) | +10 |

- Score ≥ 70: Blocked (requires manual review)
- Score 20-69: Requires Telegram approval
- Score < 20 + auto-execute enabled: Auto-approved

## Adapters

| Adapter | Type | Actions |
|---|---|---|
| Stripe | `stripe` | payWithCard, getCardBalance, refundCharge |
| Interactive Brokers | `ibkr` | executeTrade, getPortfolio, getPositions, cancelOrder |
| Alpaca | `alpaca` | executeTrade, getPortfolio, getOrderHistory, cancelOrder |
| Generic OAuth2 | `generic_oauth` | getBalance, transfer, getTransactions, getAccountInfo |

## Docker Deployment

```bash
cp .env.example .env
# Edit .env with your secrets
docker compose up -d
```

The compose file supports ARM64 architecture.

## API Reference

See `docs/API.md` for complete endpoint documentation.

## License

MIT
