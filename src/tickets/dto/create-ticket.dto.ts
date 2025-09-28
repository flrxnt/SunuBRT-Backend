import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTicketDto {
  @ApiProperty({
    description: 'ID du voyage pour lequel acheter le ticket',
    example: 1,
  })
  @IsNotEmpty({ message: "L'ID du voyage est requis" })
  @IsNumber({}, { message: "L'ID du voyage doit être un nombre" })
  @Type(() => Number)
  tripId: number;

  @ApiPropertyOptional({
    description: 'Numéro de siège souhaité (optionnel)',
    example: 'A15',
  })
  @IsOptional()
  @IsString({ message: 'Le numéro de siège doit être une chaîne' })
  seatNumber?: string;

  @ApiPropertyOptional({
    description:
      'Date de validité du ticket (par défaut calculée automatiquement)',
    example: '2024-01-20T23:59:59Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La date de validité doit être au format ISO 8601' },
  )
  validUntil?: string;

  @ApiPropertyOptional({
    description: 'Nombre de passagers (par défaut 1)',
    example: 1,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Le nombre de passagers doit être un nombre' })
  @Min(1, { message: 'Au minimum 1 passager' })
  @Max(10, { message: 'Maximum 10 passagers par commande' })
  @Type(() => Number)
  passengers?: number = 1;

  @ApiPropertyOptional({
    description: 'Notes additionnelles pour le ticket',
    example: 'Voyage pour rendez-vous médical',
  })
  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne' })
  notes?: string;
}
