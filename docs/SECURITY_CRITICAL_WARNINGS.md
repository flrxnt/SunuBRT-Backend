# ⚠️ CRITICAL SECURITY WARNINGS ⚠️

## MANDATORY: Change Default Secrets Before Production

### 🔴 CRITICAL - JWT Secrets

The following files contain hardcoded default JWT secrets that **MUST** be changed in production:

1. **`src/config/jwt.config.ts`** (lines 4-5, 14-16)
   ```typescript
   secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
   secret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-jwt-key-change-in-production'
   ```

2. **`src/auth/strategies/jwt.strategy.ts`** (lines 13-15)
   ```typescript
   secretOrKey: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
   ```

3. **`src/common/guards/app.guard.ts`** (lines 72-74)
   ```typescript
   secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
   ```

4. **`src/auth/auth.service.ts`** (lines 160, 443, 447)
   ```typescript
   secret: process.env.JWT_REFRESH_SECRET
   secret: process.env.JWT_SECRET
   ```

### ⚠️ How to Secure Your Production Deployment

#### 1. Generate Strong Secrets

Use cryptographically secure random strings for your secrets:

```bash
# Generate JWT_SECRET (at least 64 characters)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Generate JWT_REFRESH_SECRET (at least 64 characters)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Generate PAYDUNYA_WEBHOOK_SECRET if using PayDunya
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2. Set Environment Variables

**Never commit these values to Git!** Set them in your environment:

```bash
# For development (.env file - never commit this!)
JWT_SECRET="<your-generated-secret-here>"
JWT_REFRESH_SECRET="<your-generated-refresh-secret-here>"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

# For production (use your hosting provider's environment variable system)
# Examples:
# - AWS: AWS Systems Manager Parameter Store / Secrets Manager
# - Heroku: Config Vars in dashboard
# - Docker: Environment variables in docker-compose.yml or Kubernetes secrets
# - Azure: Azure Key Vault
```

#### 3. Verify Secrets Are Set

Before deploying to production, verify that:
- [ ] `JWT_SECRET` environment variable is set with a strong random value
- [ ] `JWT_REFRESH_SECRET` environment variable is set with a different strong random value
- [ ] Default fallback values are **NEVER** used in production
- [ ] Secrets are stored securely (not in code, not in logs)

### 🔒 Security Best Practices

1. **Secret Rotation**: Change JWT secrets regularly (e.g., every 90 days)
2. **No Logging**: Never log secret values, even in debug mode
3. **Access Control**: Limit who can view/change secrets in production
4. **Separate Secrets**: Use different secrets for development, staging, and production
5. **Monitor Access**: Set up alerts for unauthorized access attempts

## Recent Security Fixes (Applied)

### ✅ Fixed: Timing Attack in Payment Hash Validation
- **Location**: `src/payments/payments.service.ts` (line 161)
- **Issue**: Used `!==` operator for hash comparison, vulnerable to timing attacks
- **Fix**: Now uses `crypto.timingSafeEqual()` for constant-time comparison
- **Impact**: Prevents attackers from forging payment callbacks through timing analysis

### ✅ Fixed: Sensitive Data Exposure in Logs
- **Location**: `src/payments/payments.service.ts` (lines 162-164, 774-812)
- **Issue**: `console.error()` and `console.log()` exposed hash values and tokens
- **Fix**: Replaced with proper logger that doesn't expose sensitive data
- **Impact**: Prevents hash/token leakage through log files

### ✅ Fixed: Missing Security Headers
- **Location**: `src/main.ts`
- **Issue**: Helmet package installed but not configured
- **Fix**: Configured helmet with Content Security Policy
- **Impact**: Protects against XSS, clickjacking, and other attacks

### ✅ Fixed: No Rate Limiting
- **Location**: `src/main.ts`
- **Issue**: Express-rate-limit installed but not configured
- **Fix**: Applied rate limiting globally (100 req/15min) and stricter limits on auth endpoints (5 req/15min)
- **Impact**: Prevents brute force attacks and DoS attempts

## Testing Security in Development

### 1. Verify Rate Limiting
```bash
# This should fail after 5 attempts
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

### 2. Verify Security Headers
```bash
# Check for security headers
curl -I http://localhost:3000/api/v1/health
# Should see: X-Content-Type-Options, X-Frame-Options, etc.
```

### 3. Verify JWT Secret is Loaded
```bash
# Should NOT see default secret in production
echo $JWT_SECRET
# Should output your custom secret, NOT "your-super-secret-jwt-key-change-in-production"
```

## Checklist Before Production Deployment

- [ ] All default secrets replaced with strong random values
- [ ] Environment variables configured in production environment
- [ ] Rate limiting tested and working
- [ ] Security headers verified in responses
- [ ] HTTPS enabled (mandatory for production)
- [ ] No sensitive data in logs
- [ ] Timing-safe hash comparison verified
- [ ] CORS configured for production domain only
- [ ] Database credentials secured
- [ ] PayDunya keys secured (if using payments)
- [ ] Monitoring and alerting configured

## Emergency Response

If you suspect secrets have been compromised:

1. **Immediately** rotate all secrets
2. Invalidate all existing JWT tokens (restart service with new secret)
3. Review logs for unauthorized access
4. Notify affected users if data breach occurred
5. Update secrets in all environments
6. Review and update access controls

## Contact

For security concerns or to report vulnerabilities:
- **DO NOT** open public GitHub issues for security vulnerabilities
- Email: security@sunubrt.com (if available)
- Follow responsible disclosure practices

---

**Last Updated**: 2024-12-XX
**Security Review Status**: ✅ Critical issues fixed
**Next Review Due**: 90 days from deployment
