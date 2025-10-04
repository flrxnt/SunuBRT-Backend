import { Test, TestingModule } from '@nestjs/testing';
import { RoutesService } from './routes.service';
import { PrismaService } from '../database/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('RoutesService', () => {
  let service: RoutesService;
  let prismaService: PrismaService;

  const mockLine = {
    id: 1,
    name: 'Line 1',
    number: 'L1',
    isActive: true,
  };

  const mockRoute = {
    id: 1,
    name: 'Route A',
    lineId: 1,
    direction: 'OUTBOUND',
    distance: 15.5,
    estimatedDuration: 45,
    isActive: true,
    stops: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStop = {
    id: 1,
    name: 'Stop 1',
    latitude: 14.6937,
    longitude: -17.4441,
    order: 1,
  };

  const mockPrismaService = {
    line: {
      findUnique: jest.fn(),
    },
    route: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    routeStop: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    trip: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RoutesService>(RoutesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createRouteDto = {
      name: 'New Route',
      lineId: 1,
      direction: 'OUTBOUND',
      distance: 20,
      estimatedDuration: 60,
    };

    it('should successfully create a new route', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue(mockLine);
      mockPrismaService.route.create.mockResolvedValue(mockRoute);

      const result = await service.create(createRouteDto, { id: 'admin-1' });

      expect(result).toBeDefined();
      expect(mockPrismaService.route.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if line not found', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createRouteDto, { id: 'admin-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if line is inactive', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue({
        ...mockLine,
        isActive: false,
      });

      await expect(
        service.create(createRouteDto, { id: 'admin-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all routes', async () => {
      mockPrismaService.route.findMany.mockResolvedValue([mockRoute]);
      mockPrismaService.route.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result).toHaveProperty('routes');
      expect(result).toHaveProperty('total', 1);
      expect(mockPrismaService.route.findMany).toHaveBeenCalled();
    });

    it('should filter routes by lineId', async () => {
      mockPrismaService.route.findMany.mockResolvedValue([mockRoute]);
      mockPrismaService.route.count.mockResolvedValue(1);

      await service.findAll({ lineId: 1 });

      expect(mockPrismaService.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ lineId: 1 }),
        }),
      );
    });

    it('should filter active routes', async () => {
      mockPrismaService.route.findMany.mockResolvedValue([mockRoute]);
      mockPrismaService.route.count.mockResolvedValue(1);

      await service.findAll({ isActive: true });

      expect(mockPrismaService.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a route by id', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(mockRoute);

      const result = await service.findOne(1);

      expect(result).toEqual(mockRoute);
      expect(mockPrismaService.route.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if route not found', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateRouteDto = {
      distance: 25,
      estimatedDuration: 70,
    };

    it('should successfully update a route', async () => {
      const updatedRoute = { ...mockRoute, ...updateRouteDto };
      mockPrismaService.route.findUnique.mockResolvedValue(mockRoute);
      mockPrismaService.route.update.mockResolvedValue(updatedRoute);

      const result = await service.update(1, updateRouteDto, { id: 'admin-1' });

      expect(result.distance).toBe(25);
      expect(mockPrismaService.route.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if route not found', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999, updateRouteDto, { id: 'admin-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should successfully delete a route', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(mockRoute);
      mockPrismaService.trip.findMany.mockResolvedValue([]);
      mockPrismaService.route.delete.mockResolvedValue(mockRoute);

      await service.remove(1);

      expect(mockPrismaService.route.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if route not found', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if route has scheduled trips', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(mockRoute);
      mockPrismaService.trip.findMany.mockResolvedValue([{ id: 1 }]);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRouteStops', () => {
    it('should return route stops in order', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(mockRoute);
      mockPrismaService.routeStop.findMany.mockResolvedValue([mockStop]);

      const result = await service.getRouteStops(1);

      expect(result).toEqual([mockStop]);
      expect(mockPrismaService.routeStop.findMany).toHaveBeenCalledWith({
        where: { routeId: 1 },
        orderBy: { order: 'asc' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if route not found', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(null);

      await expect(service.getRouteStops(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addStopsToRoute', () => {
    const stopsData = [
      { stopId: 1, order: 1, estimatedTime: 5 },
      { stopId: 2, order: 2, estimatedTime: 10 },
    ];

    it('should successfully add stops to route', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(mockRoute);
      mockPrismaService.routeStop.createMany.mockResolvedValue({ count: 2 });

      const result = await service.addStopsToRoute(1, stopsData, {
        id: 'admin-1',
      });

      expect(result).toHaveProperty('message');
      expect(mockPrismaService.routeStop.createMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException if route not found', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(null);

      await expect(
        service.addStopsToRoute(999, stopsData, { id: 'admin-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
