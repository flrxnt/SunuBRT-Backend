import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WebsocketsGateway } from './websockets.gateway';
import { BusTrackingService } from './bus-tracking.service';
import { TrackingController } from './tracking.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TrackingController],
  providers: [WebsocketsGateway, BusTrackingService, PrismaService],
  exports: [WebsocketsGateway, BusTrackingService],
})
export class WebsocketsModule {}
