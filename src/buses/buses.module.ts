import { Module } from '@nestjs/common';
import { BusesService } from './buses.service';
import { BusesController } from './buses.controller';

@Module({
  controllers: [BusesController],
  providers: [BusesService],
})
export class BusesModule {}
