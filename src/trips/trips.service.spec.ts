import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service';
import { PrismaService } from '../database/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('TripsService', () => {
  let service: TripsService;
  let prismaService: PrismaService;

  const mockRoute = {
    id: 1,
    name: 'Route A',
    lineId: 1,
    isActive: true,
  };

  const mockBus = {
    id: 'bus-1',
    busNumber: 'BUS001',
    isActive: true,
  };

  const mockDriver = {
    id: 'driver-1',
    firstName: 'John',
    lastName: 'Doe',
    role: 'DRIVER',
  };

  const mockTrip = {
    id: 1,
    routeId: 1,
    busId: 'bus-1',
    driverId: 'driver-1',
    scheduledDeparture: new Date('2024-01-15T08:00:00Z'),
    scheduledArrival: new Date('2024-01-15T09:00:00Z'),
    actualDeparture: null,
    actualArrival: null,
    status: 'SCHEDULED',
    passengersCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    route: {
      findUnique: jest.fn(),
    },
    bus: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    trip: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createTripDto = {
      routeId: 1,
      busId: 'bus-1',
      driverId: 'driver-1',
      scheduledDeparture: new Date('2024-01-15T08:00:00Z'),
      scheduledArrival: new Date('2024-01-15T09:00:00Z'),
    };

    it('should successfully create a new trip', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(mockRoute);
      mockPrismaService.bus.findUnique.mockResolvedValue(mockBus);
      mockPrismaService.user.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.trip.findMany.mockResolvedValue([]);
      mockPrismaService.trip.create.mockResolvedValue(mockTrip);

      const result = await service.create(createTripDto, { id: 'admin-1' });

      expect(result).toBeDefined();
      expect(mockPrismaService.trip.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if route not found', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createTripDto, { id: 'admin-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if route is inactive', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue({
        ...mockRoute,
        isActive: false,
      });

      await expect(
        service.create(createTripDto, { id: 'admin-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if bus not found', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(mockRoute);
      mockPrismaService.bus.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createTripDto, { id: 'admin-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if bus is inactive', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(mockRoute);
      mockPrismaService.bus.findUnique.mockResolvedValue({
        ...mockBus,
        isActive: false,
      });

      await expect(
        service.create(createTripDto, { id: 'admin-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if driver not found', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(mockRoute);
      mockPrismaService.bus.findUnique.mockResolvedValue(mockBus);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createTripDto, { id: 'admin-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if bus has overlapping trip', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(mockRoute);
      mockPrismaService.bus.findUnique.mockResolvedValue(mockBus);
      mockPrismaService.user.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.trip.findMany.mockResolvedValue([mockTrip]);

      await expect(
        service.create(createTripDto, { id: 'admin-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all trips', async () => {
      mockPrismaService.trip.findMany.mockResolvedValue([mockTrip]);
      mockPrismaService.trip.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result).toHaveProperty('trips');
      expect(result).toHaveProperty('total', 1);
      expect(mockPrismaService.trip.findMany).toHaveBeenCalled();
    });

    it('should filter trips by routeId', async () => {
      mockPrismaService.trip.findMany.mockResolvedValue([mockTrip]);
      mockPrismaService.trip.count.mockResolvedValue(1);

      await service.findAll({ routeId: 1 });

      expect(mockPrismaService.trip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ routeId: 1 }),
        }),
      );
    });

    it('should filter trips by status', async () => {
      mockPrismaService.trip.findMany.mockResolvedValue([mockTrip]);
      mockPrismaService.trip.count.mockResolvedValue(1);

      await service.findAll({ status: 'SCHEDULED' });

      expect(mockPrismaService.trip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'SCHEDULED' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a trip by id', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue(mockTrip);

      const result = await service.findOne(1);

      expect(result).toEqual(mockTrip);
      expect(mockPrismaService.trip.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if trip not found', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateTripDto = {
      status: 'IN_PROGRESS',
      passengersCount: 25,
    };

    it('should successfully update a trip', async () => {
      const updatedTrip = { ...mockTrip, ...updateTripDto };
      mockPrismaService.trip.findUnique.mockResolvedValue(mockTrip);
      mockPrismaService.trip.update.mockResolvedValue(updatedTrip);

      const result = await service.update(1, updateTripDto, { id: 'admin-1' });

      expect(result.status).toBe('IN_PROGRESS');
      expect(mockPrismaService.trip.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if trip not found', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999, updateTripDto, { id: 'admin-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should successfully delete a trip', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue(mockTrip);
      mockPrismaService.trip.delete.mockResolvedValue(mockTrip);

      await service.remove(1);

      expect(mockPrismaService.trip.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if trip not found', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if trip is in progress', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue({
        ...mockTrip,
        status: 'IN_PROGRESS',
      });

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('startTrip', () => {
    it('should successfully start a trip', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue(mockTrip);
      mockPrismaService.trip.update.mockResolvedValue({
        ...mockTrip,
        status: 'IN_PROGRESS',
        actualDeparture: new Date(),
      });

      const result = await service.startTrip(1, { id: 'driver-1' });

      expect(result.status).toBe('IN_PROGRESS');
      expect(mockPrismaService.trip.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if trip not found', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue(null);

      await expect(service.startTrip(999, { id: 'driver-1' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if trip already started', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue({
        ...mockTrip,
        status: 'IN_PROGRESS',
      });

      await expect(service.startTrip(1, { id: 'driver-1' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('completeTrip', () => {
    it('should successfully complete a trip', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue({
        ...mockTrip,
        status: 'IN_PROGRESS',
        actualDeparture: new Date(),
      });
      mockPrismaService.trip.update.mockResolvedValue({
        ...mockTrip,
        status: 'COMPLETED',
        actualArrival: new Date(),
      });

      const result = await service.completeTrip(1, { id: 'driver-1' });

      expect(result.status).toBe('COMPLETED');
      expect(mockPrismaService.trip.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if trip not found', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue(null);

      await expect(
        service.completeTrip(999, { id: 'driver-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if trip not in progress', async () => {
      mockPrismaService.trip.findUnique.mockResolvedValue(mockTrip);

      await expect(service.completeTrip(1, { id: 'driver-1' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
