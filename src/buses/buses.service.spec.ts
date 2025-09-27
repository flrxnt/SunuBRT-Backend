import { Test, TestingModule } from '@nestjs/testing';
import { BusesService } from './buses.service';

describe('BusesService', () => {
  let service: BusesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BusesService],
    }).compile();

    service = module.get<BusesService>(BusesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
