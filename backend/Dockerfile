FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Install dependencies
RUN yarn install

# Copy source code
COPY src ./src

# Create uploads directory
RUN mkdir -p uploads

# Build the application with less strict TypeScript config
RUN yarn tsc -p tsconfig.build.json

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:${PORT:-3001}/health || exit 1

# Expose the port
EXPOSE ${PORT:-3001}

# Start the application
CMD ["yarn", "start"]
