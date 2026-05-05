# 🎯 Hobby Tracker

A lightweight, single-page web app to track your hobbies and the time you invest in them — no server, no sign-up, all data stays in your browser.

## Features

- **Add hobbies** with a custom colour so they're easy to tell apart
- **Log sessions** — record how many minutes you spent and add an optional note
- **Stats panel** — see total time and session count per hobby at a glance
- **Recent sessions** — a scrollable log of your last 30 sessions
- **Persistent** — everything is saved to `localStorage`; your data survives page reloads
- **Zero dependencies** — plain HTML, CSS, and JavaScript; opens straight from the file system

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/vikassridhar/Hobby-Building.git
   cd Hobby-Building
   ```
2. Open `index.html` directly in your browser (double-click the file, or run a local server):
   ```bash
   # Python 3 — quick local server
   python3 -m http.server 8080
   # then visit http://localhost:8080
   ```

## How to Use

| Step | Action |
|------|--------|
| 1 | Type a hobby name, pick a colour, and click **Add Hobby** |
| 2 | Select the hobby from the dropdown, enter the number of minutes, choose a date, and click **Log Session** |
| 3 | Watch the **Stats** panel update in real time |
| 4 | To remove a hobby (and all its sessions), click the **✕** on its chip |

## Project Structure

```
Hobby-Building/
├── index.html   — page layout & markup
├── style.css    — responsive, modern styling
├── app.js       — all application logic & localStorage persistence
└── README.md
```

## License

MIT — do whatever you like with it.
