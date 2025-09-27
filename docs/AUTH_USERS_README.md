# SunuBRT Auth & Users System

This document provides comprehensive information about the authentication and user management system implemented for the SunuBRT Backend API.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Authentication Flow](#authentication-flow)
- [API Endpoints](#api-endpoints)
- [Security Features](#security-features)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Overview

The SunuBRT authentication system is built using NestJS with JWT (JSON Web Tokens) for stateless authentication. It supports user registration, login, password management, role-based access control, and profile management.

### Key Features

- ✅ User registration with email verification
- ✅ JWT-based authentication with refresh tokens
- ✅ Role-based access control (USER, DRIVER, ADMIN)
- ✅ Password hashing using bcrypt
- ✅ Password strength validation
- ✅ Profile management
- ✅ Password reset functionality
- ✅ Comprehensive input validation
- ✅ Rate limiting ready
- ✅ CORS configuration

## Architecture

```
src/
├── auth/
│   ├── auth.controller.ts      # Auth endpoints
│   ├── auth.service.ts         # Auth business logic
│   ├── auth.module.ts          # Auth module configuration
│   ├── dto/                    # Data transfer objects
│   │   ├── login.dto.ts
│   │   ├── register.dto.ts
│   │   └── reset-password.dto.ts
│   └── strategies/
│       ├── jwt.strategy.ts     # JWT strategy
│       └── local.strategy.ts   # Local strategy
├── users/
│   ├── users.controller.ts     # User management endpoints
│   ├── users.service.ts        # User business logic
│   ├── users.module.ts         # Users module configuration
│   ├── dto/                    # Data transfer objects
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   └── entities/
│       └── user.entity.ts      # User entity class
└── common/
    ├── guards/
    │   ├── auth.guard.ts       # JWT authentication guard
    │   └── roles.guard.ts      # Role-based authorization guard
    ├── decorators/
    │   ├── public.decorator.ts # Public endpoint decorator
    │   └── roles.decorator.ts  # Roles decorator
    └── utils/
        ├── bcrypt.util.ts      # Password hashing utilities
        └── date.util.ts        # Date manipulation utilities
```

## Authentication Flow

### 1. User Registration
```
POST /api/v1/auth/register
```

1. User provides email, password, and profile information
2. System validates input data
3. Password is hashed using bcrypt (12 rounds)
4. User is created in database with `isVerified: false`
5. Verification email is sent (TODO: implement email service)
6. User receives confirmation response

### 2. User Login
```
POST /api/v1/auth/login
```

1. User provides email and password
2. System validates credentials
3. Checks if user is verified
4. Generates JWT access token (24h expiry) and refresh token (7d expiry)
5. Returns tokens and user profile

### 3. Token Refresh
```
POST /api/v1/auth/refresh
```

1. Client provides refresh token
2. System validates refresh token
3. Generates new access and refresh tokens
4. Returns new tokens

### 4. Protected Endpoints

All protected endpoints require:
- Valid JWT token in Authorization header: `Bearer <token>`
- Token is validated using JWT strategy
- User information is attached to request object

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/auth/register` | POST | Public | Register new user |
| `/auth/login` | POST | Public | User login |
| `/auth/refresh` | POST | Public | Refresh access token |
| `/auth/logout` | POST | Protected | User logout |
| `/auth/forgot-password` | POST | Public | Request password reset |
| `/auth/reset-password` | POST | Public | Reset password with token |
| `/auth/change-password` | POST | Protected | Change password |
| `/auth/profile` | GET | Protected | Get current user profile |
| `/auth/validate` | GET | Protected | Validate current token |
| `/auth/verify-email/:token` | GET | Public | Verify email address |
| `/auth/resend-verification` | POST | Public | Resend verification email |
| `/auth/revoke-all-tokens` | POST | Protected | Revoke all refresh tokens |

### User Management Endpoints

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/users` | GET | Admin | Get all users (paginated) |
| `/users` | POST | Admin | Create new user |
| `/users/search` | GET | Admin | Search users |
| `/users/stats` | GET | Admin | Get user statistics |
| `/users/by-role/:role` | GET | Admin | Get users by role |
| `/users/profile` | GET | Protected | Get own profile |
| `/users/profile` | PATCH | Protected | Update own profile |
| `/users/:id` | GET | Admin | Get user by ID |
| `/users/:id` | PATCH | Admin | Update user |
| `/users/:id` | DELETE | Admin | Delete user |
| `/users/:id/verify` | PATCH | Admin | Verify user |
| `/users/:id/unverify` | PATCH | Admin | Unverify user |
| `/users/:id/role` | PATCH | Admin | Update user role |
| `/users/:id/exists` | GET | Admin | Check if user exists |
| `/users/bulk-create` | POST | Admin | Create multiple users |
| `/users/bulk-delete` | DELETE | Admin | Delete multiple users |

## Security Features

### Password Security
- Minimum 8 characters
- Must contain uppercase, lowercase, number, and special character
- Hashed using bcrypt with 12 rounds
- Password strength validation on client and server side

### JWT Security
- Access tokens expire in 24 hours
- Refresh tokens expire in 7 days
- Tokens include issuer and audience claims
- Refresh tokens are tracked server-side

### Input Validation
- All DTOs use class-validator decorators
- Email format validation
- Phone number validation (Senegalese format)
- Automatic data transformation and sanitization

### Role-Based Access Control
```typescript
// User roles
enum Role {
  USER = "USER",
  DRIVER = "DRIVER", 
  ADMIN = "ADMIN"
}

// Usage in controllers
@Roles(Role.ADMIN)
@Get('stats')
async getUserStats() { ... }
```

### CORS Configuration
- Configurable allowed origins
- Credentials support
- Proper headers handling

## Environment Variables

Required environment variables in `.env` file:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/sunubrt_db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_SECRET="your-super-secret-refresh-jwt-key-change-in-production"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# Security
BCRYPT_ROUNDS=12

# Optional: Email service (for verification emails)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
EMAIL_FROM="noreply@sunubrt.com"
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your database credentials

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

### 3. Start the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

### 4. Test the Endpoints

```bash
# Register a new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+221701234567"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'

# Use the returned token for protected endpoints
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Testing

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Test Structure

```
test/
├── auth.e2e-spec.ts           # Authentication E2E tests
└── users.e2e-spec.ts          # User management E2E tests (TODO)
```

### Sample Test Cases

The auth system includes comprehensive tests for:
- User registration validation
- Login success/failure scenarios
- Token validation
- Password change functionality
- Profile access
- Role-based access control

## Error Handling

### Common HTTP Status Codes

| Code | Description | When It Occurs |
|------|-------------|----------------|
| 200 | OK | Successful operation |
| 201 | Created | User registration, resource creation |
| 400 | Bad Request | Validation errors, malformed data |
| 401 | Unauthorized | Invalid credentials, expired tokens |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | User not found |
| 409 | Conflict | Email/phone already exists |
| 500 | Internal Server Error | Unexpected server errors |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

## Best Practices

### Security
1. Always use HTTPS in production
2. Store JWT secrets in environment variables
3. Implement rate limiting for auth endpoints
4. Log authentication attempts for monitoring
5. Use secure password requirements
6. Implement account lockout after failed attempts

### Development
1. Use DTOs for all input validation
2. Transform and sanitize user input
3. Use proper TypeScript types
4. Handle errors gracefully
5. Write comprehensive tests
6. Document API changes

### Database
1. Use database transactions for critical operations
2. Index frequently queried fields (email, phone)
3. Implement soft deletes for user accounts
4. Regular backup procedures

### Performance
1. Implement caching for user lookups
2. Use database connection pooling
3. Optimize query performance
4. Monitor API response times

## Future Enhancements

### Planned Features
- [ ] Email service integration for verification
- [ ] SMS verification for phone numbers
- [ ] Two-factor authentication (2FA)
- [ ] OAuth integration (Google, Facebook)
- [ ] Account lockout mechanism
- [ ] Password history tracking
- [ ] Audit logging for security events
- [ ] User session management
- [ ] Account deactivation workflow

### Scalability Considerations
- [ ] Redis for session storage
- [ ] Microservices architecture preparation
- [ ] API versioning strategy
- [ ] Database sharding considerations
- [ ] CDN integration for static assets

## Support

For questions or issues:
1. Check the [API documentation](./API_DOCS.md)
2. Review the test files for usage examples
3. Check environment variable configuration
4. Verify database connection and migrations

## Contributing

1. Follow the existing code structure
2. Write tests for new features
3. Update documentation
4. Use TypeScript strictly
5. Follow NestJS conventions