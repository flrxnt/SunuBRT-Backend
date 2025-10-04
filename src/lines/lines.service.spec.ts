import { Test, TestingModule } from '@nestjs/testing';
import { LinesService } from './lines.service';
import { PrismaService } from '../database/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('LinesService', () => {
  let service: LinesService;
  let prismaService: PrismaService;

  const mockLine = {
    id: 1,
    name: 'Line 1',
    number: 'L1',
    color: '#FF0000',
    description: 'Main line',
    isActive: true,
    startLocation: 'Station A',
    endLocation: 'Station B',
    operatingHours: '06:00-22:00',
    frequency: 15,
    estimatedDuration: 45,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    line: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    route: {
      findMany: jest.fn(),
    },
    trip: {
      findMany: jest.fn(),
    },
    bus: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LinesService>(LinesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createLineDto = {
      name: 'New Line',
      number: 'L2',
      color: '#00FF00',
      description: 'New line description',
      startLocation: 'Station C',
      endLocation: 'Station D',
    };

    it('should successfully create a new line', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue(null);
      mockPrismaService.line.create.mockResolvedValue(mockLine);

      const result = await service.create(createLineDto, { id: 'admin-1' });

      expect(result).toBeDefined();
      expect(mockPrismaService.line.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if line name already exists', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue(mockLine);

      await expect(
        service.create(createLineDto, { id: 'admin-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if line number already exists', async () => {
      mockPrismaService.line.findUnique
        .mockResolvedValueOnce(null) // name check
        .mockResolvedValueOnce(mockLine); // number check

      await expect(
        service.create(createLineDto, { id: 'admin-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all lines', async () => {
      mockPrismaService.line.findMany.mockResolvedValue([mockLine]);
      mockPrismaService.line.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result).toHaveProperty('lines');
      expect(result).toHaveProperty('total', 1);
      expect(mockPrismaService.line.findMany).toHaveBeenCalled();
    });

    it('should filter active lines', async () => {
      mockPrismaService.line.findMany.mockResolvedValue([mockLine]);
      mockPrismaService.line.count.mockResolvedValue(1);

      await service.findAll({ isActive: true });

      expect(mockPrismaService.line.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should search lines by name', async () => {
      mockPrismaService.line.findMany.mockResolvedValue([mockLine]);
      mockPrismaService.line.count.mockResolvedValue(1);

      await service.findAll({ search: 'Line' });

      expect(mockPrismaService.line.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a line by id', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue(mockLine);

      const result = await service.findOne(1);

      expect(result).toEqual(mockLine);
      expect(mockPrismaService.line.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if line not found', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateLineDto = {
      color: '#0000FF',
      frequency: 20,
    };

    it('should successfully update a line', async () => {
      const updatedLine = { ...mockLine, ...updateLineDto };
      mockPrismaService.line.findUnique.mockResolvedValue(mockLine);
      mockPrismaService.line.update.mockResolvedValue(updatedLine);

      const result = await service.update(1, updateLineDto, { id: 'admin-1' });

      expect(result.color).toBe('#0000FF');
      expect(mockPrismaService.line.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if line not found', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999, updateLineDto, { id: 'admin-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating to existing name', async () => {
      mockPrismaService.line.findUnique
        .mockResolvedValueOnce(mockLine) // existing line check
        .mockResolvedValueOnce({ ...mockLine, id: 2 }); // name conflict check

      await expect(
        service.update(1, { name: 'Existing Line' }, { id: 'admin-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should successfully delete a line', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue(mockLine);
      mockPrismaService.route.findMany.mockResolvedValue([]);
      mockPrismaService.trip.findMany.mockResolvedValue([]);
      mockPrismaService.bus.findMany.mockResolvedValue([]);
      mockPrismaService.line.delete.mockResolvedValue(mockLine);

      await service.remove(1);

      expect(mockPrismaService.line.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if line not found', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if line has active routes', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue(mockLine);
      mockPrismaService.route.findMany.mockResolvedValue([{ id: 1 }]);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if line has scheduled trips', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue(mockLine);
      mockPrismaService.route.findMany.mockResolvedValue([]);
      mockPrismaService.trip.findMany.mockResolvedValue([{ id: 1 }]);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if line has assigned buses', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue(mockLine);
      mockPrismaService.route.findMany.mockResolvedValue([]);
      mockPrismaService.trip.findMany.mockResolvedValue([]);
      mockPrismaService.bus.findMany.mockResolvedValue([{ id: 'bus-1' }]);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLineStats', () => {
    it('should return line statistics', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue(mockLine);
      mockPrismaService.route.findMany.mockResolvedValue([{ id: 1 }]);
      mockPrismaService.bus.findMany.mockResolvedValue([{ id: 'bus-1' }]);
      mockPrismaService.trip.findMany.mockResolvedValue([{ id: 1 }]);

      const result = await service.getLineStats(1);

      expect(result).toHaveProperty('line');
      expect(result).toHaveProperty('stats');
    });

    it('should throw NotFoundException if line not found', async () => {
      mockPrismaService.line.findUnique.mockResolvedValue(null);

      await expect(service.getLineStats(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
