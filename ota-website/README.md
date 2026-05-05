# AuraTravel — OTA Website

A hobby **Online Travel Agency (OTA)** website built with React, TypeScript, and Vite. Features a luxury hotel search and booking flow with an **AI-powered concierge chatbot** backed by a local LLM (e.g., Gemma via vLLM) and Brave Search for real-time web lookups.

## ✨ Features

- **Property Search** — Filter by destination, price, star rating, property type, and guest rating
- **Property Details** — Photo galleries, amenities, room selection, guest reviews
- **AI Concierge** — Ask questions about any property; powered by a local LLM with web search tool-calling
- **Booking Flow** — Guest info form → payment simulation → confirmation with reference code
- **Responsive Design** — Mobile-first layout with luxury aesthetic (Outfit + Playfair Display fonts)
- **Docker Support** — Multi-stage Docker build with optional Nginx reverse proxy

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | Plain CSS with CSS variables |
| Routing | React Router DOM 7 |
| Icons | Lucide React |
| Backend Proxy | Express 5 (Node.js) |
| AI | OpenAI-compatible LLM API (Gemma via vLLM) |
| Web Search | Brave Search API |
| Containers | Docker + Docker Compose |
| Reverse Proxy | Nginx (Alpine) |

## 📦 Project Structure

```
├── public/               # Static assets
├── src/
│   ├── assets/           # Images, SVGs
│   ├── components/       # Navbar, Footer, PropertyCard
│   ├── context/          # BookingContext (global booking state)
│   ├── data/             # mockData.json (sample hotel listings)
│   ├── pages/            # Home, SearchResults, PropertyDetails,
│   │                     # BookingForm, Payment, Confirmation
│   ├── types/            # TypeScript interfaces
│   ├── App.tsx           # Root component with routing
│   └── main.tsx          # Entry point
├── proxy-server.js       # Express API proxy (LLM + Brave Search)
├── vite.config.js        # Vite config with API proxy
├── Dockerfile            # Multi-stage production build
├── docker-compose.yml    # Full stack (app + Nginx)
├── nginx.conf            # Nginx config for serving frontend + proxying API
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm (or npm)
- A running OpenAI-compatible LLM endpoint (e.g., vLLM with Gemma loaded on port 8000)
- A [Brave Search API key](https://brave.com/search/api/)

### 1. Clone & Install

```bash
git clone https://github.com/vikassridhar/Hobby-Building.git
cd Hobby-Building/ota-website
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
LLM_URL=http://localhost:8000/v1/chat/completions
BRAVE_API_KEY=your_brave_api_key_here
PORT=3001
```

### 3. Run in Development

Start the proxy server and Vite dev server together:

```bash
# Option A: Use the start script (runs both)
./start.sh

# Option B: Run separately
node proxy-server.js &
pnpm dev
```

- Frontend: http://localhost:5173
- API Proxy: http://localhost:3001

### 4. Run with Docker

```bash
# Build and start all services
docker-compose up -d

# Or use the deploy script
./deploy-docker.sh
```

- Website: http://localhost:8080
- API: http://localhost:3001

## 🤖 AI Concierge

The property detail page includes an "Ask About This Property" chat widget. It:

1. Sends guest questions to the Express proxy server
2. The proxy forwards to your local LLM with a system prompt containing property details
3. If the LLM triggers a `web_search` tool call, the proxy queries Brave Search and feeds results back
4. The LLM's final answer is displayed in the chat

## 📝 Notes

- This is a **hobby project** — no real payment processing, no real bookings
- Hotel data is entirely mock/simulated
- The AI concierge requires a running LLM endpoint (tested with Gemma 4 via vLLM)
- Brave Search API has a free tier (2,000 queries/month)

## 📄 License

MIT
