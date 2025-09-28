import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { PrismaService } from '../database/prisma.service';
import { WebsocketsModule } from '../websockets/websockets.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [WebsocketsModule, PaymentsModule],
  controllers: [TicketsController],
  providers: [TicketsService, PrismaService],
  exports: [TicketsService],
})
export class TicketsModule {}
