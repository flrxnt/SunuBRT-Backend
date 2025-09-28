import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class RoleCreationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    // Seuls les admins peuvent créer des utilisateurs
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Seuls les administrateurs peuvent créer des utilisateurs',
      );
    }

    // Validation des rôles lors de la création
    if (body.role) {
      // Vérifier que le rôle demandé est valide
      if (!Object.values(Role).includes(body.role)) {
        throw new BadRequestException('Rôle invalide');
      }

      // Un admin peut créer n'importe quel rôle
      // Mais on peut ajouter des restrictions supplémentaires ici si nécessaire

      // Par exemple, empêcher la création de multiples super-admins
      if (body.role === Role.ADMIN) {
        // Ici on pourrait ajouter une vérification pour limiter le nombre d'admins
        // Mais pour l'instant, on autorise la création d'admins par les admins existants
      }

      // Validation spéciale pour les conducteurs
      if (body.role === Role.DRIVER) {
        // On pourrait ajouter des validations spécifiques aux conducteurs
        // comme vérifier qu'ils ont un permis de conduire valide, etc.
      }
    }

    return true;
  }
}
