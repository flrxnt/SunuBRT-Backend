import { Module } from '@nestjs/common';
import { StopsService } from './stops.service';
import { StopsController } from './stops.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [StopsController],
  providers: [StopsService, PrismaService],
  exports: [StopsService],
})
export class StopsModule {}
