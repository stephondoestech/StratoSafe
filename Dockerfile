FROM node:22-alpine

RUN apk add --no-cache tini

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock* ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN yarn install --frozen-lockfile

# Copy source
COPY backend ./backend
COPY frontend ./frontend

# Build backend and frontend
RUN yarn workspace stratosafe-backend build && \
    yarn workspace stratosafe-frontend build

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["yarn", "workspace", "stratosafe-backend", "start"]
