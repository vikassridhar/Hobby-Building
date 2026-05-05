# SecureVault — Deployment Guide

## Why Separate Deployment?

If the agent and SecureVault share the same machine, a compromised agent can:
- Read `data/vault.db` (encrypted but master key is in `.env`)
- Read `.env` directly (plaintext keys)
- Bypass the gateway entirely by calling Alpaca/Stripe APIs with stolen credentials

Separate deployment = the agent only sees port 8443 and can never touch the filesystem.

---

## Option 1: Existing Server / Home Lab (Best)

**Cost: $0/month** (already paid for)

If you have an existing server (home lab, workstation, etc.):
- ARM64 Docker support already configured
- Hardware-backed encryption for key derivation
- Isolated from the agent machine

**Setup:**
1. Copy the project to your server
2. `docker compose up -d` (arm64 image already configured)
3. Only expose port 8443 internally (VPN/Tailscale)
4. Agent connects via `http://<server-ip>:8443`
5. Block outbound from server to everything except Alpaca/Stripe APIs

**Security:**
- Agent machine → VPN → Server:8443 (API only)
- Server → Alpaca/Stripe (outbound only)
- No filesystem access from agent
- Master key never leaves the server

---

## Option 2: Cheapest VPS

**Cost: $3-5/month**

| Provider | Plan | Specs | Price |
|---|---|---|---|
| Hetzner | CX22 | 2 vCPU, 4GB RAM, 40GB | €3.79/mo (~$4.20) |
| Contabo | Cloud VPS S | 4 vCPU, 8GB RAM, 50GB | €4.50/mo (~$5) |
| DigitalOcean | Basic | 1 vCPU, 1GB RAM, 25GB | $6/mo |
| Vultr | Regular | 1 vCPU, 1GB RAM, 25GB | $5/mo |

**Recommended: Hetzner CX22** — best value, EU data privacy, great uptime.

**Setup:**
1. Provision VPS (Ubuntu 24.04)
2. Install Docker: `curl -fsSL https://get.docker.com | sh`
3. Clone SecureVault, copy `.env` (never commit it)
4. `docker compose up -d`
5. Configure Tailscale on VPS for private access
6. Set up firewall: only allow Tailscale IP on 8443, block everything else

**Security:**
- Agent → Tailscale → VPS:8443
- VPS has no agent code, no filesystem access
- UFW firewall blocks all direct internet access to 8443
- Automatic SSL via Tailscale

---

## Option 3: Free Tier Cloud Run (Serverless)

**Cost: $0/month** (within free tier)

Google Cloud Run free tier: 2M requests/month, 360K GB-seconds compute.

**But:** Not recommended for SecureVault because:
- Cold starts delay approval responses
- SQLite doesn't work well on ephemeral filesystem
- Need to switch to Cloud SQL (adds cost)
- Secret manager integration adds complexity

**Verdict:** Skip for now. Only worth it if you want to learn GCP.

---

## Recommended Architecture

```
┌──────────────────┐         VPN/Tailscale     ┌──────────────────┐
│   Agent Machine   │ ◄──────────────────────► │   SecureVault     │
│   (AI Agent)      │        encrypted         │   (Server)        │
│                    │                           │                    │
│  - Never sees keys │   POST /api/gateway      │  - Holds secrets  │
│  - Only sees :8443 │   /request               │  - Decrypts       │
│  - Scoped token    │                           │  - Calls APIs    │
└──────────────────┘                           └────────┬──────────┘
                                                         │
                                                         │ HTTPS
                                                         ▼
                                                ┌──────────────────┐
                                                │  Alpaca / Stripe  │
                                                │  (External APIs)  │
                                                └──────────────────┘
```

---

## Deployment Steps

1. **Copy project to server**
   ```bash
   rsync -avz ./securevault/ your-server:~/securevault/
   ```

2. **SSH into server and start**
   ```bash
   cd ~/securevault
   cp .env.example .env
   # Edit .env with production values
   # Generate a fresh VAULT_MASTER_KEY: openssl rand -hex 32
   docker compose up -d
   ```

3. **Update agent config**
   Change `SECUREVAULT_URL` to point to your server's address

4. **Lock down network access**
   ```bash
   # On server firewall
   sudo ufw allow in on tailscale0 to any port 8443
   sudo ufw deny out to any port 443 # except Alpaca/Stripe
   ```

5. **Verify**
   - Agent can reach `http://<server-ip>:8443/health`
   - Agent CANNOT access the server filesystem or read vault.db
   - Gateway requests work through the API

---

## Option 4: AWS Free Tier

**Cost: $0 for 12 months, then ~$8-10/month**

### EC2 t2.micro / t3.micro (12 Months Free)

| Spec | Value |
|---|---|
| CPU | 1 vCPU (t3 has burst) |
| RAM | 1 GB |
| Storage | 30 GB EBS (gp3) |
| Transfer | 100 GB/month outbound |
| Duration | 750 hours/month for 12 months |
| After 12 months | ~$8.50/mo (t3.micro, us-east-1) |

**Works because:** SecureVault is lightweight — Fastify + SQLite + Telegraf bot. Idles at ~50MB RAM.

### Setup (EC2 Free Tier)

```bash
# 1. Launch EC2 instance
# AMI: Ubuntu 24.04 LTS (free tier eligible)
# Type: t3.micro
# Storage: 30 GB gp3

# 2. Security Group (firewall)
#   Inbound:  SSH (22) from your IP only
#             Custom TCP (8443) from Tailscale range only
#   Outbound: All (for Alpaca/Stripe API calls + Tailscale)

# 3. SSH in and install
ssh <user>@<ec2-public-ip>
curl -fsSL https://get.docker.com | sh

# 4. Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# 5. Deploy SecureVault
git clone <your-repo> ~/securevault
cd ~/securevault
cp .env.example .env
# Edit .env — generate fresh master key:
#   openssl rand -hex 32
docker compose up -d

# 6. Lock down — remove public SSH access, use Tailscale only
sudo systemctl restart sshd
```

### AWS Cost Traps to Watch

| Trap | Prevention |
|---|---|
| EBS grows past 30 GB free tier | Set CloudWatch alarm on volume size |
| Data transfer fees | 100 GB/month free — SecureVault uses almost zero |
| Elastic IP charge if stopped | Don't use Elastic IP; use Tailscale instead |
| Forgot running instance after 12 months | Set calendar reminder + billing alarm at $5 |
| NAT Gateway ($0.045/hr = $32/mo) | Don't use VPC with NAT — just use default VPC |

---

## Cost Summary

| Option | Monthly Cost | Pros | Cons |
|---|---|---|---|
| **Existing server** | **$0** | Already own it, hardware security | Single point of failure |
| **AWS EC2 t3.micro** | **$0 (12mo) → $8.50** | Free for a year, reliable | Need AWS account, 1GB RAM |
| Hetzner CX22 | ~$4 | Always on, EU privacy, cheap | Another machine to manage |
| Cloud Run | $0 (free tier) | Serverless, no ops | Cold starts, SQLite won't work |
