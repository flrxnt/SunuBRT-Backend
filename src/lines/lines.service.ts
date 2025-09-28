import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateLineDto } from './dto/create-line.dto';
import { UpdateLineDto } from './dto/update-line.dto';
import { Line, LineWithStats } from './entities/line.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';

@Injectable()
export class LinesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer une nouvelle ligne
   */
  async create(
    createLineDto: CreateLineDto,
    user: CurrentUserData,
  ): Promise<Line> {
    // Vérifier l'unicité du nom
    const existingByName = await this.prisma.line.findUnique({
      where: { name: createLineDto.name },
    });

    if (existingByName) {
      throw new ConflictException(
        `Une ligne avec le nom "${createLineDto.name}" existe déjà`,
      );
    }

    // Vérifier l'unicité du numéro
    const existingByNumber = await this.prisma.line.findUnique({
      where: { number: createLineDto.number },
    });

    if (existingByNumber) {
      throw new ConflictException(
        `Une ligne avec le numéro "${createLineDto.number}" existe déjà`,
      );
    }

    try {
      const line = await this.prisma.line.create({
        data: createLineDto,
        include: {
          buses: {
            where: { isActive: true },
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
          routes: {
            where: { isActive: true },
          },
        },
      });

      return line;
    } catch (error) {
      throw new ConflictException(
        'Erreur lors de la création de la ligne',
        error.message,
      );
    }
  }

  /**
   * Récupérer toutes les lignes avec filtres optionnels
   */
  async findAll(
    query: {
      isActive?: boolean;
      withBuses?: boolean;
      withRoutes?: boolean;
      withStats?: boolean;
    } = {},
  ): Promise<Line[] | LineWithStats[]> {
    const { isActive, withBuses, withRoutes, withStats } = query;

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const include: any = {};
    if (withBuses) {
      include.buses = {
        where: { isActive: true },
        include: {
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          currentPosition: true,
        },
      };
    }

    if (withRoutes) {
      include.routes = {
        where: { isActive: true },
        include: {
          startPoint: true,
          endPoint: true,
        },
      };
    }

    const lines = await this.prisma.line.findMany({
      where,
      include: include as any,
      orderBy: [{ isActive: 'desc' }, { number: 'asc' }],
    });

    if (withStats) {
      // Ajouter les statistiques à chaque ligne
      const linesWithStats = await Promise.all(
        lines.map(async (line) => {
          const [activeBusesCount, totalBusesCount, routesCount] =
            await Promise.all([
              this.prisma.bus.count({
                where: { lineId: line.id, isActive: true },
              }),
              this.prisma.bus.count({
                where: { lineId: line.id },
              }),
              this.prisma.route.count({
                where: { lineId: line.id, isActive: true },
              }),
            ]);

          return {
            ...line,
            activeBusesCount,
            totalBusesCount,
            routesCount,
          };
        }),
      );

      return linesWithStats as LineWithStats[];
    }

    return lines;
  }

  /**
   * Récupérer une ligne par ID
   */
  async findOne(
    id: number,
    includeRelations = true,
  ): Promise<Line | LineWithStats> {
    const include = includeRelations
      ? {
          buses: {
            where: { isActive: true },
            include: {
              driver: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              currentPosition: true,
            },
          },
          routes: {
            where: { isActive: true },
            include: {
              startPoint: true,
              endPoint: true,
              trips: {
                where: {
                  startTime: {
                    gte: new Date(),
                  },
                },
                take: 5,
                orderBy: { startTime: 'asc' as const },
              },
            },
          },
        }
      : undefined;

    const line = await this.prisma.line.findUnique({
      where: { id },
      include,
    });

    if (!line) {
      throw new NotFoundException(`Ligne avec l'ID ${id} non trouvée`);
    }

    // Ajouter les statistiques
    if (includeRelations) {
      const [activeBusesCount, totalBusesCount, routesCount] =
        await Promise.all([
          this.prisma.bus.count({
            where: { lineId: id, isActive: true },
          }),
          this.prisma.bus.count({
            where: { lineId: id },
          }),
          this.prisma.route.count({
            where: { lineId: id, isActive: true },
          }),
        ]);

      return {
        ...line,
        activeBusesCount,
        totalBusesCount,
        routesCount,
      } as LineWithStats;
    }

    return line;
  }

  /**
   * Récupérer une ligne par numéro
   */
  async findByNumber(number: string): Promise<Line> {
    const line = await this.prisma.line.findUnique({
      where: { number },
      include: {
        buses: {
          where: { isActive: true },
          include: {
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            currentPosition: true,
          },
        },
        routes: {
          where: { isActive: true },
        },
      },
    });

    if (!line) {
      throw new NotFoundException(
        `Ligne avec le numéro "${number}" non trouvée`,
      );
    }

    return line;
  }

  /**
   * Mettre à jour une ligne
   */
  async update(
    id: number,
    updateLineDto: UpdateLineDto,
    user: CurrentUserData,
  ): Promise<Line> {
    // Vérifier que la ligne existe
    await this.findOne(id, false);

    // Vérifier l'unicité du nom si modifié
    if (updateLineDto.name) {
      const existingByName = await this.prisma.line.findFirst({
        where: {
          name: updateLineDto.name,
          id: { not: id },
        },
      });

      if (existingByName) {
        throw new ConflictException(
          `Une ligne avec le nom "${updateLineDto.name}" existe déjà`,
        );
      }
    }

    // Vérifier l'unicité du numéro si modifié
    if (updateLineDto.number) {
      const existingByNumber = await this.prisma.line.findFirst({
        where: {
          number: updateLineDto.number,
          id: { not: id },
        },
      });

      if (existingByNumber) {
        throw new ConflictException(
          `Une ligne avec le numéro "${updateLineDto.number}" existe déjà`,
        );
      }
    }

    try {
      const line = await this.prisma.line.update({
        where: { id },
        data: updateLineDto,
        include: {
          buses: {
            where: { isActive: true },
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
          routes: {
            where: { isActive: true },
          },
        },
      });

      return line;
    } catch (error) {
      throw new ConflictException(
        'Erreur lors de la mise à jour de la ligne',
        error.message,
      );
    }
  }

  /**
   * Supprimer une ligne
   */
  async remove(
    id: number,
    user: CurrentUserData,
  ): Promise<{ message: string }> {
    // Vérifier que la ligne existe
    await this.findOne(id, false);

    // Vérifier qu'il n'y a pas de bus assignés à cette ligne
    const busesCount = await this.prisma.bus.count({
      where: { lineId: id },
    });

    if (busesCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer la ligne : ${busesCount} bus sont assignés à cette ligne`,
      );
    }

    // Vérifier qu'il n'y a pas de routes actives
    const routesCount = await this.prisma.route.count({
      where: { lineId: id, isActive: true },
    });

    if (routesCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer la ligne : ${routesCount} routes actives sont associées à cette ligne`,
      );
    }

    try {
      await this.prisma.line.delete({
        where: { id },
      });

      return {
        message: `Ligne avec l'ID ${id} supprimée avec succès`,
      };
    } catch (error) {
      throw new ConflictException(
        'Erreur lors de la suppression de la ligne',
        error.message,
      );
    }
  }

  /**
   * Activer/désactiver une ligne
   */
  async toggleActive(
    id: number,
    user: CurrentUserData,
  ): Promise<{ message: string; isActive: boolean }> {
    const line = await this.findOne(id, false);

    const updatedLine = await this.prisma.line.update({
      where: { id },
      data: { isActive: !line.isActive },
    });

    const action = updatedLine.isActive ? 'activée' : 'désactivée';

    return {
      message: `Ligne "${line.name}" ${action} avec succès`,
      isActive: updatedLine.isActive,
    };
  }

  /**
   * Récupérer les statistiques des lignes
   */
  async getStatistics(): Promise<{
    totalLines: number;
    activeLines: number;
    inactiveLines: number;
    linesWithBuses: number;
    linesWithRoutes: number;
    averageBusesPerLine: number;
    lineDetails: Array<{
      id: number;
      name: string;
      number: string;
      activeBusesCount: number;
      routesCount: number;
      isActive: boolean;
    }>;
  }> {
    const [totalLines, activeLines, linesWithBuses, linesWithRoutes, allLines] =
      await Promise.all([
        this.prisma.line.count(),
        this.prisma.line.count({ where: { isActive: true } }),
        this.prisma.line.count({
          where: {
            buses: {
              some: { isActive: true },
            },
          },
        }),
        this.prisma.line.count({
          where: {
            routes: {
              some: { isActive: true },
            },
          },
        }),
        this.prisma.line.findMany({
          select: {
            id: true,
            name: true,
            number: true,
            isActive: true,
            _count: {
              select: {
                buses: {
                  where: { isActive: true },
                },
                routes: {
                  where: { isActive: true },
                },
              },
            },
          },
          orderBy: { number: 'asc' },
        }),
      ]);

    const totalActiveBuses = allLines.reduce(
      (sum, line) => sum + line._count.buses,
      0,
    );

    const lineDetails = allLines.map((line) => ({
      id: line.id,
      name: line.name,
      number: line.number,
      activeBusesCount: line._count.buses,
      routesCount: line._count.routes,
      isActive: line.isActive,
    }));

    return {
      totalLines,
      activeLines,
      inactiveLines: totalLines - activeLines,
      linesWithBuses,
      linesWithRoutes,
      averageBusesPerLine:
        activeLines > 0
          ? Math.round((totalActiveBuses / activeLines) * 100) / 100
          : 0,
      lineDetails,
    };
  }

  /**
   * Rechercher des lignes
   */
  async search(query: string): Promise<Line[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException(
        'Le terme de recherche ne peut pas être vide',
      );
    }

    const searchTerm = query.trim();

    const lines = await this.prisma.line.findMany({
      where: {
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            number: {
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
        ],
      },
      include: {
        buses: {
          where: { isActive: true },
          select: {
            id: true,
            busNumber: true,
            isActive: true,
          },
        },
        routes: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { number: 'asc' }],
    });

    return lines as any;
  }
}
