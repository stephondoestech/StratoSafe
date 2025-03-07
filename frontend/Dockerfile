# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN yarn install

# Build the app with CI=false to prevent treating warnings as errors
RUN CI=false yarn build

# Production stage with Nginx
FROM nginx:alpine

# Copy build files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Create a custom nginx config directly in the Dockerfile
RUN echo 'server { \
    listen 3000; \
    \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api/ { \
        proxy_pass http://backend:3001/api/; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Display the nginx config for debugging
RUN cat /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
