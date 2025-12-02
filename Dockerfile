FROM node:22-alpine AS base

# Install dependencies required for both services
RUN apk add --no-cache tini curl nginx

# Create app directory
WORKDIR /app

# Copy package.json files for all services
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY package.json ./

# Copy yarn.lock if it exists (only try at root level)
COPY yarn.lock* ./

# Install dependencies
RUN yarn install

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build backend
WORKDIR /app/backend
ARG DB_USERNAME
ARG DB_PASSWORD
ARG JWT_SECRET
ENV DB_USERNAME=${DB_USERNAME}
ENV DB_PASSWORD=${DB_PASSWORD}
ENV JWT_SECRET=${JWT_SECRET}
RUN yarn build

# Build frontend
WORKDIR /app/frontend
RUN yarn build

# Setup Nginx for frontend
COPY ./nginx/combined.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 3000 3001

# Create startup script
WORKDIR /app
RUN echo '#!/bin/sh\nnginx\ncd /app/backend && node dist/server.js &\nwait' > /app/start.sh && \
    chmod +x /app/start.sh

# Run with tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/start.sh"]
