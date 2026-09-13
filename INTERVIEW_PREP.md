# EquityEdge — Complete Interview Preparation Guide

> This document is generated specifically from features that actually exist
> in the codebase. Every answer maps directly to code you wrote.
> Before any interview, re-read the code first, then re-read this document.

---

## HOW TO USE THIS DOCUMENT

1. Read the CONCEPT section first — understand it, don't just memorise it
2. Read the CODE WALKTHROUGH — trace it back to the actual file
3. Rehearse the IDEAL ANSWER out loud — under 90 seconds each
4. Prepare for every FOLLOW-UP listed — interviewers go deep
5. Know the TRADEOFF — this is what separates average from strong candidates

---

## PART 1 — TECHNOLOGY EXPLANATIONS

Before Q&A, here is what you need to know deeply about each technology.
These are the "why" answers that separate someone who used a library
from someone who understands it.

---

### 1. React

**Why did you use React?**
React solves the problem of keeping the UI in sync with state. Without a
framework, every time data changes (e.g., a stock price) you'd manually
find DOM elements and update them. React's virtual DOM diffing means you
just update state and React figures out the minimum DOM changes needed.

**How does it work internally?**
React maintains a virtual DOM — a JavaScript object tree mirroring the real
DOM. When state changes, React creates a new virtual DOM, diffs it against
the previous one (reconciliation), and applies only the changed nodes to the
real DOM (commit phase). This is faster than touching the real DOM for every
update.

**Why not vanilla JavaScript?**
For a trading dashboard where prices change every 5 seconds and multiple
components (TopBar, WatchList, Holdings) all display the same data, manual
DOM updates become unmaintainable. React's component model and unidirectional
data flow make this manageable.

**What are its limitations?**
React only handles the view layer — you still need routing (React Router),
state management (Context/Redux), and HTTP (Axios) yourself. Bundle size
grows quickly. Server-side rendering (Next.js) is better for SEO-heavy pages.

**What happens if it fails?**
Without Error Boundaries, one component throwing an error unmounts the entire
tree — user sees a blank screen. Error boundaries catch and isolate failures.
We don't have them in EquityEdge — that's a valid gap to mention.

---

### 2. Node.js + Express

**Why Node.js?**
Node.js is event-driven and non-blocking. When a request comes in that needs
a DB query (an I/O operation), Node doesn't block the thread waiting —
it registers a callback and handles other requests in the meantime.
This is the Event Loop model. It's ideal for I/O-heavy applications like APIs.

**Why not Java Spring Boot (which you also know)?**
For this project: Spring Boot would be correct at scale, but the overhead
(JVM startup, verbose configuration, deployment size) is unnecessary for
a learning project where the full stack is in one repository. Node + Express
gives you a working API server in ~20 lines. Both are valid choices; the
honest answer in an interview is about trade-offs, not "one is better."

**Why Express over raw Node.js http module?**
Express adds routing (`router.get('/stocks', ...)` instead of manually
parsing `req.url`), middleware chaining, and error handling patterns.
Without Express, you'd write this boilerplate yourself. Express doesn't
hide complexity — it organises it.

**What is the Event Loop?**
The JavaScript engine has one thread. The Event Loop monitors a call stack
and a callback queue. When the call stack is empty, it pulls the next
callback from the queue and runs it. This means Node.js can handle thousands
of concurrent requests with one thread — as long as none of them block
(which is why you must always use async DB calls, never synchronous ones).

**What happens if a synchronous operation blocks the event loop?**
Every other request is frozen until it completes. This is why we never use
`fs.readFileSync` or synchronous crypto in a Node.js server. bcrypt's
`hash()` is async — never use `hashSync` in a request handler.

---

### 3. MongoDB + Mongoose

**Why MongoDB over a relational DB like MySQL (which you also know)?**
For our data:
- Stocks have a priceHistory array — natural document embedding, awkward in SQL
- Watchlists are embedded arrays — one document per user, one query to read
- Holdings vary: a user might have 0 or 50 holdings

MongoDB's document model fits this better than normalised tables. If we were
building a banking ledger where referential integrity is critical, SQL (with
foreign key constraints) would be the correct choice. The honest answer
is: the right database depends on your access patterns.

**What is Mongoose?**
Mongoose is an ODM (Object-Document Mapper). It adds schemas, validation,
indexes, and instance methods on top of the MongoDB Node.js driver.
Without Mongoose: `db.collection('users').insertOne({email: "no@validation"})` —
no type checking, no required fields, nothing. With Mongoose, the schema
is enforced before any document hits the database.

**What is an index in MongoDB?**
Without an index, MongoDB does a collection scan — reads every document to
find matches. An index is a B-tree data structure on a specific field.
`User.findOne({ email })` without an index = O(n). With an index on email = O(log n).
We index: `email` (unique), `user+symbol` (holding lookup), `user+createdAt` (order history).

**What is the N+1 query problem and how did you solve it?**
If a user has 10 holdings and you fetch each stock's current price
individually, that's 11 queries (1 for holdings + 10 for stock prices).
In `portfolioController.js`:
```js
const symbols = holdings.map(h => h.symbol);
const stocks = await Stock.find({ symbol: { $in: symbols } });
```
One query for all prices. N+1 → 2 queries.

**What is `.lean()` and when do you use it?**
By default, `Model.find()` returns Mongoose Document instances — heavy
objects with all schema methods, validation, change tracking overhead.
`.lean()` returns plain JavaScript objects. ~2-3x faster for read-only
operations where you don't need `doc.save()`. We use it in all GET
endpoints: `Stock.find(query).lean()`.

---

### 4. JWT (JSON Web Token)

**How does JWT work?**
A JWT has three parts separated by dots: `Header.Payload.Signature`

- Header: `{ "alg": "HS256", "typ": "JWT" }` — base64url encoded
- Payload: `{ "id": "userId", "iat": 1234567890, "exp": 1235172690 }` — base64url encoded
- Signature: `HMACSHA256(base64(header) + "." + base64(payload), secret)`

The client sends `Authorization: Bearer <token>` with every request.
The server calls `jwt.verify(token, secret)` — which recomputes the
signature from the header + payload and compares. If they match and
the token hasn't expired, it's valid.

**Is the payload encrypted?**
No. It is base64url encoded — anyone can decode it. Never store passwords,
card numbers, or sensitive data in JWT. We only store `{ id: userId }`.

**Why HS256 not RS256?**
HS256 (symmetric): same secret signs and verifies. Correct for a monolith
where the same server both issues and verifies tokens.
RS256 (asymmetric): private key signs, public key verifies. Needed when
multiple microservices verify tokens but only one auth service issues them.
EquityEdge is a monolith — HS256 is correct.

**How do you handle token expiry?**
Our tokens expire in 7 days (JWT_EXPIRES_IN=7d). When `jwt.verify` throws
`TokenExpiredError`, our `errorHandler` catches it and returns 401
"Your session has expired. Please log in again." The client's Axios
response interceptor sees 401 and redirects to /login, clearing localStorage.

**How do you "log out" a stateless JWT?**
You can't invalidate a JWT from the server side without extra infrastructure.
On logout, the client deletes the token from localStorage. For true
server-side invalidation: maintain a Redis blacklist of invalidated JIDs,
check on every request. We don't implement this — it's a valid "what would
you add next" answer.

---

### 5. REST API Design

**What makes an API RESTful?**
REST (Representational State Transfer) has 6 constraints:
1. Client-Server separation
2. Statelessness — each request contains all info needed (hence JWT in header)
3. Cacheability
4. Uniform Interface — standard HTTP methods + resource-based URLs
5. Layered System
6. Code on Demand (optional)

In practice: use nouns not verbs in URLs, use HTTP methods correctly
(`GET` = read, `POST` = create, `PUT/PATCH` = update, `DELETE` = delete),
return consistent status codes.

**What HTTP status codes do you use and why?**
```
200 OK          — successful GET, PUT, PATCH, DELETE
201 Created     — successful POST (new resource created)
400 Bad Request — validation failed, missing fields
401 Unauthorized — not authenticated (no/invalid token)
403 Forbidden   — authenticated but not authorised
404 Not Found   — resource doesn't exist
409 Conflict    — duplicate (e.g., email already registered)
429 Too Many Requests — rate limit hit
500 Internal Server Error — unexpected server error
```

---

### 6. Socket.IO / Real-Time Architecture

**What is Socket.IO?**
Socket.IO is a library built on WebSocket with automatic fallback to HTTP
long-polling. It adds: rooms, namespaces, automatic reconnection, and an
event-based API. A WebSocket connection is a persistent, bidirectional TCP
connection — unlike HTTP which is request-response.

**How did you implement real-time prices?**
The PriceSimulator service runs `setInterval` every 5 seconds:
1. Fetches all 20 stocks from MongoDB
2. Generates new prices using a random walk: `newPrice = currentPrice × (1 + random%)`
3. Saves all updates with `Stock.bulkWrite()` — one MongoDB round-trip for 20 stocks
4. Emits `prices:update` to ALL connected clients via `io.emit()`

The React WatchList and TopBar components listen with `socket.on('prices:update', ...)`.
When the event fires, they update their local state with the new prices.

**Why `bulkWrite` instead of calling `.save()` in a loop?**
20 × `.save()` = 20 MongoDB write operations. `bulkWrite([...20 ops])` = 1
network round-trip. At 5-second tick intervals with many users, this
difference is significant.

**What is a Socket.IO room?**
A room is a named channel that sockets can join. `socket.join('user:abc123')`
puts that connection in a room. `io.to('user:abc123').emit(...)` sends only
to that room — not to everyone. We use this for `portfolio:updated` events
after a trade — only the trading user needs to know their balance changed.

**How would this scale to thousands of users?**
Socket.IO's Redis adapter. In a multi-server deployment, each server instance
has its own connected clients. Without the adapter, a price update emitted
on server A wouldn't reach clients connected to server B. The Redis adapter
uses pub/sub so all instances share events.

---

### 7. Axios

**Why Axios over the browser's native fetch?**
Axios adds:
1. Request/response interceptors (we use them for JWT injection and 401 handling)
2. Automatic JSON serialisation/deserialisation
3. Timeout configuration
4. Better error objects (fetch throws only on network errors, not 4xx/5xx)

**What is the request interceptor in axiosInstance.js?**
```js
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```
Every outgoing request automatically gets the JWT attached. Without this,
every API call would need `headers: { Authorization: ... }` manually.

**What is the response interceptor?**
```js
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```
Global 401 handler — when the token expires, the user is redirected to
login automatically. Without this, every component would need its own
401 check.

---

### 8. Docker

**What is Docker?**
Docker packages an application and all its dependencies into a container —
an isolated, portable unit. The container runs identically on any machine
that has Docker installed, regardless of the host OS. "Works on my machine"
stops being a problem.

**What is the difference between an image and a container?**
Image = the blueprint (built by `docker build`, immutable). 
Container = a running instance of an image (created by `docker run`).
One image, many containers.

**Why multi-stage builds for the frontend?**
```
Stage 1 (builder): Node.js → npm build → outputs /build folder (static HTML/JS/CSS)
Stage 2 (serve):   nginx:alpine → copies /build folder → serves it
```
Final image is nginx (~25MB) not node (~500MB). The build tools never ship
to production. This is a standard production pattern.

**What does `depends_on` do in docker-compose?**
It controls startup order. `backend: depends_on: mongodb` means Docker
won't start the backend container until MongoDB is running. With
`condition: service_healthy`, it waits until MongoDB actually passes its
healthcheck (not just starts the process — it waits until it accepts connections).

---

### 9. Testing (Jest + Supertest)

**Why test?**
Without tests, every change risks silently breaking existing functionality.
With 63 tests, you can refactor the order controller confidently — if the
tests pass, the behaviour is preserved.

**What is Supertest?**
Supertest wraps your Express `app` (not server) and lets you make real HTTP
requests in tests without binding to a port. It spins up a temporary server,
makes the request, returns the response, tears it down. No port conflicts.

**What is the app.js / server.js separation for?**
`server.js` calls `server.listen()` and `connectDB()`. If tests import
`server.js`, the server binds port 5000 — which fails if the port is in use,
and creates EADDRINUSE when multiple test suites run. `app.js` is pure
Express config — no side effects. Tests import `app.js`, use it with
supertest. Production runs `server.js`.

**Why `--runInBand`?**
By default Jest runs test files in parallel worker processes. When multiple
files all connect to the same test MongoDB instance, they can interfere.
`--runInBand` runs them sequentially in one process — slower but reliable.

**Why `clearTestDB()` in `beforeEach`?**
Full isolation between tests. Test A creates a user; test B should start
with a clean DB. Without `clearTestDB()`, test B might fail because the
user from test A already exists.

---

## PART 2 — FEATURE-BY-FEATURE INTERVIEW Q&A

---

### FEATURE 1: USER REGISTRATION

**INTERVIEW QUESTION:**
"Walk me through how user registration works in your project."

**IDEAL ANSWER (90 seconds):**
"Registration is handled by `POST /api/auth/register`. The route first runs
express-validator rules — name between 2–50 characters, valid email format,
password at least 6 characters with uppercase, lowercase, and a number.
If validation fails, we return 400 with a structured errors array.

If validation passes, the controller calls `User.create()`. The User model
has a pre-save hook that runs `bcrypt.hash(password, 12)` automatically before
storing. bcrypt generates a random salt, hashes the password 2^12 = 4096 times,
and stores the result. The salt is embedded in the hash itself.

We also create an empty Watchlist document for the user at registration, so
`GET /api/watchlist` always works without a 'not found' error.

On success, we call `jwt.sign({ id: user._id }, secret, { expiresIn: '7d' })`
and return the token with a 201. The password is never included in the response
because the schema has `select: false` on the password field."

**FOLLOW-UP QUESTION:**
"Why 12 salt rounds for bcrypt? Why not 100?"

**IDEAL FOLLOW-UP ANSWER:**
"bcrypt's cost scales as 2^rounds. At 12 rounds on modern hardware, hashing
takes approximately 100–300ms. That's acceptable user latency for login.
At 100 rounds, it would take several seconds — unbearable UX. The purpose
is to make offline brute-force attacks expensive, not legitimate logins.
10–12 rounds is the current industry standard. If CPU speeds double, we
bump it to 13."

**TRADEOFF:**
"We hash in the model pre-save hook rather than the controller. This costs a
bit of explicitness — the controller doesn't see the hashing. The benefit is
that any code path that saves a User document will always hash automatically,
preventing plaintext passwords from ever being stored accidentally."

---

### FEATURE 2: JWT AUTHENTICATION

**INTERVIEW QUESTION:**
"How does authentication work on your protected routes?"

**IDEAL ANSWER:**
"Every request to a protected route first passes through the `protect`
middleware in `authMiddleware.js`.

It does three things: First, it extracts the token from the `Authorization`
header. The format is `Bearer <token>` per RFC 6750. If no token, it returns
401 immediately.

Second, it calls `jwt.verify(token, secret)`. This function checks the
signature — it re-computes HMAC-SHA256 of the header and payload using our
secret and compares it to the signature in the token. It also checks the
`exp` field against the current time. If either check fails, it throws
`JsonWebTokenError` or `TokenExpiredError`, which our central error handler
converts to a clean 401 response.

Third, even after the token passes cryptographic verification, we do
`User.findById(decoded.id)`. This is necessary because a token is
mathematically valid even after its user account has been deleted.
The DB check ensures we're not serving a ghost account.

Then `req.user = currentUser` and `next()` — the controller runs."

**FOLLOW-UP QUESTION:**
"How would you handle token refresh without forcing users to log in every 7 days?"

**IDEAL FOLLOW-UP ANSWER:**
"The standard pattern is access token + refresh token. The access token has
a short life (15 minutes). When it expires, the client sends the refresh
token — a long-lived (7-day) token stored in an httpOnly cookie — to a
dedicated `POST /api/auth/refresh` endpoint. The server validates the refresh
token (ideally from a whitelist in Redis), issues a new access token, and
the user never notices the expiry. The refresh token in an httpOnly cookie
is inaccessible to JavaScript, which protects it from XSS attacks.
In EquityEdge we use a simpler 7-day single token — this two-token pattern
would be the production improvement."

**TRADEOFF:**
"Single long-lived token vs refresh token pattern: the single token is simpler
to implement and sufficient for a learning project. In production, the
refresh token pattern is safer because compromised access tokens expire quickly."

---

### FEATURE 3: ORDER PLACEMENT (BUY/SELL)

**INTERVIEW QUESTION:**
"Walk me through what happens when a user places a buy order."

**IDEAL ANSWER:**
"The client sends `POST /api/orders` with `{ symbol, orderType: 'BUY', quantity }`.
The request first hits `protect` middleware for auth, then the validation
middleware checks that symbol is alphanumeric, orderType is BUY or SELL,
and quantity is a positive integer.

In the controller: first I fetch the stock from MongoDB to get the current
price — this is the execution price. I compute `totalValue = price × quantity`.

Then I try to start a Mongoose session for a multi-document ACID transaction.
If the MongoDB instance is a replica set or Atlas cluster, this succeeds and
all subsequent operations are atomic. On a standalone instance (local dev),
it falls back to sequential operations gracefully.

Within the transaction: I create the Order with status PENDING. I check
the user's `cashBalance >= totalValue` — if not, I abort the transaction,
mark the order REJECTED, and return 400. If they have sufficient balance,
I deduct `cashBalance -= totalValue` and save the user.

Then I upsert the Holding. If a holding for this stock exists, I recalculate
the weighted average buy price: `newAvg = (oldQty×oldAvg + newQty×newPrice) / totalQty`.
If no holding exists, I create one. Then I create an immutable Transaction record
with `balanceAfter` for the audit trail. Finally, I mark the Order EXECUTED
and commit the transaction.

After commit, I emit a Socket.IO event to the user's personal room so their
dashboard updates the cash balance in real time without a page refresh."

**FOLLOW-UP QUESTION:**
"What is the average cost basis and why does it matter?"

**IDEAL FOLLOW-UP ANSWER:**
"Average cost basis is the weighted average price paid per share across multiple
purchases. If I buy 10 TCS shares at ₹500 and later 5 more at ₹600, my
average is `(10×500 + 5×600) / 15 = ₹533.33`. This matters because my true
P&L is `(currentPrice - 533.33) × 15 shares` — not based on either individual
purchase price. It's the standard accounting method used by brokerages.
The formula in `orderController.js` implements this exactly."

**FOLLOW-UP QUESTION:**
"What is a MongoDB ACID transaction and why did you use it?"

**IDEAL FOLLOW-UP ANSWER:**
"ACID stands for Atomicity, Consistency, Isolation, Durability. The transaction
groups multiple write operations so they either ALL commit or ALL roll back.
Here, a buy order involves 4 writes: Order, User balance, Holding, Transaction.
Without atomicity: if the server crashes after deducting the balance but before
creating the Holding, the user has lost money with no record. The transaction
guarantees that either everything succeeds or nothing does, leaving the database
in a consistent state. MongoDB has supported multi-document transactions since
version 4.0, but they require a replica set."

**TRADEOFF:**
"MongoDB transactions require a replica set — not available on standalone
MongoDB (local dev). My solution: try to start a session, and if MongoDB
throws error code 20 ('Transaction numbers only allowed on replica set'),
retry the same operation without a session. Production on Atlas (which is
always a replica set) gets full ACID guarantees. Local dev sacrifices that
for ergonomics. I'm transparent about this trade-off."

---

### FEATURE 4: PORTFOLIO P&L CALCULATION

**INTERVIEW QUESTION:**
"How do you calculate the portfolio's profit and loss?"

**IDEAL ANSWER:**
"The portfolio is derived data — there's no `Portfolio` collection in MongoDB.
P&L is computed fresh on every `GET /api/portfolio` request, because stock
prices change every 5 seconds and any stored value would be immediately stale.

The calculation has three steps: First, I fetch the user's holdings and cash
balance in parallel using `Promise.all` to avoid sequential latency.

Second, I get current prices for all held stocks with a single `$in` query:
`Stock.find({ symbol: { $in: symbols } })`. I build a symbol→price map for O(1)
lookups. This solves the N+1 problem — 10 holdings = 2 queries, not 11.

Third, for each holding I compute:
- `currentValue = currentPrice × quantity`
- `profitLoss = (currentPrice - averageBuyPrice) × quantity`
- `profitLossPercent = (profitLoss / investedValue) × 100`
- `dayPL = (currentPrice - previousClose) × quantity`

I sum these across all holdings for the portfolio totals.
`totalPortfolioValue = cashBalance + totalCurrentValue`."

**FOLLOW-UP QUESTION:**
"What is the difference between total P&L and today's P&L?"

**IDEAL FOLLOW-UP ANSWER:**
"Total P&L compares the current price against the average buy price —
it reflects gains/losses since the user first bought the stock.
Today's P&L compares the current price against the previous day's closing
price — it reflects only today's movement. The Stock model stores
`previousClose` exactly for this purpose. If I bought TCS at ₹500 and it
closed yesterday at ₹600, today's opening at ₹620 means: total P&L = +₹120,
today's P&L = +₹20. Both are meaningful — today's tells you daily performance,
total tells you overall investment performance."

---

### FEATURE 5: REAL-TIME PRICE SIMULATION

**INTERVIEW QUESTION:**
"How does your real-time price update work?"

**IDEAL ANSWER:**
"The backend has a `PriceSimulator` class in `services/priceSimulator.js`.
On server startup, after `server.listen()`, we instantiate it with the Socket.IO
server and call `simulator.start()`.

`start()` calls `setInterval(this.updatePrices, 5000)` — every 5 seconds,
`updatePrices()` runs. It fetches all 20 active stocks from MongoDB, then
for each one generates a new price using a simplified random walk:
`newPrice = currentPrice × (1 + changePercent/100)`
where `changePercent` is random between -0.8% and +0.8%.

This is inspired by Geometric Brownian Motion — the mathematical model in
the Black-Scholes formula. GBM applies changes as percentages of the current
price, so prices can never go negative and higher-priced stocks have larger
absolute moves, which is realistic.

After generating all prices, I use `Stock.bulkWrite()` to update all 20
documents in one MongoDB round-trip instead of 20 saves. The `priceHistory`
array is maintained with `$push: { $each: [newPoint], $slice: -100 }` —
atomically appends and trims to 100 entries.

Then `io.emit('prices:update', priceMap)` broadcasts to all connected clients.
React components listening with `socket.on('prices:update', ...)` update their
local state, which triggers a re-render with the new prices."

**FOLLOW-UP QUESTION:**
"What would you change to use real market data instead of simulation?"

**IDEAL FOLLOW-UP ANSWER:**
"The architecture wouldn't change — only the data source for `updatePrices`.
Instead of a random walk, I'd call NSE India's data feed, or a free API like
Yahoo Finance for delayed quotes. The `updatePrices()` method would make an
HTTP call, map the response to our stock format, and the rest of the pipeline
(bulkWrite + Socket.IO emit) stays identical. This is the power of the service
abstraction — the simulator is swappable."

**TRADEOFF:**
"Simulated prices vs real data: real data requires a paid API, authentication,
rate limits, and handling market hours (prices don't move when the market
is closed). Simulation sidesteps all of this for a learning project while
keeping the architecture real and demonstrable. I clearly label all prices
as simulated in the UI."

---

### FEATURE 6: WATCHLIST

**INTERVIEW QUESTION:**
"How is the watchlist designed in your database?"

**IDEAL ANSWER:**
"One Watchlist document per user, with stocks embedded as an array.
The schema is: `{ user: ObjectId, stocks: [{ symbol, name, addedAt }] }`.

I chose embedding over a separate WatchlistItem collection because the access
pattern is always user-scoped: add a stock for user X, remove for user X,
list all for user X. There's no query like 'find all users watching TCS.'
When access is always via the parent document, embedding is more efficient.

For removing a stock, I use MongoDB's `$pull` operator directly:
`Watchlist.findOneAndUpdate({ user }, { $pull: { stocks: { symbol } } })`.
This is atomic and avoids loading the entire document into memory just to
splice an array.

The `GET /api/watchlist` endpoint enriches the stored symbol list with live
prices using a `$in` batch query — same N+1 solution as the portfolio."

**FOLLOW-UP QUESTION:**
"When would you choose a separate collection over embedding?"

**IDEAL FOLLOW-UP ANSWER:**
"Three scenarios favour a separate collection:
1. Unbounded growth — if a watchlist could have millions of items, a single
   document would exceed MongoDB's 16MB limit. Ours is capped at 50.
2. Independent queries — if you needed 'which users watch TCS?' you'd need
   to scan every watchlist document. A separate collection with an index
   on `symbol` handles this in O(log n).
3. Shared references — if the same watchlist item is referenced from multiple
   parent documents, embedding duplicates data. References (ObjectIds) avoid that.
   For our use case: bounded, always user-scoped, never cross-referenced —
   embedding is definitively correct."

---

### FEATURE 7: CENTRALISED ERROR HANDLING

**INTERVIEW QUESTION:**
"How do you handle errors in your API?"

**IDEAL ANSWER:**
"Every controller is wrapped in `catchAsync()` — a higher-order function
that catches any rejected promise and passes it to `next(err)`. This means
no controller needs try/catch boilerplate.

The central `errorHandler` middleware (identified by Express via 4 arguments:
`err, req, res, next`) handles all errors in one place.

I distinguish two error types: `AppError` instances are 'operational' errors
— things I expect to happen, like a stock not found or invalid credentials.
These have an HTTP status code and a safe message to show the user.
Other errors are programming bugs — null references, DB driver errors.
For these, I log to console and return a generic 'Something went wrong'
message so stack traces never reach the client.

I also handle specific MongoDB errors: duplicate key (code 11000) → 409
Conflict, validation failure → 400, invalid ObjectId → 400, JWT errors → 401.
By centralising these conversions, the controllers stay clean."

**FOLLOW-UP QUESTION:**
"What is the difference between `throw new AppError()` and `next(new AppError())`?"

**IDEAL FOLLOW-UP ANSWER:**
"`throw` inside an async function will propagate up to `catchAsync`'s `.catch(next)`,
which calls `next(err)`. Inside a synchronous middleware or a callback, `throw`
won't reach Express's error handler — you must call `next(err)` explicitly.
In an async `catchAsync` wrapper, both work, but `return next(new AppError())`
is preferred because `return` stops the function immediately, whereas `throw`
also stops it but is clearer about intent when you're inside an async function.
In practice: use `return next(new AppError(...))` in async controllers."

---

### FEATURE 8: INPUT VALIDATION

**INTERVIEW QUESTION:**
"How do you validate API inputs?"

**IDEAL ANSWER:**
"I use `express-validator` at the route level. Validation rules are arrays
of middleware attached to specific routes:
```js
router.post('/orders',
  [body('symbol').trim().notEmpty().isLength({max:10}),
   body('orderType').isIn(['BUY','SELL']),
   body('quantity').isInt({min:1})],
  validate,  // checks validationResult(req)
  controller.placeOrder
);
```

The `validate` middleware calls `validationResult(req)`. If there are errors,
it returns 400 with a structured array: `[{field: 'quantity', message: 'must be positive'}]`.
If no errors, it calls `next()` and the controller runs.

Validation is ONLY on the backend. Frontend validation is UX — it can be
bypassed with curl or Postman. The server never trusts client-side validation."

**FOLLOW-UP QUESTION:**
"What is NoSQL injection and how do you prevent it?"

**IDEAL FOLLOW-UP ANSWER:**
"MongoDB operators like `$gt`, `$where`, `$regex` can be injected in JSON
request bodies. For example, sending `{ 'email': { '$gt': '' }, 'password': { '$gt': '' } }`
to a login endpoint could bypass password checks because `$gt: ''` matches
any string. `express-mongo-sanitize` strips all keys beginning with `$` and
containing `.` from `req.body`, `req.params`, and `req.query`. It runs as
global middleware before any route handler. I also use Mongoose's `find()`
with typed schemas, which provides a second layer of protection since
Mongoose coerces types and rejects unexpected operator objects."

---

### FEATURE 9: TESTING

**INTERVIEW QUESTION:**
"Tell me about your testing approach."

**IDEAL ANSWER:**
"I wrote 63 integration tests across 5 test suites using Jest and Supertest.
They're integration tests, not unit tests — they test the full HTTP request
lifecycle including the real MongoDB database.

The test setup separates `app.js` from `server.js`. Tests import `app.js`
which is pure Express configuration — no port binding, no DB connection.
Supertest wraps it internally. Each suite calls `connectDB()` in `beforeAll`
to connect to a dedicated test database (equityedge_test), and `clearTestDB()`
in `beforeEach` for full isolation between tests.

The most important tests are for orders: I verify that a successful BUY
deducts the exact amount from `cashBalance`, creates a Holding with the
correct `averageBuyPrice`, creates an immutable Transaction with `balanceAfter`,
and marks the Order as EXECUTED — all in one test. This validates the atomicity
of the workflow.

I also test error paths: insufficient balance returns 400, wrong symbol returns
404, selling more shares than held returns 400, and trying to access another
user's orders returns 404 — not 403 — to avoid leaking whether the resource exists."

**FOLLOW-UP QUESTION:**
"Why 404 instead of 403 when a user tries to access another user's order?"

**IDEAL FOLLOW-UP ANSWER:**
"403 Forbidden tells the attacker that the resource EXISTS but they're not
authorised. This is an information leak — they now know order ID X belongs
to another user. 404 Not Found gives no information about existence.
The query is `Order.findOne({ _id: orderId, user: currentUserId })` — if
the order belongs to another user, this returns null, same as a non-existent
order. Both scenarios get 404. This is the 'security through obscurity'
principle applied correctly — not hiding the system, but not confirming
resource existence to unauthorised users."

---

### FEATURE 10: DOCKER + CI

**INTERVIEW QUESTION:**
"Walk me through your Docker setup."

**IDEAL ANSWER:**
"There are three services: the Node.js backend, the React frontend (served by
nginx), and the React dashboard (also nginx). Plus MongoDB. All four are
defined in `docker-compose.yml`.

The backend Dockerfile uses `node:20-alpine` for a small image (~150MB vs 1GB
for full Debian). It copies `package.json` first, runs `npm ci`, then copies
source — this enables Docker layer caching. If I only change application code,
the `npm ci` layer is reused.

The frontend and dashboard use multi-stage builds. Stage 1 uses Node to run
`npm run build`, producing static HTML/JS/CSS. Stage 2 uses `nginx:alpine`
to serve those files. The final image is ~25MB and contains no Node.js —
only the build output.

Docker Compose sets up the full stack with `docker-compose up --build`.
The backend `depends_on` MongoDB with `condition: service_healthy`, meaning
it waits until MongoDB's health check passes before starting — not just when
the container starts.

For CI, GitHub Actions runs three parallel jobs: backend (with a MongoDB
service container, installs, then runs the 63 tests), frontend build check,
and dashboard build check. Every push to main triggers the pipeline."

**FOLLOW-UP QUESTION:**
"What is Docker layer caching and why does it matter?"

**IDEAL FOLLOW-UP ANSWER:**
"Docker builds images in layers, one per instruction. Each layer is cached by
a hash of its content. If a layer's content hasn't changed, Docker reuses the
cached version instead of re-executing it. The key insight: `npm install` is
slow (~30-60s). If we copy all source code first and then run `npm install`,
any source code change invalidates the `npm install` layer. By copying
`package.json` and `package-lock.json` first, running `npm ci`, and THEN
copying source, the `npm ci` layer is only invalidated when dependencies
actually change. Source code changes only invalidate the final COPY layer —
which is fast. This reduces build times from ~2 minutes to ~15 seconds for
typical code changes."

---

## PART 3 — TECHNOLOGY TRADEOFF MATRIX

Use this when an interviewer asks "why X and not Y?"

| Decision | Why Chosen | Why Not Alternative |
|---|---|---|
| MongoDB over MySQL | priceHistory array, embedded watchlist, flexible holdings | SQL good for strict referential integrity; overkill here |
| JWT over sessions | Stateless, works across multiple servers, standard for SPAs | Sessions need server-side storage (Redis); adds infrastructure |
| bcrypt over SHA-256 | Adaptive cost, salt built-in, immune to rainbow tables | SHA-256 is fast — good for data integrity, terrible for passwords |
| Express-validator over Joi | Middleware-based, integrates naturally with Express route chains | Joi requires separate validation step; both are valid |
| Socket.IO over raw WebSocket | Rooms, auto-reconnect, fallback to polling | Raw WS needs all that written manually; no benefit here |
| Axios over fetch | Interceptors, timeouts, consistent error objects | fetch is built-in but lacks interceptors without wrappers |
| Jest+Supertest over Postman | Automated, repeatable, in CI | Postman is manual; can't run in CI without Newman |
| Node.js over Java/Spring | Fast setup, same language as frontend, ideal for I/O | Spring has better enterprise tooling but heavier for this scale |
| Two React apps over monorepo | Clear separation of concerns, independent deployments | Shared component library would reduce duplication |
| Embedding watchlist over separate collection | All access is user-scoped, bounded size | Separate collection needed if querying across users |

---

## PART 4 — COMMON MISTAKES TO AVOID IN INTERVIEWS

**Don't say you "built" something that isn't in the code.**
Every claim must map to an actual file. Before an interview, run the project
and demo it. If a feature doesn't work, say "it's implemented but I haven't
fully tested it" rather than claiming it works perfectly.

**Don't confuse encoding with encryption.**
JWT payload is base64url ENCODED, not encrypted. Anyone can decode it.
This is a very common interview trap — "so the password in the JWT is safe?"
No, we never put passwords in the JWT. Only the user ID.

**Don't say "MongoDB is better than SQL."**
Say "for this access pattern, MongoDB was a good fit because..." and then
give the specific reason. Interviewers hate blanket statements.

**Don't say "React is faster than vanilla JS."**
React's virtual DOM can actually be slower than hand-optimised vanilla JS
for simple cases. React's value is developer productivity and maintainability
for complex, stateful UIs.

**Don't confuse authentication and authorisation.**
Auth = who are you (identity). Authz = what are you allowed to do (permissions).
In EquityEdge, `protect` middleware handles authentication. All users have
equal permissions (no roles), so there's no authorisation layer.

**Don't forget error cases when walking through a feature.**
When explaining the buy order flow, mention what happens when balance is
insufficient, when the stock doesn't exist, when the session fails.
Interviewers want to see you think about failure modes.

---

## PART 5 — HONEST GAPS TO ACKNOWLEDGE

These are things EquityEdge doesn't have. If asked, acknowledge honestly
and explain what you would add:

1. **Refresh tokens** — current 7-day JWT is simpler but less secure. Production
   would use short-lived access tokens + long-lived refresh tokens in httpOnly cookies.

2. **Redis caching** — `GET /api/stocks` hits MongoDB on every request. A 2-second
   Redis cache would dramatically reduce DB load at scale.

3. **Technical charts** — price history exists in the DB but there's no
   Recharts/Chart.js component rendering it yet.

4. **Error boundaries in React** — one crashing component currently unmounts
   the entire tree. Error boundaries would isolate failures.

5. **Refresh on Socket.IO reconnect** — if the connection drops and reconnects,
   the client doesn't re-fetch the latest state. Should call the REST API
   on reconnect to resync.

6. **Real market data** — prices are simulated. The architecture supports
   swapping in a real data feed without changing anything except
   `priceSimulator.js`.

7. **Password reset flow** — no email/OTP flow for forgotten passwords.

---

*This document covers every feature that actually exists in the codebase.
Read it alongside the actual code — the combination of understanding + code
familiarity is what makes the difference in a technical interview.*
