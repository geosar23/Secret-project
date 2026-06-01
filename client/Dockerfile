# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

# Backend API URL — override at build time for production:
#   docker build --build-arg API_URL=https://your-backend.railway.app/api .
ARG API_URL=http://localhost:3000/api

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy source and inject the API URL into the production environment file
COPY . .
RUN sed -i "s|http://localhost:3000/api|${API_URL}|g" src/environments/environment.prod.ts

# Build Angular in production mode (output: dist/client/browser/)
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM nginx:alpine AS production

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy Angular build output
COPY --from=builder /app/dist/client/browser /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
