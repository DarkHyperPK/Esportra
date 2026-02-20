# Build stage
FROM node:20-alpine AS build-stage

WORKDIR /app

# Define build arguments for environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_APP_NAME="Esportra Partner Portal"

# Export them as environment variables so Vite picks them up
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_APP_NAME=$VITE_APP_NAME

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
