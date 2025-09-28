import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ValidationContext {
  BOARDING = 'BOARDING',
  INSPECTION = 'INSPECTION',
  EXIT = 'EXIT',
}

export class ValidateTicketDto {
  @ApiProperty({
    description: 'Code QR du ticket à valider',
    example: 'SUNUBRT-abc123def456ghi789',
  })
  @IsNotEmpty({ message: 'Le code QR est requis' })
  @IsString({ message: 'Le code QR doit être une chaîne de caractères' })
  qrCode: string;

  @ApiPropertyOptional({
    description: 'ID du voyage pour validation spécifique (optionnel)',
    example: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: "L'ID du voyage doit être un nombre" })
  @Type(() => Number)
  tripId?: number;

  @ApiPropertyOptional({
    description: 'ID du bus utilisé pour la validation',
    example: 'clxxx-xxxx-xxxx-xxxx',
  })
  @IsOptional()
  @IsString({ message: "L'ID du bus doit être une chaîne" })
  busId?: string;

  @ApiPropertyOptional({
    description: 'Contexte de validation',
    enum: ValidationContext,
    example: ValidationContext.BOARDING,
    default: ValidationContext.BOARDING,
  })
  @IsOptional()
  @IsEnum(ValidationContext, {
    message: 'Le contexte de validation doit être valide',
  })
  validationContext?: ValidationContext = ValidationContext.BOARDING;

  @ApiPropertyOptional({
    description: 'Latitude de la position de validation (optionnel)',
    example: 14.6937,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La latitude doit être un nombre' })
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude de la position de validation (optionnel)',
    example: -17.4441,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La longitude doit être un nombre' })
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Notes additionnelles pour la validation',
    example: 'Validation à bord du bus',
  })
  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne' })
  notes?: string;
}

export class ScanTicketDto {
  @ApiProperty({
    description: 'Code QR scanné du ticket',
    example: 'SUNUBRT-abc123def456ghi789',
  })
  @IsNotEmpty({ message: 'Le code QR scanné est requis' })
  @IsString({ message: 'Le code QR doit être une chaîne de caractères' })
  qrCode: string;
}

export class TicketValidationResponseDto {
  @ApiProperty({
    description: 'Indique si le ticket est valide',
    example: true,
  })
  @IsBoolean()
  isValid: boolean;

  @ApiProperty({
    description: 'Message de résultat de la validation',
    example: 'Ticket validé avec succès',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Informations du ticket validé',
  })
  ticket?: {
    id: number;
    qrCode: string;
    ticketType: string;
    seatNumber?: string;
    passengerName: string;
    isReusable: boolean;
    currentUsages: number;
    maxUsages?: number;
    tripInfo?: {
      routeName: string;
      startTime: string;
      busNumber: string;
    };
    validFrom: string;
    validUntil?: string;
    lastUsedAt?: string;
  };

  @ApiPropertyOptional({
    description: "Code d'erreur si la validation échoue",
    example: 'TICKET_EXPIRED',
  })
  @IsOptional()
  @IsString()
  errorCode?: string;

  @ApiPropertyOptional({
    description: "Détails additionnels sur l'erreur",
  })
  @IsOptional()
  errorDetails?: any;

  @ApiPropertyOptional({
    description: "Nombre d'utilisations restantes pour ce ticket",
    example: 25,
  })
  @IsOptional()
  @IsNumber()
  remainingUsages?: number;

  @ApiPropertyOptional({
    description: 'Indique si ce ticket peut être utilisé plusieurs fois',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  canReuse?: boolean;
}
