import { Test, TestingModule } from '@nestjs/testing';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

describe('TripsController', () => {
  let controller: TripsController;
  let service: TripsService;

  const mockTrip = {
    id: 1,
    routeId: 1,
    busId: 'bus-1',
    driverId: 'driver-1',
    scheduledDeparture: new Date('2024-01-15T08:00:00Z'),
    scheduledArrival: new Date('2024-01-15T09:00:00Z'),
    status: 'SCHEDULED',
  };

  const mockUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  const mockTripsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    startTrip: jest.fn(),
    completeTrip: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripsController],
      providers: [
        {
          provide: TripsService,
          useValue: mockTripsService,
        },
      ],
    }).compile();

    controller = module.get<TripsController>(TripsController);
    service = module.get<TripsService>(TripsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new trip', async () => {
      const createTripDto = {
        routeId: 1,
        busId: 'bus-1',
        driverId: 'driver-1',
        scheduledDeparture: new Date('2024-01-15T08:00:00Z'),
        scheduledArrival: new Date('2024-01-15T09:00:00Z'),
      };

      mockTripsService.create.mockResolvedValue(mockTrip);

      const result = await controller.create(createTripDto, mockUser as any);

      expect(result).toEqual(mockTrip);
      expect(service.create).toHaveBeenCalledWith(createTripDto, mockUser);
    });
  });

  describe('findAll', () => {
    it('should return all trips', async () => {
      const paginatedResult = {
        trips: [mockTrip],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockTripsService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({});

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('findOne', () => {
    it('should return a trip by id', async () => {
      mockTripsService.findOne.mockResolvedValue(mockTrip);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockTrip);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a trip', async () => {
      const updateTripDto = {
        status: 'IN_PROGRESS',
        passengersCount: 25,
      };
      const updatedTrip = { ...mockTrip, ...updateTripDto };

      mockTripsService.update.mockResolvedValue(updatedTrip);

      const result = await controller.update(1, updateTripDto, mockUser as any);

      expect(result).toEqual(updatedTrip);
      expect(service.update).toHaveBeenCalledWith(1, updateTripDto, mockUser);
    });
  });

  describe('remove', () => {
    it('should remove a trip', async () => {
      mockTripsService.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('startTrip', () => {
    it('should start a trip', async () => {
      const startedTrip = { ...mockTrip, status: 'IN_PROGRESS' };

      mockTripsService.startTrip.mockResolvedValue(startedTrip);

      const result = await controller.startTrip(1, mockUser as any);

      expect(result).toEqual(startedTrip);
      expect(service.startTrip).toHaveBeenCalledWith(1, mockUser);
    });
  });

  describe('completeTrip', () => {
    it('should complete a trip', async () => {
      const completedTrip = { ...mockTrip, status: 'COMPLETED' };

      mockTripsService.completeTrip.mockResolvedValue(completedTrip);

      const result = await controller.completeTrip(1, mockUser as any);

      expect(result).toEqual(completedTrip);
      expect(service.completeTrip).toHaveBeenCalledWith(1, mockUser);
    });
  });
});
