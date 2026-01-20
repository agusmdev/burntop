# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security issues seriously. If you discover a security vulnerability in burntop, please report it responsibly.

### How to Report

**Option 1: GitHub Security Advisories (Recommended)**

1. Go to the [Security tab](https://github.com/agusmdev/burntop/security/advisories) of this repository
2. Click "Report a vulnerability"
3. Fill out the form with details about the vulnerability

**Option 2: Email**

Send an email to security@burntop.dev with:

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes (optional)

### What to Expect

| Timeline | Action |
| -------- | ------ |
| 48 hours | Initial acknowledgment of your report |
| 7 days | Status update with our assessment |
| 30 days | Target resolution timeframe |

We may extend the resolution timeline for complex issues, but we'll keep you informed.

### Recognition

We appreciate responsible disclosure. With your permission, we'll acknowledge security researchers who report valid vulnerabilities in our release notes.

## Self-Hosting Security Best Practices

If you're self-hosting burntop, follow these security guidelines:

### Environment Variables

- **Never commit secrets** to version control
- Use a secrets manager for production environments
- Rotate credentials regularly

### Database

- Use strong, unique passwords for PostgreSQL
- Restrict database network access
- Enable SSL for database connections in production
- Keep PostgreSQL updated

### Authentication

- Use a strong `BETTER_AUTH_SECRET` (minimum 32 characters)
- Configure OAuth credentials through your provider's secure settings
- Review and limit OAuth scopes to minimum required

### Network Security

- Use HTTPS in production (enforce via redirect)
- Configure appropriate CORS origins
- Consider rate limiting for API endpoints
- Use a reverse proxy (nginx, Caddy) in production

### Updates

- Keep dependencies updated
- Monitor security advisories for dependencies
- Subscribe to release notifications for security patches

## Scope

This security policy applies to:

- The burntop web application
- The burntop CLI tool
- The FastAPI backend API
- Official documentation

Third-party integrations and self-hosted instances are managed by their respective operators.

## Not In Scope

The following are not considered security vulnerabilities:

- Rate limiting bypasses through parallel requests
- Missing security headers on non-sensitive endpoints
- Information disclosure of non-sensitive public information
- Clickjacking on pages with no sensitive actions

## Contact

For non-security issues, please use [GitHub Issues](https://github.com/agusmdev/burntop/issues).
