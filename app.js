/**
 * Hobby Tracker — app.js
 *
 * Data model (localStorage key "hobbyTracker"):
 *   {
 *     hobbies:  [{ id, name, color }],
 *     sessions: [{ id, hobbyId, minutes, date, note }]
 *   }
 */

const STORAGE_KEY = "hobbyTracker";

// ── State ──────────────────────────────────────────────────────────────────────
let state = load();

// ── DOM refs ───────────────────────────────────────────────────────────────────
const addHobbyForm  = document.getElementById("add-hobby-form");
const hobbyNameIn   = document.getElementById("hobby-name");
const hobbyColorIn  = document.getElementById("hobby-color");
const hobbiesList   = document.getElementById("hobbies-list");
const noHobbiesMsg  = document.getElementById("no-hobbies-msg");

const logForm       = document.getElementById("log-form");
const logHobbySelect= document.getElementById("log-hobby");
const logMinutesIn  = document.getElementById("log-minutes");
const logDateIn     = document.getElementById("log-date");
const logNoteIn     = document.getElementById("log-note");

const statsGrid     = document.getElementById("stats-grid");
const noStatsMsg    = document.getElementById("no-stats-msg");

const sessionsList  = document.getElementById("sessions-list");
const noSessionsMsg = document.getElementById("no-sessions-msg");

const toast         = document.getElementById("toast");

// ── Init ───────────────────────────────────────────────────────────────────────
logDateIn.value = todayString();
render();

// ── Event listeners ────────────────────────────────────────────────────────────
addHobbyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = hobbyNameIn.value.trim();
  if (!name) return;
  if (state.hobbies.some((h) => h.name.toLowerCase() === name.toLowerCase())) {
    showToast("That hobby already exists!");
    return;
  }
  state.hobbies.push({ id: uid(), name, color: hobbyColorIn.value });
  save();
  render();
  hobbyNameIn.value = "";
  showToast(`"${name}" added 🎉`);
});

logForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const hobbyId = logHobbySelect.value;
  const minutes = parseInt(logMinutesIn.value, 10);
  const date    = logDateIn.value;
  const note    = logNoteIn.value.trim();
  if (!hobbyId || !minutes || !date) return;

  state.sessions.unshift({ id: uid(), hobbyId, minutes, date, note });
  save();
  render();
  logMinutesIn.value = "";
  logNoteIn.value = "";
  const hobby = state.hobbies.find((h) => h.id === hobbyId);
  showToast(`Logged ${formatMins(minutes)} for "${hobby ? hobby.name : "hobby"}" ✓`);
});

// ── Render ─────────────────────────────────────────────────────────────────────
function render() {
  renderHobbies();
  renderLogSelect();
  renderStats();
  renderSessions();
}

function renderHobbies() {
  noHobbiesMsg.style.display = state.hobbies.length ? "none" : "";

  // Remove existing chips (keep the empty message node)
  Array.from(hobbiesList.querySelectorAll(".hobby-chip")).forEach((el) => el.remove());

  state.hobbies.forEach((hobby) => {
    const chip = document.createElement("div");
    chip.className = "hobby-chip";
    chip.style.borderColor = hobby.color;

    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = hobby.color;

    const label = document.createElement("span");
    label.textContent = hobby.name;

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.title = "Remove hobby";
    del.textContent = "✕";
    del.setAttribute("aria-label", `Remove ${hobby.name}`);
    del.addEventListener("click", () => deleteHobby(hobby.id));

    chip.append(swatch, label, del);
    hobbiesList.appendChild(chip);
  });
}

function renderLogSelect() {
  const prev = logHobbySelect.value;
  // clear all options except the placeholder
  while (logHobbySelect.options.length > 1) logHobbySelect.remove(1);

  state.hobbies.forEach((hobby) => {
    const opt = document.createElement("option");
    opt.value = hobby.id;
    opt.textContent = hobby.name;
    logHobbySelect.appendChild(opt);
  });

  // restore previous selection if still valid
  if (prev && state.hobbies.some((h) => h.id === prev)) {
    logHobbySelect.value = prev;
  }
}

function renderStats() {
  // Build totals per hobby
  const totals = {};
  state.sessions.forEach(({ hobbyId, minutes }) => {
    totals[hobbyId] = (totals[hobbyId] || { minutes: 0, count: 0 });
    totals[hobbyId].minutes += minutes;
    totals[hobbyId].count += 1;
  });

  const hasStats = Object.keys(totals).length > 0;
  noStatsMsg.style.display = hasStats ? "none" : "";

  // Remove existing stat cards
  Array.from(statsGrid.querySelectorAll(".stat-card")).forEach((el) => el.remove());

  state.hobbies.forEach((hobby) => {
    if (!totals[hobby.id]) return;
    const { minutes, count } = totals[hobby.id];

    const card = document.createElement("div");
    card.className = "stat-card";
    card.style.background = hobby.color;

    card.innerHTML = `
      <div class="stat-name">${escHtml(hobby.name)}</div>
      <div class="stat-total">${formatMins(minutes)}</div>
      <div class="stat-sessions">${count} session${count !== 1 ? "s" : ""}</div>
    `;
    statsGrid.appendChild(card);
  });
}

function renderSessions() {
  const hasSessions = state.sessions.length > 0;
  noSessionsMsg.style.display = hasSessions ? "none" : "";

  // Remove existing rows
  Array.from(sessionsList.querySelectorAll(".session-row")).forEach((el) => el.remove());

  // Show most recent 30
  state.sessions.slice(0, 30).forEach((session) => {
    const hobby = state.hobbies.find((h) => h.id === session.hobbyId);
    const color = hobby ? hobby.color : "#94a3b8";
    const name  = hobby ? hobby.name  : "Unknown";

    const row = document.createElement("div");
    row.className = "session-row";
    row.innerHTML = `
      <span class="s-dot" style="background:${color}"></span>
      <span class="s-name">${escHtml(name)}</span>
      <span class="s-mins">${formatMins(session.minutes)}</span>
      ${session.note ? `<span class="s-note" title="${escHtml(session.note)}">${escHtml(session.note)}</span>` : ""}
      <span class="s-date">${formatDate(session.date)}</span>
    `;
    sessionsList.appendChild(row);
  });
}

// ── Actions ────────────────────────────────────────────────────────────────────
function deleteHobby(id) {
  const hobby = state.hobbies.find((h) => h.id === id);
  state.hobbies   = state.hobbies.filter((h) => h.id !== id);
  state.sessions  = state.sessions.filter((s) => s.hobbyId !== id);
  save();
  render();
  if (hobby) showToast(`"${hobby.name}" removed.`);
}

// ── Persistence ────────────────────────────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        hobbies:  Array.isArray(parsed.hobbies)  ? parsed.hobbies  : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      };
    }
  } catch (_) { /* ignore */ }
  return { hobbies: [], sessions: [] };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatMins(mins) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Toast ──────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}
