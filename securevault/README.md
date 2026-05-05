# SecureVault

Self-hosted financial action gateway with human-in-the-loop approval via Telegram.

## What is SecureVault?

SecureVault is a secure bridge between AI agents and financial services. It acts as a **gatekeeper** — storing encrypted secrets, assessing risk on every action, and requiring human approval via Telegram before executing high-risk financial operations through service adapters.

Built with [OpenClaw](https://github.com/nousresearch/openclaw).

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  AI Agent   │────▶│  SecureVault API  │────▶│  Adapters   │
│  (external) │     │  (Fastify + TLS)  │     │  (Stripe,   │
└─────────────┘     │                    │     │   IBKR,     │
                    │  ┌──────────────┐  │     │   OAuth)    │
┌─────────────┐     │  │ Risk Engine  │  │     └─────────────┘
│  Telegram   │◀────│  │ (score 0-100)│  │
│  Bot        │     │  └──────┬───────┘  │     ┌─────────────┐
│  (approve/  │     │         │          │     │  SQLite DB  │
│   reject)   │     │  ┌──────▼───────┐  │     │  (AES-256   │
└─────────────┘     │  │ Approval     │  │     │   GCM at    │
                    │  │ Flow         │  │     │   rest)      │
                    │  └──────────────┘  │     └─────────────┘
                    └──────────────────┘
```

**Core flow:**
1. Agent sends a task (e.g., "transfer $500 to account X") via authenticated API
2. Risk engine scores the task (0-100) based on amount, type, priority, timing
3. High-risk tasks require Telegram approval from the owner
4. Approved tasks execute through service adapters (Stripe, IBKR, OAuth)
5. All actions logged to immutable audit trail

## Quick Start

### Prerequisites
- Node.js 20+
- npm
- Telegram bot token (from @BotFather)

### Local Development

```bash
# Clone and install
cd securevault
npm install

# Configure
cp .env.example .env
# Edit .env with your values

# Build
npm run build

# Run
npm start
```

### Docker

```bash
# Build image
docker build -t securevault .

# Run with compose
cp .env.example .env
# Edit .env with your values
docker compose up -d

# Check health
curl http://localhost:8443/health

# View logs
docker compose logs -f securevault
```

## Configuration

All config via environment variables. See `.env.example` for the full list.

| Variable | Required | Default | Description |
|---|---|---|---|
| `VAULT_MASTER_KEY` | Yes | — | Encryption key for secrets (32-byte hex) |
| `SECUREVAULT_AGENT_TOKEN` | Yes | — | Bearer token for API auth |
| `TELEGRAM_BOT_TOKEN` | Yes | — | Bot token from @BotFather |
| `TELEGRAM_USER_ID` | Yes | — | Your Telegram user ID |
| `PORT` | No | `8443` | HTTP port |
| `AUTO_EXECUTE_ENABLED` | No | `false` | Auto-approve low-risk tasks |
| `AUTO_EXECUTE_MAX_AMOUNT` | No | `100` | Max amount for auto-approval |
| `RISK_TIMEZONE` | No | `UTC` | Timezone for off-hours risk scoring |

## API Endpoints

All endpoints require `Authorization: Bearer <SECUREVAULT_AGENT_TOKEN>` except `/health`.

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/secrets` | Create encrypted secret |
| GET | `/api/secrets` | List secrets (paginated) |
| GET | `/api/secrets/:id` | Get secret with decrypted plaintext |
| PATCH | `/api/secrets/:id` | Update secret metadata |
| DELETE | `/api/secrets/:id` | Delete secret |
| POST | `/api/secrets/:id/revoke` | Revoke secret |
| POST | `/api/tasks` | Create task (legacy) |
| POST | `/api/tasks/v2` | Create task with risk assessment |
| GET | `/api/tasks` | List tasks |
| GET | `/api/tasks/:id` | Get task |
| GET | `/api/tasks/v2/:id` | Get task with gateway requests |
| POST | `/api/tasks/:id/complete` | Mark task complete |
| POST | `/api/tasks/v2/:id/complete` | Mark v2 task complete |
| POST | `/api/gateway/request` | Execute request via adapter |
| GET | `/api/gateway/request/:id` | Get gateway request status |
| GET | `/api/gateway/requests` | List gateway requests |
| GET | `/audit/log` | Immutable audit trail |
| GET | `/api/audit` | Audit trail (authenticated) |

## Security Model

### Threat Model

See `docs/SECURITY.md` for the full threat model and mitigations.

**Key principles:**
- **Secrets encrypted at rest** with AES-256-GCM
- **Keys derived via scrypt** (memory-hard KDF)
- **Constant-time token comparison** (timing attack resistant)
- **Helmet.js** for HTTP security headers
- **Rate limiting** (100 req/min per IP)
- **All actions logged** to immutable audit trail
- **Human-in-the-loop** for high-risk operations
- **Non-root Docker container**
- **Read-only filesystem** where possible

### Risk Assessment

| Factor | Score Impact |
|---|---|
| Amount > $10,000 | +40 (high) |
| Amount > $1,000 | +20 (medium) |
| Crypto/trade type | +25 (high) |
| Bank/card type | +10 (medium) |
| Critical priority | +15 |
| Off-hours (7PM-7AM) | +10 |

- Score ≥ 70: **Blocked** (requires manual review)
- Score 20-69: **Requires Telegram approval**
- Score < 20 + auto-execute enabled: **Auto-approved**

## Project Structure

```
src/
├── adapters/          # Service adapters (Stripe, IBKR, OAuth)
├── bot/               # Telegram approval bot
├── crypto/            # AES-256-GCM encryption
├── server/            # Fastify server + gateway router
├── skills/            # Action definitions + validation
├── storage/           # SQLite CRUD (secrets, tasks, approvals, audit)
├── types/             # TypeScript type definitions
├── utils/             # Risk engine, approval flow, task utils
└── server.ts          # Entry point
```

## Tech Stack

- **Runtime:** Node.js 20+ (TypeScript)
- **Server:** Fastify with Helmet + rate limiting
- **Database:** SQLite (better-sqlite3) with WAL mode
- **Encryption:** AES-256-GCM with scrypt key derivation
- **Bot:** Telegraf (Telegram Bot API)
- **Container:** Docker multi-stage build, non-root, ARM64 support

## Testing

```bash
# Run all tests
npm test

# Run smoke tests only
npx vitest run test/smoke.test.ts

# Run integration tests
npx vitest run tests/integration.test.ts
```

## License

MIT
