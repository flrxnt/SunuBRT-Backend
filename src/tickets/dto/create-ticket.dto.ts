import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TicketType {
  SINGLE_USE = 'SINGLE_USE',
  DAILY_PASS = 'DAILY_PASS',
  WEEKLY_PASS = 'WEEKLY_PASS',
  MONTHLY_PASS = 'MONTHLY_PASS',
  ANNUAL_PASS = 'ANNUAL_PASS',
}

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
    description: 'ID du voyage (optionnel pour les abonnements)',
    example: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: "L'ID du voyage doit être un nombre" })
  @Type(() => Number)
  tripId?: number;

  @ApiPropertyOptional({
    description: 'Type de ticket',
    enum: TicketType,
    example: TicketType.SINGLE_USE,
    default: TicketType.SINGLE_USE,
  })
  @IsOptional()
  @IsEnum(TicketType, { message: 'Le type de ticket doit être valide' })
  ticketType?: TicketType = TicketType.SINGLE_USE;

  @ApiPropertyOptional({
    description: 'Numéro de siège souhaité (optionnel)',
    example: 'A15',
  })
  @IsOptional()
  @IsString({ message: 'Le numéro de siège doit être une chaîne' })
  seatNumber?: string;

  @ApiPropertyOptional({
    description: 'Date de début de validité (optionnel, par défaut maintenant)',
    example: '2024-01-15T08:00:00Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La date de début doit être au format ISO 8601' },
  )
  validFrom?: string;

  @ApiPropertyOptional({
    description: "Nombre maximum d'utilisations (optionnel)",
    example: 30,
  })
  @IsOptional()
  @IsNumber({}, { message: "Le nombre max d'utilisations doit être un nombre" })
  @Type(() => Number)
  maxUsages?: number;

  @ApiPropertyOptional({
    description: 'Indique si le ticket est réutilisable',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isReusable doit être un booléen' })
  @Type(() => Boolean)
  isReusable?: boolean = false;

  @ApiPropertyOptional({
    description: 'Notes additionnelles pour le ticket',
    example: 'Voyage pour rendez-vous médical',
  })
  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne' })
  notes?: string;
}

export class CreateSubscriptionTicketDto {
  @ApiProperty({
    description: "ID du paiement confirmé pour l'abonnement",
    example: 1,
  })
  @IsNotEmpty({ message: "L'ID du paiement est requis" })
  @IsNumber({}, { message: "L'ID du paiement doit être un nombre" })
  @Type(() => Number)
  paymentId: number;

  @ApiProperty({
    description: "Type d'abonnement",
    enum: [
      TicketType.DAILY_PASS,
      TicketType.WEEKLY_PASS,
      TicketType.MONTHLY_PASS,
      TicketType.ANNUAL_PASS,
    ],
    example: TicketType.MONTHLY_PASS,
  })
  @IsNotEmpty({ message: "Le type d'abonnement est requis" })
  @IsEnum(
    [
      TicketType.DAILY_PASS,
      TicketType.WEEKLY_PASS,
      TicketType.MONTHLY_PASS,
      TicketType.ANNUAL_PASS,
    ],
    {
      message: "Le type d'abonnement doit être valide",
    },
  )
  ticketType: TicketType;

  @ApiPropertyOptional({
    description:
      "ID de la ligne (optionnel, pour limiter l'abonnement à une ligne)",
    example: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: "L'ID de ligne doit être un nombre" })
  @Type(() => Number)
  lineId?: number;

  @ApiPropertyOptional({
    description: 'Date de début de validité (optionnel, par défaut maintenant)',
    example: '2024-01-15T08:00:00Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La date de début doit être au format ISO 8601' },
  )
  validFrom?: string;

  @ApiPropertyOptional({
    description: "Nombre maximum d'utilisations par jour/semaine/mois",
    example: 60,
  })
  @IsOptional()
  @IsNumber({}, { message: "Le nombre max d'utilisations doit être un nombre" })
  @Type(() => Number)
  maxUsages?: number;

  @ApiPropertyOptional({
    description: "Notes additionnelles pour l'abonnement",
    example: 'Abonnement mensuel ligne 1',
  })
  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne' })
  notes?: string;
}
