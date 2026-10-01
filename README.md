# 🚚 Real-Time Delivery Tracking System (DTS)

A production-ready, full-stack real-time delivery tracking platform with three portals: **Customer**, **Driver**, and **Admin**. Features live GPS tracking via WebSockets, animated map markers, delivery state machine, role-based auth, and GPS simulation mode for demos.

---

## 🎯 Features

### Customer Portal
- Track active delivery in real time on an interactive map
- See driver's live location (animated marker)
- Delivery timeline with status progression
- ETA calculation updated every 2 seconds
- Mobile-optimized with bottom sheet UI
- Delivery history
- In-app notifications

### Driver Dashboard
- Accept/reject deliveries
- Real browser GPS via `navigator.geolocation.watchPosition`
- **GPS Simulation Mode** for demos — moves driver along predefined route
- Live status update buttons
- Today's earnings and statistics
- Route visualization on map

### Admin Operations Center
- Live fleet map showing all active drivers with color-coded markers
- Real-time stats (active deliveries, available drivers, delayed)
- Delivery management with assign-driver capability
- 7-day analytics dashboard
- Customer and driver management

---

## 🏗️ Architecture

```
real-time-dts/
├── packages/
│   ├── shared/         # Shared TypeScript types, enums, constants
│   ├── backend/        # Express + Socket.IO API server
│   │   ├── src/
│   │   │   ├── routes/       # REST API routes
│   │   │   ├── sockets/      # Socket.IO handlers
│   │   │   ├── services/     # ETA, GPS simulation, notifications
│   │   │   ├── middleware/   # Auth (JWT), rate limiting
│   │   │   └── db/           # Prisma client + seed
│   │   └── prisma/
│   └── frontend/       # React + Vite + Tailwind
│       └── src/
│           ├── pages/        # All portal pages
│           ├── components/   # Reusable UI components
│           ├── services/     # API client, Socket.IO client
│           ├── stores/       # Zustand state management
│           └── hooks/        # Custom React hooks
└── README.md
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| State | Zustand |
| Maps | Leaflet.js + OpenStreetMap (free, no API key) |
| Real-time | Socket.IO |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite (dev) / PostgreSQL (prod) via Prisma ORM |
| Auth | JWT + bcrypt |
| Tests | Vitest, Supertest |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (v24 recommended)
- npm 9+

### 1. Clone and Install

```bash
git clone <repo-url>
cd real-time-dts
npm install
```

### 2. Configure Environment

Backend (already pre-configured for dev):
```bash
# packages/backend/.env is already created with dev defaults
# Edit if needed:
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-here"
PORT=4000
```

### 3. Setup Database & Seed

```bash
# Generate Prisma client + create SQLite database
cd packages/backend
npx prisma db push
npm run seed
```

Or from root:
```bash
npm run seed
```

### 4. Start Development Servers

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd packages/backend
npm run dev
```
Backend runs at `http://localhost:4000`

**Terminal 2 — Frontend:**
```bash
cd packages/frontend
npm run dev
```
Frontend runs at `http://localhost:5173`

---

## 🎭 Demo Accounts

| Role | Email | Password |
|---|---|---|
| 🔑 Admin | `admin@dts.dev` | `Admin@123` |
| 🚴 Driver | `driver@dts.dev` | `Driver@123` |
| 📦 Customer | `customer@dts.dev` | `Customer@123` |

---

## 🗺️ Demo Flow — Real-Time Tracking

This demonstrates the core real-time tracking feature:

1. **Tab 1:** Log in as **Customer** → Go to Dashboard → Click on an active delivery → Note the tracking URL (`/track/DLV-XXXXXXXX`)

2. **Tab 2:** Log in as **Driver** → Enable **Simulation Mode** → Select a route → Click **Start Simulation**

3. Watch Tab 1 update in real time as the driver marker moves along the route!

4. **Tab 3 (optional):** Log in as **Admin** → See fleet view with all drivers moving simultaneously

---

## 🔌 Real-Time Architecture

```
Driver App (Tab 2)
    ↓ GPS/Simulation tick (every 2s)
    ↓ Socket.IO emit: driver:location:update
    ↓
Backend Socket.IO Server
    ↓ Throttle (max 1 update / 2s)
    ↓ Persist to LocationUpdate table
    ↓ Calculate ETA (Haversine)
    ↓ Broadcast to rooms:
        delivery:{id}  →  Customer App (Tab 1)
        admin          →  Admin App (Tab 3)
    ↓
Customer App
    ↓ Receive driver:location event
    ↓ Animate map marker to new position
    ↓ Update ETA display
    ↓ Show "Last updated X seconds ago"
```

---

## 📡 API Reference

### Authentication
```
POST /api/auth/register    Register new user (CUSTOMER or DRIVER)
POST /api/auth/login       Login
GET  /api/auth/me          Get current user
```

### Deliveries
```
GET    /api/deliveries                     List deliveries (role-scoped)
GET    /api/deliveries/:id                 Get delivery
GET    /api/deliveries/track/:trackingNum  Public tracking (no auth)
POST   /api/deliveries                     Create delivery
PATCH  /api/deliveries/:id/status          Update status
POST   /api/deliveries/:id/assign-driver   Assign driver (admin)
GET    /api/deliveries/:id/location-history Location history
```

### Drivers
```
GET    /api/drivers          List all (admin)
GET    /api/drivers/me       Own profile (driver)
GET    /api/drivers/:id      Get driver
PATCH  /api/drivers/:id/status  Update status
POST   /api/drivers/:id/location  HTTP location update
```

### Admin
```
GET /api/admin/stats        Live stats
GET /api/admin/deliveries   All deliveries
GET /api/admin/drivers      Fleet view
GET /api/admin/customers    Customer list
GET /api/admin/analytics    7-day analytics
```

### Simulation
```
GET  /api/simulation/routes   Available demo routes
POST /api/simulation/start    Start GPS simulation
POST /api/simulation/stop     Stop simulation
GET  /api/simulation/status   Simulation status
```

---

## 🔔 WebSocket Events

| Event | Direction | Description |
|---|---|---|
| `driver:location:update` | Client → Server | Driver sends GPS update |
| `driver:location` | Server → Clients | Broadcast location to tracking clients |
| `driver:online` | Server → Admin | Driver came online |
| `driver:offline` | Server → Admin | Driver went offline |
| `delivery:status` | Server → Clients | Delivery status changed |
| `delivery:assigned` | Server → Driver/Customer | Driver assigned |
| `delivery:eta` | Server → Customer | ETA updated |
| `notification` | Server → User | In-app notification |
| `join:delivery` | Client → Server | Subscribe to delivery room |
| `join:admin` | Client → Server | Subscribe to admin room |

---

## 🗄️ Database Schema

**SQLite (dev)** — zero config, auto-created by Prisma.
**PostgreSQL (prod)** — change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`.

Key models: `User`, `Driver`, `Customer`, `Address`, `Delivery`, `LocationUpdate`, `DeliveryStatusHistory`, `Notification`

---

## 📍 GPS Simulation Routes

5 pre-defined Indian city routes:
1. Mumbai: Andheri → Bandra Kurla Complex
2. Delhi: Connaught Place → Lajpat Nagar
3. Bangalore: Indiranagar → Koramangala
4. Hyderabad: Jubilee Hills → Hitech City
5. Chennai: T Nagar → Adyar

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests only
cd packages/backend && npm test

# Frontend tests only
cd packages/frontend && npm test
```

Test coverage:
- Authentication (register, login, token validation)
- ETA calculation (Haversine, bearing, format)
- Delivery status machine (valid/invalid transitions)
- WebSocket events

---

## 🌍 Environment Variables

### Backend (`packages/backend/.env`)

```env
DATABASE_URL="file:./dev.db"          # SQLite or PostgreSQL URL
JWT_SECRET="change-in-production"     # JWT signing secret
PORT=4000                              # Server port
CORS_ORIGIN="http://localhost:5173"   # Frontend URL
NODE_ENV="development"
THROTTLE_LOCATION_MS=2000             # GPS update throttle
STALE_DRIVER_THRESHOLD_MS=30000       # Time to mark driver offline
```

### Frontend (`packages/frontend/.env`)

```env
VITE_API_URL=http://localhost:4000    # Backend URL
VITE_SOCKET_URL=http://localhost:4000 # Socket.IO URL
```

---

## 🗺️ Map Provider

Currently uses **Leaflet.js + OpenStreetMap** (free, no API key).

To switch to **Mapbox:**
1. Replace `TileLayer` URL in `src/components/map/MapView.tsx`
2. Set `VITE_MAPBOX_TOKEN` in frontend `.env`

To switch to **Google Maps:**
1. Install `@react-google-maps/api`
2. Replace `MapView.tsx` with Google Maps implementation
3. Set `VITE_GOOGLE_MAPS_KEY` in frontend `.env`

---

## ⚠️ Limitations

- **Maps**: Uses OpenStreetMap tiles; routing is Haversine (straight-line with 1.3x road factor), not real turn-by-turn
- **Push notifications**: Browser Notification API (no FCM/APNs)
- **No payment integration**: Amount stored but no payment gateway
- **No real-time messaging**: Call/message buttons use `tel:` links
- **SQLite**: Single-file DB, not suitable for production clusters (switch to PostgreSQL)

---

## 🏭 Production Deployment

1. Change `DATABASE_URL` to PostgreSQL
2. Run `npx prisma migrate deploy`
3. Set secure `JWT_SECRET`
4. Set `CORS_ORIGIN` to your production domain
5. Build frontend: `cd packages/frontend && npm run build`
6. Serve `dist/` from CDN or with nginx
7. Run backend with PM2 or Docker
