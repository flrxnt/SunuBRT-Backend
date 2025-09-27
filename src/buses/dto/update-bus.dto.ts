import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsOptional,
  Min,
  Max,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class UpdateBusDto {
  @ApiProperty({
    description: 'Numéro unique du bus',
    example: '001',
    required: false,
  })
  @IsString()
  @IsOptional()
  busNumber?: string;

  @ApiProperty({
    description: "Plaque d'immatriculation du bus",
    example: 'DK-1234-AB',
    required: false,
  })
  @IsString()
  @IsOptional()
  licensePlate?: string;

  @ApiProperty({
    description: 'Capacité maximale de passagers',
    example: 50,
    minimum: 1,
    maximum: 200,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(200)
  @IsOptional()
  capacity?: number;

  @ApiProperty({
    description: 'Modèle du bus',
    example: 'Mercedes Citaro',
    required: false,
  })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({
    description: 'Année de fabrication du bus',
    example: 2020,
    required: false,
    minimum: 1980,
    maximum: new Date().getFullYear() + 2,
  })
  @IsInt()
  @Min(1980)
  @Max(new Date().getFullYear() + 2)
  @IsOptional()
  year?: number;

  @ApiProperty({
    description: 'ID de la ligne assignée au bus',
    example: 1,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  lineId?: number;

  @ApiProperty({
    description: 'ID du conducteur assigné au bus',
    example: 'clxxx-xxxx-xxxx-xxxx',
    required: false,
  })
  @IsString()
  @IsUUID()
  @IsOptional()
  driverId?: string;

  @ApiProperty({
    description: 'Statut actif du bus',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Nombre de passagers actuels',
    example: 25,
    minimum: 0,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  passengersCount?: number;
}
