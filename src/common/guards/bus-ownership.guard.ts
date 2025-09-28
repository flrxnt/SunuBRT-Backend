import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class BusOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const busId = request.params.id;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    if (!busId) {
      throw new ForbiddenException('ID du bus requis');
    }

    // Les admins peuvent accéder à tous les bus
    if (user.role === Role.ADMIN) {
      return true;
    }

    // Vérifier que le bus existe
    const bus = await this.prisma.bus.findUnique({
      where: { id: busId },
      select: { id: true, driverId: true },
    });

    if (!bus) {
      throw new NotFoundException('Bus non trouvé');
    }

    // Pour les conducteurs, vérifier qu'ils sont propriétaires du bus
    if (user.role === Role.DRIVER) {
      if (bus.driverId !== user.id) {
        throw new ForbiddenException(
          "Vous ne pouvez accéder qu'à votre propre bus",
        );
      }
      return true;
    }

    // Pour les autres rôles, interdire l'accès
    throw new ForbiddenException('Accès non autorisé');
  }
}
