# SecureVault Security Documentation

## Threat Model

### Assets

| Asset | Value | Storage |
|---|---|---|
| Financial secrets (API keys, card tokens, OAuth tokens) | Critical | AES-256-GCM encrypted in SQLite |
| Master encryption key | Critical | Environment variable only |
| Agent authentication token | High | Environment variable only |
| Audit logs | High | SQLite (plaintext for querying) |
| Telegram bot token | Medium | Environment variable only |

### Threat Actors

| Actor | Capability | Motivation |
|---|---|---|
| External attacker | Network access, exploit skills | Steal funds, extract secrets |
| Malicious agent | Valid API token | Unauthorized transactions |
| Insider (host admin) | File system access | Extract secrets, modify logs |
| Telegram attacker | Compromised bot/token | Approve/reject transactions |

### Attack Scenarios

#### 1. Secret Extraction at Rest

**Threat:** Attacker gains access to the SQLite database file.

**Mitigation:**
- Secrets encrypted with AES-256-GCM before storage
- Master key stored only in environment variable, never persisted
- Key derivation via scrypt (memory-hard KDF, N=2^14, 128MB memory)
- Database file owned by non-root container user

**Residual Risk:** If master key is also compromised, secrets can be decrypted.

#### 2. API Token Theft / Replay

**Threat:** Attacker intercepts or brute-forces the agent bearer token.

**Mitigation:**
- Constant-time token comparison via `timingSafeEqual`
- Rate limiting: 100 requests/minute per IP
- All auth attempts logged to audit trail
- Token should be high-entropy (generated via `crypto.randomBytes`)

**Residual Risk:** Token exposed in transit if TLS not enabled.

#### 3. Unauthorized Transaction Execution

**Threat:** Compromised agent sends malicious transaction requests.

**Mitigation:**
- Risk engine scores every task (0-100)
- High-risk tasks require Telegram human approval
- Task-action binding: `authorizedActions` limits what a task can execute
- Approval requests expire after 30 minutes
- All transactions logged to immutable audit trail

**Residual Risk:** User accidentally approves malicious request on Telegram.

#### 4. Telegram Bot Compromise

**Threat:** Attacker gains control of the Telegram bot or intercepts messages.

**Mitigation:**
- Bot only responds to configured `TELEGRAM_USER_ID`
- Unauthorized users receive "⛔ Unauthorized" response
- Approval callbacks validated against user ID
- Bot start command requires authorization

**Residual Risk:** If Telegram account is compromised, attacker can approve transactions.

#### 5. Supply Chain / Dependency Attack

**Threat:** Malicious npm package compromise.

**Mitigation:**
- `package-lock.json` pins exact versions
- Minimal dependency footprint (Fastify, SQLite, Telegraf, Zod)
- No unnecessary dev dependencies in production image
- Docker multi-stage build: dev dependencies pruned

#### 6. Container Escape / Host Compromise

**Threat:** Attacker escapes container to host.

**Mitigation:**
- Non-root user (`vault:vault`) in container
- `no-new-privileges:true` security option
- Minimal tmpfs mount (`/tmp` with `noexec,nosuid`)
- Resource limits (512MB memory)
- Read-only filesystem where possible

#### 7. Timing Attacks on Token Comparison

**Threat:** Attacker measures response times to infer token characters.

**Mitigation:**
- `crypto.timingSafeEqual` for all token comparisons
- Equal-length buffers enforced before comparison

#### 8. SQL Injection

**Threat:** Attacker injects SQL via API parameters.

**Mitigation:**
- All database queries use parameterized statements (`better-sqlite3` prepared statements)
- No string concatenation in queries
- Zod validation on inputs

#### 9. Replay Attacks

**Threat:** Attacker replays old approval or execution requests.

**Mitigation:**
- Each approval request has unique UUID
- Approval status checked before processing (idempotent)
- Tasks have status machine: pending → approved → executing → completed
- Audit trail captures all attempts

## Security Checklist

### Deployment

- [ ] Master key generated with `crypto.randomBytes(32).toString('hex')`
- [ ] Agent token generated with `crypto.randomBytes(32).toString('base64url')`
- [ ] `.env` file has restrictive permissions (`chmod 600`)
- [ ] TLS certificates configured for production
- [ ] Telegram bot created with @BotFather, privacy mode enabled
- [ ] TELEGRAM_USER_ID verified (use @userinfobot)
- [ ] Container running as non-root user
- [ ] Host firewall restricts port 8443 access

### Runtime

- [ ] Rate limiting active (check logs for 429 responses)
- [ ] Audit logs being written to `/app/data/audit.log`
- [ ] Health check endpoint responding
- [ ] Telegram bot responding to `/start`
- [ ] Auto-execute disabled or threshold appropriately set
- [ ] Off-hours risk scoring matches your timezone

### Monitoring

- [ ] Alert on `auth_failure` audit events
- [ ] Alert on `system_stop` events
- [ ] Monitor disk space for SQLite growth
- [ ] Review pending approvals regularly
- [ ] Rotate master key annually (requires re-encryption)

## Cryptographic Details

### Encryption

- **Algorithm:** AES-256-GCM
- **Key Derivation:** scrypt (N=2^14, r=8, p=1, maxmem=128MB)
- **Salt:** 32 bytes (random per encryption)
- **IV:** 16 bytes (random per encryption)
- **Auth Tag:** 16 bytes (GCM authentication)

### Key Management

- Master key is the only secret needed for decryption
- No key escrow or backup mechanism (by design)
- Key rotation requires re-encrypting all secrets
- Keys cleared from memory after use (best effort in Node.js)

## Compliance Notes

- **PCI DSS:** Not compliant out-of-the-box. Card data encryption helps but additional controls needed.
- **SOC 2:** Audit trail and access controls support Type II requirements.
- **GDPR:** No PII storage by default. If storing identity documents, implement data retention policies.

## Incident Response

### If You Suspect Compromise

1. **Stop the container:** `docker compose down`
2. **Check audit logs:** Look for unauthorized auth or executions
3. **Revoke all secrets:** Use `/api/secrets/:id/revoke` for each secret
4. **Rotate tokens:** Generate new `VAULT_MASTER_KEY` and `SECUREVAULT_AGENT_TOKEN`
5. **Review Telegram:** Check for unauthorized approval messages
6. **Rebuild:** `docker compose up -d` with new secrets

### Forensics

- SQLite database preserved in `vault-data` Docker volume
- Audit logs in `/app/data/audit.log`
- Container logs via `docker compose logs`
- All timestamps in UTC for cross-reference

## Reporting Vulnerabilities

Please report security issues privately. Do not open public issues for security bugs.
