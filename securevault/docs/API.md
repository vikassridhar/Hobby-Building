# SecureVault API Reference

Base URL: `http://localhost:8443` (or your configured host/port)

Authentication: All endpoints require `Authorization: Bearer <SECUREVAULT_AGENT_TOKEN>` except `/health`.

## Authentication Errors

| Status | Code | Description |
|---|---|---|
| 401 | `AUTH_MISSING` | Missing or invalid Authorization header |
| 401 | `AUTH_INVALID` | Invalid agent token |
| 429 | `RATE_LIMITED` | Too many requests (100/min per IP) |

---

## Health

### GET /health

Health check endpoint. No authentication required.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Secrets

### POST /api/secrets

Create an encrypted secret.

**Request Body:**
```json
{
  "name": "Stripe API Key",
  "category": "api_key",
  "plaintext": "sk_live_...",
  "metadata": {
    "issuer": "Stripe",
    "tags": ["production"]
  },
  "expiresAt": "2025-01-01T00:00:00Z"
}
```

**Categories:** `bank_account`, `credit_card`, `crypto_wallet`, `api_key`, `password`, `note`, `identity_document`

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Stripe API Key",
  "category": "api_key",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/secrets

List secrets (paginated).

**Query Parameters:**
- `category` — Filter by category
- `status` — Filter by status (`active`, `revoked`, `expired`)
- `limit` — Page size (default: 50)
- `offset` — Pagination offset

**Response:**
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 50,
  "hasMore": true
}
```

### GET /api/secrets/:id

Get a secret with decrypted plaintext.

**Response:**
```json
{
  "id": "...",
  "name": "Stripe API Key",
  "category": "api_key",
  "plaintext": "sk_live_...",
  "metadata": { ... }
}
```

### PATCH /api/secrets/:id

Update secret metadata.

**Request Body:**
```json
{
  "name": "Updated Name",
  "metadata": { "tags": ["updated"] },
  "status": "revoked",
  "expiresAt": "2025-06-01T00:00:00Z"
}
```

### DELETE /api/secrets/:id

Delete a secret permanently.

**Response:** 204 No Content

### POST /api/secrets/:id/revoke

Revoke a secret (soft delete).

**Response:**
```json
{
  "id": "...",
  "status": "revoked"
}
```

---

## Tasks

### POST /api/tasks/v2

Create a task with risk assessment and approval flow.

**Request Body:**
```json
{
  "type": "card_payment",
  "priority": "normal",
  "description": "Electricity bill payment",
  "secretId": "550e8400-e29b-41d4-a716-446655440000",
  "parameters": {
    "amount": 120,
    "currency": "USD",
    "recipient": "PowerCo"
  },
  "requestedBy": "agent-001",
  "maxRetries": 3,
  "purpose": "Monthly bill payment",
  "authorizedActions": ["payWithCard"]
}
```

**Task Types:** `bank_transfer`, `crypto_transfer`, `card_payment`, `bill_payment`, `subscription_renewal`, `api_call`, `trade`

**Priorities:** `low`, `normal`, `high`, `critical`

**Response (201):**
```json
{
  "task": {
    "id": "...",
    "type": "card_payment",
    "status": "pending",
    "description": "Electricity bill payment",
    "secretId": "...",
    "parameters": { ... },
    "requestedAt": "2024-01-15T10:30:00.000Z",
    "requestedBy": "agent-001",
    "retryCount": 0,
    "maxRetries": 3
  },
  "approval": {
    "id": "...",
    "taskId": "...",
    "status": "pending",
    "requestedAt": "2024-01-15T10:30:00.000Z",
    "expiresAt": "2024-01-15T11:00:00.000Z",
    "riskScore": 15,
    "riskFlags": [],
    "autoApproved": false
  },
  "message": "Approval request sent via Telegram"
}
```

### GET /api/tasks

List tasks (paginated).

**Query Parameters:**
- `status` — Filter by status
- `secretId` — Filter by associated secret
- `limit`, `offset` — Pagination

### GET /api/tasks/v2/:id

Get task with related gateway requests.

**Response:**
```json
{
  "id": "...",
  "type": "card_payment",
  "status": "approved",
  "description": "...",
  "gatewayRequests": [
    {
      "id": "...",
      "status": "completed",
      "adapterType": "stripe",
      "action": "payWithCard",
      "createdAt": "..."
    }
  ]
}
```

### POST /api/tasks/v2/:id/complete

Mark a task as complete with result.

**Request Body:**
```json
{
  "result": {
    "transactionId": "txn_123",
    "amount": 120,
    "currency": "USD"
  },
  "errorMessage": null
}
```

---

## Gateway

### POST /api/gateway/request

Execute a request via a service adapter under an approved task.

**Request Body:**
```json
{
  "taskId": "...",
  "adapterType": "stripe",
  "action": "payWithCard",
  "payload": {
    "amount": 120,
    "currency": "USD",
    "description": "Electricity bill"
  },
  "adapterConfig": {
    "type": "stripe",
    "name": "Stripe Production",
    "enabled": true,
    "credentials": {
      "apiKey": "sk_live_..."
    },
    "options": {
      "apiVersion": "2024-06-20"
    }
  }
}
```

**Adapter Types:** `stripe`, `interactive_brokers`, `generic_oauth`

**Actions by Adapter:**

| Adapter | Actions |
|---|---|
| `stripe` | `payWithCard`, `getCardBalance`, `refundCharge`, `createCustomer` |
| `interactive_brokers` | `executeTrade`, `getPortfolio`, `getPositions`, `getAccountSummary`, `cancelOrder` |
| `generic_oauth` | `getBalance`, `transfer`, `getTransactions`, `getAccountInfo` |

**Response (201):**
```json
{
  "gatewayRequest": {
    "id": "...",
    "taskId": "...",
    "status": "completed",
    "adapterType": "stripe",
    "action": "payWithCard",
    "createdAt": "...",
    "executedAt": "...",
    "result": { ... },
    "errorMessage": null
  },
  "adapterResult": {
    "success": true,
    "data": {
      "paymentIntentId": "pi_123",
      "status": "succeeded"
    },
    "rawResponse": "..."
  }
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 403 | `TASK_NOT_APPROVED` | Task not approved yet |
| 403 | `ACTION_NOT_AUTHORIZED` | Action not in task's authorizedActions |
| 400 | `UNKNOWN_ACTION` | Action not recognized by any skill |
| 400 | `INVALID_PARAMETERS` | Missing or invalid parameters |

### GET /api/gateway/request/:id

Get gateway request status.

### GET /api/gateway/requests

List gateway requests (paginated).

**Query Parameters:**
- `taskId` — Filter by task
- `status` — Filter by status
- `limit`, `offset` — Pagination

---

## Audit

### GET /audit/log
### GET /api/audit

Immutable audit trail.

**Query Parameters:**
- `action` — Filter by action type
- `targetId` — Filter by target ID
- `severity` — Filter by severity (`info`, `warning`, `critical`)
- `limit`, `offset` — Pagination

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "action": "task_created",
      "severity": "info",
      "actor": "agent",
      "targetId": "...",
      "targetType": "task",
      "details": { "type": "card_payment", "riskScore": 15 },
      "success": true
    }
  ],
  "total": 1000,
  "page": 1,
  "pageSize": 50,
  "hasMore": true
}
```

**Audit Actions:**
- `secret_created`, `secret_read`, `secret_updated`, `secret_deleted`, `secret_revoked`
- `task_created`, `task_approved`, `task_rejected`, `task_executed`, `task_failed`, `task_cancelled`
- `approval_requested`, `approval_responded`
- `gateway_request_created`, `gateway_request_executed`, `gateway_request_failed`
- `system_start`, `system_stop`, `config_changed`
- `auth_success`, `auth_failure`

---

## Error Format

All errors follow this structure:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "type, description, and secretId required",
  "code": "MISSING_FIELDS"
}
```

Common error codes:

| Code | HTTP | Meaning |
|---|---|---|
| `MISSING_FIELDS` | 400 | Required fields missing |
| `SECRET_NOT_FOUND` | 404 | Secret does not exist |
| `TASK_NOT_FOUND` | 404 | Task does not exist |
| `TASK_NOT_APPROVED` | 403 | Task not approved yet |
| `ACTION_NOT_AUTHORIZED` | 403 | Action not in authorizedActions |
| `UNKNOWN_ACTION` | 400 | Action not recognized |
| `INVALID_PARAMETERS` | 400 | Parameter validation failed |
| `RATE_LIMITED` | 429 | Too many requests |
| `AUTH_MISSING` | 401 | Missing auth header |
| `AUTH_INVALID` | 401 | Invalid token |
