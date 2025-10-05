import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { Role } from '@prisma/client';

@Injectable()
export class BusesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBusDto: CreateBusDto, user: any) {
    // Vérifier que le conducteur existe et a le bon rôle
    const driver = await this.prisma.user.findUnique({
      where: { id: createBusDto.driverId },
    });

    if (!driver) {
      throw new NotFoundException('Conducteur non trouvé');
    }

    if (driver.role !== Role.DRIVER) {
      throw new BadRequestException("L'utilisateur doit avoir le rôle DRIVER");
    }

    // Vérifier que le conducteur n'est pas déjà assigné à un bus
    const existingBus = await this.prisma.bus.findUnique({
      where: { driverId: createBusDto.driverId },
    });

    if (existingBus) {
      throw new ConflictException('Ce conducteur est déjà assigné à un bus');
    }

    // Vérifier que le numéro de bus et la plaque sont uniques
    const existingBusNumber = await this.prisma.bus.findUnique({
      where: { busNumber: createBusDto.busNumber },
    });

    if (existingBusNumber) {
      throw new ConflictException('Ce numéro de bus existe déjà');
    }

    const existingLicensePlate = await this.prisma.bus.findUnique({
      where: { licensePlate: createBusDto.licensePlate },
    });

    if (existingLicensePlate) {
      throw new ConflictException("Cette plaque d'immatriculation existe déjà");
    }

    // Vérifier que la ligne existe si fournie
    if (createBusDto.lineId) {
      const line = await this.prisma.line.findUnique({
        where: { id: createBusDto.lineId },
      });

      if (!line) {
        throw new NotFoundException('Ligne non trouvée');
      }

      if (!line.isActive) {
        throw new BadRequestException("La ligne n'est pas active");
      }
    }

    return this.prisma.bus.create({
      data: createBusDto,
      include: {
        line: {
          select: {
            id: true,
            name: true,
            number: true,
            color: true,
          },
        },
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
    });
  }

  async findAll(query?: { lineId?: number; isActive?: boolean }) {
    const where: any = {};

    if (query?.lineId) {
      where.lineId = query.lineId;
    }

    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return this.prisma.bus.findMany({
      where,
      include: {
        line: {
          select: {
            id: true,
            name: true,
            number: true,
            color: true,
          },
        },
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
      orderBy: [{ lineId: 'asc' }, { busNumber: 'asc' }],
    });
  }

  async findOne(id: string) {
    const bus = await this.prisma.bus.findUnique({
      where: { id },
      include: {
        line: {
          select: {
            id: true,
            name: true,
            number: true,
            color: true,
            description: true,
          },
        },
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
        trips: {
          where: {
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          },
          include: {
            route: {
              select: {
                id: true,
                name: true,
                startPoint: true,
                endPoint: true,
              },
            },
          },
          orderBy: { startTime: 'asc' },
          take: 5,
        },
      },
    });

    if (!bus) {
      throw new NotFoundException('Bus non trouvé');
    }

    return bus;
  }

  async findByLine(lineId: number) {
    // Vérifier que la ligne existe
    const line = await this.prisma.line.findUnique({
      where: { id: lineId },
    });

    if (!line) {
      throw new NotFoundException('Ligne non trouvée');
    }

    return this.prisma.bus.findMany({
      where: {
        lineId,
        isActive: true,
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        currentPosition: true,
      },
      orderBy: { busNumber: 'asc' },
    });
  }

  async findByDriverId(driverId: string) {
    const bus = await this.prisma.bus.findUnique({
      where: { driverId },
      include: {
        line: {
          select: {
            id: true,
            name: true,
            number: true,
            color: true,
            description: true,
          },
        },
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
        trips: {
          where: {
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          },
          include: {
            route: {
              select: {
                id: true,
                name: true,
                startPoint: true,
                endPoint: true,
              },
            },
          },
          orderBy: { startTime: 'asc' },
          take: 5,
        },
      },
    });

    if (!bus) {
      throw new NotFoundException('Aucun bus assigné à ce conducteur');
    }

    return bus;
  }

  async update(id: string, updateBusDto: UpdateBusDto, user: any) {
    const existingBus = await this.prisma.bus.findUnique({
      where: { id },
    });

    if (!existingBus) {
      throw new NotFoundException('Bus non trouvé');
    }

    // Vérifications des contraintes d'unicité si les champs sont modifiés
    if (
      updateBusDto.busNumber &&
      updateBusDto.busNumber !== existingBus.busNumber
    ) {
      const existingBusNumber = await this.prisma.bus.findUnique({
        where: { busNumber: updateBusDto.busNumber },
      });

      if (existingBusNumber) {
        throw new ConflictException('Ce numéro de bus existe déjà');
      }
    }

    if (
      updateBusDto.licensePlate &&
      updateBusDto.licensePlate !== existingBus.licensePlate
    ) {
      const existingLicensePlate = await this.prisma.bus.findUnique({
        where: { licensePlate: updateBusDto.licensePlate },
      });

      if (existingLicensePlate) {
        throw new ConflictException(
          "Cette plaque d'immatriculation existe déjà",
        );
      }
    }

    if (
      updateBusDto.driverId &&
      updateBusDto.driverId !== existingBus.driverId
    ) {
      const driver = await this.prisma.user.findUnique({
        where: { id: updateBusDto.driverId },
      });

      if (!driver) {
        throw new NotFoundException('Conducteur non trouvé');
      }

      if (driver.role !== Role.DRIVER) {
        throw new BadRequestException(
          "L'utilisateur doit avoir le rôle DRIVER",
        );
      }

      const existingDriverBus = await this.prisma.bus.findUnique({
        where: { driverId: updateBusDto.driverId },
      });

      if (existingDriverBus && existingDriverBus.id !== id) {
        throw new ConflictException(
          'Ce conducteur est déjà assigné à un autre bus',
        );
      }
    }

    // Vérifier que la ligne existe si fournie
    if (updateBusDto.lineId) {
      const line = await this.prisma.line.findUnique({
        where: { id: updateBusDto.lineId },
      });

      if (!line) {
        throw new NotFoundException('Ligne non trouvée');
      }
    }

    // Validation du nombre de passagers
    if (
      updateBusDto.passengersCount !== undefined &&
      updateBusDto.capacity !== undefined
    ) {
      if (updateBusDto.passengersCount > updateBusDto.capacity) {
        throw new BadRequestException(
          'Le nombre de passagers ne peut pas dépasser la capacité',
        );
      }
    } else if (updateBusDto.passengersCount !== undefined) {
      if (updateBusDto.passengersCount > existingBus.capacity) {
        throw new BadRequestException(
          'Le nombre de passagers ne peut pas dépasser la capacité',
        );
      }
    } else if (updateBusDto.capacity !== undefined) {
      if (existingBus.passengersCount > updateBusDto.capacity) {
        throw new BadRequestException(
          'La nouvelle capacité ne peut pas être inférieure au nombre actuel de passagers',
        );
      }
    }

    return this.prisma.bus.update({
      where: { id },
      data: updateBusDto,
      include: {
        line: {
          select: {
            id: true,
            name: true,
            number: true,
            color: true,
          },
        },
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
    });
  }

  async updatePosition(
    id: string,
    updatePositionDto: UpdatePositionDto,
    user: any,
  ) {
    const bus = await this.prisma.bus.findUnique({
      where: { id },
      include: { driver: true },
    });

    if (!bus) {
      throw new NotFoundException('Bus non trouvé');
    }

    // Vérifier que l'utilisateur est soit admin, soit le conducteur du bus
    if (user.role !== Role.ADMIN && user.id !== bus.driverId) {
      throw new ForbiddenException(
        'Vous ne pouvez mettre à jour que la position de votre propre bus',
      );
    }

    if (!bus.isActive) {
      throw new BadRequestException(
        "Impossible de mettre à jour la position d'un bus inactif",
      );
    }

    const positionData = {
      ...updatePositionDto,
      timestamp: updatePositionDto.timestamp
        ? new Date(updatePositionDto.timestamp)
        : new Date(),
    };

    // Upsert de la position (créer si n'existe pas, mettre à jour sinon)
    const position = await this.prisma.position.upsert({
      where: { busId: id },
      create: {
        busId: id,
        ...positionData,
      },
      update: positionData,
    });

    return {
      message: 'Position mise à jour avec succès',
      position,
      bus: {
        id: bus.id,
        busNumber: bus.busNumber,
        licensePlate: bus.licensePlate,
      },
    };
  }

  async remove(id: string, user: any) {
    const bus = await this.prisma.bus.findUnique({
      where: { id },
      include: {
        trips: {
          where: {
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          },
        },
      },
    });

    if (!bus) {
      throw new NotFoundException('Bus non trouvé');
    }

    // Vérifier s'il y a des trajets actifs
    if (bus.trips.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer un bus avec des trajets actifs',
      );
    }

    // Supprimer la position associée d'abord (cascade devrait le faire mais soyons explicites)
    await this.prisma.position.deleteMany({
      where: { busId: id },
    });

    await this.prisma.bus.delete({
      where: { id },
    });

    return {
      message: 'Bus supprimé avec succès',
      deletedBus: {
        id: bus.id,
        busNumber: bus.busNumber,
        licensePlate: bus.licensePlate,
      },
    };
  }

  async getBusStatistics() {
    const [
      totalBuses,
      activeBuses,
      inactiveBuses,
      busesWithoutLine,
      busesWithPosition,
    ] = await Promise.all([
      this.prisma.bus.count(),
      this.prisma.bus.count({ where: { isActive: true } }),
      this.prisma.bus.count({ where: { isActive: false } }),
      this.prisma.bus.count({ where: { lineId: null } }),
      this.prisma.bus.count({
        where: {
          currentPosition: {
            isNot: null,
          },
        },
      }),
    ]);

    const busesPerLine = await this.prisma.line.findMany({
      select: {
        id: true,
        name: true,
        number: true,
        _count: {
          select: {
            buses: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: { number: 'asc' },
    });

    return {
      totalBuses,
      activeBuses,
      inactiveBuses,
      busesWithoutLine,
      busesWithPosition,
      busesPerLine: busesPerLine.map((line) => ({
        lineId: line.id,
        lineName: line.name,
        lineNumber: line.number,
        activeBusesCount: line._count.buses,
      })),
    };
  }
}
