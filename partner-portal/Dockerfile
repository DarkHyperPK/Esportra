# Build stage
FROM node:20-alpine AS build-stage

WORKDIR /app

# Install dependencies specifically for the partner portal
COPY package*.json ./
RUN npm install

# Copy partner portal source code
COPY . .

# Build the portal
RUN npm run build

# Production stage
FROM nginx:stable-alpine AS production-stage

# Copy the build output
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
