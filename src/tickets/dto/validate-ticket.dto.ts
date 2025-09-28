import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ValidateTicketDto {
  @ApiProperty({
    description: 'Code QR du ticket à valider',
    example: 'SUNUBRT-abc123def456ghi789',
  })
  @IsNotEmpty({ message: 'Le code QR est requis' })
  @IsString({ message: 'Le code QR doit être une chaîne de caractères' })
  qrCode: string;

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
    seatNumber?: string;
    passengerName: string;
    tripInfo: {
      routeName: string;
      startTime: string;
      busNumber: string;
    };
    validUntil?: string;
    usedAt?: string;
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
}
