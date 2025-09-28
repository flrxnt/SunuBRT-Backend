import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsPositive,
  IsNumber,
  IsDateString,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { TripStatus } from '@prisma/client';

export class CreateTripDto {
  @ApiProperty({
    description: 'ID de la route pour ce trajet',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  routeId: number;

  @ApiProperty({
    description: 'ID du bus assigné à ce trajet',
    example: 'clxxx-xxxx-xxxx-xxxx',
  })
  @IsString()
  @IsNotEmpty()
  busId: string;

  @ApiProperty({
    description: 'Heure de départ du trajet (ISO 8601)',
    example: '2024-01-15T08:00:00Z',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: "Heure d'arrivée prévue du trajet (ISO 8601, optionnel)",
    example: '2024-01-15T09:30:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({
    description: 'Prix du ticket pour ce trajet en FCFA',
    example: 500,
    minimum: 100,
    maximum: 5000,
  })
  @IsNumber()
  @Min(100)
  @Max(5000)
  price: number;

  @ApiProperty({
    description: 'Nombre de places disponibles pour ce trajet',
    example: 45,
    minimum: 1,
  })
  @IsInt()
  @IsPositive()
  @Min(1)
  availableSeats: number;

  @ApiProperty({
    description: 'Statut du trajet',
    example: TripStatus.SCHEDULED,
    enum: TripStatus,
    default: TripStatus.SCHEDULED,
    required: false,
  })
  @IsEnum(TripStatus)
  @IsOptional()
  status?: TripStatus = TripStatus.SCHEDULED;
}
