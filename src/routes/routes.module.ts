import { Module } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [RoutesController],
  providers: [RoutesService, PrismaService],
  exports: [RoutesService],
})
export class RoutesModule {}
