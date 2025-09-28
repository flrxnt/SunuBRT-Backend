import { Module } from '@nestjs/common';
import { LinesService } from './lines.service';
import { LinesController } from './lines.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [LinesController],
  providers: [LinesService, PrismaService],
  exports: [LinesService],
})
export class LinesModule {}
