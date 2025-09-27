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
} from 'class-validator';

export class CreateBusDto {
  @ApiProperty({
    description: 'Numéro unique du bus',
    example: '001',
  })
  @IsString()
  @IsNotEmpty()
  busNumber: string;

  @ApiProperty({
    description: "Plaque d'immatriculation du bus",
    example: 'DK-1234-AB',
  })
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @ApiProperty({
    description: 'Capacité maximale de passagers',
    example: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(200)
  capacity: number;

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
  @IsOptional()
  @Min(1980)
  @Max(new Date().getFullYear() + 2)
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
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  driverId: string;
}
