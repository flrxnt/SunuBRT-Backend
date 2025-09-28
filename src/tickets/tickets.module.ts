import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { PrismaService } from '../database/prisma.service';
import { WebsocketsModule } from '../websockets/websockets.module';

@Module({
  imports: [WebsocketsModule],
  controllers: [TicketsController],
  providers: [TicketsService, PrismaService],
  exports: [TicketsService],
})
export class TicketsModule {}
