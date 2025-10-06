import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsPositive,
  IsNumber,
  IsArray,
  Min,
  Max,
  Length,
} from 'class-validator';

export class CreateStopDto {
  @ApiProperty({
    description: 'Nom de l\'arrêt',
    example: 'République',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @ApiProperty({
    description: 'Adresse de l\'arrêt',
    example: 'Place de la République, 75011 Paris',
    required: false,
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @Length(0, 255)
  address?: string;

  @ApiProperty({
    description: 'Latitude de l\'arrêt',
    example: 48.8676,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude de l\'arrêt',
    example: 2.3631,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: 'Zone géographique de l\'arrêt',
    example: 'Zone 1',
    required: false,
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @Length(0, 50)
  zone?: string;

  @ApiProperty({
    description: 'Services disponibles à l\'arrêt (wifi, accessible, shelter, bench, lighting)',
    example: '["wifi", "accessible", "shelter"]',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  services?: string[];

  @ApiProperty({
    description: 'URL de la photo de l\'arrêt',
    example: 'https://example.com/stop-photo.jpg',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  photo?: string;

  @ApiProperty({
    description: 'Statut actif/inactif de l\'arrêt',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiProperty({
    description: 'IDs des lignes qui passent par cet arrêt',
    example: [1, 2, 3],
    required: false,
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @IsOptional()
  lineIds?: number[];
}
