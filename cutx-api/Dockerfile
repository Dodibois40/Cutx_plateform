# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy ALL config files first (needed for postinstall which runs nest build)
COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install all dependencies (postinstall will run prisma generate + nest build)
# But we need src first for the build
COPY src ./src/

# Now install - postinstall will generate prisma client and build
RUN npm ci

# Verify build output exists
RUN ls -la dist/ && test -f dist/main.js

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only (skip postinstall which tries to build)
RUN npm ci --omit=dev --ignore-scripts

# Generate Prisma client
RUN npx prisma generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Run migrations and start the application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
