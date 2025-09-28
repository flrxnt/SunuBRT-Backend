import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaService } from '../database/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { WebsocketsModule } from '../websockets/websockets.module';

@Module({
  imports: [ConfigModule, WebsocketsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
