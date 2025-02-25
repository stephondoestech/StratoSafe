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

# Expose the port
EXPOSE ${PORT}

# Start the application
CMD ["yarn", "start"]
