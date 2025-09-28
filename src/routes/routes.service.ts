import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { Route, RouteWithStats } from './entities/route.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';

@Injectable()
export class RoutesService {
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
   * Calcule la distance totale d'une route à partir de ses points
   */
  private calculateTotalDistance(
    points: Array<{ latitude: number; longitude: number }>,
  ): number {
    if (points.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalDistance += this.calculateDistance(
        points[i].latitude,
        points[i].longitude,
        points[i + 1].latitude,
        points[i + 1].longitude,
      );
    }

    return Math.round(totalDistance * 100) / 100; // Arrondi à 2 décimales
  }

  /**
   * Estime la durée en fonction de la distance (vitesse moyenne de 25 km/h en ville)
   */
  private estimateDuration(distance: number): number {
    const averageSpeedKmh = 25; // Vitesse moyenne en ville
    const durationHours = distance / averageSpeedKmh;
    return Math.ceil(durationHours * 60); // Convertir en minutes et arrondir vers le haut
  }

  /**
   * Créer une nouvelle route
   */
  async create(
    createRouteDto: CreateRouteDto,
    _user: CurrentUserData,
  ): Promise<Route> {
    const { points, lineId, ...routeData } = createRouteDto;

    // Vérifier que la ligne existe si spécifiée
    if (lineId) {
      const line = await this.prisma.line.findUnique({
        where: { id: lineId },
      });

      if (!line) {
        throw new NotFoundException(`Ligne avec l'ID ${lineId} non trouvée`);
      }

      if (!line.isActive) {
        throw new BadRequestException(
          'Impossible de créer une route sur une ligne inactive',
        );
      }
    }

    // Calculer la distance si non fournie
    let distance = routeData.distance;
    if (!distance) {
      distance = this.calculateTotalDistance(points);
    }

    // Calculer la durée si non fournie
    let duration = routeData.duration;
    if (!duration) {
      duration = this.estimateDuration(distance);
    }

    try {
      const route = await this.prisma.route.create({
        data: {
          ...routeData,
          lineId,
          distance,
          duration,
          points: {
            create: points.map((point, index) => ({
              ...point,
              seq: index + 1,
            })),
          },
        },
        include: {
          line: true,
          points: {
            orderBy: { seq: 'asc' },
          },
        },
      });

      // Mettre à jour les points de départ et d'arrivée
      const firstPoint = route.points[0];
      const lastPoint = route.points[route.points.length - 1];

      const updatedRoute = await this.prisma.route.update({
        where: { id: route.id },
        data: {
          startPointId: firstPoint.id,
          endPointId: lastPoint.id,
        },
        include: {
          line: true,
          startPoint: true,
          endPoint: true,
          points: {
            orderBy: { seq: 'asc' },
          },
        },
      });

      return updatedRoute;
    } catch (error: any) {
      throw new ConflictException('Erreur lors de la création de la route');
    }
  }

  /**
   * Récupérer toutes les routes avec filtres optionnels
   */
  async findAll(
    query: {
      lineId?: number;
      isActive?: boolean;
      withTrips?: boolean;
      withStats?: boolean;
    } = {},
  ): Promise<Route[] | RouteWithStats[]> {
    const { lineId, isActive, withTrips, withStats } = query;

    const where: any = {};
    if (lineId !== undefined) {
      where.lineId = lineId;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const include: any = {
      line: true,
      startPoint: true,
      endPoint: true,
      points: {
        orderBy: { seq: 'asc' },
      },
    };

    if (withTrips) {
      include.trips = {
        where: {
          startTime: {
            gte: new Date(),
          },
        },
        take: 5,
        orderBy: { startTime: 'asc' },
        include: {
          bus: {
            select: {
              id: true,
              busNumber: true,
              licensePlate: true,
            },
          },
        },
      };
    }

    const routes = await this.prisma.route.findMany({
      where,
      include,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    if (withStats) {
      // Ajouter les statistiques à chaque route
      const routesWithStats = await Promise.all(
        routes.map(async (route) => {
          const [activeTripsCount, totalTripsCount] = await Promise.all([
            this.prisma.trip.count({
              where: {
                routeId: route.id,
                status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
              },
            }),
            this.prisma.trip.count({
              where: { routeId: route.id },
            }),
          ]);

          return {
            ...route,
            pointsCount: route.points?.length || 0,
            activeTripsCount,
            totalTripsCount,
          };
        }),
      );

      return routesWithStats as RouteWithStats[];
    }

    return routes;
  }

  /**
   * Récupérer une route par ID
   */
  async findOne(
    id: number,
    includeRelations = true,
  ): Promise<Route | RouteWithStats> {
    const include = includeRelations
      ? {
          line: true,
          startPoint: true,
          endPoint: true,
          points: {
            orderBy: { seq: 'asc' as const },
          },
          trips: {
            where: {
              startTime: {
                gte: new Date(),
              },
            },
            take: 10,
            orderBy: { startTime: 'asc' as const },
            include: {
              bus: {
                select: {
                  id: true,
                  busNumber: true,
                  licensePlate: true,
                  driver: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        }
      : undefined;

    const route = await this.prisma.route.findUnique({
      where: { id },
      include: include as any,
    });

    if (!route) {
      throw new NotFoundException(`Route avec l'ID ${id} non trouvée`);
    }

    // Ajouter les statistiques si les relations sont incluses
    if (includeRelations) {
      const [activeTripsCount, totalTripsCount] = await Promise.all([
        this.prisma.trip.count({
          where: {
            routeId: id,
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          },
        }),
        this.prisma.trip.count({
          where: { routeId: id },
        }),
      ]);

      return {
        ...route,
        pointsCount: (route as any).points?.length || 0,
        activeTripsCount,
        totalTripsCount,
        upcomingTrips: (route as any).trips,
      } as RouteWithStats;
    }

    return route;
  }

  /**
   * Récupérer les routes d'une ligne
   */
  async findByLine(lineId: number): Promise<Route[]> {
    // Vérifier que la ligne existe
    const line = await this.prisma.line.findUnique({
      where: { id: lineId },
    });

    if (!line) {
      throw new NotFoundException(`Ligne avec l'ID ${lineId} non trouvée`);
    }

    return this.prisma.route.findMany({
      where: {
        lineId,
        isActive: true,
      },
      include: {
        line: true,
        startPoint: true,
        endPoint: true,
        points: {
          orderBy: { seq: 'asc' },
        },
        trips: {
          where: {
            startTime: {
              gte: new Date(),
            },
          },
          take: 3,
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Mettre à jour une route
   */
  async update(
    id: number,
    updateRouteDto: UpdateRouteDto,
    _user: CurrentUserData,
  ): Promise<Route> {
    // Vérifier que la route existe
    await this.findOne(id, false);

    const { points, lineId, ...routeData } = updateRouteDto;

    // Vérifier que la ligne existe si spécifiée
    if (lineId) {
      const line = await this.prisma.line.findUnique({
        where: { id: lineId },
      });

      if (!line) {
        throw new NotFoundException(`Ligne avec l'ID ${lineId} non trouvée`);
      }
    }

    try {
      // Si des points sont fournis, recalculer la distance et la durée
      let distance = routeData.distance;
      let duration = routeData.duration;

      if (points && points.length >= 2) {
        if (!distance) {
          distance = this.calculateTotalDistance(points);
        }
        if (!duration) {
          duration = this.estimateDuration(distance);
        }

        // Supprimer les anciens points et créer les nouveaux
        await this.prisma.routePoint.deleteMany({
          where: { routeId: id },
        });

        const route = await this.prisma.route.update({
          where: { id },
          data: {
            ...routeData,
            lineId,
            distance,
            duration,
            points: {
              create: points.map((point, index) => ({
                ...point,
                seq: index + 1,
              })),
            },
          },
          include: {
            points: {
              orderBy: { seq: 'asc' },
            },
          },
        });

        // Mettre à jour les points de départ et d'arrivée
        const firstPoint = route.points[0];
        const lastPoint = route.points[route.points.length - 1];

        return this.prisma.route.update({
          where: { id },
          data: {
            startPointId: firstPoint.id,
            endPointId: lastPoint.id,
          },
          include: {
            line: true,
            startPoint: true,
            endPoint: true,
            points: {
              orderBy: { seq: 'asc' },
            },
          },
        });
      } else {
        // Mise à jour sans changement de points
        return this.prisma.route.update({
          where: { id },
          data: {
            ...routeData,
            lineId,
            distance,
            duration,
          },
          include: {
            line: true,
            startPoint: true,
            endPoint: true,
            points: {
              orderBy: { seq: 'asc' },
            },
          },
        });
      }
    } catch (error: any) {
      throw new ConflictException('Erreur lors de la mise à jour de la route');
    }
  }

  /**
   * Supprimer une route
   */
  async remove(
    id: number,
    _user: CurrentUserData,
  ): Promise<{ message: string }> {
    // Vérifier que la route existe
    await this.findOne(id, false);

    // Vérifier qu'il n'y a pas de trajets actifs
    const activeTripsCount = await this.prisma.trip.count({
      where: {
        routeId: id,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
    });

    if (activeTripsCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer la route : ${activeTripsCount} trajets actifs sont associés à cette route`,
      );
    }

    try {
      // Supprimer d'abord les points de route (cascade)
      await this.prisma.routePoint.deleteMany({
        where: { routeId: id },
      });

      // Supprimer la route
      await this.prisma.route.delete({
        where: { id },
      });

      return {
        message: `Route avec l'ID ${id} supprimée avec succès`,
      };
    } catch (error: any) {
      throw new ConflictException('Erreur lors de la suppression de la route');
    }
  }

  /**
   * Activer/désactiver une route
   */
  async toggleActive(
    id: number,
    _user: CurrentUserData,
  ): Promise<{ message: string; isActive: boolean }> {
    const route = await this.findOne(id, false);

    const updatedRoute = await this.prisma.route.update({
      where: { id },
      data: { isActive: !route.isActive },
    });

    const action = updatedRoute.isActive ? 'activée' : 'désactivée';

    return {
      message: `Route "${route.name}" ${action} avec succès`,
      isActive: updatedRoute.isActive,
    };
  }

  /**
   * Récupérer les statistiques des routes
   */
  async getStatistics() {
    const [
      totalRoutes,
      activeRoutes,
      routesWithLine,
      routesWithTrips,
      routeStats,
      routesByLine,
    ] = await Promise.all([
      this.prisma.route.count(),
      this.prisma.route.count({ where: { isActive: true } }),
      this.prisma.route.count({
        where: { lineId: { not: null } },
      }),
      this.prisma.route.count({
        where: {
          trips: {
            some: {},
          },
        },
      }),
      this.prisma.route.aggregate({
        where: { isActive: true },
        _avg: {
          distance: true,
          duration: true,
        },
        _sum: {
          distance: true,
        },
      }),
      this.prisma.route.groupBy({
        by: ['lineId'],
        _count: {
          id: true,
        },
        where: { isActive: true },
      }),
    ]);

    // Enrichir les données de groupement avec les informations des lignes
    const enrichedRoutesByLine = await Promise.all(
      routesByLine.map(async (group) => {
        if (group.lineId) {
          const line = await this.prisma.line.findUnique({
            where: { id: group.lineId },
            select: { name: true, number: true },
          });

          return {
            lineId: group.lineId,
            lineName: line?.name || null,
            lineNumber: line?.number || null,
            routesCount: group._count.id,
          };
        }

        return {
          lineId: null,
          lineName: 'Sans ligne',
          lineNumber: null,
          routesCount: group._count.id,
        };
      }),
    );

    return {
      totalRoutes,
      activeRoutes,
      inactiveRoutes: totalRoutes - activeRoutes,
      routesWithLine,
      routesWithTrips,
      averageDistance: Math.round((routeStats._avg.distance || 0) * 100) / 100,
      averageDuration: Math.round(routeStats._avg.duration || 0),
      totalDistance: Math.round((routeStats._sum.distance || 0) * 100) / 100,
      routesByLine: enrichedRoutesByLine.sort((a, b) =>
        (a.lineNumber || '').localeCompare(b.lineNumber || ''),
      ),
    };
  }

  /**
   * Rechercher des routes
   */
  async search(query: string): Promise<Route[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException(
        'Le terme de recherche ne peut pas être vide',
      );
    }

    const searchTerm = query.trim();

    return await this.prisma.route.findMany({
      where: {
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            line: {
              name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
          {
            line: {
              number: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      include: {
        line: true,
        startPoint: true,
        endPoint: true,
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Obtenir les routes proches d'une position GPS
   */
  async findNearbyRoutes(
    _latitude: number,
    _longitude: number,
    _radiusKm: number = 5,
  ): Promise<Route[]> {
    // Cette fonction nécessiterait une extension PostGIS pour PostgreSQL
    // Pour l'instant, on retourne toutes les routes actives
    // TODO: Implémenter la recherche géographique avec PostGIS

    return this.prisma.route.findMany({
      where: { isActive: true },
      include: {
        line: true,
        startPoint: true,
        endPoint: true,
        trips: {
          where: {
            startTime: {
              gte: new Date(),
            },
          },
          take: 3,
          orderBy: { startTime: 'asc' },
        },
      },
      take: 10,
      orderBy: { name: 'asc' },
    });
  }
}
