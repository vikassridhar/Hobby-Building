/**
 * Admin Dashboard UI
 * Single-page app embedded as HTML string — no static files needed
 * Dark theme, mobile responsive, Linear/Vercel inspired
 */

export function getAdminHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SecureVault Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0a;--surface:#141414;--surface2:#1e1e1e;--border:#2e2e2e;--text:#ededed;--text2:#888;--accent:#fff;--blue:#3b82f6;--green:#22c55e;--red:#ef4444;--yellow:#eab308;--radius:8px;--font:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
body{font-family:var(--font);background:var(--bg);color:var(--text);line-height:1.5;min-height:100vh}
a{color:var(--blue);text-decoration:none}
button{font-family:var(--font);cursor:pointer;border:none;border-radius:var(--radius);padding:8px 16px;font-size:14px;transition:opacity .15s}
button:hover{opacity:.85}
input,select,textarea{font-family:var(--font);background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:var(--radius);font-size:14px;width:100%}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--blue)}
.btn-primary{background:var(--text);color:var(--bg);font-weight:600}
.btn-danger{background:var(--red);color:#fff}
.btn-secondary{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
.btn-sm{padding:4px 10px;font-size:12px}

/* Layout */
.nav{display:flex;align-items:center;gap:24px;padding:16px 24px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg);z-index:100}
.nav-brand{font-weight:700;font-size:16px;letter-spacing:-.3px}
.nav-links{display:flex;gap:4px}
.nav-links a{padding:6px 12px;border-radius:var(--radius);color:var(--text2);font-size:13px;font-weight:500;transition:all .15s}
.nav-links a:hover,.nav-links a.active{color:var(--text);background:var(--surface2)}
.main{max-width:1200px;margin:0 auto;padding:24px}
.page{display:none}
.page.active{display:block}

/* Auth overlay */
.auth-overlay{position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;justify-content:center;z-index:1000}
.auth-box{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:32px;width:100%;max-width:380px}
.auth-box h2{font-size:18px;margin-bottom:4px}
.auth-box p{color:var(--text2);font-size:13px;margin-bottom:20px}
.auth-box input{margin-bottom:12px}
.auth-box button{width:100%}

/* Cards */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:12px}
.card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.card-title{font-size:14px;font-weight:600}

/* Stat grid */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px}
.stat-label{font-size:12px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.stat-value{font-size:28px;font-weight:700;letter-spacing:-.5px}
.stat-detail{font-size:12px;color:var(--text2);margin-top:4px}

/* Tables */
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:10px 12px;color:var(--text2);font-weight:500;border-bottom:1px solid var(--border);font-size:12px;text-transform:uppercase;letter-spacing:.3px}
td{padding:10px 12px;border-bottom:1px solid var(--border)}
tr:hover td{background:var(--surface2)}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
.badge-green{background:#22c55e20;color:var(--green)}
.badge-red{background:#ef444420;color:var(--red)}
.badge-yellow{background:#eab30820;color:var(--yellow)}
.badge-blue{background:#3b82f620;color:var(--blue)}

/* Forms */
.form-group{margin-bottom:16px}
.form-group label{display:block;font-size:12px;color:var(--text2);margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.toggle{display:flex;align-items:center;gap:8px;cursor:pointer}
.toggle input{width:auto}
.toggle-label{font-size:14px}

/* Warning */
.warning-box{background:#ef444415;border:1px solid #ef444440;border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--red)}

/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:200}
.modal{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto}
.modal h3{margin-bottom:16px;font-size:16px}
.modal .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}

/* Responsive */
@media(max-width:640px){
  .nav{flex-wrap:wrap;gap:12px;padding:12px 16px}
  .nav-links{overflow-x:auto;width:100%;padding-bottom:4px}
  .main{padding:16px}
  .stats{grid-template-columns:1fr 1fr}
  .form-row{grid-template-columns:1fr}
}

/* Utility */
.mt-4{margin-top:16px}.mt-2{margin-top:8px}.mb-4{margin-bottom:16px}.mb-2{margin-bottom:8px}
.text-sm{font-size:13px}.text-xs{font-size:12px}.text-muted{color:var(--text2)}
.flex{display:flex}.gap-2{gap:8px}.gap-4{gap:16px}.items-center{align-items:center}.justify-between{justify-content:space-between}
.hidden{display:none!important}
</style>
</head>
<body>

<!-- Auth Overlay -->
<div id="authOverlay" class="auth-overlay">
  <div class="auth-box">
    <h2>🔐 SecureVault</h2>
    <p>Enter your agent token to access the admin dashboard</p>
    <input type="password" id="authToken" placeholder="Agent token" autocomplete="off">
    <button class="btn-primary" onclick="doAuth()">Unlock</button>
    <p id="authError" class="text-sm text-muted mt-2" style="color:var(--red);display:none"></p>
  </div>
</div>

<!-- Nav -->
<nav class="nav" id="mainNav" style="display:none">
  <div class="nav-brand">🔐 SecureVault</div>
  <div class="nav-links">
    <a href="#" onclick="showPage('dashboard')" class="active" data-page="dashboard">Dashboard</a>
    <a href="#" onclick="showPage('secrets')" data-page="secrets">Secrets</a>
    <a href="#" onclick="showPage('rules')" data-page="rules">Rules</a>
    <a href="#" onclick="showPage('audit')" data-page="audit">Audit</a>
    <a href="#" onclick="showPage('settings')" data-page="settings">Settings</a>
  </div>
</nav>

<div class="main" id="mainContent" style="display:none">

<!-- Dashboard Page -->
<div id="page-dashboard" class="page active">
  <div class="stats" id="statsGrid"></div>
  <div class="card">
    <div class="card-header">
      <div class="card-title">Recent Activity</div>
      <button class="btn-secondary btn-sm" onclick="showPage('audit')">View All</button>
    </div>
    <div class="table-wrap"><table id="recentAudit"><thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Status</th><th>Details</th></tr></thead><tbody></tbody></table></div>
  </div>
</div>

<!-- Secrets Page -->
<div id="page-secrets" class="page">
  <div class="flex justify-between items-center mb-4">
    <h2 style="font-size:18px">Secrets</h2>
    <button class="btn-primary btn-sm" onclick="showAddSecretModal()">+ Add Secret</button>
  </div>
  <div class="table-wrap">
    <table id="secretsTable">
      <thead><tr><th>Name</th><th>Category</th><th>Last 4</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>
</div>

<!-- Rules Page -->
<div id="page-rules" class="page">
  <h2 style="font-size:18px" class="mb-4">Approval Rules</h2>
  <div id="rulesContent"></div>
</div>

<!-- Audit Page -->
<div id="page-audit" class="page">
  <div class="flex justify-between items-center mb-4">
    <h2 style="font-size:18px">Audit Log</h2>
    <button class="btn-secondary btn-sm" onclick="exportAudit()">⬇ Export CSV</button>
  </div>
  <div class="card mb-4">
    <div class="form-row">
      <div class="form-group"><label>Action</label><select id="auditFilterAction"><option value="">All</option><option value="secret_created">Secret Created</option><option value="secret_read">Secret Read</option><option value="task_created">Task Created</option><option value="task_approved">Task Approved</option><option value="auth_success">Auth Success</option><option value="auth_failure">Auth Failure</option><option value="config_changed">Config Changed</option></select></div>
      <div class="form-group"><label>Severity</label><select id="auditFilterSeverity"><option value="">All</option><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></select></div>
    </div>
    <button class="btn-secondary btn-sm" onclick="loadAudit()">Apply Filters</button>
  </div>
  <div class="table-wrap">
    <table id="auditTable">
      <thead><tr><th>Time</th><th>Action</th><th>Severity</th><th>Actor</th><th>Target</th><th>Status</th></tr></thead><tbody></tbody>
    </table>
  </div>
  <div class="flex justify-between items-center mt-4">
    <span id="auditPageInfo" class="text-sm text-muted"></span>
    <div class="flex gap-2">
      <button class="btn-secondary btn-sm" onclick="auditPrev()">← Prev</button>
      <button class="btn-secondary btn-sm" onclick="auditNext()">Next →</button>
    </div>
  </div>
</div>

<!-- Settings Page -->
<div id="page-settings" class="page">
  <h2 style="font-size:18px" class="mb-4">Settings</h2>
  <div id="settingsContent"></div>
</div>

</div><!-- /main -->

<!-- Modal -->
<div id="modalOverlay" class="modal-overlay" style="display:none" onclick="if(event.target===this)closeModal()">
  <div class="modal" id="modalContent"></div>
</div>

<script>
const API = '';
let token = localStorage.getItem('sv_token') || '';
let auditPage = 0;
let pollTimer = null;

// ─── Auth ───
async function doAuth() {
  token = document.getElementById('authToken').value.trim();
  if (!token) return;
  try {
    const r = await api('GET', '/api/admin/status');
    if (r.uptime !== undefined) {
      localStorage.setItem('sv_token', token);
      document.getElementById('authOverlay').style.display = 'none';
      document.getElementById('mainNav').style.display = 'flex';
      document.getElementById('mainContent').style.display = 'block';
      init();
    }
  } catch(e) {
    document.getElementById('authError').textContent = 'Invalid token';
    document.getElementById('authError').style.display = 'block';
  }
}

async function api(method, path, body) {
  const opts = { method, headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  if (r.status === 401) { localStorage.removeItem('sv_token'); location.reload(); }
  if (r.status === 204) return null;
  return r.json();
}

// ─── Init ───
async function init() {
  await Promise.all([loadDashboard(), loadSecrets(), loadRules(), loadSettings()]);
  startPolling();
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => loadDashboard(), 5000);
}

// ─── Navigation ───
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
  if (page === 'audit') loadAudit();
  if (page === 'dashboard') loadDashboard();
  if (page === 'secrets') loadSecrets();
  if (page === 'rules') loadRules();
  if (page === 'settings') loadSettings();
  return false;
}

// ─── Dashboard ───
async function loadDashboard() {
  try {
    const s = await api('GET', '/api/admin/status');
    const statsHtml = [
      { label: 'Uptime', value: formatUptime(s.uptime), detail: 'v' + s.version },
      { label: 'Secrets', value: s.totalSecrets, detail: 'encrypted at rest' },
      { label: 'Tasks', value: s.totalTasks, detail: Object.entries(s.tasksByStatus || {}).map(([k,v]) => k + ':' + v).join(', ') || 'none' },
      { label: 'Pending', value: s.pendingApprovals, detail: s.pendingApprovals > 0 ? 'needs attention' : 'all clear', cls: s.pendingApprovals > 0 ? 'color:var(--yellow)' : 'color:var(--green)' },
    ].map(st => '<div class="stat"><div class="stat-label">' + st.label + '</div><div class="stat-value" style="' + (st.cls||'') + '">' + st.value + '</div><div class="stat-detail">' + st.detail + '</div></div>').join('');
    document.getElementById('statsGrid').innerHTML = statsHtml;

    const audit = await api('GET', '/api/admin/audit?limit=20');
    const tbody = document.querySelector('#recentAudit tbody');
    tbody.innerHTML = (audit.data || []).map(e => '<tr><td>' + fmtTime(e.timestamp) + '</td><td>' + e.action + '</td><td>' + e.actor + '</td><td>' + (e.success ? '<span class="badge badge-green">ok</span>' : '<span class="badge badge-red">fail</span>') + '</td><td class="text-xs text-muted">' + (e.targetId || '-') + '</td></tr>').join('');
  } catch(e) { console.error(e); }
}

// ─── Secrets ───
async function loadSecrets() {
  try {
    const r = await api('GET', '/api/secrets?limit=200');
    const tbody = document.querySelector('#secretsTable tbody');
    tbody.innerHTML = r.data.map(s => '<tr><td>' + esc(s.name) + '</td><td><span class="badge badge-blue">' + s.category + '</span></td><td>' + (s.metadata?.lastFour || '••••') + '</td><td><span class="badge badge-' + (s.status==='active'?'green':'red') + '">' + s.status + '</span></td><td class="text-xs text-muted">' + fmtTime(s.createdAt) + '</td><td><button class="btn-secondary btn-sm" onclick="viewSecret(\\'' + s.id + '\\')">View</button> <button class="btn-danger btn-sm" onclick="deleteSecret(\\'' + s.id + '\\', \\'' + esc(s.name) + '\\')">Delete</button></td></tr>').join('');
  } catch(e) { console.error(e); }
}

async function viewSecret(id) {
  try {
    const s = await api('GET', '/api/secrets/' + id);
    openModal('<h3>Secret: ' + esc(s.name) + '</h3><div class="form-group"><label>Category</label><div>' + s.category + '</div></div><div class="form-group"><label>Plaintext</label><div style="background:var(--surface2);padding:8px 12px;border-radius:var(--radius);font-family:monospace;word-break:break-all">' + esc(s.plaintext) + '</div></div><div class="actions"><button class="btn-secondary" onclick="closeModal()">Close</button></div>');
  } catch(e) { alert('Failed to decrypt: ' + e.message); }
}

async function deleteSecret(id, name) {
  if (!confirm('Delete secret "' + name + '"? This cannot be undone.')) return;
  await api('DELETE', '/api/secrets/' + id);
  loadSecrets();
  loadDashboard();
}

function showAddSecretModal() {
  openModal('<h3>Add Secret</h3><div class="form-group"><label>Name</label><input id="newSecretName" placeholder="My API Key"></div><div class="form-group"><label>Category</label><select id="newSecretCategory"><option value="api_key">API Key</option><option value="bank_account">Bank Account</option><option value="credit_card">Credit Card</option><option value="password">Password</option><option value="note">Note</option></select></div><div class="form-group"><label>Value (plaintext)</label><textarea id="newSecretValue" rows="3" placeholder="sk-..."></textarea></div><div class="actions"><button class="btn-secondary" onclick="closeModal()">Cancel</button><button class="btn-primary" onclick="addSecret()">Create</button></div>');
}

async function addSecret() {
  const name = document.getElementById('newSecretName').value.trim();
  const category = document.getElementById('newSecretCategory').value;
  const plaintext = document.getElementById('newSecretValue').value.trim();
  if (!name || !plaintext) return alert('Name and value required');
  await api('POST', '/api/secrets', { name, category, plaintext });
  closeModal();
  loadSecrets();
  loadDashboard();
}

// ─── Rules ───
async function loadRules() {
  try {
    const r = await api('GET', '/api/admin/rules');
    document.getElementById('rulesContent').innerHTML =
      '<div class="card"><div class="card-header"><div class="card-title">Auto-Execute</div></div><label class="toggle"><input type="checkbox" id="ruleAutoExec" ' + (r.autoExecuteEnabled ? 'checked' : '') + ' onchange="updateRules()"><span class="toggle-label">Enable auto-execute</span></label><div class="form-group mt-4"><label>Max Amount (' + r.autoExecuteCurrency + ')</label><input type="number" id="ruleMaxAmount" value="' + r.autoExecuteMaxAmount + '" onchange="updateRules()"></div></div>' +
      '<div class="card"><div class="card-header"><div class="card-title">Per-Action Rules</div></div>' + Object.entries(r.perActionRules).map(([k,v]) => '<div class="flex justify-between items-center mb-2"><span class="text-sm">' + k + '</span><div class="flex gap-2 items-center"><label class="toggle text-sm"><input type="checkbox" data-action="' + k + '" class="actionAutoApprove" ' + (v.autoApprove ? 'checked' : '') + ' onchange="updateRules()"> auto</label><input type="number" style="width:80px" data-action="' + k + '" class="actionMaxAmount" value="' + v.maxAmount + '" onchange="updateRules()"></div></div>').join('') + '</div>' +
      '<div class="card"><div class="card-header"><div class="card-title">Trading Rules</div></div><div class="form-group"><label>Position Size Limit (%)</label><input type="number" id="rulePosLimit" value="' + r.tradingPositionLimit + '" onchange="updateRules()"></div><label class="toggle mt-2"><input type="checkbox" id="ruleSellApproval" ' + (r.tradingSellRequiresApproval ? 'checked' : '') + ' onchange="updateRules()"><span class="toggle-label">Always require approval for SELL</span></label></div>';
  } catch(e) { console.error(e); }
}

async function updateRules() {
  const rules = {
    autoExecuteEnabled: document.getElementById('ruleAutoExec')?.checked,
    autoExecuteMaxAmount: parseInt(document.getElementById('ruleMaxAmount')?.value) || 100,
    perActionRules: {},
    tradingPositionLimit: parseInt(document.getElementById('rulePosLimit')?.value) || 25,
    tradingSellRequiresApproval: document.getElementById('ruleSellApproval')?.checked,
  };
  document.querySelectorAll('.actionAutoApprove').forEach(el => {
    const action = el.dataset.action;
    const maxEl = document.querySelector('.actionMaxAmount[data-action="' + action + '"]');
    rules.perActionRules[action] = { autoApprove: el.checked, maxAmount: parseInt(maxEl?.value) || 0 };
  });
  await api('PUT', '/api/admin/rules', rules);
}

// ─── Audit ───
async function loadAudit() {
  const action = document.getElementById('auditFilterAction')?.value || '';
  const severity = document.getElementById('auditFilterSeverity')?.value || '';
  const limit = 50;
  const offset = auditPage * limit;
  let url = '/api/admin/audit?limit=' + limit + '&offset=' + offset;
  if (action) url += '&action=' + action;
  if (severity) url += '&severity=' + severity;

  const r = await api('GET', url);
  const tbody = document.querySelector('#auditTable tbody');
  tbody.innerHTML = (r.data || []).map(e => {
    const sevClass = e.severity === 'critical' ? 'red' : e.severity === 'warning' ? 'yellow' : 'green';
    const detail = esc(JSON.stringify(e));
    return '<tr style="cursor:pointer" onclick="showAuditDetail(this.dataset.e)" data-e="' + detail + '"><td class="text-xs">' + fmtTime(e.timestamp) + '</td><td>' + e.action + '</td><td><span class="badge badge-' + sevClass + '">' + e.severity + '</span></td><td>' + e.actor + '</td><td class="text-xs text-muted">' + (e.targetId || '-') + '</td><td>' + (e.success ? '<span class="badge badge-green">✓</span>' : '<span class="badge badge-red">✗</span>') + '</td></tr>';
  }).join('');
  document.getElementById('auditPageInfo').textContent = 'Page ' + (auditPage + 1) + ' · ' + (r.data?.length || 0) + ' entries';
}

function showAuditDetail(json) {
  try {
    const e = JSON.parse(json);
    openModal('<h3>Audit Entry</h3><div class="card"><pre style="white-space:pre-wrap;font-size:12px;font-family:monospace">' + esc(JSON.stringify(e, null, 2)) + '</pre></div><div class="actions"><button class="btn-secondary" onclick="closeModal()">Close</button></div>');
  } catch(ex) {}
}

function auditPrev() { if (auditPage > 0) { auditPage--; loadAudit(); } }
function auditNext() { auditPage++; loadAudit(); }

async function exportAudit() {
  const action = document.getElementById('auditFilterAction')?.value || '';
  const severity = document.getElementById('auditFilterSeverity')?.value || '';
  let url = '/api/admin/audit/export?';
  if (action) url += 'action=' + action + '&';
  if (severity) url += 'severity=' + severity;
  const r = await fetch(API + url, { headers: { Authorization: 'Bearer ' + token } });
  const blob = await r.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'securevault-audit.csv';
  a.click();
}

// ─── Settings ───
async function loadSettings() {
  try {
    const c = await api('GET', '/api/admin/config');
    document.getElementById('settingsContent').innerHTML =
      '<div class="card"><div class="card-header"><div class="card-title">Trading</div></div>' +
      (c.tradingMode === 'live' ? '<div class="warning-box">⚠️ LIVE TRADING MODE — Real money is at risk</div>' : '') +
      '<div class="form-group"><label>Trading Mode</label><select id="cfgTradingMode"><option value="paper"' + (c.tradingMode === 'paper' ? ' selected' : '') + '>Paper (Safe)</option><option value="live"' + (c.tradingMode === 'live' ? ' selected' : '') + '>Live (Real Money)</option></select></div>' +
      '<div class="form-row"><div class="form-group"><label>Approval Threshold ($)</label><input type="number" id="cfgThreshold" value="' + c.tradeApprovalThreshold + '"></div><div class="form-group"><label>Position Limit (%)</label><input type="number" id="cfgPosLimit" value="' + c.tradeMaxPositionPercent + '"></div></div></div>' +
      '<div class="card"><div class="card-header"><div class="card-title">Server</div></div><div class="form-row"><div class="form-group"><label>Environment</label><div class="text-sm">' + c.nodeEnv + '</div></div><div class="form-group"><label>Port</label><div class="text-sm">' + c.gatewayPort + '</div></div></div><div class="form-group"><label>Timezone</label><input id="cfgTimezone" value="' + c.riskTimezone + '"></div><div class="form-row"><div class="form-group"><label>TLS</label><div class="text-sm">' + (c.tlsEnabled ? '✅ Enabled' : '❌ Disabled') + '</div></div><div class="form-group"><label>Telegram</label><div class="text-sm">' + (c.telegramConfigured ? '✅ Configured' : '❌ Not set') + '</div></div></div></div>' +
      '<button class="btn-primary mt-4" onclick="saveSettings()">Save Settings</button>';
  } catch(e) { console.error(e); }
}

async function saveSettings() {
  const mode = document.getElementById('cfgTradingMode').value;
  if (mode === 'live' && !confirm('⚠️ Switch to LIVE trading? Real money will be used.')) return;
  await api('PUT', '/api/admin/config', {
    tradingMode: mode,
    tradeApprovalThreshold: parseInt(document.getElementById('cfgThreshold').value),
    tradeMaxPositionPercent: parseInt(document.getElementById('cfgPosLimit').value),
    riskTimezone: document.getElementById('cfgTimezone').value,
  });
  loadSettings();
  alert('Settings saved');
}

// ─── Modal ───
function openModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modalOverlay').style.display = 'flex';
}
function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }

// ─── Helpers ───
function esc(s) { const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }
function fmtTime(ts) { if (!ts) return '-'; const d = new Date(ts); return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }
function formatUptime(s) { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return h > 0 ? h + 'h ' + m + 'm' : m + 'm'; }

// ─── Boot ───
if (token) {
  api('GET', '/api/admin/status').then(() => {
    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('mainNav').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'block';
    init();
  }).catch(() => { localStorage.removeItem('sv_token'); token = ''; });
}
</script>
</body>
</html>`;
}
