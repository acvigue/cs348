# Stage 1: Build the Nuxt.js application
FROM node:lts-alpine AS build

# Enable Corepack to manage pnpm
RUN corepack enable

# Set up pnpm environment variables
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV DATABASE_URL="postgresql://cs348:cs348@localhost:5432/cs348"

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --ignore-scripts

# Generate Prisma client dependencies
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN pnpm prisma generate

# Copy everything else and build the application
COPY . .
RUN --mount=type=cache,id=nuxt,target=/app/node_modules/.cache \
    pnpm run build

# Stage 2: final image to run the application
FROM node:lts-alpine AS final

# Enable Corepack to manage pnpm
RUN corepack enable

# Set working directory
WORKDIR /app
RUN addgroup -S appuser && adduser -S -G appuser appuser 
RUN chown appuser:appuser /app

RUN apk add --no-cache git
RUN npm i dotenv prisma @prisma/adapter-pg

# Copy built application from build stage as well as prisma files
COPY --from=build --chown=appuser:appuser /app/.output ./
COPY --from=build --chown=appuser:appuser /app/prisma ./prisma
COPY --from=build --chown=appuser:appuser /app/package.json ./package.json
COPY --from=build --chown=appuser:appuser /app/prisma.config.ts ./prisma.config.ts

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000
USER appuser

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]
CMD ["node", "server/index.mjs"]