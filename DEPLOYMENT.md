# Deployment Guide

This guide covers deploying burntop.dev to production, including database setup, web deployment, and CI/CD configuration.

---

## Phase 19.1: PostgreSQL Database Setup

### Option A: Neon (Recommended)

Neon is a serverless Postgres platform with generous free tier and excellent developer experience.

**Setup Steps:**

1. **Create Account**
   - Visit https://neon.tech
   - Sign up with GitHub

2. **Create Project**

   ```bash
   # Install Neon CLI (optional)
   npm install -g neonctl

   # Or use the web dashboard
   # Navigate to: https://console.neon.tech
   ```

3. **Create Database**
   - Project name: `burntop-production`
   - Region: Choose closest to your users (e.g., `us-east-2` for US)
   - Postgres version: 16 (latest stable)
   - Database name: `burntop`

4. **Get Connection String**
   - Copy the connection string from the dashboard
   - Format: `postgresql://[user]:[password]@[host]/[dbname]?sslmode=require`
   - Add to your production environment variables as `DATABASE_URL`

5. **Run Migrations**

   ```bash
   # Set DATABASE_URL to your Neon connection string
   export DATABASE_URL="postgresql://..."

   # Run migrations from packages/web
   cd packages/web
   bun run db:migrate

   # Seed achievements (optional)
   bun run scripts/seed-achievements.ts

   # Update benchmarks
   bun run benchmarks:update
   ```

**Neon Features:**

- Autoscaling: Automatically scales compute based on load
- Autosuspend: Suspends compute after 5 minutes of inactivity (free tier)
- Branching: Create database branches for preview deployments
- Point-in-time restore: Restore to any point within retention period
- Free tier: 0.5 GB storage, 3 compute hours/month

**Pricing:**

- Free tier: $0/month (sufficient for development and small projects)
- Pro: $19/month (includes 10 GB storage, unlimited compute hours)
- Custom: Contact sales for enterprise features

**Neon-Specific Configuration:**

```typescript
// packages/web/src/lib/db/index.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// For serverless environments (Vercel Edge, Cloudflare Workers)
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);
```

### Option B: Supabase

Supabase provides Postgres database with additional features like auth, storage, and real-time subscriptions.

**Setup Steps:**

1. **Create Account**
   - Visit https://supabase.com
   - Sign up with GitHub

2. **Create Project**
   - Organization: Create new or use existing
   - Project name: `burntop-production`
   - Database password: Generate strong password (save securely)
   - Region: Choose closest to your users

3. **Get Connection String**
   - Navigate to Project Settings > Database
   - Copy "Connection string" (URI format)
   - Choose "Transaction" mode for pooled connections
   - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

4. **Configure Connection Pooling**
   - Supabase provides built-in connection pooling via PgBouncer
   - Use port `6543` for transaction mode (recommended for serverless)
   - Use port `5432` for direct connection (recommended for long-running servers)

5. **Run Migrations**

   ```bash
   # Set DATABASE_URL to your Supabase connection string
   export DATABASE_URL="postgresql://..."

   # Run migrations from packages/web
   cd packages/web
   bun run db:migrate

   # Seed achievements (optional)
   bun run scripts/seed-achievements.ts

   # Update benchmarks
   bun run benchmarks:update
   ```

**Supabase Features:**

- Connection pooling: Built-in PgBouncer for serverless
- Dashboard: Web UI for viewing tables, running SQL
- Extensions: PostGIS, pg_stat_statements, and more
- Free tier: 500 MB database, 1 GB file storage, 2 GB bandwidth

**Pricing:**

- Free tier: $0/month (sufficient for hobby projects)
- Pro: $25/month (8 GB database, 100 GB bandwidth)
- Team: $599/month (includes point-in-time recovery)

**Supabase-Specific Configuration:**

```typescript
// packages/web/src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// For serverless environments, use connection pooling
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  max: 10, // Connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client);
```

### Option C: Railway

Railway provides simple Postgres deployment with great developer experience.

**Setup Steps:**

1. **Create Account**
   - Visit https://railway.app
   - Sign up with GitHub

2. **Create Project**
   - Click "New Project"
   - Select "Provision PostgreSQL"
   - Project name: `burntop-production`

3. **Get Connection String**
   - Click on the Postgres service
   - Go to "Connect" tab
   - Copy "Postgres Connection URL"
   - Format: `postgresql://postgres:[password]@[host]:[port]/railway`

4. **Run Migrations** (same as above)

**Railway Features:**

- Automatic backups: Daily snapups
- Metrics: CPU, memory, disk usage
- Free tier: $5 credit/month

**Pricing:**

- Hobby: $5 credit/month (enough for small projects)
- Pro: $20/month (includes priority support)

---

## Database Migration Strategy

### Running Migrations in Production

**Manual Migration (Recommended for first deployment):**

```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://..."

# Run migrations
cd packages/web
bun run db:migrate

# Verify migration
bun run db:studio  # Opens Drizzle Studio to inspect tables
```

**Automated Migration (CI/CD):**

Add migration step to your deployment pipeline:

```yaml
# .github/workflows/deploy.yml
- name: Run database migrations
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: |
    cd packages/web
    bun run db:migrate
```

### Handling Migration Failures

1. **Always backup before migrations:**
   - Neon: Automatic point-in-time restore
   - Supabase: Manual backup via dashboard
   - Railway: Automatic daily backups

2. **Test migrations locally first:**

   ```bash
   # Create a copy of production data (if small enough)
   pg_dump $PROD_DATABASE_URL > backup.sql
   psql $LOCAL_DATABASE_URL < backup.sql

   # Test migration locally
   bun run db:migrate
   ```

3. **Rollback strategy:**
   - Drizzle doesn't support automatic rollback
   - Keep a backup SQL dump before major migrations
   - Use database branching (Neon) for testing migrations

---

## Environment Variables

### Production Environment Variables

Create these secrets in your deployment platform:

```bash
# Required
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
BETTER_AUTH_URL=https://burntop.dev

# OAuth (GitHub login)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Optional: Error tracking (Phase 18.3)
SENTRY_DSN=https://...

# Optional: Analytics (Phase 18.3)
VITE_PLAUSIBLE_DOMAIN=burntop.dev
VITE_PLAUSIBLE_API_HOST=https://plausible.io
```

### Vercel Deployment

**Prerequisites:**

- PostgreSQL database set up (Neon/Supabase/Railway)
- All environment variables prepared (see ENV_SETUP.md)
- GitHub OAuth app configured with callback URL
- Repository pushed to GitHub

**Deployment Steps:**

1. **Connect Repository**
   - Go to https://vercel.com/new
   - Click "Import Project"
   - Select your GitHub repository
   - Click "Import"

2. **Configure Build Settings**

   Vercel will auto-detect the project. Override with these settings:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave as repository root)
   - **Build Command**: `cd packages/web && bun run build`
   - **Output Directory**: `packages/web/.vercel/output`
   - **Install Command**: `bun install`

   **Important:** The project uses TanStack Start with Nitro, which generates a `.vercel/output` directory. The `vercel.json` file at the repository root already configures this.

3. **Add Environment Variables**

   Go to **Settings** > **Environment Variables** and add:

   **Required:**

   ```
   DATABASE_URL = postgresql://... (Sensitive)
   BETTER_AUTH_SECRET = <generated-secret> (Sensitive)
   BETTER_AUTH_URL = https://your-domain.vercel.app
   ```

   **OAuth (Required for GitHub login):**

   ```
   GITHUB_CLIENT_ID = <your-github-client-id> (Sensitive)
   GITHUB_CLIENT_SECRET = <your-github-client-secret> (Sensitive)
   ```

   **Monitoring (Optional):**

   ```
   SENTRY_DSN = https://... (if using Sentry)
   VITE_PLAUSIBLE_DOMAIN = burntop.dev (if using Plausible)
   NODE_ENV = production
   ```

   - Mark all secrets as **Sensitive** ✓
   - Apply to: **Production**, **Preview**, **Development**

4. **Run Database Migrations**

   Before deploying, run migrations against your production database:

   ```bash
   # Set production DATABASE_URL locally
   export DATABASE_URL="postgresql://..."

   # Run migrations
   cd packages/web
   bun run db:migrate

   # Seed achievements (optional, for Phase 6)
   bun run db:seed:achievements

   # Update community benchmarks
   bun run benchmarks:update
   ```

   **Note:** Migrations must be run manually before first deployment. For subsequent deployments, you can add a migration step to the build command or use a GitHub Action (see .github/workflows/deploy.yml).

5. **Deploy**
   - Click "Deploy"
   - Vercel will install dependencies, build the app, and deploy
   - First deployment takes ~2-3 minutes

6. **Verify Deployment**

   Once deployed, verify the application is working:

   ```bash
   # Check health endpoint
   curl https://your-domain.vercel.app/api/health

   # Expected response:
   # {"status":"ok","timestamp":"...","checks":{"database":"ok"}}
   ```

   Visit your deployment URL and test:
   - Homepage loads correctly
   - Login with GitHub works
   - Database connections are successful

**Updating OAuth Callback URLs:**

After your first deployment, update your OAuth app settings:

- **GitHub OAuth App**: https://github.com/settings/developers
  - Callback URL: `https://your-domain.vercel.app/api/auth/callback/github`

**Automatic Deployments:**

Vercel automatically deploys on every push to your repository:

- **Production**: Deploys from `main` branch to your-domain.vercel.app
- **Preview**: Deploys from PRs to preview URLs (e.g., your-project-git-branch.vercel.app)

**GitHub Actions Preview Deployments:**

The repository includes a GitHub Actions workflow (`.github/workflows/preview.yml`) that automates preview deployments for pull requests with enhanced features:

1. **Automated PR Comments**: Every PR gets a comment with the preview URL and verification checklist
2. **Deployment Status**: GitHub deployment API tracks preview environments
3. **Automatic Cleanup**: Preview deployments are marked inactive when PRs are closed

**Required GitHub Secrets:**

To enable the GitHub Actions preview workflow, add these secrets to your repository settings (Settings → Secrets and variables → Actions):

| Secret              | Description                 | How to Find                                      |
| ------------------- | --------------------------- | ------------------------------------------------ |
| `VERCEL_TOKEN`      | Vercel API token            | Vercel Settings → Tokens → Create Token          |
| `VERCEL_ORG_ID`     | Vercel organization/team ID | Run `vercel project ls` and copy the "org" field |
| `VERCEL_PROJECT_ID` | Vercel project ID           | Run `vercel project ls` and copy the project ID  |

**To get Vercel IDs:**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project (run in project root)
vercel link

# Get project info (copy org and project IDs)
cat .vercel/project.json
```

**Preview Environment Variables:**

Vercel automatically inherits preview environment variables from your production environment. To customize preview-specific variables:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. For each variable, select the "Preview" environment checkbox
3. Preview deployments use the same database and OAuth apps as production by default

**Note:** For security, preview deployments should use a separate preview database branch (if using Neon) to avoid affecting production data.

**Troubleshooting:**

| Issue                               | Solution                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| Build fails with "preset not found" | Ensure `nitro.config.ts` has `preset: 'vercel'`                                             |
| Functions exceed size limit         | Check bundle size in build output. Consider code splitting if needed                        |
| Database connection errors          | Verify `DATABASE_URL` is correct and database allows connections from Vercel IPs            |
| OAuth redirect mismatch             | Ensure `BETTER_AUTH_URL` matches your Vercel domain and OAuth app callback URLs are updated |
| Page not found (404)                | Check that output directory is `packages/web/.vercel/output`                                |

**Performance Optimization:**

Vercel Edge Network caching is configured via `nitro.config.ts`:

- Static assets: 1 year cache
- API routes: No cache
- OG images: 1 hour cache
- Badges: 15 minutes cache
- Pages: 5 minutes cache with stale-while-revalidate

See `packages/web/nitro.config.ts` for full configuration.

### Railway Deployment

1. **Create New Project**
   - Connect GitHub repository
   - Select `packages/web` as root directory

2. **Configure Service**
   - Build command: `bun install && bun run build`
   - Start command: `bun run start`
   - Add environment variables

3. **Deploy**
   - Railway will automatically deploy on push to main branch

---

## Database Monitoring

### Health Checks

The application includes a health check endpoint for monitoring:

```bash
curl https://burntop.dev/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-05T12:34:56.789Z",
  "checks": {
    "database": "ok"
  }
}
```

### Uptime Monitoring

Configure uptime monitoring with:

- **UptimeRobot**: Free tier includes 50 monitors
- **BetterUptime**: Free tier includes 10 monitors
- **Pingdom**: Paid service with detailed analytics

### Database Metrics

**Neon Dashboard:**

- Navigate to: https://console.neon.tech/app/projects/[project-id]
- View: Connection count, CPU usage, storage

**Supabase Dashboard:**

- Navigate to: https://app.supabase.com/project/[project-id]/database/tables
- View: Table sizes, query performance

**Drizzle Studio:**

```bash
# Connect to production database (read-only recommended)
export DATABASE_URL="postgresql://..."
bun run db:studio
```

---

## Backup and Disaster Recovery

### Automated Backups

**Neon:**

- Automatic point-in-time restore (7 days on free tier)
- Manual backups via CLI:
  ```bash
  neonctl branches create --name backup-$(date +%Y%m%d)
  ```

**Supabase:**

- Automatic daily backups (7 days retention on free tier)
- Manual backups via dashboard or pg_dump

**Railway:**

- Automatic daily backups (7 days retention)
- Manual backups via CLI

### Manual Backup

```bash
# Backup production database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup-20240105-120000.sql
```

### Disaster Recovery Plan

1. **Database corruption:**
   - Restore from automated backup (point-in-time or daily)
   - Verify data integrity after restore

2. **Accidental deletion:**
   - Use point-in-time restore to before deletion
   - Export deleted data and re-import

3. **Performance degradation:**
   - Check connection pool settings
   - Review slow queries in dashboard
   - Scale up database instance if needed

---

## Custom Domain Configuration

### Prerequisites

Before configuring a custom domain:

- Web application successfully deployed to Vercel
- Access to domain registrar (where you purchased the domain)
- Domain DNS can be updated (some registrars have propagation delays of 24-48 hours)

### Step 1: Purchase Domain

If you haven't already purchased `burntop.dev`:

**Recommended Registrars:**

- **Cloudflare Registrar** (at-cost pricing, excellent DNS, free SSL)
  - Visit: https://www.cloudflare.com/products/registrar/
  - Pricing: ~$9-12/year for .dev domains
- **Namecheap** (affordable, good UI)
  - Visit: https://www.namecheap.com
  - Pricing: ~$15-20/year for .dev domains
- **Google Domains** (now Squarespace Domains)
  - Visit: https://domains.google
  - Pricing: ~$12/year for .dev domains

**Note:** `.dev` domains require HTTPS (enforced by browser), which Vercel provides automatically.

### Step 2: Add Domain to Vercel

#### Via Vercel Dashboard

1. **Navigate to Project Settings**
   - Go to https://vercel.com/dashboard
   - Select your `burntop` project
   - Click **Settings** > **Domains**

2. **Add Domain**
   - Click **Add Domain**
   - Enter: `burntop.dev`
   - Click **Add**

3. **Add www Subdomain (Optional but Recommended)**
   - Click **Add Domain** again
   - Enter: `www.burntop.dev`
   - Select **Redirect to burntop.dev** (recommended)
   - Click **Add**

#### Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Login to Vercel
vercel login

# Link to your project (if not already linked)
vercel link

# Add domain
vercel domains add burntop.dev

# Add www redirect
vercel domains add www.burntop.dev --redirect burntop.dev
```

### Step 3: Configure DNS Records

After adding the domain to Vercel, you'll see DNS configuration instructions. Vercel will show you which DNS records to create.

#### Option A: Using Vercel Nameservers (Recommended)

**Advantages:**

- Automatic DNS configuration
- Fastest propagation
- Automatic SSL certificate renewal
- Vercel manages all DNS records

**Steps:**

1. **Get Vercel Nameservers**
   - In Vercel Dashboard > Domains > burntop.dev
   - Vercel will display nameservers like:
     ```
     ns1.vercel-dns.com
     ns2.vercel-dns.com
     ```

2. **Update Nameservers at Registrar**

   **Cloudflare:**
   - Go to https://dash.cloudflare.com
   - Select your domain
   - Go to **DNS** > **Records**
   - Note: Cloudflare doesn't support external nameservers for proxied domains
   - Use Option B instead (Cloudflare DNS)

   **Namecheap:**
   - Go to https://www.namecheap.com/myaccount/domain-list
   - Click **Manage** next to `burntop.dev`
   - Go to **Nameservers** section
   - Select **Custom DNS**
   - Add Vercel nameservers:
     ```
     ns1.vercel-dns.com
     ns2.vercel-dns.com
     ```
   - Click **Save**

   **Google Domains / Squarespace:**
   - Go to https://domains.google.com/registrar
   - Select `burntop.dev`
   - Click **DNS** in left sidebar
   - Scroll to **Name servers**
   - Select **Use custom name servers**
   - Add Vercel nameservers
   - Click **Save**

3. **Wait for Propagation**
   - DNS propagation typically takes 1-24 hours
   - Check status: `dig burntop.dev NS`
   - Vercel will automatically issue SSL certificate once DNS propagates

#### Option B: Using Custom DNS (Your Registrar's DNS)

**Advantages:**

- Keep all DNS records in one place
- Use Cloudflare for DDoS protection and analytics
- More control over DNS configuration

**Steps:**

1. **Get DNS Configuration from Vercel**
   - In Vercel Dashboard > Domains > burntop.dev
   - Vercel will show required DNS records:

     ```
     Type: A
     Name: @
     Value: 76.76.21.21

     Type: CNAME
     Name: www
     Value: cname.vercel-dns.com
     ```

2. **Add DNS Records at Your Registrar**

   **Cloudflare DNS (Recommended for Advanced Features):**

   a. **Add Domain to Cloudflare** (if not already)
   - Go to https://dash.cloudflare.com
   - Click **Add a Site**
   - Enter `burntop.dev`
   - Choose **Free** plan
   - Cloudflare will scan existing DNS records

   b. **Update Nameservers at Registrar**
   - Cloudflare will provide nameservers like:
     ```
     ella.ns.cloudflare.com
     hugh.ns.cloudflare.com
     ```
   - Update nameservers at your registrar (Namecheap, Google Domains, etc.)

   c. **Add Vercel DNS Records in Cloudflare**
   - Go to **DNS** > **Records**
   - Add A record:
     - Type: `A`
     - Name: `@` (or `burntop.dev`)
     - IPv4 address: `76.76.21.21`
     - Proxy status: **DNS only** (grey cloud icon)
     - TTL: Auto
     - Click **Save**
   - Add CNAME record for www:
     - Type: `CNAME`
     - Name: `www`
     - Target: `cname.vercel-dns.com`
     - Proxy status: **DNS only** (grey cloud icon)
     - TTL: Auto
     - Click **Save**

   **Important:** Disable Cloudflare proxy (grey cloud) for Vercel domains. Vercel needs to see the actual client IP for proper routing.

   **Namecheap DNS:**
   - Go to https://www.namecheap.com/myaccount/domain-list
   - Click **Manage** next to `burntop.dev`
   - Go to **Advanced DNS** tab
   - Add A Record:
     - Type: `A Record`
     - Host: `@`
     - Value: `76.76.21.21`
     - TTL: Automatic
   - Add CNAME Record:
     - Type: `CNAME Record`
     - Host: `www`
     - Value: `cname.vercel-dns.com`
     - TTL: Automatic
   - Click **Save All Changes**

   **Google Domains / Squarespace:**
   - Go to https://domains.google.com/registrar
   - Select `burntop.dev`
   - Click **DNS** in left sidebar
   - Under **Custom resource records**:
   - Add A record:
     - Name: `@`
     - Type: `A`
     - TTL: `1H`
     - Data: `76.76.21.21`
   - Add CNAME record:
     - Name: `www`
     - Type: `CNAME`
     - TTL: `1H`
     - Data: `cname.vercel-dns.com`
   - Click **Save**

3. **Verify DNS Configuration**

   ```bash
   # Check A record
   dig burntop.dev A
   # Expected: 76.76.21.21

   # Check CNAME record
   dig www.burntop.dev CNAME
   # Expected: cname.vercel-dns.com

   # Check from multiple DNS servers
   dig @8.8.8.8 burntop.dev
   dig @1.1.1.1 burntop.dev
   ```

   **Online DNS Checkers:**
   - https://dnschecker.org (check global propagation)
   - https://mxtoolbox.com/SuperTool.aspx (comprehensive DNS tools)

### Step 4: SSL Certificate Configuration

Vercel automatically issues SSL certificates via Let's Encrypt once DNS is configured correctly.

#### Automatic SSL (Default)

Vercel automatically:

1. Detects DNS configuration
2. Issues SSL certificate via Let's Encrypt
3. Renews certificate before expiration (every 90 days)
4. Enables HTTP/2 and HTTP/3 (QUIC)

**Expected Timeline:**

- DNS propagation: 1-24 hours
- SSL issuance: 5-30 minutes after DNS propagates
- Total time: 1-24 hours

#### Verify SSL Certificate

```bash
# Check SSL certificate
openssl s_client -connect burntop.dev:443 -servername burntop.dev < /dev/null 2>/dev/null | openssl x509 -noout -text

# Or use online tools:
# - https://www.ssllabs.com/ssltest/ (comprehensive SSL test)
# - https://www.sslshopper.com/ssl-checker.html (quick check)
```

#### Troubleshooting SSL Issues

**Issue: SSL certificate not issued after 24 hours**

**Solutions:**

1. Verify DNS records are correct:
   ```bash
   dig burntop.dev A
   dig www.burntop.dev CNAME
   ```
2. Check Vercel domain status in dashboard (should show green checkmark)
3. Check DNS propagation: https://dnschecker.org
4. If using Cloudflare, ensure proxy is disabled (grey cloud)
5. Try removing and re-adding domain in Vercel

**Issue: SSL certificate error (NET::ERR_CERT_COMMON_NAME_INVALID)**

**Solutions:**

1. Wait for full DNS propagation (up to 48 hours)
2. Clear browser cache and SSL state
3. Check domain is correctly pointed to Vercel
4. Contact Vercel support if issue persists

### Step 5: Update Environment Variables

After domain is configured, update the `BETTER_AUTH_URL` environment variable:

#### Via Vercel Dashboard

1. Go to **Settings** > **Environment Variables**
2. Find `BETTER_AUTH_URL`
3. Click **Edit**
4. Change value to: `https://burntop.dev`
5. Apply to: **Production**, **Preview**, **Development**
6. Click **Save**

#### Via Vercel CLI

```bash
vercel env rm BETTER_AUTH_URL production
vercel env add BETTER_AUTH_URL production
# Enter value: https://burntop.dev
```

#### Redeploy Application

After updating environment variables, trigger a new deployment:

```bash
# Via CLI
vercel --prod

# Or via Dashboard
# Go to Deployments > (latest deployment) > Redeploy
```

### Step 6: Update OAuth Callback URLs

Update OAuth application settings to use the new domain:

#### GitHub OAuth

1. Go to https://github.com/settings/developers
2. Click on your OAuth app (`burntop.dev`)
3. Update **Homepage URL**: `https://burntop.dev`
4. Update **Authorization callback URL**: `https://burntop.dev/api/auth/callback/github`
5. Click **Update application**

### Step 7: Verify Deployment

After all configuration is complete, verify everything works:

```bash
# 1. Check domain resolves
curl -I https://burntop.dev
# Expected: HTTP/2 200

# 2. Check health endpoint
curl https://burntop.dev/api/health
# Expected: {"status":"ok", ...}

# 3. Check SSL certificate
echo | openssl s_client -connect burntop.dev:443 2>/dev/null | grep "subject="
# Expected: subject=CN=burntop.dev

# 4. Check OAuth redirect
curl -I https://burntop.dev/api/auth/signin/github
# Expected: HTTP/2 302 (redirect to GitHub)
```

**Manual Testing:**

1. Visit https://burntop.dev
2. Test login with GitHub (should redirect correctly)
3. Check dashboard loads
4. Verify profile pages work
5. Test badge embedding: `https://burntop.dev/badge/[username]`
6. Test OG images: `https://burntop.dev/og/[username]/stats`

### Additional Domain Configuration

#### Subdomain Configuration (Optional)

Add subdomains for different environments or services:

**Examples:**

- `api.burntop.dev` - API-only endpoint
- `staging.burntop.dev` - Staging environment
- `docs.burntop.dev` - Documentation site

**Steps:**

1. Add subdomain in Vercel Dashboard
2. Add DNS record (CNAME to `cname.vercel-dns.com`)
3. Wait for SSL certificate
4. Configure routing in `nitro.config.ts` if needed

#### Email DNS Configuration (Optional)

To send emails from `@burntop.dev`:

**Add MX Records** (for receiving email):

```
Priority: 10
Value: mail.protonmail.ch (if using ProtonMail)
```

**Add SPF Record** (for sending email):

```
Type: TXT
Name: @
Value: v=spf1 include:_spf.protonmail.ch ~all
```

**Add DMARC Record** (for email authentication):

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@burntop.dev
```

### Domain Security Best Practices

#### Enable DNSSEC (Optional but Recommended)

DNSSEC adds cryptographic signatures to DNS records to prevent spoofing:

1. **Enable at Registrar:**
   - Cloudflare: Automatically enabled
   - Namecheap: Go to Advanced DNS > DNSSEC
   - Google Domains: Go to DNS > DNSSEC

2. **Verify DNSSEC:**
   ```bash
   dig burntop.dev +dnssec
   # Should see RRSIG records
   ```

#### Enable CAA Records (Optional but Recommended)

CAA records restrict which Certificate Authorities can issue certificates:

```
Type: CAA
Name: @
Flags: 0
Tag: issue
Value: letsencrypt.org
```

Add in your DNS provider:

```bash
# Verify CAA records
dig burntop.dev CAA
```

#### Monitor Domain Expiration

Set up reminders for domain renewal:

- Most registrars send email reminders 30/15/7 days before expiration
- Enable auto-renewal at registrar
- Add calendar reminder as backup

---

## Next Steps

After completing database setup:

1. ✅ Set up PostgreSQL database (Neon/Supabase)
2. ✅ Configure environment variables (Phase 19.1)
3. ✅ Set up CI/CD pipeline (Phase 19.1)
4. ✅ Deploy to Vercel (Phase 19.2)
5. ⏭️ Configure custom domain (Phase 19.2) - **You are here**
6. ⏭️ Set up SSL certificate (Phase 19.2) - **Automatic with domain setup**
7. ✅ Configure preview deployments (Phase 19.2)

See `plan.md` for complete deployment checklist.
