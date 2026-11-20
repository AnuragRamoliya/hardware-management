# Production Deployment Guide

## 1. Prerequisites

- **Operating System**: Linux (Ubuntu 22.04 LTS / Debian 12 recommended)
- **Node.js**: v22.x LTS with npm
- **Database**: MySQL 8.0 or 8.4 (or MariaDB 10.4+)
- **Reverse Proxy**: Nginx or Caddy with TLS/HTTPS certificates (Let's Encrypt / Certbot)

---

## 2. Deployment via Docker Compose (Recommended)

1. **Clone repository**:

   ```bash
   git clone <repo-url> /opt/hardware-management
   cd /opt/hardware-management
   ```

2. **Configure production environment**:

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

   Edit `apps/api/.env`:
   - `NODE_ENV=production`
   - `DB_HOST=mysql`
   - `DB_DATABASE=itam_db`
   - `DB_USERNAME=itam_user`
   - `DB_PASSWORD=<secure-database-password>`
   - `SECRET_KEY=<32-char-random-jwt-secret>`
   - `VAULT_ENCRYPTION_KEY=<32-char-random-vault-key>`
   - `CORS_ORIGINS=https://itam.yourcompany.com`

3. **Build and launch containers**:

   ```bash
   docker compose build
   docker compose up -d
   ```

4. **Verify container health**:
   ```bash
   docker compose ps
   curl http://localhost:8000/health
   curl http://localhost:8000/ready
   ```

---

## 3. Deployment on Bare Metal / Virtual Machine

1. **Install dependencies**:

   ```bash
   npm ci --legacy-peer-deps
   ```

2. **Build all workspaces**:

   ```bash
   npm run build
   ```

3. **Run database migrations**:

   ```bash
   npm run db:migrate --workspace=@hm/api
   ```

4. **Start API service via PM2 / Systemd**:

   ```bash
   pm2 start apps/api/dist/server.js --name hm-api
   ```

5. **Serve Web SPA via Nginx**:
   Point Nginx `root` directive to `/opt/hardware-management/apps/web/dist` with client-side routing fallback:
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   location /api/ {
       proxy_pass http://localhost:8000/;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
   }
   ```
