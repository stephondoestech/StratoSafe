FROM node:16-alpine

WORKDIR /app

# Copy backend files
COPY backend/package*.json ./
RUN yarn install

# Copy the backend source code
COPY backend .

# Copy the React build folder from the frontend
COPY frontend/build ./frontend/build

# Expose the port the backend runs on
EXPOSE 3000

CMD ["npx", "ts-node", "src/server.ts"]
