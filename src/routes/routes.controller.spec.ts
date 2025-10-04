import { Test, TestingModule } from '@nestjs/testing';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

describe('RoutesController', () => {
  let controller: RoutesController;
  let service: RoutesService;

  const mockRoute = {
    id: 1,
    name: 'Route A',
    lineId: 1,
    direction: 'OUTBOUND',
    distance: 15.5,
    estimatedDuration: 45,
    isActive: true,
  };

  const mockUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  const mockRoutesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getRouteStops: jest.fn(),
    addStopsToRoute: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoutesController],
      providers: [
        {
          provide: RoutesService,
          useValue: mockRoutesService,
        },
      ],
    }).compile();

    controller = module.get<RoutesController>(RoutesController);
    service = module.get<RoutesService>(RoutesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new route', async () => {
      const createRouteDto = {
        name: 'New Route',
        lineId: 1,
        direction: 'OUTBOUND',
        distance: 20,
        estimatedDuration: 60,
      };

      mockRoutesService.create.mockResolvedValue(mockRoute);

      const result = await controller.create(createRouteDto, mockUser as any);

      expect(result).toEqual(mockRoute);
      expect(service.create).toHaveBeenCalledWith(createRouteDto, mockUser);
    });
  });

  describe('findAll', () => {
    it('should return all routes', async () => {
      const paginatedResult = {
        routes: [mockRoute],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockRoutesService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({});

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('findOne', () => {
    it('should return a route by id', async () => {
      mockRoutesService.findOne.mockResolvedValue(mockRoute);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockRoute);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a route', async () => {
      const updateRouteDto = {
        distance: 25,
        estimatedDuration: 70,
      };
      const updatedRoute = { ...mockRoute, ...updateRouteDto };

      mockRoutesService.update.mockResolvedValue(updatedRoute);

      const result = await controller.update(1, updateRouteDto, mockUser as any);

      expect(result).toEqual(updatedRoute);
      expect(service.update).toHaveBeenCalledWith(1, updateRouteDto, mockUser);
    });
  });

  describe('remove', () => {
    it('should remove a route', async () => {
      mockRoutesService.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('getRouteStops', () => {
    it('should return route stops', async () => {
      const stops = [
        { id: 1, name: 'Stop 1', order: 1 },
        { id: 2, name: 'Stop 2', order: 2 },
      ];

      mockRoutesService.getRouteStops.mockResolvedValue(stops);

      const result = await controller.getRouteStops(1);

      expect(result).toEqual(stops);
      expect(service.getRouteStops).toHaveBeenCalledWith(1);
    });
  });
});
