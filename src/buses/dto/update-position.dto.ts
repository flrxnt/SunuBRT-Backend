import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

export class UpdatePositionDto {
  @ApiProperty({
    description: 'Latitude de la position du bus',
    example: 14.6937,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude de la position du bus',
    example: -17.4441,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: 'Altitude du bus (en mètres)',
    example: 25.5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  altitude?: number;

  @ApiProperty({
    description: 'Vitesse du bus (en km/h)',
    example: 45.2,
    minimum: 0,
    maximum: 200,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(200)
  speed?: number;

  @ApiProperty({
    description: 'Direction du bus (en degrés, 0-360)',
    example: 180.5,
    minimum: 0,
    maximum: 360,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(360)
  heading?: number;

  @ApiProperty({
    description: 'Timestamp de la position (ISO string)',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  timestamp?: string;
}
