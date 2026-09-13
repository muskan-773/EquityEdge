# ── Backend Dockerfile ────────────────────────────────────────────────────────
#
# Multi-stage is overkill for a Node.js API — one stage is correct here.
# We use the official Node 20 slim image to keep the image small.
#
# Interview Q: "What is a Dockerfile?"
# A: A Dockerfile is a script of instructions that tells Docker how to build
#    an image — a reproducible, isolated snapshot of your application and
#    all its dependencies. Anyone with Docker can run `docker build` and get
#    an identical environment, regardless of their OS or local setup.
#
# Interview Q: "Why node:20-alpine instead of node:20?"
# A: The alpine variant is based on Alpine Linux (~5MB) instead of Debian
#    (~170MB). The resulting image is ~150MB vs ~1GB. Smaller images pull
#    faster, use less disk, and have a smaller attack surface. The trade-off
#    is that alpine uses musl libc instead of glibc — some native Node
#    addons can break. For pure JS apps like ours, alpine is always the
#    right choice.
#
# Interview Q: "Why copy package.json before copying source code?"
# A: Docker builds in layers. If we copied everything first, then changed
#    one line of source code, Docker would re-run npm install — wasting
#    minutes. By copying package.json first, `npm ci` is only re-run when
#    dependencies actually change. Everything else just copies the cached
#    node_modules layer. This is called layer caching.

FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy dependency manifests first — enables layer caching
# (npm install layer only re-runs when package.json or package-lock.json changes)
COPY package.json package-lock.json ./

# `npm ci` (clean install): faster and stricter than `npm install`
# Uses exact versions from package-lock.json. Never updates the lockfile.
# Best practice for Docker and CI.
RUN npm ci --omit=dev

# Copy source code (this layer changes on every code edit)
COPY . .

# Document which port the app listens on (informational — doesn't actually publish)
EXPOSE 5000

# Health check: Docker will automatically restart the container if this fails
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Start the server
CMD ["node", "server.js"]
