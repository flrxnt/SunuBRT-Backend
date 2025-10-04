import { Test, TestingModule } from '@nestjs/testing';
import { BusesService } from './buses.service';
import { PrismaService } from '../database/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

describe('BusesService', () => {
  let service: BusesService;
  let prismaService: PrismaService;

  const mockDriver = {
    id: 'driver-1',
    email: 'driver@example.com',
    role: Role.DRIVER,
    firstName: 'Driver',
    lastName: 'Test',
  };

  const mockLine = {
    id: 1,
    name: 'Line 1',
    number: 'L1',
    isActive: true,
  };

  const mockBus = {
    id: 'bus-1',
    busNumber: 'BUS001',
    licensePlate: 'DK-123-AA',
    capacity: 50,
    model: 'Mercedes Citaro',
    status: 'ACTIVE',
    isActive: true,
    driverId: 'driver-1',
    lineId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    line: {
      findUnique: jest.fn(),
    },
    bus: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BusesService>(BusesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createBusDto = {
      busNumber: 'BUS001',
      licensePlate: 'DK-123-AA',
      capacity: 50,
      model: 'Mercedes Citaro',
      driverId: 'driver-1',
      lineId: 1,
    };

    it('should successfully create a new bus', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.bus.findUnique
        .mockResolvedValueOnce(null) // driver check
        .mockResolvedValueOnce(null) // bus number check
        .mockResolvedValueOnce(null); // license plate check
      mockPrismaService.line.findUnique.mockResolvedValue(mockLine);
      mockPrismaService.bus.create.mockResolvedValue(mockBus);

      const result = await service.create(createBusDto, { id: 'admin-1' });

      expect(result).toEqual(mockBus);
      expect(mockPrismaService.bus.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if driver not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createBusDto, { id: 'admin-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not a driver', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockDriver,
        role: Role.USER,
      });

      await expect(
        service.create(createBusDto, { id: 'admin-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if driver already assigned', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.bus.findUnique.mockResolvedValue(mockBus);

      await expect(
        service.create(createBusDto, { id: 'admin-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if bus number already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.bus.findUnique
        .mockResolvedValueOnce(null) // driver check
        .mockResolvedValueOnce(mockBus); // bus number check

      await expect(
        service.create(createBusDto, { id: 'admin-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if license plate already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.bus.findUnique
        .mockResolvedValueOnce(null) // driver check
        .mockResolvedValueOnce(null) // bus number check
        .mockResolvedValueOnce(mockBus); // license plate check

      await expect(
        service.create(createBusDto, { id: 'admin-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if line not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.bus.findUnique
        .mockResolvedValueOnce(null) // driver check
        .mockResolvedValueOnce(null) // bus number check
        .mockResolvedValueOnce(null); // license plate check
      mockPrismaService.line.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createBusDto, { id: 'admin-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if line is not active', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.bus.findUnique
        .mockResolvedValueOnce(null) // driver check
        .mockResolvedValueOnce(null) // bus number check
        .mockResolvedValueOnce(null); // license plate check
      mockPrismaService.line.findUnique.mockResolvedValue({
        ...mockLine,
        isActive: false,
      });

      await expect(
        service.create(createBusDto, { id: 'admin-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all buses', async () => {
      mockPrismaService.bus.findMany.mockResolvedValue([mockBus]);

      const result = await service.findAll();

      expect(result).toEqual([mockBus]);
      expect(mockPrismaService.bus.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a bus by id', async () => {
      mockPrismaService.bus.findUnique.mockResolvedValue(mockBus);

      const result = await service.findOne('bus-1');

      expect(result).toEqual(mockBus);
      expect(mockPrismaService.bus.findUnique).toHaveBeenCalledWith({
        where: { id: 'bus-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if bus not found', async () => {
      mockPrismaService.bus.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateBusDto = {
      capacity: 60,
      status: 'MAINTENANCE',
    };

    it('should successfully update a bus', async () => {
      const updatedBus = { ...mockBus, ...updateBusDto };
      mockPrismaService.bus.findUnique.mockResolvedValue(mockBus);
      mockPrismaService.bus.update.mockResolvedValue(updatedBus);

      const result = await service.update('bus-1', updateBusDto);

      expect(result.capacity).toBe(60);
      expect(mockPrismaService.bus.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if bus not found', async () => {
      mockPrismaService.bus.findUnique.mockResolvedValue(null);

      await expect(service.update('999', updateBusDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should successfully delete a bus', async () => {
      mockPrismaService.bus.findUnique.mockResolvedValue(mockBus);
      mockPrismaService.bus.delete.mockResolvedValue(mockBus);

      await service.remove('bus-1');

      expect(mockPrismaService.bus.delete).toHaveBeenCalledWith({
        where: { id: 'bus-1' },
      });
    });

    it('should throw NotFoundException if bus not found', async () => {
      mockPrismaService.bus.findUnique.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });
});
