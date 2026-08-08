# ==========================
# Build stage
# ==========================
FROM node:22-alpine AS build

WORKDIR /app

# Copy services
COPY mainService ./mainService
COPY playerService ./playerService

# Install + build mainService
WORKDIR /app/mainService
RUN yarn install --frozen-lockfile
RUN yarn build

# Install + build playerService
WORKDIR /app/playerService
RUN yarn install --frozen-lockfile
RUN yarn build

# ==========================
# Runtime stage
# ==========================
FROM node:22-alpine

WORKDIR /app

# Redis is a runtime dependency for the mainService
RUN apk add --no-cache redis bash

# Copy built services
COPY --from=build /app/mainService /app/mainService
COPY --from=build /app/playerService /app/playerService

COPY docker-entrypoint.sh /app/docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh

# Expose the main service port
EXPOSE 3001

# Internal ports used by the services
EXPOSE 4001
EXPOSE 50051
EXPOSE 6379

CMD ["/app/docker-entrypoint.sh"]