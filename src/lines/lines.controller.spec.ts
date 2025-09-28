import { Test, TestingModule } from '@nestjs/testing';
import { LinesController } from './lines.controller';
import { LinesService } from './lines.service';

describe('LinesController', () => {
  let controller: LinesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinesController],
      providers: [LinesService],
    }).compile();

    controller = module.get<LinesController>(LinesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
