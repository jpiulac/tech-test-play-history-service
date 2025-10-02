FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json first to cache dependencies
COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Build the NestJS application
RUN npm run build

# --- STAGE 2: PRODUCTION/RUNTIME ---
FROM node:20-alpine AS final

# Set the working directory
WORKDIR /app

# Copy production dependencies (only needed packages)
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm install --only=production

# Copy the built application files
COPY --from=builder /app/dist ./dist

# Copy the node_modules needed for production (if not installed in the current stage)
# If using TypeORM or other things that rely on the package.json run, keep the line above.
# If you prefer copying the built node_modules:
# COPY --from=builder /app/node_modules ./node_modules

# Expose the port (3000 is NestJS default)
EXPOSE 3000

# Command to run the application
CMD [ "node", "dist/main.js" ]

# --- Optional: Development Stage (If you want live reloading) ---
FROM builder AS development
# This stage is only referenced in docker-compose.yml for local development
CMD ["npm", "run", "start:dev"]
