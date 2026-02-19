# Esportra Coolify Deployment Guide

This guide explains how to deploy the Esportra project to your Coolify instance.

## Prerequisites

1.  A running Coolify instance.
2.  Your project pushed to a Git repository (GitHub/GitLab/etc.).

## Deployment Steps

1.  **Select Source Type**:
    - In Coolify, when adding a new resource, ensure you select **"Public Repository"** or **"Private Repository"** (e.g., GitHub).
    - **Do NOT** select "Docker Image" as the source unless you have already built and pushed the image to a registry.

2.  **Create a New Application**:
    - Connect your **Git Repository**.
    - Choose the **branch** (e.g., `main`).

3.  **Docker Registry Settings (Optional)**:
    - You mentioned seeing **"Docker Image"** and **"Docker Image Tag"** under the Docker Registry settings.
    - **Leave these empty**. 
    - If left empty, Coolify will build the image locally on your server and run it. It only needs these settings if you want to push the resulting image to an external registry (like Docker Hub).

4.  **Select Build Pack**:
    - Select **Docker Compose**. Coolify will automatically detect the `docker-compose.yml` file.
    - Alternatively, you can select **Dockerfile** and it will use the `Dockerfile` I provided.

3.  **Configure Environment Variables**:
    - Go to the **Environment Variables** tab in Coolify.
    - Add the following variables (you can find these in your local `.env.production` file):
        - `VITE_SUPABASE_URL`
        - `VITE_SUPABASE_ANON_KEY`
        - `VITE_APP_NAME`
        - `VITE_APP_VERSION`
    - **Note**: Ensure these are set to the correct production values.

4.  **Domains**:
    - Set up your domain or subdomain in the **Domains** tab.
    - Coolify will automatically handle SSL if configured.

5.  **Health Check (Optional but Recommended)**:
    - Set a health check to monitor the `/` path on port 80.

6.  **Deploy**:
    - Click **Deploy**. Coolify will pull the code, build the Docker image (using the multi-stage build in the `Dockerfile`), and start the container with Nginx serving your SPA.

## Why this configuration?

- **Multi-stage Build**: Keeps the final production image small by only including the build artifacts and Nginx.
- **Nginx Config**: Handles React Router's SPA routing, meaning if you refresh a sub-page (like `/dashboard`), Nginx will correctly serve `index.html` instead of a 404.
- **Gzip & Caching**: Pre-configured for better performance.

## Troubleshooting

- **404 on refresh**: Ensure `nginx.conf` was correctly copied into the image.
- **Build fails**: Check the build logs in Coolify. It usually points to a missing dependency or an issue in `package.json`.
