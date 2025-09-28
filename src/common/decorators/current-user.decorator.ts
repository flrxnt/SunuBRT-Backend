import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  id: string;
  sub: string; // Ajouter sub pour la compatibilité
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isVerified?: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
