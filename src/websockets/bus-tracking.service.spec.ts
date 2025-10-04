import { Test, TestingModule } from '@nestjs/testing';
import { BusTrackingService } from './bus-tracking.service';
import { PrismaService } from '../database/prisma.service';
import { WebsocketsGateway } from './websockets.gateway';

describe('BusTrackingService', () => {
  let service: BusTrackingService;
  let prismaService: PrismaService;
  let websocketsGateway: WebsocketsGateway;

  const mockBus = {
    id: 'bus-1',
    busNumber: 'BUS001',
    latitude: 14.6937,
    longitude: -17.4441,
    isActive: true,
  };

  const mockPrismaService = {
    bus: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    trip: {
      findFirst: jest.fn(),
    },
  };

  const mockWebsocketsGateway = {
    emitBusPositionUpdate: jest.fn(),
    emitToLine: jest.fn(),
    emitTrafficAlert: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusTrackingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WebsocketsGateway,
          useValue: mockWebsocketsGateway,
        },
      ],
    }).compile();

    service = module.get<BusTrackingService>(BusTrackingService);
    prismaService = module.get<PrismaService>(PrismaService);
    websocketsGateway = module.get<WebsocketsGateway>(WebsocketsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateBusPosition', () => {
    const positionUpdate = {
      busId: 'bus-1',
      latitude: 14.6937,
      longitude: -17.4441,
      speed: 50,
      heading: 90,
    };

    it('should successfully update bus position', async () => {
      mockPrismaService.bus.findUnique.mockResolvedValue(mockBus);
      mockPrismaService.bus.update.mockResolvedValue({
        ...mockBus,
        ...positionUpdate,
      });

      await service.updateBusPosition(positionUpdate);

      expect(mockPrismaService.bus.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bus-1' },
          data: expect.objectContaining({
            latitude: positionUpdate.latitude,
            longitude: positionUpdate.longitude,
          }),
        }),
      );
      expect(mockWebsocketsGateway.emitBusPositionUpdate).toHaveBeenCalled();
    });

    it('should handle missing bus gracefully', async () => {
      mockPrismaService.bus.findUnique.mockResolvedValue(null);

      await expect(service.updateBusPosition(positionUpdate)).resolves.not.toThrow();
    });
  });

  describe('updateBusStatus', () => {
    const statusUpdate = {
      busId: 'bus-1',
      isActive: true,
      passengersCount: 25,
      tripId: 1,
    };

    it('should successfully update bus status', async () => {
      mockPrismaService.bus.findUnique.mockResolvedValue(mockBus);
      mockPrismaService.bus.update.mockResolvedValue({
        ...mockBus,
        isActive: statusUpdate.isActive,
      });

      await service.updateBusStatus(statusUpdate);

      expect(mockPrismaService.bus.update).toHaveBeenCalled();
    });
  });

  describe('getBusPosition', () => {
    it('should return bus position', async () => {
      mockPrismaService.bus.findUnique.mockResolvedValue(mockBus);

      const result = await service.getBusPosition('bus-1');

      expect(result).toEqual(mockBus);
      expect(mockPrismaService.bus.findUnique).toHaveBeenCalledWith({
        where: { id: 'bus-1' },
        include: expect.any(Object),
      });
    });

    it('should return null for non-existent bus', async () => {
      mockPrismaService.bus.findUnique.mockResolvedValue(null);

      const result = await service.getBusPosition('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createTrafficAlert', () => {
    const alertData = {
      lineId: 1,
      busId: 'bus-1',
      type: 'CONGESTION' as const,
      severity: 'HIGH' as const,
      message: 'Heavy traffic detected',
      location: {
        latitude: 14.6937,
        longitude: -17.4441,
        description: 'Route de Ngor',
      },
    };

    it('should successfully create traffic alert', () => {
      service.createTrafficAlert(alertData);

      expect(mockWebsocketsGateway.emitTrafficAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          lineId: alertData.lineId,
          type: alertData.type,
          severity: alertData.severity,
        }),
      );
    });
  });

  describe('getTrafficAlerts', () => {
    it('should return traffic alerts for a line', () => {
      const alert = {
        lineId: 1,
        type: 'CONGESTION' as const,
        severity: 'HIGH' as const,
        message: 'Heavy traffic',
      };

      service.createTrafficAlert(alert);
      const result = service.getTrafficAlerts(1);

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('clearOldAlerts', () => {
    it('should clear expired alerts', () => {
      jest.useFakeTimers();
      
      const alert = {
        lineId: 1,
        type: 'CONGESTION' as const,
        severity: 'HIGH' as const,
        message: 'Heavy traffic',
        estimatedDuration: 30,
      };

      service.createTrafficAlert(alert);
      
      // Fast forward time
      jest.advanceTimersByTime(35 * 60 * 1000);
      
      service.clearOldAlerts();
      
      const alerts = service.getTrafficAlerts(1);
      expect(alerts.length).toBe(0);

      jest.useRealTimers();
    });
  });
});
