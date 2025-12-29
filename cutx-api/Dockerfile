# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files from cutx-api subfolder
COPY cutx-api/package*.json ./
COPY cutx-api/prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code from cutx-api subfolder
COPY cutx-api/. .

# Build the NestJS application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files from cutx-api subfolder
COPY cutx-api/package*.json ./
COPY cutx-api/prisma ./prisma/

# Install production dependencies only
RUN npm ci --omit=dev

# Generate Prisma client
RUN npx prisma generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main"]
