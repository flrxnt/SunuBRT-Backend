import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Trip, TripWithStats } from './entities/trip.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { TripStatus, TicketStatus } from '@prisma/client';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer un nouveau trajet
   */
  async create(
    createTripDto: CreateTripDto,
    user: CurrentUserData,
  ): Promise<Trip> {
    const { routeId, busId, startTime, endTime, ...tripData } = createTripDto;

    // Vérifier que la route existe et est active
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
      include: { line: true },
    });

    if (!route) {
      throw new NotFoundException(`Route avec l'ID ${routeId} non trouvée`);
    }

    if (!route.isActive) {
      throw new BadRequestException(
        'Impossible de créer un trajet sur une route inactive',
      );
    }

    // Vérifier que le bus existe et est actif
    const bus = await this.prisma.bus.findUnique({
      where: { id: busId },
      include: { driver: true },
    });

    if (!bus) {
      throw new NotFoundException(`Bus avec l'ID ${busId} non trouvé`);
    }

    // Si c'est un conducteur, il ne peut créer un trajet que pour son propre bus
    if (user.role === 'DRIVER' && bus.driverId !== user.sub) {
      throw new BadRequestException(
        'Un conducteur ne peut créer un trajet que pour son propre bus',
      );
    }

    if (!bus.isActive) {
      throw new BadRequestException(
        'Impossible de créer un trajet avec un bus inactif',
      );
    }

    // Vérifier que le nombre de places ne dépasse pas la capacité du bus
    if (tripData.availableSeats > bus.capacity) {
      throw new BadRequestException(
        `Le nombre de places disponibles (${tripData.availableSeats}) ne peut pas dépasser la capacité du bus (${bus.capacity})`,
      );
    }

    // Vérifier les conflits d'horaires pour le bus
    const startTimeDate = new Date(startTime);
    const endTimeDate = endTime ? new Date(endTime) : null;

    if (endTimeDate && endTimeDate <= startTimeDate) {
      throw new BadRequestException(
        "L'heure de fin doit être postérieure à l'heure de début",
      );
    }

    // Calculer l'heure de fin si non fournie (basée sur la durée de la route)
    let calculatedEndTime = endTimeDate;
    if (!calculatedEndTime && route.duration) {
      calculatedEndTime = new Date(
        startTimeDate.getTime() + route.duration * 60 * 1000,
      );
    }

    const conflictingTrips = await this.prisma.trip.count({
      where: {
        busId,
        status: { in: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS] },
        OR: [
          {
            AND: [
              { startTime: { lte: startTimeDate } },
              {
                endTime: {
                  gte: startTimeDate,
                },
              },
            ],
          },
          ...(calculatedEndTime
            ? [
                {
                  AND: [
                    { startTime: { lte: calculatedEndTime } },
                    {
                      endTime: {
                        gte: calculatedEndTime,
                      },
                    },
                  ],
                },
              ]
            : []),
        ],
      },
    });

    if (conflictingTrips > 0) {
      throw new ConflictException(
        'Le bus est déjà assigné à un autre trajet sur cette période',
      );
    }

    try {
      const trip = await this.prisma.trip.create({
        data: {
          ...tripData,
          routeId,
          busId,
          startTime: startTimeDate,
          endTime: calculatedEndTime,
          // Forcer price à 0 si non fourni (pas de prix associé au voyage)
          price: typeof (tripData as any).price === 'number' ? (tripData as any).price : 0,
        },
        include: {
          route: {
            include: {
              line: true,
              startPoint: true,
              endPoint: true,
            },
          },
          bus: {
            include: {
              driver: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return trip;
    } catch (error: any) {
      throw new ConflictException('Erreur lors de la création du trajet');
    }
  }

  /**
   * Récupérer tous les trajets avec filtres optionnels
   */
  async findAll(
    query: {
      routeId?: number;
      busId?: string;
      status?: TripStatus;
      dateFrom?: string;
      dateTo?: string;
      lineId?: number;
      withStats?: boolean;
    } = {},
  ): Promise<Trip[] | TripWithStats[]> {
    const { routeId, busId, status, dateFrom, dateTo, lineId, withStats } =
      query;

    const where: any = {};

    if (routeId !== undefined) {
      where.routeId = routeId;
    }

    if (busId) {
      where.busId = busId;
    }

    if (status) {
      where.status = status;
    }

    if (lineId !== undefined) {
      where.route = {
        lineId: lineId,
      };
    }

    if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) {
        where.startTime.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.startTime.lte = new Date(dateTo);
      }
    }

    const include = {
      route: {
        include: {
          line: true,
          startPoint: true,
          endPoint: true,
        },
      },
      bus: {
        include: {
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      tickets: withStats
        ? {
            where: {
              status: { notIn: [TicketStatus.CANCELLED] },
            },
          }
        : false,
    };

    const trips = await this.prisma.trip.findMany({
      where,
      include,
      orderBy: [{ startTime: 'asc' }],
    });

    if (withStats) {
      const tripsWithStats = trips.map((trip: any) => {
        const soldTickets = trip.tickets?.length || 0;
        const remainingSeats = trip.availableSeats - soldTickets;
        const occupancyRate =
          trip.availableSeats > 0
            ? Math.round((soldTickets / trip.availableSeats) * 10000) / 100
            : 0;
        const revenue = soldTickets * trip.price;

        return {
          ...trip,
          soldTickets,
          remainingSeats,
          occupancyRate,
          revenue,
          estimatedDuration: trip.route?.duration || null,
          distance: trip.route?.distance || null,
        };
      });

      return tripsWithStats as TripWithStats[];
    }

    return trips;
  }

  /**
   * Récupérer un trajet par ID
   */
  async findOne(
    id: number,
    includeRelations = true,
  ): Promise<Trip | TripWithStats> {
    const include = includeRelations
      ? {
          route: {
            include: {
              line: true,
              startPoint: true,
              endPoint: true,
              points: {
                orderBy: { seq: 'asc' as const },
              },
            },
          },
          bus: {
            include: {
              driver: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
              currentPosition: true,
            },
          },
          tickets: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              payment: true,
            },
          },
        }
      : undefined;

    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include,
    });

    if (!trip) {
      throw new NotFoundException(`Trajet avec l'ID ${id} non trouvé`);
    }

    // Ajouter les statistiques si les relations sont incluses
    if (includeRelations) {
      const soldTickets =
        (trip as any).tickets?.filter(
          (t: any) => t.status !== TicketStatus.CANCELLED,
        ).length || 0;
      const remainingSeats = trip.availableSeats - soldTickets;
      const occupancyRate =
        trip.availableSeats > 0
          ? Math.round((soldTickets / trip.availableSeats) * 10000) / 100
          : 0;
      const revenue = soldTickets * trip.price;

      return {
        ...trip,
        soldTickets,
        remainingSeats,
        occupancyRate,
        revenue,
        estimatedDuration: (trip as any).route?.duration || null,
        distance: (trip as any).route?.distance || null,
      } as TripWithStats;
    }

    return trip;
  }

  /**
   * Récupérer les trajets d'une route
   */
  async findByRoute(routeId: number): Promise<Trip[]> {
    // Vérifier que la route existe
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      throw new NotFoundException(`Route avec l'ID ${routeId} non trouvée`);
    }

    return this.prisma.trip.findMany({
      where: {
        routeId,
        startTime: {
          gte: new Date(),
        },
      },
      include: {
        route: {
          include: {
            line: true,
          },
        },
        bus: {
          include: {
            driver: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 20,
    });
  }

  /**
   * Récupérer les trajets d'un bus
   */
  async findByBus(busId: string): Promise<Trip[]> {
    // Vérifier que le bus existe
    const bus = await this.prisma.bus.findUnique({
      where: { id: busId },
    });

    if (!bus) {
      throw new NotFoundException(`Bus avec l'ID ${busId} non trouvé`);
    }

    return this.prisma.trip.findMany({
      where: { busId },
      include: {
        route: {
          include: {
            line: true,
            startPoint: true,
            endPoint: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 50,
    });
  }

  /**
   * Mettre à jour un trajet
   */
  async update(
    id: number,
    updateTripDto: UpdateTripDto,
    user: CurrentUserData,
  ): Promise<Trip> {
    // Vérifier que le trajet existe
    const existingTrip = await this.findOne(id, false);

    // Vérifier que le trajet peut être modifié
    if (existingTrip.status === TripStatus.COMPLETED) {
      throw new BadRequestException('Impossible de modifier un trajet terminé');
    }

    if (existingTrip.status === TripStatus.CANCELLED) {
      throw new BadRequestException('Impossible de modifier un trajet annulé');
    }

    const { routeId, busId, startTime, endTime, ...tripData } = updateTripDto;

    // Vérifier la route si elle est modifiée
    if (routeId && routeId !== (existingTrip as any).routeId) {
      const route = await this.prisma.route.findUnique({
        where: { id: routeId },
      });

      if (!route) {
        throw new NotFoundException(`Route avec l'ID ${routeId} non trouvée`);
      }

      if (!route.isActive) {
        throw new BadRequestException(
          "Impossible d'assigner un trajet à une route inactive",
        );
      }
    }

    // Vérifier le bus si il est modifié
    if (busId && busId !== (existingTrip as any).busId) {
      const bus = await this.prisma.bus.findUnique({
        where: { id: busId },
      });

      if (!bus) {
        throw new NotFoundException(`Bus avec l'ID ${busId} non trouvé`);
      }

      if (!bus.isActive) {
        throw new BadRequestException(
          "Impossible d'assigner un trajet à un bus inactif",
        );
      }

      // Vérifier la capacité
      if (tripData.availableSeats && tripData.availableSeats > bus.capacity) {
        throw new BadRequestException(
          `Le nombre de places disponibles ne peut pas dépasser la capacité du bus (${bus.capacity})`,
        );
      }
    }

    // Vérifier les tickets vendus si on réduit les places disponibles
    if (
      tripData.availableSeats &&
      tripData.availableSeats < (existingTrip as any).availableSeats
    ) {
      const soldTickets = await this.prisma.ticket.count({
        where: {
          tripId: id,
          status: { notIn: ['CANCELLED'] },
        },
      });

      if (tripData.availableSeats < soldTickets) {
        throw new BadRequestException(
          `Impossible de réduire les places disponibles en dessous du nombre de tickets vendus (${soldTickets})`,
        );
      }
    }

    try {
      const updatedData: any = { ...tripData };

      if (routeId) updatedData.routeId = routeId;
      if (busId) updatedData.busId = busId;
      if (startTime) updatedData.startTime = new Date(startTime);
      if (endTime) updatedData.endTime = new Date(endTime);

      const trip = await this.prisma.trip.update({
        where: { id },
        data: updatedData,
        include: {
          route: {
            include: {
              line: true,
              startPoint: true,
              endPoint: true,
            },
          },
          bus: {
            include: {
              driver: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return trip;
    } catch (error: any) {
      throw new ConflictException('Erreur lors de la mise à jour du trajet');
    }
  }

  /**
   * Supprimer un trajet
   */
  async remove(
    id: number,
    _user: CurrentUserData,
  ): Promise<{ message: string }> {
    // Vérifier que le trajet existe
    const trip = await this.findOne(id, false);

    // Vérifier qu'il n'y a pas de tickets vendus
    const ticketsCount = await this.prisma.ticket.count({
      where: {
        tripId: id,
        status: { notIn: [TicketStatus.CANCELLED] },
      },
    });

    if (ticketsCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer le trajet : ${ticketsCount} tickets ont été vendus`,
      );
    }

    try {
      await this.prisma.trip.delete({
        where: { id },
      });

      return {
        message: `Trajet avec l'ID ${id} supprimé avec succès`,
      };
    } catch (error: any) {
      throw new ConflictException('Erreur lors de la suppression du trajet');
    }
  }

  /**
   * Changer le statut d'un trajet
   */
  async updateStatus(
    id: number,
    newStatus: TripStatus,
    user: CurrentUserData,
  ): Promise<{ message: string; status: TripStatus }> {
    const trip = await this.findOne(id, false);

    // Vérifier les transitions de statut autorisées
    const validTransitions = {
      [TripStatus.SCHEDULED]: [TripStatus.IN_PROGRESS, TripStatus.CANCELLED],
      [TripStatus.IN_PROGRESS]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
      [TripStatus.COMPLETED]: [],
      [TripStatus.CANCELLED]: [TripStatus.SCHEDULED], // Seulement pour les admins
    };

    const allowedStatuses = validTransitions[(trip as any).status];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Transition de statut invalide: ${(trip as any).status} -> ${newStatus}`,
      );
    }

    // Seuls les admins peuvent réactiver un trajet annulé
    if (
      (trip as any).status === TripStatus.CANCELLED &&
      user.role !== 'ADMIN'
    ) {
      throw new BadRequestException(
        'Seuls les administrateurs peuvent réactiver un trajet annulé',
      );
    }

    try {
      const updateData: any = { status: newStatus };

      // Marquer l'heure de fin si le trajet est terminé
      if (newStatus === TripStatus.COMPLETED) {
        updateData.endTime = new Date();
      }

      const updatedTrip = await this.prisma.trip.update({
        where: { id },
        data: updateData,
      });

      return {
        message: `Statut du trajet mis à jour vers ${newStatus}`,
        status: updatedTrip.status,
      };
    } catch (error: any) {
      throw new ConflictException('Erreur lors de la mise à jour du statut');
    }
  }

  /**
   * Récupérer les statistiques des trajets
   */
  async getStatistics(): Promise<{
    totalTrips: number;
    scheduledTrips: number;
    inProgressTrips: number;
    completedTrips: number;
    cancelledTrips: number;
    todayTrips: number;
    weekTrips: number;
    averageOccupancy: number;
    totalRevenue: number;
    tripsByStatus: Array<{
      status: TripStatus;
      count: number;
    }>;
    tripsByLine: Array<{
      lineId: number | null;
      lineName: string | null;
      lineNumber: string | null;
      tripsCount: number;
    }>;
    revenueByDay: Array<{
      date: string;
      revenue: number;
      tripsCount: number;
    }>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      totalTrips,
      statusCounts,
      todayTrips,
      weekTrips,
      occupancyStats,
      revenueStats,
      tripsByLine,
    ] = await Promise.all([
      this.prisma.trip.count(),
      this.prisma.trip.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.trip.count({
        where: {
          startTime: { gte: today },
        },
      }),
      this.prisma.trip.count({
        where: {
          startTime: { gte: weekAgo },
        },
      }),
      this.prisma.trip.findMany({
        where: {
          status: TripStatus.COMPLETED,
        },
        select: {
          availableSeats: true,
          _count: {
            select: {
              tickets: {
                where: {
                  status: { notIn: [TicketStatus.CANCELLED] },
                },
              },
            },
          },
        },
      }),
      this.prisma.trip.findMany({
        where: {
          status: TripStatus.COMPLETED,
        },
        select: {
          price: true,
          startTime: true,
          _count: {
            select: {
              tickets: {
                where: {
                  status: { notIn: [TicketStatus.CANCELLED] },
                },
              },
            },
          },
        },
      }),
      this.prisma.trip.groupBy({
        by: ['routeId'],
        _count: { id: true },
        where: {
          startTime: { gte: weekAgo },
        },
      }),
    ]);

    // Calculer le taux d'occupation moyen
    const totalSeats = occupancyStats.reduce(
      (sum, trip) => sum + trip.availableSeats,
      0,
    );
    const totalSoldSeats = occupancyStats.reduce(
      (sum, trip) => sum + trip._count.tickets,
      0,
    );
    const averageOccupancy =
      totalSeats > 0
        ? Math.round((totalSoldSeats / totalSeats) * 10000) / 100
        : 0;

    // Calculer le revenu total
    const totalRevenue = revenueStats.reduce(
      (sum, trip) => sum + trip.price * trip._count.tickets,
      0,
    );

    // Formater les statistiques par statut
    const tripsByStatus = Object.values(TripStatus).map((status) => ({
      status,
      count: statusCounts.find((s) => s.status === status)?._count.id || 0,
    }));

    // Enrichir les données par ligne
    const enrichedTripsByLine = await Promise.all(
      tripsByLine.map(async (group) => {
        const route = await this.prisma.route.findUnique({
          where: { id: group.routeId },
          include: { line: true },
        });

        return {
          lineId: route?.lineId || null,
          lineName: route?.line?.name || 'Sans ligne',
          lineNumber: route?.line?.number || null,
          tripsCount: group._count.id,
        };
      }),
    );

    // Revenus par jour (7 derniers jours)
    const revenueByDay: Array<{
      date: string;
      revenue: number;
      tripsCount: number;
    }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayStats = revenueStats.filter(
        (trip) => trip.startTime >= date && trip.startTime < nextDay,
      );

      const dayRevenue = dayStats.reduce(
        (sum, trip) => sum + trip.price * trip._count.tickets,
        0,
      );

      revenueByDay.push({
        date: date.toISOString().split('T')[0],
        revenue: dayRevenue,
        tripsCount: dayStats.length,
      });
    }

    return {
      totalTrips,
      scheduledTrips:
        tripsByStatus.find((t) => t.status === TripStatus.SCHEDULED)?.count ||
        0,
      inProgressTrips:
        tripsByStatus.find((t) => t.status === TripStatus.IN_PROGRESS)?.count ||
        0,
      completedTrips:
        tripsByStatus.find((t) => t.status === TripStatus.COMPLETED)?.count ||
        0,
      cancelledTrips:
        tripsByStatus.find((t) => t.status === TripStatus.CANCELLED)?.count ||
        0,
      todayTrips,
      weekTrips,
      averageOccupancy,
      totalRevenue,
      tripsByStatus,
      tripsByLine: enrichedTripsByLine,
      revenueByDay,
    };
  }

  /**
   * Rechercher des trajets
   */
  async search(query: string): Promise<Trip[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException(
        'Le terme de recherche ne peut pas être vide',
      );
    }

    const searchTerm = query.trim();

    const trips = await this.prisma.trip.findMany({
      where: {
        OR: [
          {
            route: {
              name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
          {
            route: {
              line: {
                name: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            route: {
              line: {
                number: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            bus: {
              busNumber: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
          {
            bus: {
              licensePlate: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      include: {
        route: {
          include: {
            line: true,
            startPoint: true,
            endPoint: true,
          },
        },
        bus: {
          include: {
            driver: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 50,
    });

    return trips;
  }
}
