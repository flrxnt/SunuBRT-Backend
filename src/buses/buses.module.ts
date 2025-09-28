import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BusesService } from './buses.service';
import { BusesController } from './buses.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'your-super-secret-jwt-key-change-in-production',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [BusesController],
  providers: [BusesService, PrismaService],
  exports: [BusesService],
})
export class BusesModule {}
