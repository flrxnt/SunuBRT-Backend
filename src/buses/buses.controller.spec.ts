import { Test, TestingModule } from '@nestjs/testing';
import { BusesController } from './buses.controller';
import { BusesService } from './buses.service';

describe('BusesController', () => {
  let controller: BusesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusesController],
      providers: [BusesService],
    }).compile();

    controller = module.get<BusesController>(BusesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
