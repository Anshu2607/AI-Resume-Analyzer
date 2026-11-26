# =====================================
# STAGE 1: BUILD REACT APPLICATION
# =====================================

FROM node:24-bookworm-slim AS builder

WORKDIR /app

# Install dependencies using lockfile.

COPY package.json package-lock.json ./

RUN npm ci

# Copy frontend source code.

COPY . .

# Configure production API URL.

ARG VITE_API_BASE_URL=/api/v1

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Generate production build.

RUN npm run build

# =====================================
# STAGE 2: NGINX RUNTIME
# =====================================

FROM nginx:stable-alpine AS runtime

# Remove default Nginx configuration.

RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration.

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled React application.

COPY --from=builder /app/dist /usr/share/nginx/html

# Expose frontend port.

EXPOSE 80

# Container health check.

HEALTHCHECK --interval=30s --timeout=5s \
    --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1

# Graceful shutdown.

STOPSIGNAL SIGQUIT

# Start Nginx.

CMD ["nginx", "-g", "daemon off;"]