import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTicketDto {
  @ApiProperty({
    description: 'ID du paiement confirmé',
    example: 1,
  })
  @IsNotEmpty({ message: "L'ID du paiement est requis" })
  @IsNumber({}, { message: "L'ID du paiement doit être un nombre" })
  @Type(() => Number)
  paymentId: number;

  @ApiPropertyOptional({
    description: 'Numéro de siège souhaité (optionnel)',
    example: 'A15',
  })
  @IsOptional()
  @IsString({ message: 'Le numéro de siège doit être une chaîne' })
  seatNumber?: string;

  @ApiPropertyOptional({
    description: 'Notes additionnelles pour le ticket',
    example: 'Voyage pour rendez-vous médical',
  })
  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne' })
  notes?: string;
}
