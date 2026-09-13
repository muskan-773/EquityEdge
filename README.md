# EquityEdge — Full-Stack Paper Trading Platform

> A production-grade paper trading platform built with the MERN stack.  
> Trade 20 real NSE-listed stocks with simulated real-time prices, portfolio analytics, and a full order management system — using ₹10,00,000 in virtual funds.

---

## Problem Statement

Most trading simulators either use fake stock symbols with no real-world context, or they require real money to practice. EquityEdge bridges that gap: it uses real Indian NSE-listed companies with simulated price movement based on geometric Brownian motion — the same mathematical model used in the Black-Scholes options pricing formula. Users can experience a realistic trading workflow without financial risk.

---

## Live Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│                                                                     │
│  frontend (React)              dashboard (React)                    │
│  localhost:3000                localhost:3001                       │
│  Landing / Marketing           Trading Interface                    │
│  Signup Form                   Login → Portfolio → Orders           │
│        │                               │                            │
└────────┼───────────────────────────────┼────────────────────────────┘
         │  HTTP (Axios)                 │  HTTP (Axios) + WebSocket
         ▼                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API LAYER                                   │
│                                                                     │
│  Node.js + Express  (localhost:5000)                                │
│                                                                     │
│  Routes → Controllers → Models → MongoDB                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Middleware Stack                                            │   │
│  │  Helmet → CORS → Rate Limiter → MongoSanitize → Auth → ...  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Socket.IO ──► broadcasts price updates every 5 seconds            │
│             ──► emits portfolio:updated to user's personal room    │
│                                                                     │
│  Price Simulator ──► Geometric Brownian Motion random walk         │
│                   ──► bulkWrite to MongoDB (1 round-trip / tick)   │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                                │
│                                                                     │
│  MongoDB (equityedge)                                               │
│                                                                     │
│  users ──── watchlists                                              │
│    │                                                                │
│    ├──── orders ──── transactions                                   │
│    └──── holdings                                                   │
│                                                                     │
│  stocks  (updated every 5s by price simulator)                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

| Feature | Status |
|---|---|
| User registration + login (JWT) | ✅ |
| Password hashing (bcrypt, 12 rounds) | ✅ |
| Protected routes (auth middleware) | ✅ |
| 20 real NSE-listed stocks | ✅ |
| Real-time price simulation (Socket.IO) | ✅ |
| Buy/sell orders with balance validation | ✅ |
| Weighted average cost basis | ✅ |
| Portfolio summary (invested / current / P&L) | ✅ |
| Today's P&L | ✅ |
| Transaction history (immutable ledger) | ✅ |
| Watchlist (add / remove / live prices) | ✅ |
| Input validation (express-validator) | ✅ |
| Centralised error handling | ✅ |
| Rate limiting (Helmet, CORS) | ✅ |
| NoSQL injection prevention | ✅ |
| MongoDB ACID transactions (Atlas / replica set) | ✅ |
| Swagger / OpenAPI docs | ✅ |
| 63 automated backend tests (Jest + Supertest) | ✅ |
| GitHub Actions CI pipeline | ✅ |
| Docker + docker-compose | ✅ |

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19, React Router v7 | SPA routing, component model |
| HTTP client | Axios | Interceptors for JWT injection |
| Real-time | Socket.IO client | Price feed & portfolio events |
| Backend | Node.js 20, Express 4 | Non-blocking I/O, REST APIs |
| Auth | JWT (HS256) + bcryptjs | Stateless auth, secure hashing |
| Database | MongoDB 7, Mongoose 8 | Flexible schema, rich queries |
| Validation | express-validator | Declarative, server-side only |
| Security | Helmet, CORS, express-rate-limit, express-mongo-sanitize | Defence in depth |
| API Docs | Swagger / OpenAPI 3.0 | Self-documenting API |
| Testing | Jest, Supertest | Integration tests against real DB |
| CI | GitHub Actions | Automated test on every push |
| Containers | Docker, Docker Compose | Reproducible dev environment |

---

## Database Schema

### User
```
_id          ObjectId   (primary key)
name         String     required, 2–50 chars
email        String     required, unique, indexed
password     String     bcrypt hash, select:false
cashBalance  Number     default 1,000,000 (₹10 lakh)
createdAt    Date       auto
updatedAt    Date       auto
```

### Stock
```
_id              ObjectId
symbol           String    unique, uppercase, indexed
name             String
currentPrice     Number
previousClose    Number
dayChange        Number    currentPrice - previousClose
dayChangePercent Number
dayHigh / dayLow Number
volume           Number    simulated
sector           Enum      Technology | Finance | Healthcare | ...
exchange         Enum      NSE | BSE
priceHistory     Array     last 100 { price, timestamp } points
isActive         Boolean   false = not tradeable
```

### Order
```
_id              ObjectId
user             ObjectId  ref User, indexed
symbol           String    uppercase
stockName        String    denormalised for display
orderType        Enum      BUY | SELL
quantity         Integer   min 1
price            Number    market price at request time
executionPrice   Number    price at execution
totalValue       Number    quantity × executionPrice
status           Enum      PENDING | EXECUTED | REJECTED | CANCELLED
rejectionReason  String    populated on REJECTED
createdAt        Date      compound index: (user, createdAt desc)
```

### Holding
```
_id              ObjectId
user             ObjectId  compound unique index: (user, symbol)
symbol           String
stockName        String    denormalised
quantity         Number    shares currently held
averageBuyPrice  Number    weighted average of all buys
investedValue    Number    quantity × averageBuyPrice
```

### Transaction  *(immutable — never updated)*
```
_id              ObjectId
user             ObjectId  indexed
order            ObjectId  ref Order
symbol           String
transactionType  Enum      BUY | SELL
quantity         Number
price            Number    execution price
totalValue       Number
balanceAfter     Number    user's cash balance after this trade
createdAt        Date      compound index: (user, createdAt desc)
```

### Watchlist  *(one document per user)*
```
_id    ObjectId
user   ObjectId  unique index
stocks Array     [{ symbol, name, addedAt }]  max 50 items
```

---

## API Reference

All responses follow this shape:
```json
{ "success": true/false, "message": "...", "data": { ... } }
```

### Auth
```
POST   /api/auth/register    Create account → returns JWT
POST   /api/auth/login       Authenticate   → returns JWT
POST   /api/auth/logout      Informational  (client deletes token)
GET    /api/auth/me          Get own profile  [protected]
```

### Stocks
```
GET    /api/stocks                   List all active stocks
GET    /api/stocks?sector=Finance    Filter by sector
GET    /api/stocks?search=tcs        Search by symbol or name
GET    /api/stocks/:symbol           Single stock + price history
GET    /api/stocks/meta/sectors      Sector list with counts
```

### Orders  *(all protected)*
```
POST   /api/orders           Place BUY or SELL market order
GET    /api/orders           List own orders (paginated)
GET    /api/orders/:id       Get single order
DELETE /api/orders/:id       Cancel PENDING order
```

### Portfolio  *(all protected)*
```
GET    /api/portfolio          Full summary + enriched holdings
GET    /api/portfolio/holdings Holdings list with live P&L
```

### Transactions  *(protected)*
```
GET    /api/transactions       Immutable trade history (paginated)
```

### Watchlist  *(all protected)*
```
GET    /api/watchlist          Get watchlist with live prices
POST   /api/watchlist          Add stock { symbol }
DELETE /api/watchlist/:symbol  Remove stock
```

### Utilities
```
GET    /api/health   Health check (used by Docker, load balancers)
GET    /api/docs     Swagger UI (OpenAPI 3.0)
```

---

## Real-Time Architecture (Socket.IO)

```
Backend Price Simulator (every 5s)
  │
  ├─► Stock.bulkWrite()          — update all 20 prices in 1 DB round-trip
  └─► io.emit('prices:update')   — broadcast to ALL connected clients
         │
         └─► React WatchList     — updates prices in state
         └─► React TopBar        — updates index values

On trade execution:
  Backend orderController
    └─► io.to(`user:${userId}`).emit('portfolio:updated')
           └─► React TopBar     — refreshes cash balance
```

---

## Setup Instructions

### Option A — Local (recommended for development)

**Prerequisites:** Node.js 20+, MongoDB running locally

```bash
# 1. Clone
git clone https://github.com/muskan-773/EquityEdge.git
cd EquityEdge

# 2. Backend
cd backend
cp .env.example .env
# Edit .env: set MONGO_URI and JWT_SECRET
npm install
npm run seed       # Populates 20 NSE stocks
npm run dev        # Starts on :5000

# 3. Frontend (new terminal)
cd frontend
npm install
npm start          # Starts on :3000

# 4. Dashboard (new terminal)
cd dashboard
npm install
npm start          # Starts on :3001
```

### Option B — Docker (one command)

```bash
git clone https://github.com/muskan-773/EquityEdge.git
cd EquityEdge

docker-compose up --build

# Seed stocks (in a separate terminal while containers are running):
docker-compose exec backend npm run seed
```

Services available at:
- Frontend: http://localhost:3000
- Dashboard: http://localhost:3001
- API:       http://localhost:5000
- Swagger:   http://localhost:5000/api/docs

---

## Environment Variables

```bash
# backend/.env  (copy from .env.example)

PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/equityedge

# Generate with: node -e "require('crypto').randomBytes(64).toString('hex')"
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:3001
INITIAL_CASH_BALANCE=1000000
```

**Never commit `.env` to git.** The `.gitignore` already excludes it.

---

## Testing

```bash
cd backend
npm test                  # Run all 63 tests
npm run test:coverage     # With coverage report
```

Test suites:

| Suite | Tests | What is covered |
|---|---|---|
| auth.test.js | 14 | Register, login, protected routes, token validation |
| stocks.test.js | 10 | List, search, sector filter, detail, 404 |
| orders.test.js | 16 | BUY/SELL success, balance check, shares check, cancel |
| portfolio.test.js | 11 | P&L calculation, multi-holding aggregation |
| watchlist.test.js | 12 | Add, duplicate, remove, auth |

---

## Security Checklist

- [x] Passwords hashed with bcrypt (12 rounds)
- [x] JWTs signed with HS256, 7-day expiry
- [x] `select: false` on password field — never returned in queries
- [x] Single error message for wrong email/password (prevents user enumeration)
- [x] `express-mongo-sanitize` strips `$` and `.` from inputs (NoSQL injection)
- [x] `helmet` sets 11 security headers (CSP, X-Frame-Options, etc.)
- [x] CORS whitelist — only frontend/dashboard origins allowed
- [x] Rate limiting: 100 req/15 min global, 10 req/15 min on auth routes
- [x] Request body size capped at 10kb
- [x] `.env` in `.gitignore` — secrets never committed
- [x] Users can only access their own orders/portfolio/watchlist

---

## Project Structure

```
ZERODHA CLONE/
├── .github/workflows/ci.yml    GitHub Actions CI (3 jobs)
├── docker-compose.yml          Full stack in one command
├── .dockerignore
│
├── backend/
│   ├── app.js                  Express app (no listen — testable)
│   ├── server.js               HTTP server + Socket.IO + startup
│   ├── config/                 db.js, jwt.js, swagger.js
│   ├── controllers/            6 controllers (auth/stock/order/portfolio/tx/watchlist)
│   ├── middleware/             authMiddleware, errorHandler, asyncHandler, validate
│   ├── models/                 6 Mongoose models
│   ├── routes/                 6 Express routers
│   ├── services/               priceSimulator.js
│   ├── scripts/                seedStocks.js
│   ├── tests/                  5 test suites, 63 tests
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                   Marketing site (React)
│   ├── src/landing_page/       home, about, products, pricing, support, signup
│   ├── Dockerfile
│   └── nginx.conf
│
└── dashboard/                  Trading app (React)
    ├── src/
    │   ├── api/axiosInstance.js   JWT interceptor
    │   ├── context/AuthContext.js Auth state
    │   └── components/            Login, TopBar, Menu, Dashboard,
    │                              Summary, Holdings, Orders,
    │                              Positions, Funds, WatchList
    ├── Dockerfile
    └── nginx.conf
```

---

## Future Improvements

1. **Refresh tokens** — short-lived access tokens (15 min) + long-lived refresh tokens stored in httpOnly cookies
2. **Redis caching** — cache `GET /api/stocks` with 1-second TTL to reduce DB reads
3. **Technical indicators** — SMA 20/50, RSI, MACD on the stock chart (educational, labelled as simulated)
4. **Price charts** — Recharts LineChart component with time-range selector (1D / 1W / 1M)
5. **Order book** — limit orders with price matching engine
6. **Email notifications** — Nodemailer for trade confirmations
7. **Admin dashboard** — manage stocks, reset balances, view all users

---

## Disclaimer

> EquityEdge is an educational paper-trading platform. All stock prices are simulated using a random walk algorithm and do not reflect real market data. No real money is involved. This project is for learning purposes only and is not affiliated with or endorsed by NSE, BSE, or any financial institution.

---

## Author

Built by [Ritesh Kumar](https://github.com/muskan-773) — B.Tech CSE (2027 batch)  
Stack: React · Node.js · Express · MongoDB · Socket.IO · Jest
