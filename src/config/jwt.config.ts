import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig: JwtModuleOptions = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  signOptions: {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'sunubrt-api',
    audience: 'sunubrt-app',
  },
};

export const jwtRefreshConfig: JwtModuleOptions = {
  secret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-jwt-key-change-in-production',
  signOptions: {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'sunubrt-api',
    audience: 'sunubrt-app',
  },
};

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface JwtRefreshPayload {
  sub: string; // user id
  tokenVersion: number;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}
