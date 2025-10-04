import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to database', async () => {
      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockResolvedValue(undefined);
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ Database connected successfully',
      );

      connectSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database', async () => {
      const disconnectSpy = jest
        .spyOn(service, '$disconnect')
        .mockResolvedValue(undefined);
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('❌ Database disconnected');

      disconnectSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('cleanDatabase', () => {
    it('should return early in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = await service.cleanDatabase();

      expect(result).toBeUndefined();

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should attempt to clean database in non-production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      // This test just verifies the method exists and can be called
      // Actual database cleaning is tested in integration tests
      const result = await service.cleanDatabase();

      expect(result).toBeDefined();

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });
});
