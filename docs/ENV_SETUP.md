# Environment Variables Setup Guide

Complete guide for configuring environment variables for burntop.dev in different environments.

---

## Quick Reference

| Variable                  | Required       | Environment | Description                                            |
| ------------------------- | -------------- | ----------- | ------------------------------------------------------ |
| `DATABASE_URL`            | ✅ Yes         | All         | PostgreSQL connection string                           |
| `BETTER_AUTH_SECRET`      | ✅ Yes         | All         | Secret key for session encryption (32+ chars)          |
| `BETTER_AUTH_URL`         | ✅ Yes         | All         | Base URL for OAuth callbacks                           |
| `GITHUB_CLIENT_ID`        | ⚠️ Conditional | Production  | GitHub OAuth app ID (required for GitHub login)        |
| `GITHUB_CLIENT_SECRET`    | ⚠️ Conditional | Production  | GitHub OAuth app secret                                |
| `SENTRY_DSN`              | ❌ Optional    | Production  | Sentry error tracking endpoint                         |
| `VITE_PLAUSIBLE_DOMAIN`   | ❌ Optional    | Production  | Domain for Plausible analytics                         |
| `VITE_PLAUSIBLE_API_HOST` | ❌ Optional    | Production  | Custom Plausible server URL                            |
| `NODE_ENV`                | ✅ Yes         | All         | Environment mode (`development`, `production`, `test`) |

---

## Local Development Setup

### Step 1: Copy Example Environment File

```bash
cd packages/web
cp .env.example .env
```

### Step 2: Configure Required Variables

Open `packages/web/.env` and set:

```bash
# Node environment
NODE_ENV=development

# Database (use Docker Compose setup)
DATABASE_URL=postgresql://burntop:burntop_dev_password@localhost:5432/burntop

# Auth configuration
BETTER_AUTH_SECRET=dev_secret_key_at_least_32_characters_long_12345
BETTER_AUTH_URL=http://localhost:3000

# OAuth (optional for local development)
# Leave commented if you don't need OAuth locally
# GITHUB_CLIENT_ID=your_dev_github_client_id
# GITHUB_CLIENT_SECRET=your_dev_github_client_secret
```

### Step 3: Start Local Database

```bash
# From project root
docker compose up -d

# Wait for database to be ready
sleep 3

# Run migrations
cd packages/web
bun run db:migrate
```

### Step 4: Verify Setup

```bash
# Start development server
bun dev

# In another terminal, check health endpoint
curl http://localhost:3000/api/health
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

---

## Production Setup

### Step 1: Generate Secrets

```bash
# Generate BETTER_AUTH_SECRET (32+ characters)
openssl rand -base64 32
# Example output: 9KvJ8X2mP4nR6sT8uV0wY2zA4bC6dE8f

# Or use this one-liner to copy to clipboard (macOS)
openssl rand -base64 32 | pbcopy
```

### Step 2: Set Up OAuth Providers

#### GitHub OAuth

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - Application name: `burntop.dev`
   - Homepage URL: `https://burntop.dev`
   - Authorization callback URL: `https://burntop.dev/api/auth/callback/github`
4. Click "Register application"
5. Copy **Client ID** and generate **Client Secret**
6. Save both securely (you'll need them for deployment)

### Step 3: Set Up Database

Choose one of the following providers (see DEPLOYMENT.md for detailed setup):

- **Neon** (Recommended): https://neon.tech
- **Supabase**: https://supabase.com
- **Railway**: https://railway.app

After creating your database, you'll receive a connection string like:

```
postgresql://user:password@host:port/database?sslmode=require
```

### Step 4: Configure Monitoring (Optional)

#### Sentry Error Tracking

1. Go to https://sentry.io
2. Create new project
3. Select platform: "Node.js"
4. Copy the DSN (Data Source Name)
5. Format: `https://<key>@<org>.ingest.sentry.io/<project>`

#### Plausible Analytics

1. Go to https://plausible.io
2. Add your domain: `burntop.dev`
3. Get tracking domain from settings
4. Set `VITE_PLAUSIBLE_DOMAIN=burntop.dev`
5. (Optional) If self-hosting: `VITE_PLAUSIBLE_API_HOST=https://your-plausible.com`

---

## Deployment Platform Configuration

### Vercel

#### Via Dashboard

1. Go to https://vercel.com/new
2. Import your repository
3. Go to **Settings** > **Environment Variables**
4. Add each variable:

   ```
   DATABASE_URL = postgresql://... (Sensitive)
   BETTER_AUTH_SECRET = <your-generated-secret> (Sensitive)
   BETTER_AUTH_URL = https://burntop.dev
   GITHUB_CLIENT_ID = <your-github-client-id> (Sensitive)
   GITHUB_CLIENT_SECRET = <your-github-client-secret> (Sensitive)
   SENTRY_DSN = https://... (if using Sentry)
   VITE_PLAUSIBLE_DOMAIN = burntop.dev (if using Plausible)
   NODE_ENV = production
   ```

5. Mark all secrets as **Sensitive** (check the checkbox)
6. Apply to: **Production**, **Preview**, **Development**

#### Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Set environment variables
vercel env add DATABASE_URL production
vercel env add BETTER_AUTH_SECRET production
vercel env add BETTER_AUTH_URL production
vercel env add GITHUB_CLIENT_ID production
vercel env add GITHUB_CLIENT_SECRET production

# Optional monitoring
vercel env add SENTRY_DSN production
vercel env add VITE_PLAUSIBLE_DOMAIN production
```

#### Via .env File (Local Testing Only)

**⚠️ WARNING: Never commit this file to git**

```bash
# Create production env file (for local testing only)
cat > .env.production.local <<EOF
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<your-secret>
BETTER_AUTH_URL=https://burntop.dev
GITHUB_CLIENT_ID=<your-id>
GITHUB_CLIENT_SECRET=<your-secret>
SENTRY_DSN=https://...
VITE_PLAUSIBLE_DOMAIN=burntop.dev
NODE_ENV=production
EOF

# Add to .gitignore (should already be there)
echo ".env.production.local" >> .gitignore
```

### Railway

1. Go to https://railway.app/new
2. Connect your GitHub repository
3. Select `burntop` project
4. Click on the service > **Variables** tab
5. Click **Add Variable** for each:

   ```
   DATABASE_URL = ${{Postgres.DATABASE_URL}} (if using Railway Postgres)
   BETTER_AUTH_SECRET = <your-generated-secret>
   BETTER_AUTH_URL = ${{RAILWAY_PUBLIC_DOMAIN}}
   GITHUB_CLIENT_ID = <your-github-client-id>
   GITHUB_CLIENT_SECRET = <your-github-client-secret>
   SENTRY_DSN = https://...
   VITE_PLAUSIBLE_DOMAIN = burntop.dev
   NODE_ENV = production
   ```

6. Click **Deploy**

#### Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Set environment variables
railway variables set DATABASE_URL="postgresql://..."
railway variables set BETTER_AUTH_SECRET="<your-secret>"
railway variables set BETTER_AUTH_URL="https://burntop.dev"
railway variables set GITHUB_CLIENT_ID="<your-id>"
railway variables set GITHUB_CLIENT_SECRET="<your-secret>"
railway variables set NODE_ENV="production"
```

### Netlify

1. Go to https://app.netlify.com/start
2. Connect your repository
3. Go to **Site settings** > **Environment variables**
4. Add each variable (same as Vercel list above)
5. Deploy site

### Docker / Self-Hosted

Create a `.env.production` file on your server:

```bash
# .env.production (on server, not in git)
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<your-generated-secret>
BETTER_AUTH_URL=https://burntop.dev
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>
SENTRY_DSN=https://...
VITE_PLAUSIBLE_DOMAIN=burntop.dev
NODE_ENV=production
```

Load variables in your Docker run command:

```bash
docker run -d \
  --env-file .env.production \
  -p 3000:3000 \
  burntop/web:latest
```

Or in `docker-compose.yml`:

```yaml
services:
  web:
    image: burntop/web:latest
    env_file:
      - .env.production
    ports:
      - '3000:3000'
```

---

## Environment Variable Validation

### Pre-deployment Checklist

Before deploying, verify all required variables are set:

```bash
# Run this script to validate environment variables
cd packages/web

# Check required variables
node -e "
const required = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL'
];

const missing = required.filter(v => !process.env[v]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(v => console.error('  -', v));
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set');
}

// Warn about optional OAuth variables
const oauth = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'];
const missingOAuth = oauth.filter(v => !process.env[v]);
if (missingOAuth.length > 0) {
  console.warn('⚠️  GitHub OAuth not configured (login will be disabled)');
}
"
```

### Automated Validation

Add to your CI/CD pipeline:

```yaml
# .github/workflows/deploy.yml
- name: Validate Environment Variables
  run: |
    if [ -z "$DATABASE_URL" ]; then
      echo "❌ DATABASE_URL is not set"
      exit 1
    fi
    if [ -z "$BETTER_AUTH_SECRET" ]; then
      echo "❌ BETTER_AUTH_SECRET is not set"
      exit 1
    fi
    if [ -z "$BETTER_AUTH_URL" ]; then
      echo "❌ BETTER_AUTH_URL is not set"
      exit 1
    fi
    echo "✅ All required environment variables are set"
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
    BETTER_AUTH_URL: ${{ secrets.BETTER_AUTH_URL }}
```

---

## Security Best Practices

### 1. Never Commit Secrets

Ensure these files are in `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.production
.env.production.local
.env.development.local
.env.test.local

# Keep .env.example (template with no real values)
!.env.example
```

### 2. Rotate Secrets Regularly

```bash
# Generate new BETTER_AUTH_SECRET
openssl rand -base64 32

# Update in deployment platform
# This will invalidate all existing sessions
```

### 3. Use Different Secrets Per Environment

- **Development**: Use simple, non-sensitive values
- **Staging**: Use separate OAuth apps and database
- **Production**: Use strong, unique secrets

### 4. Limit Secret Access

- Mark variables as "Sensitive" in Vercel/Netlify
- Use environment-specific access controls in Railway
- Use secret management tools (AWS Secrets Manager, HashiCorp Vault) for large teams

### 5. Audit Secret Usage

```bash
# Check where environment variables are used
cd packages/web
rg "process.env" --type ts --type tsx

# Ensure secrets are only accessed server-side
# Never use in client components or expose in public builds
```

---

## Troubleshooting

### Issue: `DATABASE_URL` connection fails

**Symptoms:**

```
Error: connect ECONNREFUSED
```

**Solutions:**

1. Verify connection string format
2. Check database is running (local) or accessible (cloud)
3. Ensure SSL mode is correct (`?sslmode=require` for cloud databases)
4. Check firewall rules allow connections

### Issue: `BETTER_AUTH_SECRET` too short

**Symptoms:**

```
Error: Secret must be at least 32 characters long
```

**Solution:**

```bash
# Generate a proper secret
openssl rand -base64 32
```

### Issue: OAuth callback URL mismatch

**Symptoms:**

```
Error: redirect_uri_mismatch
```

**Solutions:**

1. Verify `BETTER_AUTH_URL` matches OAuth app configuration
2. Check GitHub OAuth app settings
3. Ensure callback URL is exactly: `{BETTER_AUTH_URL}/api/auth/callback/{provider}`

### Issue: Environment variables not loading

**Symptoms:**

```
process.env.DATABASE_URL is undefined
```

**Solutions:**

For Vite (client-side):

- Only variables prefixed with `VITE_` are exposed to client
- Use `import.meta.env.VITE_*` instead of `process.env.*`

For server-side:

- Ensure `.env` file is in correct directory (`packages/web/`)
- Restart development server after changing `.env`
- Check file is not named `.env.txt` or similar

### Issue: Different values in different environments

**Symptom:**
Production uses development database URL

**Solution:**

- Check deployment platform environment variables
- Ensure production variables are set in correct environment
- Verify build command uses correct environment

---

## Migration from .env to Secrets Manager

For production deployments with multiple team members, consider using a secrets manager:

### AWS Secrets Manager

```typescript
// packages/web/src/lib/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export async function getSecret(secretName: string) {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
  return JSON.parse(response.SecretString!);
}

// Usage
const secrets = await getSecret('burntop/production');
process.env.DATABASE_URL = secrets.DATABASE_URL;
```

### HashiCorp Vault

```bash
# Store secrets in Vault
vault kv put secret/burntop/production \
  DATABASE_URL="postgresql://..." \
  BETTER_AUTH_SECRET="..." \
  GITHUB_CLIENT_ID="..."

# Retrieve in application
vault kv get -format=json secret/burntop/production
```

---

## Next Steps

After configuring environment variables:

1. ✅ Set up environment variables
2. ⏭️ Run database migrations in production
3. ⏭️ Set up CI/CD pipeline
4. ⏭️ Deploy to production
5. ⏭️ Verify deployment with health check
6. ⏭️ Monitor error tracking and analytics

See `DEPLOYMENT.md` for complete deployment guide.
