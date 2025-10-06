import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { Stop, StopWithLines } from './entities/stop.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';

@Injectable()
export class StopsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcule la distance entre deux points GPS (formule de Haversine)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convertit des degrés en radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Créer un nouvel arrêt
   */
  async create(
    createStopDto: CreateStopDto,
    _user: CurrentUserData,
  ): Promise<Stop> {
    const { lineIds, ...stopData } = createStopDto;

    try {
      const stop = await this.prisma.stop.create({
        data: {
          ...stopData,
          lines: lineIds && lineIds.length > 0 ? {
            connect: lineIds.map(id => ({ id })),
          } : undefined,
        },
        include: {
          lines: true,
          routePoints: {
            include: {
              route: {
                include: {
                  line: true,
                },
              },
            },
          },
        },
      });

      return stop;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Un arrêt avec ce nom existe déjà');
      }
      throw new ConflictException('Erreur lors de la création de l\'arrêt');
    }
  }

  /**
   * Récupérer tous les arrêts avec filtres optionnels
   */
  async findAll(
    query: {
      lineId?: number;
      zone?: string;
      isActive?: boolean;
      withLines?: boolean;
      withRoutes?: boolean;
    } = {},
  ): Promise<Stop[] | StopWithLines[]> {
    const { lineId, zone, isActive, withLines, withRoutes } = query;

    const where: any = {};
    if (zone) {
      where.zone = zone;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const include: any = {};

    if (withLines) {
      include.lines = {
        where: { isActive: true },
        include: {
          buses: {
            where: { isActive: true },
            take: 5,
            include: {
              currentPosition: true,
            },
          },
          routes: {
            where: { isActive: true },
            take: 3,
          },
        },
      };
    }

    if (withRoutes) {
      include.routePoints = {
        include: {
          route: {
            include: {
              line: true,
            },
          },
        },
      };
    }

    let stops = await this.prisma.stop.findMany({
      where,
      include,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    // Filtrer par lineId si spécifié
    if (lineId && withLines) {
      stops = stops.filter(stop =>
        (stop as StopWithLines).lines?.some(line => line.id === lineId)
      );
    }

    return stops;
  }

  /**
   * Récupérer un arrêt par ID
   */
  async findOne(
    id: number,
    includeRelations = true,
  ): Promise<Stop | StopWithLines> {
    const include = includeRelations
      ? {
          lines: {
            where: { isActive: true },
            include: {
              buses: {
                where: { isActive: true },
                take: 10,
                include: {
                  currentPosition: true,
                  driver: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
              routes: {
                where: { isActive: true },
                take: 5,
                include: {
                  startPoint: true,
                  endPoint: true,
                },
              },
            },
          },
          routePoints: {
            include: {
              route: {
                include: {
                  line: true,
                },
              },
            },
          },
        }
      : undefined;

    const stop = await this.prisma.stop.findUnique({
      where: { id },
      include: include as any,
    });

    if (!stop) {
      throw new NotFoundException(`Arrêt avec l'ID ${id} non trouvé`);
    }

    return stop;
  }

  /**
   * Récupérer les arrêts d'une ligne
   */
  async findByLine(lineId: number): Promise<Stop[]> {
    // Vérifier que la ligne existe
    const line = await this.prisma.line.findUnique({
      where: { id: lineId },
    });

    if (!line) {
      throw new NotFoundException(`Ligne avec l'ID ${lineId} non trouvée`);
    }

    return this.prisma.stop.findMany({
      where: {
        lines: {
          some: {
            id: lineId,
          },
        },
        isActive: true,
      },
      include: {
        lines: {
          where: { id: lineId },
        },
        routePoints: {
          where: {
            route: {
              lineId: lineId,
            },
          },
          include: {
            route: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Mettre à jour un arrêt
   */
  async update(
    id: number,
    updateStopDto: UpdateStopDto,
    _user: CurrentUserData,
  ): Promise<Stop> {
    // Vérifier que l'arrêt existe
    await this.findOne(id, false);

    const { lineIds, ...stopData } = updateStopDto;

    try {
      const updateData: any = { ...stopData };

      // Gérer les connexions aux lignes
      if (lineIds !== undefined) {
        updateData.lines = {
          set: lineIds.map(id => ({ id })),
        };
      }

      return this.prisma.stop.update({
        where: { id },
        data: updateData,
        include: {
          lines: true,
          routePoints: {
            include: {
              route: {
                include: {
                  line: true,
                },
              },
            },
          },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Un arrêt avec ce nom existe déjà');
      }
      throw new ConflictException('Erreur lors de la mise à jour de l\'arrêt');
    }
  }

  /**
   * Supprimer un arrêt
   */
  async remove(
    id: number,
    _user: CurrentUserData,
  ): Promise<{ message: string }> {
    // Vérifier que l'arrêt existe
    await this.findOne(id, false);

    try {
      // Supprimer l'arrêt (les routePoints seront supprimés en cascade)
      await this.prisma.stop.delete({
        where: { id },
      });

      return {
        message: `Arrêt avec l'ID ${id} supprimé avec succès`,
      };
    } catch (error: any) {
      throw new ConflictException('Erreur lors de la suppression de l\'arrêt');
    }
  }

  /**
   * Activer/désactiver un arrêt
   */
  async toggleActive(
    id: number,
    _user: CurrentUserData,
  ): Promise<{ message: string; isActive: boolean }> {
    const stop = await this.findOne(id, false);

    const updatedStop = await this.prisma.stop.update({
      where: { id },
      data: { isActive: !stop.isActive },
    });

    const action = updatedStop.isActive ? 'activé' : 'désactivé';

    return {
      message: `Arrêt "${stop.name}" ${action} avec succès`,
      isActive: updatedStop.isActive,
    };
  }

  /**
   * Récupérer les statistiques des arrêts
   */
  async getStatistics() {
    const [
      totalStops,
      activeStops,
      stopsWithLines,
      stopsWithRoutes,
      stopsByZone,
    ] = await Promise.all([
      this.prisma.stop.count(),
      this.prisma.stop.count({ where: { isActive: true } }),
      this.prisma.stop.count({
        where: {
          lines: {
            some: {},
          },
        },
      }),
      this.prisma.stop.count({
        where: {
          routePoints: {
            some: {},
          },
        },
      }),
      this.prisma.stop.groupBy({
        by: ['zone'],
        _count: {
          id: true,
        },
        where: { isActive: true },
      }),
    ]);

    return {
      totalStops,
      activeStops,
      inactiveStops: totalStops - activeStops,
      stopsWithLines,
      stopsWithRoutes,
      stopsByZone: stopsByZone
        .filter(group => group.zone !== null)
        .sort((a, b) => (a.zone || '').localeCompare(b.zone || '')),
    };
  }

  /**
   * Rechercher des arrêts
   */
  async search(query: string): Promise<Stop[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException(
        'Le terme de recherche ne peut pas être vide',
      );
    }

    const searchTerm = query.trim();

    return await this.prisma.stop.findMany({
      where: {
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            address: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            zone: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            lines: {
              some: {
                name: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            lines: {
              some: {
                number: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      },
      include: {
        lines: {
          select: {
            id: true,
            name: true,
            number: true,
            color: true,
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Obtenir les arrêts proches d'une position GPS
   */
  async findNearbyStops(
    latitude: number,
    longitude: number,
    radiusKm: number = 1,
  ): Promise<Stop[]> {
    // Pour l'instant, on utilise une approche simple sans PostGIS
    // TODO: Implémenter la recherche géographique avec PostGIS pour de meilleures performances

    const stops = await this.prisma.stop.findMany({
      where: { isActive: true },
      include: {
        lines: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            number: true,
            color: true,
          },
        },
      },
    });

    // Filtrer par distance (approximation simple)
    const nearbyStops = stops.filter(stop => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        stop.latitude,
        stop.longitude,
      );
      return distance <= radiusKm;
    });

    // Trier par distance
    return nearbyStops
      .map(stop => ({
        ...stop,
        distance: this.calculateDistance(
          latitude,
          longitude,
          stop.latitude,
          stop.longitude,
        ),
      }))
      .sort((a, b) => (a as any).distance - (b as any).distance)
      .slice(0, 20); // Limiter à 20 résultats
  }

  /**
   * Récupérer les arrêts d'une route spécifique
   */
  async findByRoute(routeId: number): Promise<Stop[]> {
    // Vérifier que la route existe
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      throw new NotFoundException(`Route avec l'ID ${routeId} non trouvée`);
    }

    return this.prisma.stop.findMany({
      where: {
        routePoints: {
          some: {
            routeId: routeId,
          },
        },
        isActive: true,
      },
      include: {
        routePoints: {
          where: { routeId },
          orderBy: { seq: 'asc' },
          include: {
            route: true,
          },
        },
        lines: {
          where: { isActive: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }
}
