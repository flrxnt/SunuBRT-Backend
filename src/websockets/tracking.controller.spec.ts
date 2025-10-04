import { Test, TestingModule } from '@nestjs/testing';
import { TrackingController } from './tracking.controller';
import { BusTrackingService } from './bus-tracking.service';

describe('TrackingController', () => {
  let controller: TrackingController;
  let service: BusTrackingService;

  const mockBusPosition = {
    busId: 'bus-1',
    latitude: 14.6937,
    longitude: -17.4441,
    speed: 50,
    heading: 90,
    timestamp: new Date(),
  };

  const mockBusTrackingService = {
    updateBusPosition: jest.fn(),
    getBusPosition: jest.fn(),
    getActiveBuses: jest.fn(),
    getTrafficAlerts: jest.fn(),
    createTrafficAlert: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackingController],
      providers: [
        {
          provide: BusTrackingService,
          useValue: mockBusTrackingService,
        },
      ],
    }).compile();

    controller = module.get<TrackingController>(TrackingController);
    service = module.get<BusTrackingService>(BusTrackingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateBusPosition', () => {
    it('should update bus position', async () => {
      mockBusTrackingService.updateBusPosition.mockResolvedValue(undefined);

      await controller.updateBusPosition('bus-1', mockBusPosition, {} as any);

      expect(service.updateBusPosition).toHaveBeenCalledWith(
        expect.objectContaining({
          busId: 'bus-1',
          latitude: mockBusPosition.latitude,
          longitude: mockBusPosition.longitude,
        }),
      );
    });
  });

  describe('getBusPosition', () => {
    it('should return bus position', async () => {
      const busData = {
        id: 'bus-1',
        ...mockBusPosition,
      };

      mockBusTrackingService.getBusPosition.mockResolvedValue(busData);

      const result = await controller.getBusPosition('bus-1');

      expect(result).toEqual(busData);
      expect(service.getBusPosition).toHaveBeenCalledWith('bus-1');
    });
  });

  describe('getTrafficAlerts', () => {
    it('should return traffic alerts for a line', async () => {
      const alerts = [
        {
          lineId: 1,
          type: 'CONGESTION',
          severity: 'HIGH',
          message: 'Heavy traffic',
        },
      ];

      mockBusTrackingService.getTrafficAlerts.mockReturnValue(alerts);

      const result = await controller.getTrafficAlerts(1);

      expect(result).toEqual(alerts);
      expect(service.getTrafficAlerts).toHaveBeenCalledWith(1);
    });
  });
});
