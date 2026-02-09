
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Standard way to pass build arguments
ARG VITE_API_URL
ARG VITE_ALERT_TIMEOUT

RUN npm run build

# Stage 2: Serve
# We keep using Node to run a lightweight static server 'serve'
FROM node:20-alpine

WORKDIR /app

# Install 'serve' globally
RUN npm install -g serve

# Copy built assets
COPY --from=builder /app/dist /app/dist

# Expose internal port
EXPOSE 3000

# Run serve
# -s: Single Page Application (rewrites 404 to index.html)
# -l 3000: Listen on port 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
