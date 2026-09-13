# EquityEdge — Final Deliverables Reference

> This is the single document you open before every interview.
> Everything here is verified against the actual codebase.
> No fabricated metrics. No inflated claims.

---

## A. FINAL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                               │
│                                                                             │
│  frontend/          (localhost:3000)       dashboard/    (localhost:3001)  │
│  React 19 + RR v7                          React 19 + RR v7                │
│  ┌───────────────┐                         ┌───────────────────────────┐   │
│  │  Marketing    │                         │  AuthContext (JWT state)  │   │
│  │  Landing      │                         │  axiosInstance (interceptor│   │
│  │  Signup Form  │                         │  ProtectedRoute           │   │
│  │  ────────     │                         │  ──────────               │   │
│  │  Hero         │                         │  Login                    │   │
│  │  About        │  ──POST /register──►    │  TopBar  (Socket.IO)      │   │
│  │  Products     │                         │  Menu    (NavLink)        │   │
│  │  Pricing      │                         │  Dashboard                │   │
│  │  Support      │                         │  Summary (P&L overview)   │   │
│  │  NotFound     │                         │  Holdings (table + P&L)   │   │
│  └───────────────┘                         │  Orders  (place + history)│   │
│                                            │  WatchList (live prices)  │   │
│                                            │  Funds   (balance)        │   │
│                                            └───────────────────────────┘   │
│                                                    │ Axios + Socket.IO      │
└────────────────────────────────────────────────────┼────────────────────────┘
                                                     │ HTTP / WebSocket
                                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  API LAYER  (localhost:5000)                                                │
│                                                                             │
│  server.js  ──► http.createServer(app)  ──► socket.io attached             │
│  app.js     ──► Express middleware stack (exported for tests)               │
│                                                                             │
│  Middleware chain:                                                          │
│  Helmet ► CORS ► RateLimit* ► JSON ► MongoSanitize ► Logger ► Routes       │
│  (* disabled in NODE_ENV=test)                                              │
│                                                                             │
│  Routes  ──►  Controllers  ──►  Models  ──►  MongoDB                       │
│                                                                             │
│  /api/auth        authController       User, Watchlist                     │
│  /api/stocks      stockController      Stock                                │
│  /api/orders      orderController      Order, Holding, Transaction, User   │
│  /api/portfolio   portfolioController  Holding, Stock, User                │
│  /api/transactions transactionController Transaction                       │
│  /api/watchlist   watchlistController  Watchlist, Stock                    │
│  /api/docs        Swagger UI                                                │
│  /api/health      health check                                              │
│                                                                             │
│  PriceSimulator  ──setInterval(5s)──► bulkWrite(20 stocks)                 │
│                  ──────────────────► io.emit('prices:update')              │
│                                                                             │
│  Socket.IO rooms: 'user:{userId}' ◄── io.to(room).emit('portfolio:updated')│
└─────────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DATABASE LAYER  — MongoDB (equityedge)                                     │
│                                                                             │
│  users          cashBalance, bcrypt password (select:false)                 │
│  stocks         20 NSE stocks, priceHistory[100], sector, exchange          │
│  orders         BUY/SELL, PENDING/EXECUTED/REJECTED/CANCELLED               │
│  holdings       compound unique index (user, symbol), avgBuyPrice           │
│  transactions   immutable ledger, balanceAfter                              │
│  watchlists     one per user, embedded array max 50                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## B. FINAL FOLDER STRUCTURE

```
ZERODHA CLONE/
├── .github/
│   └── workflows/
│       └── ci.yml                  ← GitHub Actions (3 jobs: backend+test, frontend build, dashboard build)
├── docker-compose.yml              ← Full stack: mongodb + backend + frontend + dashboard
├── .dockerignore
├── README.md                       ← Professional project README
├── INTERVIEW_PREP.md               ← Technology explanations + feature Q&A
├── FINAL_DELIVERABLES.md           ← This file
│
├── backend/
│   ├── app.js                      ← Express config (no listen — testable)
│   ├── server.js                   ← HTTP server + Socket.IO + DB connect + startup
│   ├── Dockerfile
│   ├── package.json
│   ├── .env                        ← Never committed (in .gitignore)
│   ├── .env.example                ← Template committed to git
│   ├── .gitignore
│   │
│   ├── config/
│   │   ├── db.js                   ← mongoose.connect(), process.exit(1) on failure
│   │   ├── jwt.js                  ← signToken(), verifyToken()
│   │   └── swagger.js              ← OpenAPI 3.0 spec config
│   │
│   ├── middleware/
│   │   ├── asyncHandler.js         ← catchAsync HOF (eliminates try/catch boilerplate)
│   │   ├── authMiddleware.js       ← protect: extract Bearer token, verify JWT, attach req.user
│   │   ├── errorHandler.js         ← AppError class + centralised error handler (4-arg middleware)
│   │   └── validate.js             ← runs validationResult(req), returns 400 with errors array
│   │
│   ├── models/
│   │   ├── User.js                 ← bcrypt pre-save hook, comparePassword(), toSafeObject()
│   │   ├── Stock.js                ← priceHistory[100], updatePrice(), sector/exchange enums
│   │   ├── Order.js                ← BUY/SELL enum, compound indexes (user+createdAt, user+status)
│   │   ├── Holding.js              ← compound unique index (user+symbol), weighted avg price
│   │   ├── Transaction.js          ← immutable ledger, balanceAfter, compound index (user+createdAt)
│   │   └── Watchlist.js            ← one per user (unique index), embedded stocks array, max 50
│   │
│   ├── controllers/
│   │   ├── authController.js       ← register, login, logout, getMe
│   │   ├── stockController.js      ← getAllStocks (search/filter/sort), getBySymbol, getSectors
│   │   ├── orderController.js      ← placeOrder (BUY/SELL + ACID + avg price), getOrders, cancel
│   │   ├── portfolioController.js  ← getPortfolio (N+1 solved, Promise.all), getHoldings
│   │   ├── transactionController.js← getTransactions (read-only, paginated)
│   │   └── watchlistController.js  ← getWatchlist, add ($push), remove ($pull)
│   │
│   ├── routes/
│   │   ├── authRoutes.js           ← express-validator rules + validate + controller
│   │   ├── stockRoutes.js          ← public routes, /meta/sectors before /:symbol
│   │   ├── orderRoutes.js          ← router.use(protect), validation rules
│   │   ├── portfolioRoutes.js      ← router.use(protect)
│   │   ├── transactionRoutes.js    ← router.use(protect)
│   │   └── watchlistRoutes.js      ← router.use(protect), symbol validation
│   │
│   ├── services/
│   │   └── priceSimulator.js       ← GBM random walk, setInterval(5s), bulkWrite, io.emit
│   │
│   ├── scripts/
│   │   └── seedStocks.js           ← 20 real NSE stocks, idempotent (deleteMany + insertMany)
│   │
│   └── tests/
│       ├── setup.js                ← process.env.NODE_ENV='test', test DB URI override
│       ├── helpers.js              ← connectTestDB, clearTestDB, createTestUser, createTestStock
│       ├── auth.test.js            ← 14 tests: register, login, protected routes
│       ├── stocks.test.js          ← 10 tests: list, search, filter, 404, inactive
│       ├── orders.test.js          ← 16 tests: BUY/SELL success + all error paths
│       ├── portfolio.test.js       ← 11 tests: P&L calculations, multi-holding aggregation
│       └── watchlist.test.js       ← 12 tests: add, duplicate, remove, auth
│
├── frontend/
│   ├── Dockerfile                  ← multi-stage: node builder + nginx:alpine serve
│   ├── nginx.conf                  ← try_files for React Router client-side routing
│   └── src/
│       ├── index.js                ← BrowserRouter, 6 routes, no StrictMode (fixed)
│       ├── Navbar.js               ← Bootstrap 5, NavLink (not Link)
│       ├── Footer.js               ← dynamic copyright year
│       ├── OpenAccount.js          ← CTA button now routes to /signup (fixed)
│       └── landing_page/
│           ├── home/               ← Hero (CTA fixed), Stats, Pricing, Education, HomePage
│           ├── about/              ← AboutPage, Hero, Team
│           ├── products/           ← LeftSection/RightSection reusable components
│           ├── pricing/            ← PricingPage, Hero, Brokerage
│           ├── support/            ← SupportPage, Hero, CreateTicket
│           ├── signup/
│           │   └── Signup.js       ← Real form: controlled inputs, validation, POST /register
│           └── NotFound.js
│
└── dashboard/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── index.js                ← AuthProvider, BrowserRouter, ProtectedRoute
        ├── index.css               ← Layout shells, CSS custom properties, P&L colors
        ├── api/
        │   └── axiosInstance.js    ← JWT request interceptor, 401 response interceptor
        ├── context/
        │   └── AuthContext.js      ← login/logout/refreshUser, localStorage hydration on mount
        └── components/
            ├── Login.js            ← Controlled form, POST /api/auth/login, error display
            ├── ProtectedRoute.js   ← Redirects to /login if not auth, loading spinner
            ├── Home.js             ← TopBar + Dashboard shell
            ├── TopBar.js           ← Socket.IO price feed, index display, cash balance, logout
            ├── Menu.js             ← NavLink (not <p> tags — FIXED), active state
            ├── Dashboard.js        ← Fixed: WatchList component, /positions typo, exact prop
            ├── Summary.js          ← GET /api/portfolio, P&L summary cards
            ├── Holdings.js         ← GET /api/portfolio/holdings, real P&L, key={symbol}
            ├── Orders.js           ← GET+POST /api/orders, buy/sell form, cancel
            ├── WatchList.js        ← GET/POST/DELETE /api/watchlist, Socket.IO live prices
            ├── Funds.js            ← Fixed: Link to prop, real balance from API
            └── Positions.js        ← Informational stub (delivery-only platform)
```

---

## C. DATABASE SCHEMA (Complete)

### users
| Field | Type | Constraints | Notes |
|---|---|---|---|
| _id | ObjectId | PK | auto |
| name | String | required, 2–50 chars | |
| email | String | required, **unique index**, lowercase | |
| password | String | required, min 6, **select:false** | bcrypt hash, never returned |
| cashBalance | Number | default 1,000,000, min 0 | paper trading balance in INR |
| createdAt | Date | auto | timestamps:true |
| updatedAt | Date | auto | |

### stocks
| Field | Type | Constraints | Notes |
|---|---|---|---|
| _id | ObjectId | PK | |
| symbol | String | **unique index**, uppercase | e.g. "TCS" |
| name | String | required | e.g. "Tata Consultancy Services" |
| currentPrice | Number | required, min 0.01 | updated by simulator |
| previousClose | Number | required | for dayChange calculation |
| dayChange | Number | | currentPrice - previousClose |
| dayChangePercent | Number | | (dayChange/previousClose)×100 |
| dayHigh/dayLow | Number | | intraday range |
| volume | Number | | simulated |
| sector | Enum | Technology/Finance/… | **compound index: (sector, isActive)** |
| exchange | Enum | NSE/BSE | |
| marketCap | Enum | Large/Mid/Small Cap | |
| priceHistory | Array | [{price, timestamp}] | last 100 points, $push+$slice |
| isActive | Boolean | default true | false = not tradeable |

### orders
| Field | Type | Constraints | Notes |
|---|---|---|---|
| _id | ObjectId | PK | |
| user | ObjectId | ref User, **indexed** | |
| symbol | String | uppercase | denormalised for display |
| stockName | String | | denormalised |
| orderType | Enum | BUY/SELL | |
| quantity | Integer | min 1, isInteger validator | |
| price | Number | | market price at request time |
| executionPrice | Number | | same as price for market orders |
| totalValue | Number | | quantity × executionPrice |
| status | Enum | PENDING/EXECUTED/REJECTED/CANCELLED | default PENDING |
| rejectionReason | String | optional | set on REJECTED |
| createdAt | Date | **compound index: (user,createdAt desc)** | also (user,status), (user,symbol) |

### holdings
| Field | Type | Constraints | Notes |
|---|---|---|---|
| _id | ObjectId | PK | |
| user | ObjectId | **compound unique index (user,symbol)** | |
| symbol | String | uppercase | |
| stockName | String | | denormalised |
| quantity | Number | min 0 | deleted when reaches 0 on SELL |
| averageBuyPrice | Number | min 0.01 | weighted average, updated on BUY |
| investedValue | Number | | quantity × averageBuyPrice |

### transactions *(immutable — never updated)*
| Field | Type | Constraints | Notes |
|---|---|---|---|
| _id | ObjectId | PK | |
| user | ObjectId | **indexed** | |
| order | ObjectId | ref Order | |
| symbol | String | | |
| transactionType | Enum | BUY/SELL | |
| quantity | Number | | |
| price | Number | | execution price |
| totalValue | Number | | |
| balanceAfter | Number | | cash balance after trade (ledger) |
| createdAt | Date | **compound index: (user,createdAt desc)** | also (user,type), (user,symbol) |

### watchlists *(one document per user)*
| Field | Type | Constraints | Notes |
|---|---|---|---|
| _id | ObjectId | PK | |
| user | ObjectId | **unique index** | one watchlist per user |
| stocks | Array | max 50 items | [{symbol, name, addedAt}], _id:false |

---

## D. COMPLETE API LIST

```
PUBLIC (no auth required)
──────────────────────────────────────────────────────────
GET  /api/health                  Health check
GET  /api/docs                    Swagger UI

POST /api/auth/register           Register new user
POST /api/auth/login              Login → returns JWT
POST /api/auth/logout             Logout (informational)

GET  /api/stocks                  List all active stocks
GET  /api/stocks?sector=Finance   Filter by sector
GET  /api/stocks?search=tcs       Search symbol or name
GET  /api/stocks?exchange=NSE     Filter by exchange
GET  /api/stocks?sort=-dayChangePercent  Sort (prefix - for desc)
GET  /api/stocks/meta/sectors     Sectors with count + avg change
GET  /api/stocks/:symbol          Single stock + priceHistory

PROTECTED (Bearer token required — Authorization: Bearer <jwt>)
──────────────────────────────────────────────────────────
GET  /api/auth/me                 Get own profile + cashBalance

GET  /api/portfolio               Full summary + enriched holdings
GET  /api/portfolio/holdings      Holdings only (lighter payload)

POST /api/orders                  Place BUY or SELL order
     Body: { symbol, orderType: "BUY"|"SELL", quantity }
GET  /api/orders                  List own orders (paginated)
GET  /api/orders?status=EXECUTED  Filter by status
GET  /api/orders?orderType=BUY    Filter by type
GET  /api/orders?limit=10&page=2  Pagination
GET  /api/orders/:id              Single order
DELETE /api/orders/:id            Cancel PENDING order

GET  /api/transactions            Trade history (paginated)
GET  /api/transactions?type=BUY   Filter by type
GET  /api/transactions?symbol=TCS Filter by symbol

GET  /api/watchlist               Watchlist with live prices
POST /api/watchlist               Add stock { symbol }
DELETE /api/watchlist/:symbol     Remove stock
```

**Standard response envelope:**
```json
{
  "success": true,
  "message": "optional message",
  "data": { ... },
  "count": 20,
  "total": 150,
  "page": 1,
  "pages": 8
}

{
  "success": false,
  "message": "Insufficient balance. Required ₹5000, available ₹2000"
}

{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "quantity", "message": "Quantity must be a positive whole number" }
  ]
}
```

---

## E. FEATURE CHECKLIST

### Core Trading Workflow
- [x] User registration with validation
- [x] User login with JWT issuance
- [x] Protected routes with JWT middleware
- [x] 20 real NSE-listed stocks seeded
- [x] Market stock listing with search/filter/sort
- [x] Stock detail with price history
- [x] BUY order: balance check, holding upsert, avg price, transaction
- [x] SELL order: shares check, holding reduce/delete, balance credit
- [x] Order history with pagination
- [x] Cancel PENDING order
- [x] Portfolio summary: cashBalance + investedValue + currentValue + P&L
- [x] Today's P&L (vs previousClose)
- [x] Immutable transaction ledger with balanceAfter
- [x] Watchlist: add, remove, list with live prices
- [x] Real-time price simulation (GBM random walk, 5-second ticks)
- [x] Socket.IO broadcast to all clients on price tick
- [x] Socket.IO personal room for portfolio:updated events

### Frontend & Dashboard
- [x] Signup form with validation and error display
- [x] Login form with loading/error states
- [x] AuthContext with localStorage hydration on refresh
- [x] Protected routes (redirect to /login if unauthenticated)
- [x] Axios JWT interceptor (auto-attach token to every request)
- [x] 401 response interceptor (auto-logout on token expiry)
- [x] TopBar: live index values, cash balance, logout
- [x] Menu: working NavLink navigation with active state (fixed from <p> tags)
- [x] WatchList sidebar: live prices, add/remove
- [x] Holdings table: real data, P&L colours, key={symbol}
- [x] Summary: portfolio cards with P&L
- [x] Orders: place form + history table with status badges
- [x] Funds: real balance from API (fixed broken Link props)
- [x] Empty states, loading spinners, error states throughout
- [x] Responsive layout (sidebar hides on mobile)

---

## F. TESTING CHECKLIST

### Test suites (all 63 tests pass — verified locally)

**auth.test.js (14 tests)**
- [x] Register returns 201 + token
- [x] Password never returned in response
- [x] New user has cashBalance = 1,000,000
- [x] Duplicate email returns 409
- [x] Missing name returns 400 with field error
- [x] Invalid email returns 400
- [x] Password too short returns 400
- [x] Password no uppercase/number returns 400
- [x] Login returns 200 + token on valid credentials
- [x] Wrong password returns 401
- [x] Non-existent email returns same 401 (prevents enumeration)
- [x] GET /me returns 200 with valid token
- [x] GET /me returns 401 with no token
- [x] GET /me returns 401 with tampered token

**stocks.test.js (10 tests)**
- [x] List returns 200 with only active stocks
- [x] List is public (no auth)
- [x] Sector filter returns correct stocks
- [x] Symbol search works
- [x] Name search is case-insensitive
- [x] No match returns empty array (not 404)
- [x] priceHistory excluded from list response
- [x] Detail returns 200 for valid symbol
- [x] Detail is case-insensitive
- [x] Detail returns 404 for inactive/unknown

**orders.test.js (16 tests)**
- [x] BUY creates order, deducts balance, creates holding + transaction
- [x] BUY recalculates weighted average on second purchase
- [x] BUY rejects with 400 on insufficient balance
- [x] BUY returns 404 for unknown stock
- [x] BUY rejects quantity = 0
- [x] BUY rejects negative quantity
- [x] BUY requires authentication (401)
- [x] SELL credits balance, reduces holding
- [x] SELL deletes holding when qty reaches 0
- [x] SELL rejects when no holding exists
- [x] SELL rejects when requesting more shares than held
- [x] GET orders returns only current user's orders
- [x] GET orders returns paginated results
- [x] DELETE cannot cancel EXECUTED order
- [x] DELETE returns 404 for non-existent order ID
- [x] DELETE cannot cancel another user's order (returns 404, not 403)

**portfolio.test.js (11 tests)**
- [x] Requires authentication
- [x] Empty portfolio returns zeros (no error)
- [x] cashBalance correctly deducted after buy
- [x] investedValue, currentValue calculated correctly
- [x] totalPortfolioValue = cashBalance + currentValue
- [x] P&L correctly calculated when price changes
- [x] totalPLPercent calculated correctly
- [x] Multi-holding totals are summed correctly
- [x] Holdings endpoint returns empty array (not 404)
- [x] Holdings enriched with currentPrice and P&L
- [x] Holdings requires authentication

**watchlist.test.js (12 tests)**
- [x] Fresh user has empty watchlist
- [x] GET requires authentication
- [x] Add valid stock returns 200
- [x] Add normalises lowercase to uppercase
- [x] Add duplicate returns 400
- [x] Add non-existent stock returns 404
- [x] Add with missing symbol returns 400
- [x] Remove stock from watchlist
- [x] Remove is case-insensitive
- [x] Remove requires authentication
- [x] List includes added stocks
- [x] List returns enriched prices from Stock collection

---

## G. SECURITY CHECKLIST

- [x] **Passwords hashed** with bcrypt, 12 rounds — never stored plaintext
- [x] **Password excluded** from all queries by default (`select: false`)
- [x] **User enumeration prevented** — login returns identical message for wrong email AND wrong password
- [x] **JWT signed** with HS256 using environment variable secret
- [x] **JWT expiry** — 7-day tokens, client-side invalidation on logout
- [x] **Bearer token validation** — extracted, verified, and user existence checked on every protected request
- [x] **NoSQL injection prevented** — `express-mongo-sanitize` strips `$` and `.` from all inputs
- [x] **Security headers** — `helmet` sets CSP, X-Frame-Options, X-Content-Type-Options, HSTS, etc.
- [x] **CORS whitelist** — only `localhost:3000` and `localhost:3001` allowed
- [x] **Rate limiting** — 100 req/15min global; 10 req/15min on auth endpoints
- [x] **Request body size** capped at 10kb — prevents payload attacks
- [x] **Secrets in environment variables** — `.env` in `.gitignore`, `.env.example` committed
- [x] **Resource scoping** — all queries filter by `user: req.user._id` — users cannot access others' data
- [x] **404 not 403** for cross-user resource access — doesn't confirm resource existence
- [x] **Validation server-side** — express-validator on all write endpoints, frontend validation is UX only
- [x] **Input normalisation** — symbols always toUpperCase, emails always lowercase before storage

---

## H. DEPLOYMENT CHECKLIST

### Before deploying to production

- [ ] Generate a strong `JWT_SECRET` (64-byte hex: `node -e "require('crypto').randomBytes(64).toString('hex')"`)
- [ ] Set `NODE_ENV=production`
- [ ] Use MongoDB Atlas (replica set) — enables ACID transactions
- [ ] Update `FRONTEND_URL` and `DASHBOARD_URL` in `.env` to production domains
- [ ] Set up SSL/TLS (nginx reverse proxy or Cloudflare)
- [ ] Add `HTTPS` check — never serve auth over plain HTTP in production
- [ ] Configure `MONGO_URI` with Atlas connection string (includes username/password)
- [ ] Run `npm run seed` once after first deploy to populate stock data
- [ ] Set up MongoDB Atlas IP whitelist to only allow your server's IP
- [ ] Enable MongoDB Atlas automatic backups
- [ ] Set up application monitoring (e.g., PM2, New Relic, Datadog)
- [ ] Add Redis for rate limiting across multiple server instances
- [ ] Add Redis for Socket.IO adapter (if running multiple server instances)
- [ ] Remove or password-protect `/api/docs` in production
- [ ] Set up log aggregation (Winston → file/CloudWatch/Logtail)
- [ ] Run `npm audit` and fix critical vulnerabilities before deploying
- [ ] Ensure `.env` is in `.gitignore` and is NOT in the Docker image

### Starting the project locally
```bash
# Backend
cd backend && cp .env.example .env  # fill in values
npm install && npm run seed && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm start   # http://localhost:3000

# Dashboard (new terminal)
cd dashboard && npm install && npm start  # http://localhost:3001
```

---

## I. PROFESSIONAL GITHUB README

The README.md at the project root contains:
- Project overview + problem statement
- Live architecture diagram (ASCII)
- Feature table with status
- Complete tech stack with rationale
- Full database schema
- Complete API reference with request/response examples
- Local setup instructions (both manual and Docker)
- Environment variable reference
- Testing guide with test suite breakdown
- Security checklist
- Project structure tree
- Future improvements list
- Disclaimer (simulated data, educational use)

---

## J. FINAL RESUME BULLET POINTS

> Use these ONLY after you have built and run the project end-to-end.
> Every word must be something you can explain and demonstrate.

**Primary bullet (use as main project description):**
- Built EquityEdge, a full-stack paper-trading platform using React, Node.js, Express, and MongoDB with real-time simulated market prices via Socket.IO, JWT authentication, and a complete order management and portfolio analytics system

**Feature-specific bullets (pick 3–5 based on the role you're applying for):**
- Designed and implemented 6 RESTful API endpoints covering authentication, stocks, orders, portfolio, transactions, and watchlist with centralized error handling, input validation, and consistent JSON response envelopes
- Implemented JWT-based authentication with bcrypt password hashing, an Express middleware protection layer, and an Axios request interceptor for automatic token injection across all API calls
- Built a real-time stock price simulation engine using Socket.IO and a Geometric Brownian Motion random walk, broadcasting price updates to all clients via WebSocket every 5 seconds
- Designed 6 MongoDB schemas with compound indexes, enforced one-document-per-user patterns for watchlists and holdings, and solved the N+1 query problem using `$in` batch queries in portfolio aggregation
- Implemented an atomic paper-trading order workflow with MongoDB ACID transactions (replica set aware), weighted average cost basis recalculation, and an immutable transaction ledger with running balance snapshots
- Wrote 63 backend integration tests using Jest and Supertest across 5 test suites covering registration, authentication, buy/sell order flows, portfolio P&L calculations, and watchlist operations
- Configured a GitHub Actions CI pipeline with a MongoDB service container for automated test execution on every push to main, and a Docker Compose setup for reproducible local development across all 4 services

---

## K. 30 MOST LIKELY INTERVIEW QUESTIONS WITH BEST ANSWERS

---

**Q1. Tell me about your EquityEdge project.**

"EquityEdge is a full-stack paper trading platform I built with React, Node.js, Express, and MongoDB. It lets users trade 20 real Indian NSE-listed stocks using ₹10 lakh in simulated funds. The system has real-time price simulation via Socket.IO, a complete order management system with buy and sell flows, portfolio analytics with P&L calculations, and a watchlist with live prices. I wrote 63 automated backend tests with Jest and Supertest, set up a GitHub Actions CI pipeline, and containerized everything with Docker Compose. The goal was to build something that mirrors how a real brokerage platform works — not a college demo."

---

**Q2. What was the most difficult part of building this?**

"The order placement workflow. A single buy order involves 4 database writes: creating the order, deducting the user's cash balance, upserting the holding with a recalculated average buy price, and creating an immutable transaction record. Without a database transaction, if the server fails between any of those steps, the data is inconsistent — money gone with no record of the trade.

MongoDB multi-document ACID transactions require a replica set, which isn't available on standalone local MongoDB. I had to build a fallback: try to start a Mongoose session and, if MongoDB throws error code 20 indicating a standalone instance, retry the same logic without a session. Production on Atlas gets full ACID guarantees; local dev falls back gracefully. That trade-off was the most technically interesting problem I solved."

---

**Q3. How does your authentication work?**

"Registration and login are on `POST /api/auth/register` and `/login`. Passwords are hashed with bcrypt at 12 salt rounds in a Mongoose pre-save hook — the controller never touches the plaintext password. On login, I use `User.findOne({ email }).select('+password')` to explicitly include the normally-excluded password field, then call `user.comparePassword(candidate)` which does `bcrypt.compare`. Both wrong email and wrong password return the same 'Invalid email or password' message to prevent user enumeration attacks.

On success, `jwt.sign({ id: userId }, secret, { expiresIn: '7d' })` generates a token. Every protected request goes through `authMiddleware.js` which extracts the Bearer token, calls `jwt.verify`, and does a DB lookup to confirm the user still exists. The decoded user is attached to `req.user` so controllers can access it directly."

---

**Q4. What is a JWT and how does it work?**

"A JWT has three parts separated by dots: header, payload, and signature. The header contains the algorithm (HS256). The payload contains claims — in our case, just `{ id: userId, iat: issued-at, exp: expiry }`. The signature is HMAC-SHA256 of the encoded header and payload using the secret. The server verifies by recomputing the signature and comparing.

Critically: the payload is base64url encoded, not encrypted. Anyone can decode it. We never put sensitive data in the JWT — only the user ID. The signature guarantees it wasn't tampered with, but doesn't hide the contents."

---

**Q5. What is bcrypt and why is it better than SHA-256 for passwords?**

"SHA-256 is a fast hash — designed to be fast for data integrity checks. For passwords, fast is a security weakness because an attacker can try billions of guesses per second. bcrypt is intentionally slow — it applies the hash algorithm 2^N times (N = cost factor). At 12 rounds, hashing takes ~100ms, which is imperceptible to users but makes brute-force attacks 4096 times more expensive than a single-round hash. bcrypt also generates a unique random salt for each password, so two users with the same password have different hashes, defeating rainbow table attacks."

---

**Q6. What is the N+1 query problem and how did you solve it?**

"N+1 is when you fetch N items and then make N additional queries for related data. In the portfolio controller, a user might have 10 holdings. Without optimisation, I'd fetch 10 holdings and then make 10 separate stock price queries — 11 total. Instead, I extract all symbols into an array and make one `Stock.find({ symbol: { $in: symbols } })` query. I then build a symbol-to-price map for O(1) lookups when enriching each holding. N+1 becomes 2 queries."

---

**Q7. What is MongoDB and why did you choose it over SQL?**

"MongoDB is a document database — it stores JSON-like documents instead of rows in tables. I chose it because several of our entities are naturally documents: stocks have an embedded priceHistory array, watchlists are embedded arrays of items owned by a user, and holdings vary per user. These structures are awkward to represent in normalised tables. The `$in` query, aggregation pipeline, and atomic `$push + $slice` for the price history array are MongoDB features that would require multiple SQL JOINs or application-level code.

That said, if this were a financial system requiring strict referential integrity — like actual account ledgers — SQL with foreign key constraints would be the right choice. The decision depends on the access patterns."

---

**Q8. What is a Mongoose schema and why use it?**

"MongoDB is schema-less by default — you can insert any shape of document. Mongoose adds a schema layer: type enforcement, required validation, enum constraints, min/max, and custom validators. It also creates indexes, provides lifecycle hooks (like the password pre-save hook), and gives you instance methods. Without Mongoose, there's nothing stopping a bug from saving `{ password: 'plaintext' }` instead of a hash. With the pre-save hook, hashing is automatic regardless of the code path."

---

**Q9. How do you handle errors consistently across your API?**

"Every async controller is wrapped in `catchAsync` — a higher-order function that catches rejected promises and passes them to Express's `next(err)`. This eliminates try/catch boilerplate in every controller.

All errors flow to a single `errorHandler` middleware at the bottom of `app.js` — the 4-argument `(err, req, res, next)` signature tells Express it's an error handler. I distinguish operational errors (expected: stock not found, insufficient balance) via an `AppError` class with a status code, from programming errors (unexpected bugs). Operational errors return the specific message; programming errors return a generic message so stack traces never reach the client. I also handle specific MongoDB errors: duplicate key (error code 11000) → 409, validation errors → 400, invalid ObjectId → 400, JWT errors → 401."

---

**Q10. Why did you split server.js into app.js and server.js?**

"For testability. `server.js` calls `server.listen()` on port 5000. If tests import `server.js`, the server tries to bind port 5000 on every test file — which fails with EADDRINUSE when multiple suites run.

`app.js` is pure Express configuration: middleware, routes, error handler. It exports `app` with no side effects. Tests import `app.js` and pass it to Supertest, which wraps it internally without binding a port. `server.js` imports `app.js` and adds the HTTP server and Socket.IO for production. This is a standard pattern — separating configuration from startup."

---

**Q11. How does Socket.IO work in your project?**

"Socket.IO provides a persistent bidirectional connection between the backend and each React dashboard client. On startup, the `PriceSimulator` calls `setInterval(updatePrices, 5000)`. Every 5 seconds it generates new prices, saves them with `bulkWrite`, and calls `io.emit('prices:update', priceMap)` — broadcasting to every connected client. React components listen with `socket.on('prices:update', fn)` and update their local state, triggering a re-render.

For portfolio updates after a trade, I use rooms: `socket.join('user:' + userId)` puts the user's connection in a personal room, and `io.to('user:' + userId).emit('portfolio:updated', data)` sends only to that user — not everyone."

---

**Q12. What is the average cost basis and how did you calculate it?**

"Average cost basis is the weighted average price paid per share across multiple purchases. Formula: `newAvg = (existingQty × existingAvg + newQty × newPrice) / (existingQty + newQty)`. Example: buy 10 TCS at ₹500, then 5 more at ₹600: `(10×500 + 5×600) / 15 = ₹533.33`. This is what I store as `averageBuyPrice` in the Holding document. P&L is then `(currentPrice - averageBuyPrice) × quantity`. On SELL, the average price doesn't change — only the quantity reduces."

---

**Q13. What indexes did you add to MongoDB and why?**

"User: unique index on email — every login query hits this. Stock: unique on symbol, compound on (sector, isActive) for filtered listing. Order: compound on (user, createdAt DESC) for order history; (user, status) for filtered queries; (user, symbol) for stock-specific order lookup. Holding: compound unique on (user, symbol) — ensures one holding per stock per user AND is the primary lookup path. Transaction: compound on (user, createdAt DESC) for history; (user, type) and (user, symbol) for filters. Watchlist: unique on user — one watchlist per user. The compound indexes are because queries always filter by both fields together — a compound index covers them in one B-tree lookup versus two separate scans."

---

**Q14. What is CORS and why do you need it?**

"CORS — Cross-Origin Resource Sharing — is a browser security policy. When a React app on localhost:3000 makes an XMLHttpRequest to an API on localhost:5000, those are different origins (different ports). Browsers block such requests by default unless the server explicitly allows them. The browser sends a preflight OPTIONS request; the server responds with which origins, methods, and headers are allowed. Without `cors()` middleware on the backend, every API call from the frontend would fail with a CORS error in the browser. Note: this is enforced by browsers — curl and Postman don't check CORS."

---

**Q15. What is rate limiting and why does it matter?**

"Rate limiting caps the number of requests an IP can make in a time window. In EquityEdge: 100 requests per 15 minutes globally, 10 per 15 minutes on auth endpoints. Without it: an attacker can brute-force login by trying thousands of password combinations per second. With the auth rate limit, after 10 attempts they're blocked for 15 minutes, making brute-force attacks impractical. The global limit protects against DDoS — an attacker flooding the API with requests to degrade it for real users."

---

**Q16. What is express-mongo-sanitize and what attack does it prevent?**

"NoSQL injection. MongoDB operators like `$gt`, `$where`, `$regex` can be injected in JSON request bodies. Example: sending `{ email: { $gt: '' }, password: { $gt: '' } }` to a login endpoint could bypass authentication because `$gt: ''` matches any non-empty string. `express-mongo-sanitize` strips all keys beginning with `$` and containing `.` from `req.body`, `req.params`, and `req.query` before any route handler runs. It's a middleware-level defence."

---

**Q17. How does the watchlist's embedded document design work?**

"One Watchlist document per user containing an array of stock items. Adding is a `$push` to the array; removing is `$pull`. Since every access pattern is 'get/modify the watchlist FOR a specific user,' there's never a need to query across users. Embedding means one DB document fetch gives me the complete watchlist — no JOIN. I cap the array at 50 items to prevent runaway document growth. The choice of embedding over a separate collection is justified by: bounded size, always-user-scoped access, no cross-document references."

---

**Q18. What is Helmet and what security headers does it set?**

"Helmet is an Express middleware collection that sets HTTP security response headers. Headers it sets: `Content-Security-Policy` (prevents XSS by restricting script sources), `X-Frame-Options: DENY` (prevents clickjacking — embedding your page in an iframe on a malicious site), `X-Content-Type-Options: nosniff` (prevents MIME-type sniffing), `Strict-Transport-Security` (enforces HTTPS in supported browsers), `X-XSS-Protection` (legacy XSS filter for older browsers), and others. One `app.use(helmet())` call sets them all."

---

**Q19. How does Docker Compose work in your project?**

"docker-compose.yml defines 4 services: mongodb (official mongo:7.0 image), backend (built from our Dockerfile), frontend (nginx serving the React build), dashboard (nginx serving the dashboard build). `docker-compose up --build` builds all images and starts all containers in dependency order — MongoDB first (has a healthcheck), then backend (waits for MongoDB healthy), then frontend and dashboard. All services are on the same Docker network so they can reach each other by service name. `mongo_data` is a named volume that persists MongoDB data across `docker-compose down` — cleared only with `docker-compose down -v`."

---

**Q20. Why use multi-stage Docker builds for the React apps?**

"The build stage needs Node.js, npm, and all devDependencies to compile the React app. The final production image only needs nginx to serve the static HTML/JS/CSS output. Multi-stage builds let me use the Node image for building and then copy only the `/build` folder to an nginx image. Final image: ~25MB (nginx:alpine). Without multi-stage: ~500MB+ (node:alpine with all packages). Smaller images pull faster, use less disk, and have a smaller attack surface."

---

**Q21. What is the difference between authentication and authorisation?**

"Authentication answers 'who are you?' — verifying identity via token, password, biometric. In EquityEdge, the `protect` middleware handles authentication: verifying the JWT and confirming the user exists. Authorisation answers 'what are you allowed to do?' — checking permissions. In EquityEdge, all users have equal permissions (no roles), so there's no separate authorisation layer. Every data query is scoped to `user: req.user._id`, which is authorisation through scoping rather than a role check. In a system with admin/user roles, you'd add a separate `authorize('admin')` middleware."

---

**Q22. How do you handle pagination in your APIs?**

"The order and transaction GET endpoints accept `?limit=20&page=1` query parameters. `skip = (page - 1) * limit`. The response includes `total` (count of all matching documents) and `pages` (Math.ceil(total / limit)) so the frontend knows whether to show a 'next page' button. I run the data query and count query in parallel with `Promise.all([Model.find(query).skip().limit(), Model.countDocuments(query)])` to avoid sequential latency."

---

**Q23. What is a higher-order function? Give an example from your code.**

"A higher-order function takes a function as an argument or returns a function. `catchAsync` in my codebase is a higher-order function: it takes an async controller function as input and returns a new function. The returned function calls the original with `(req, res, next)` and chains `.catch(next)` on the returned Promise. When the controller throws an error, `.catch(next)` automatically routes it to Express's error handler without any try/catch in the controller itself."

---

**Q24. What is the event loop in Node.js?**

"Node.js is single-threaded but handles concurrency through the Event Loop. When an async operation (DB query, file read, HTTP request) is initiated, Node registers a callback and immediately moves on to process other events. When the async operation completes, its callback is queued. The Event Loop continuously checks: 'Is the call stack empty? If yes, pull the next callback from the queue and run it.' This allows Node to handle thousands of concurrent requests with one thread — as long as no operation blocks the thread. Blocking examples to avoid: `fs.readFileSync`, `bcrypt.hashSync`, CPU-heavy loops without `setImmediate`."

---

**Q25. What is the difference between `==` and `===` in JavaScript?**

"`==` performs type coercion — it tries to convert types before comparing: `'5' == 5` is true, `null == undefined` is true. `===` is strict equality — no type coercion: `'5' === 5` is false. In production code, always use `===`. The coercion rules for `==` are complex enough that unexpected results are common. In Node.js/Express: when comparing `req.body` values against constants, always use `===`. All comparisons in EquityEdge use `===`."

---

**Q26. What are React hooks? Which ones did you use?**

"Hooks let function components use state and lifecycle features that were previously only in class components. I used: `useState` (local component state — form fields, loading flags, error messages, fetched data), `useEffect` (side effects after render — fetching data on mount, setting up Socket.IO listeners, returning cleanup function to disconnect), `useCallback` (memoize functions passed as dependencies to prevent unnecessary re-renders and re-subscription of effects), `useContext` (consume AuthContext without prop drilling — any component calls `useAuth()` to get user, login, logout)."

---

**Q27. What is prop drilling and how did you solve it?**

"Prop drilling is passing data through multiple levels of components that don't use it themselves, just to pass it down to a deeply nested child. Example: `Index → Home → TopBar → Menu → NavLink` — if every component needed `user` and `logout`, they'd all need to accept and pass them as props. React Context solves this: `AuthContext` provides `user`, `logout`, `login` to any component in the tree via `useAuth()`. No intermediate component needs to touch auth props."

---

**Q28. How would you improve performance if this system had 10,000 users?**

"Four main areas: First, Redis caching for `GET /api/stocks` — 10,000 users hitting the stocks endpoint constantly would hammer MongoDB. A 2-second Redis cache with TTL reduces DB reads by ~99%. Second, Redis adapter for Socket.IO — with multiple server instances, each has its own socket pool. The Redis adapter uses pub/sub to sync events across instances. Third, MongoDB Atlas indexes are already in place — they'll handle scale. Fourth, the price simulator would need to be extracted to a dedicated service with its own process, rather than running inside the API server — prevents simulator CPU usage from affecting API response times."

---

**Q29. What security vulnerability exists in storing JWT in localStorage?**

"XSS — Cross-Site Scripting. If a malicious script is injected into the page (via an unescaped user input, a compromised npm package, or a CDN script), it can read `localStorage.getItem('token')` and exfiltrate the JWT. The attacker can then make authenticated API requests as the user. The safer alternative is an httpOnly cookie — a cookie flag that makes it inaccessible to JavaScript. Even with XSS, `document.cookie` won't expose it. The trade-off: httpOnly cookies require same-origin or CSRF protection. For a React SPA served from a different origin than the API, Bearer tokens in localStorage with careful XSS prevention (Content-Security-Policy headers, which Helmet sets) is a common and accepted trade-off."

---

**Q30. What would you add to EquityEdge if you had more time?**

"Three things in priority order: First, refresh tokens — short-lived access tokens (15 min) with a long-lived refresh token in an httpOnly cookie. More secure, seamless UX. Second, stock price charts — the priceHistory array is already stored in MongoDB with 100 data points per stock. Adding a Recharts LineChart component would make the platform much more demonstrable. Third, Redis caching on the stocks endpoint and a Redis adapter for Socket.IO to make the system genuinely scalable. These three would transform it from a well-architected project into a production-grade one."

---

## L. 10 DIFFICULT FOLLOW-UP QUESTIONS

---

**FU1: "Your MongoDB transactions fall back without ACID on standalone. Isn't that a data consistency risk in production?"**

"It's a local development trade-off, not a production risk. Production deployments of this application would use MongoDB Atlas, which is always a replica set — ACID transactions are guaranteed there. The fallback only activates when `session.startTransaction()` causes a write operation to throw error code 20, which only happens on standalone instances. I explicitly document this in the code comments and in the README under deployment prerequisites. The test suite runs on standalone MongoDB intentionally to verify the fallback works correctly."

---

**FU2: "Your price simulator blocks the event loop if it runs too long. How would you fix this?"**

"The `updatePrices` function is async and awaits `Stock.bulkWrite()`. The MongoDB driver handles the I/O asynchronously — the event loop isn't blocked waiting for the write. The CPU-bound part — generating 20 random prices — is trivial computation. If we had thousands of stocks, the computation could block the event loop, and the fix would be `worker_threads` (run computation in a separate thread) or extracting the simulator to its own Node process communicating via a message queue. At our scale of 20 stocks, this isn't a real concern."

---

**FU3: "How would you handle a race condition where two buy orders execute simultaneously for the same stock?"**

"For the user's balance: each order runs its own MongoDB transaction reading the user's balance, deducting, and saving. If two run concurrently on MongoDB Atlas, only one can hold the document lock at a time — MongoDB's document-level locking prevents race conditions on the same user document. For the holding: the compound unique index on (user, symbol) prevents duplicate creation. The update is an atomic findOne+save within the session. In a high-throughput system, optimistic concurrency control with a `version` field (Mongoose has `__v` for this) would add an extra safety layer — if the document changed between read and write, the save fails and you retry."

---

**FU4: "Why does your test suite use `--runInBand` and what's the cost?"**

"`--runInBand` runs all test files sequentially in one process rather than in parallel worker processes. The cost is speed — the full suite takes ~15 seconds instead of potentially ~5 seconds in parallel. The reason: all suites share one MongoDB test instance. In parallel, suite A's `clearTestDB()` could run while suite B is mid-test, corrupting its state. The alternative is spinning up a separate MongoDB instance per suite (using `mongodb-memory-server`) — that would enable parallel runs without interference, at the cost of setup complexity. For 63 tests at 15 seconds, `--runInBand` is the right pragmatic choice."

---

**FU5: "Your `priceHistory` array is capped at 100 items using `$slice`. What happens to historical data for chart time ranges?"**

"The current implementation only supports a 100-tick history — roughly 8 minutes at 5-second intervals. For longer time ranges (1 day, 1 week, 1 month), the correct architecture is a separate time-series collection — one document per (symbol, date) with an array of minute-by-minute prices. MongoDB 5.0+ has native time-series collections optimised for this pattern. Alternatively, a dedicated time-series database like InfluxDB handles this better at scale. For EquityEdge's current scope, 100 ticks is sufficient for the chart to show a meaningful price trend. It's a clear candidate for the 'what would you improve' answer."

---

**FU6: "You use `Promise.all` in the portfolio controller. What happens if one of the promises rejects?"**

"If any promise in `Promise.all([holdingsQuery, userQuery])` rejects, `Promise.all` immediately rejects with that error — the other promise result is discarded. The `catchAsync` wrapper catches it and passes it to the error handler, which returns an appropriate error response. This is correct behaviour — if we can't fetch the user's balance, we can't compute a meaningful portfolio summary. `Promise.allSettled` would be the alternative if you want results from both even when one fails, but for portfolio calculation, we need both to succeed."

---

**FU7: "How do you prevent a user from sending `{ quantity: 1.5 }` as a decimal for order quantity?"**

"Two layers: the express-validator rule `body('quantity').isInt({min:1})` at the route level rejects non-integer values before the controller runs, returning 400. The Mongoose Order schema has `validate: { validator: Number.isInteger }` as a second layer — even if validation middleware is bypassed somehow, the schema prevents fractional quantities from being saved. `Number.isInteger(1.5)` returns false, triggering a Mongoose ValidationError which the central error handler converts to a 400."

---

**FU8: "Your Watchlist has a maximum of 50 stocks. What happens if a user tries to add the 51st?"**

"The Mongoose schema has an array-level validator: `validate: { validator: arr => arr.length <= 50, message: 'Watchlist cannot contain more than 50 stocks' }`. The controller adds to the array (`watchlist.stocks.push(...)`) and calls `watchlist.save()`. Mongoose runs the validator before the save. If the array length exceeds 50, a ValidationError is thrown, caught by `catchAsync`, and returned as a 400 Bad Request. The `watchlistController.js` also has an explicit check before pushing: `if (watchlist.stocks.length >= 50) return next(new AppError('Watchlist is full', 400))` — this fails fast before the DB write."

---

**FU9: "What is the `select: false` on the password field and when can it accidentally cause a bug?"**

"`select: false` means the password field is excluded from all query results by default. This prevents accidentally including it in API responses. The field is only included when explicitly requested with `.select('+password')` — which we do only in `authController.login`. The potential bug: if someone calls `User.findById(id)` elsewhere (say, in a middleware) and then checks `user.password` expecting it to exist — it'll be `undefined`. The fix is always using `select('+password')` explicitly when password is needed, never relying on it being present by default."

---

**FU10: "Your CI pipeline uses a MongoDB service container. How is this different from using `mongodb-memory-server`?"**

"A service container runs actual MongoDB 7.0 in a Docker container alongside the test runner, accessible at `localhost:27017`. The tests run against a real MongoDB instance — same version as production. `mongodb-memory-server` (like `@shelf/jest-mongodb`) spins up a MongoDB binary in-process during tests. Both give test isolation, but the service container approach is more representative of production behavior, handles schema indexes correctly, and doesn't require a downloaded binary in the test environment. The service container approach is better for CI where Docker is already available. `mongodb-memory-server` is better for developer machines where you don't want Docker just to run tests."

---

## M. 2-MINUTE "TELL ME ABOUT YOUR EQUITYEDGE PROJECT" ANSWER

> Practise this out loud until you can say it in under 2 minutes without reading it.

---

"EquityEdge is a full-stack paper trading platform I built with React, Node.js, Express, and MongoDB. I built it to understand how a real financial application works end to end — not just CRUD, but something with meaningful business logic.

The architecture has three parts. The backend is a Node.js Express API with six RESTful endpoints covering authentication, stocks, orders, portfolio, transactions, and watchlist. Stock data is simulated using a price simulator service that applies a geometric Brownian motion random walk every 5 seconds and broadcasts price updates to all connected clients via Socket.IO.

The core feature is the order flow. When a user places a buy order, the controller checks the stock exists, verifies the user has sufficient cash, then runs four atomic database writes inside a MongoDB ACID transaction — creating the order, deducting the balance, upserting the holding with a recalculated weighted average buy price, and creating an immutable transaction record. On a MongoDB Atlas replica set, these are fully atomic. On standalone local MongoDB, there's a graceful fallback.

The portfolio analytics computes invested value, current market value, and P&L at request time rather than storing it, because stock prices change every 5 seconds. I solve the N+1 query problem with a single batch `$in` query for all held stock prices.

For security: bcrypt password hashing with 12 salt rounds, JWT authentication with a Mongoose protect middleware, Helmet for security headers, rate limiting on auth endpoints, express-mongo-sanitize for NoSQL injection prevention, and CORS whitelisting.

I wrote 63 integration tests with Jest and Supertest — covering all success and failure paths for the order workflow — and set up a GitHub Actions CI pipeline with a real MongoDB service container.

The project is containerised with Docker and a docker-compose setup that brings up all four services — MongoDB, backend, frontend, and dashboard — in one command."

---

## N. "WHY DID YOU BUILD THIS PROJECT?"

"I wanted to go beyond a generic todo app or e-commerce clone that every developer has on their resume. I chose a paper trading platform because it has real, non-trivial business logic — balance validation, average cost basis calculations, atomic multi-document writes, and real-time price updates. These are problems you'd actually encounter working on a fintech product, not just CRUD forms.

More specifically, I wanted to understand a few things I'd read about but never implemented: MongoDB ACID transactions, the Socket.IO pub/sub model, JWT authentication from scratch without a library abstracting the JWT structure, and how to architect an Express app so that it's actually testable with integration tests.

The project let me practice systems thinking — what happens when two orders execute at the same time, what makes P&L calculation stale if you store it versus computing it fresh, why you need `app.js` separate from `server.js` for tests. Those decisions are what I'm most proud of, not the feature count."

---

## O. "WHAT WAS THE MOST DIFFICULT PART?"

"The most difficult part was the order placement workflow — specifically making it work correctly both on MongoDB Atlas (replica set, ACID transactions available) and on standalone local MongoDB (no replica set, transactions throw error code 20).

The naive solution was: always use transactions, which breaks local dev. Always skip transactions, which loses atomicity in production. The correct solution was: try to start a session, execute the order logic with the session, and if MongoDB throws error code 20 at the point of first use, abort the session and re-execute the exact same logic without a session. Local dev falls back gracefully; production Atlas gets full ACID.

Getting the fallback right required understanding exactly when MongoDB throws that error (not at `startSession()`, but at the first write operation within the transaction), and structuring the code so the same function could run with or without a session without duplicating business logic. I extracted the order logic into an `executeOrder` function that takes a session parameter (nullable), and the outer function handles the session lifecycle."

---

## P. "WHAT WOULD YOU IMPROVE IF YOU HAD MORE TIME?"

"Three things in order of impact:

First, I'd add refresh tokens. The current 7-day JWT is simple but means a compromised token is valid for a week. Short-lived access tokens (15 minutes) paired with a long-lived refresh token in an httpOnly cookie — inaccessible to JavaScript so immune to XSS — would be significantly more secure. The architecture for this is clear: a `POST /api/auth/refresh` endpoint that validates the refresh token from the cookie and issues a new access token.

Second, I'd add stock price charts. The price history is already stored — 100 data points per stock in MongoDB. Adding a Recharts LineChart component would make the platform visually compelling and demonstrable. For longer time ranges, I'd introduce a separate time-series collection or use MongoDB 5.0's native time-series collections.

Third, Redis caching on the stock listing endpoint and a Redis adapter for Socket.IO. Right now, `GET /api/stocks` hits MongoDB on every page load. A 2-second Redis cache would dramatically reduce DB load under real traffic. The Socket.IO Redis adapter would make the real-time system work correctly across multiple server instances — essential for any production deployment beyond a single server."

---

*End of Final Deliverables. All claims in this document are verified against the actual codebase.*
*Before any interview: run the project, demo every feature, re-read INTERVIEW_PREP.md.*
