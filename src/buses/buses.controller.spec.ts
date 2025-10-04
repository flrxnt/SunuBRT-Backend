import { Test, TestingModule } from '@nestjs/testing';
import { BusesController } from './buses.controller';
import { BusesService } from './buses.service';

describe('BusesController', () => {
  let controller: BusesController;
  let service: BusesService;

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
  };

  const mockUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  const mockBusesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updatePosition: jest.fn(),
    getPosition: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusesController],
      providers: [
        {
          provide: BusesService,
          useValue: mockBusesService,
        },
      ],
    }).compile();

    controller = module.get<BusesController>(BusesController);
    service = module.get<BusesService>(BusesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new bus', async () => {
      const createBusDto = {
        busNumber: 'BUS001',
        licensePlate: 'DK-123-AA',
        capacity: 50,
        model: 'Mercedes Citaro',
        driverId: 'driver-1',
        lineId: 1,
      };

      mockBusesService.create.mockResolvedValue(mockBus);

      const result = await controller.create(createBusDto, mockUser as any);

      expect(result).toEqual(mockBus);
      expect(service.create).toHaveBeenCalledWith(createBusDto, mockUser);
    });
  });

  describe('findAll', () => {
    it('should return all buses', async () => {
      mockBusesService.findAll.mockResolvedValue([mockBus]);

      const result = await controller.findAll();

      expect(result).toEqual([mockBus]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a bus by id', async () => {
      mockBusesService.findOne.mockResolvedValue(mockBus);

      const result = await controller.findOne('bus-1');

      expect(result).toEqual(mockBus);
      expect(service.findOne).toHaveBeenCalledWith('bus-1');
    });
  });

  describe('update', () => {
    it('should update a bus', async () => {
      const updateBusDto = {
        capacity: 60,
        status: 'MAINTENANCE',
      };
      const updatedBus = { ...mockBus, ...updateBusDto };

      mockBusesService.update.mockResolvedValue(updatedBus);

      const result = await controller.update('bus-1', updateBusDto, mockUser as any);

      expect(result).toEqual(updatedBus);
      expect(service.update).toHaveBeenCalledWith('bus-1', updateBusDto, mockUser);
    });
  });

  describe('remove', () => {
    it('should remove a bus', async () => {
      mockBusesService.remove.mockResolvedValue(undefined);

      await controller.remove('bus-1', mockUser as any);

      expect(service.remove).toHaveBeenCalledWith('bus-1', mockUser);
    });
  });
});
