# Build stage
FROM node:20-alpine AS build-stage

WORKDIR /app

# Build-time variables — set these in Coolify → Environment Variables tab
# and mark each one as "Build Variable" (⚙ icon) so they're passed as --build-arg
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ARG VITE_APP_NAME=Esportra
ARG VITE_APP_VERSION=1.0.0
ARG VITE_FACEIT_CLIENT_ID
ARG VITE_FACEIT_REDIRECT_URI

# Expose as ENV so Vite picks them up as import.meta.env.VITE_* during build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_FACEIT_CLIENT_ID=$VITE_FACEIT_CLIENT_ID
ENV VITE_FACEIT_REDIRECT_URI=$VITE_FACEIT_REDIRECT_URI

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine AS production-stage

# Copy the build output from the build stage to Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
