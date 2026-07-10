# ==========================
# Build stage
# ==========================
FROM node:22-alpine AS build

WORKDIR /app


# Install redis for runtime later
RUN apk add --no-cache redis python3 py3-pip linux-headers make g++ && ln -sf /usr/bin/python3 /usr/bin/python


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


RUN apk add --no-cache redis bash


# Copy built services
COPY --from=build /app/mainService /app/mainService
COPY --from=build /app/playerService /app/playerService


COPY docker-entrypoint.sh /app/docker-entrypoint.sh


RUN chmod +x /app/docker-entrypoint.sh


# Render only cares about mainService port
EXPOSE 10000

# Internal
EXPOSE 4001
EXPOSE 50051
EXPOSE 6379


CMD ["/app/docker-entrypoint.sh"]