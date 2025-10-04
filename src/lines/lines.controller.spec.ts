import { Test, TestingModule } from '@nestjs/testing';
import { LinesController } from './lines.controller';
import { LinesService } from './lines.service';

describe('LinesController', () => {
  let controller: LinesController;
  let service: LinesService;

  const mockLine = {
    id: 1,
    name: 'Line 1',
    number: 'L1',
    color: '#FF0000',
    description: 'Main line',
    isActive: true,
  };

  const mockUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  const mockLinesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getLineStats: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinesController],
      providers: [
        {
          provide: LinesService,
          useValue: mockLinesService,
        },
      ],
    }).compile();

    controller = module.get<LinesController>(LinesController);
    service = module.get<LinesService>(LinesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new line', async () => {
      const createLineDto = {
        name: 'New Line',
        number: 'L2',
        color: '#00FF00',
        description: 'New line description',
        startLocation: 'Station A',
        endLocation: 'Station B',
      };

      mockLinesService.create.mockResolvedValue(mockLine);

      const result = await controller.create(createLineDto, mockUser as any);

      expect(result).toEqual(mockLine);
      expect(service.create).toHaveBeenCalledWith(createLineDto, mockUser);
    });
  });

  describe('findAll', () => {
    it('should return all lines', async () => {
      const paginatedResult = {
        lines: [mockLine],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockLinesService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({});

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('findOne', () => {
    it('should return a line by id', async () => {
      mockLinesService.findOne.mockResolvedValue(mockLine);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockLine);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a line', async () => {
      const updateLineDto = {
        color: '#0000FF',
        description: 'Updated description',
      };
      const updatedLine = { ...mockLine, ...updateLineDto };

      mockLinesService.update.mockResolvedValue(updatedLine);

      const result = await controller.update(1, updateLineDto, mockUser as any);

      expect(result).toEqual(updatedLine);
      expect(service.update).toHaveBeenCalledWith(1, updateLineDto, mockUser);
    });
  });

  describe('remove', () => {
    it('should remove a line', async () => {
      mockLinesService.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('getLineStats', () => {
    it('should return line statistics', async () => {
      const stats = {
        line: mockLine,
        stats: {
          totalRoutes: 2,
          totalBuses: 5,
          totalTrips: 10,
        },
      };

      mockLinesService.getLineStats.mockResolvedValue(stats);

      const result = await controller.getLineStats(1);

      expect(result).toEqual(stats);
      expect(service.getLineStats).toHaveBeenCalledWith(1);
    });
  });
});
