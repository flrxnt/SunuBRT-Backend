import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import {
  Permission,
  PERMISSIONS_KEY,
  RolePermissions,
} from '../decorators/permissions.decorator';
import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isVerified?: boolean;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AppGuard implements CanActivate {
  private readonly logger = new Logger(AppGuard.name);

  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthUser }>();

    // 1. Vérifier si la route est publique
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug(
        `Public route accessed: ${request.method} ${request.url}`,
      );
      return true;
    }

    // 2. Vérifier l'authentification
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      this.logger.warn(
        `Missing token for protected route: ${request.method} ${request.url}`,
      );
      throw new UnauthorizedException("Token d'accès requis");
    }

    let user: AuthUser;
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret:
          process.env.JWT_SECRET ||
          'your-super-secret-jwt-key-change-in-production',
      });

      user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        isVerified: payload.isVerified,
        iat: payload.iat,
        exp: payload.exp,
      };

      request.user = user;
    } catch (error) {
      this.logger.warn(
        `Invalid token for route: ${request.method} ${request.url}`,
        error.message,
      );
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    // 3. Vérifier les rôles requis
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(user.role);
      if (!hasRole) {
        this.logger.warn(
          `Insufficient role for user ${user.email} (${user.role}) on route: ${request.method} ${request.url}. Required: ${requiredRoles.join(', ')}`,
        );
        throw new ForbiddenException(
          'Rôle insuffisant pour accéder à cette ressource',
        );
      }
    }

    // 4. Vérifier les permissions granulaires
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = RolePermissions[user.role] || [];
      const hasPermission = requiredPermissions.some((permission) =>
        userPermissions.includes(permission as Permission),
      );

      if (!hasPermission) {
        this.logger.warn(
          `Insufficient permissions for user ${user.email} (${user.role}) on route: ${request.method} ${request.url}. Required: ${requiredPermissions.join(', ')}`,
        );
        throw new ForbiddenException(
          'Permissions insuffisantes pour accéder à cette ressource',
        );
      }
    }

    // 5. Vérifier si l'utilisateur est vérifié pour certaines actions sensibles
    const sensitiveEndpoints = ['/users', '/buses', '/trips', '/payments'];
    const isSensitiveEndpoint = sensitiveEndpoints.some((endpoint) =>
      request.url.startsWith(endpoint),
    );

    if (isSensitiveEndpoint && !user.isVerified && user.role !== Role.ADMIN) {
      this.logger.warn(
        `Unverified user ${user.email} attempted to access sensitive endpoint: ${request.method} ${request.url}`,
      );
      throw new ForbiddenException(
        'Compte non vérifié. Veuillez vérifier votre email.',
      );
    }

    // 6. Log d'accès réussi
    this.logger.debug(
      `Access granted for user ${user.email} (${user.role}) on route: ${request.method} ${request.url}`,
    );

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
