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
  ValidateNested,
  ArrayMinSize,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RoutePointDto {
  @ApiProperty({
    description: 'Latitude du point',
    example: 14.6937,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude du point',
    example: -17.4441,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: 'Élévation du point (optionnel)',
    example: 25.5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  elevation?: number;

  @ApiProperty({
    description: 'Nom optionnel du point (ex: "Arrêt Central")',
    example: 'Arrêt Central',
    required: false,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @Length(0, 100)
  name?: string;
}

export class CreateRouteDto {
  @ApiProperty({
    description: 'Nom de la route',
    example: 'Dakar Centre - Guédiawaye',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  name: string;

  @ApiProperty({
    description: 'ID de la ligne à laquelle appartient cette route',
    example: 1,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  lineId?: number;

  @ApiProperty({
    description: 'Description de la route',
    example: 'Route principale reliant le centre-ville de Dakar à Guédiawaye',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @ApiProperty({
    description: 'Points de la route (coordonnées GPS)',
    type: [RoutePointDto],
    minItems: 2,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  points: RoutePointDto[];

  @ApiProperty({
    description: 'Statut actif/inactif de la route',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiProperty({
    description:
      'Distance en kilomètres (calculée automatiquement si non fournie)',
    example: 15.5,
    required: false,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  distance?: number;

  @ApiProperty({
    description:
      'Durée estimée en minutes (calculée automatiquement si non fournie)',
    example: 45,
    required: false,
    minimum: 1,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  duration?: number;
}
