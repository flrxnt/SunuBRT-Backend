import { Test, TestingModule } from '@nestjs/testing';
import { LinesService } from './lines.service';

describe('LinesService', () => {
  let service: LinesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LinesService],
    }).compile();

    service = module.get<LinesService>(LinesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
