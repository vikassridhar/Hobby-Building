# OTA App - Travel Booking Mobile App

A mobile-first travel booking application built with React, Capacitor, and Tailwind CSS. Features hotel search, booking flow with multi-step checkout, trip management, and user account pages.

## Features

- 🔍 Hotel search with filters and results
- 🏨 Hotel detail pages with room selection
- 📱 Multi-step booking flow (Guest Info → Payment → Review)
- 🎫 Booking confirmation with reference codes
- 🧳 Trip management (upcoming & past trips)
- 👤 User account with profile, preferences, and payments
- 📱 Native iOS & Android via Capacitor
- 🌙 Dark mode support

## Tech Stack

- **Frontend:** React 19, React Router, Tailwind CSS
- **Mobile:** Capacitor (iOS & Android)
- **Build:** Vite
- **Styling:** Tailwind CSS with custom ocean theme

## Project Structure

```
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages (Home, Search, Hotel, Book, etc.)
│   ├── data/           # Mock hotel data
│   ├── context/        # React context (BookingContext)
│   ├── plugins/        # Capacitor plugins
│   └── App.jsx         # Main app with routing
├── android/            # Capacitor Android project
├── ios/                # Capacitor iOS project
└── public/             # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Install & Run

```bash
npm install
npm run dev
```

### Build for Production

```bash
npm run build
```

### Mobile (Capacitor)

```bash
# iOS
npx cap sync ios
npx cap open ios

# Android
npx cap sync android
npx cap open android
```

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |

## License

MIT
