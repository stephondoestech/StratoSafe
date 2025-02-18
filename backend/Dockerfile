# Use an official lightweight Node image.
FROM node:16-alpine

# Create and set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your backend code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the server using ts-node
CMD ["npx", "ts-node", "src/server.ts"]
