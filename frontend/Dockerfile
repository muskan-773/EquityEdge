# ── Frontend Dockerfile (multi-stage build) ───────────────────────────────────
#
# Stage 1 (builder): Install dependencies and build the React app
# Stage 2 (serve):   Use nginx to serve the static build output
#
# Interview Q: "Why two stages for a React app?"
# A: The build stage needs Node.js, npm, and all devDependencies.
#    The final production image only needs nginx to serve static files.
#    Multi-stage build means the final image is ~25MB (nginx) instead
#    of ~500MB (node + all packages). We never ship node_modules to prod.

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# CI=false prevents react-scripts from treating warnings as errors
ENV CI=false
RUN npm run build

# ── Stage 2: Serve with nginx ─────────────────────────────────────────────────
FROM nginx:alpine

# Copy the static build output from stage 1
COPY --from=builder /app/build /usr/share/nginx/html

# Custom nginx config to handle React Router's client-side routing.
# Without this, refreshing any route (e.g. /signup) returns a 404
# because nginx looks for a file named "signup" which doesn't exist.
# try_files $uri /index.html makes nginx always serve index.html,
# letting React Router handle the routing.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
