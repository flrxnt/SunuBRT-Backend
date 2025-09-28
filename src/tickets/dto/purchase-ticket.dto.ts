import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PaymentProvider {
  PAYDUNYA = 'PAYDUNYA',
  ORANGE_MONEY = 'ORANGE_MONEY',
  WAVE = 'WAVE',
  FREE_MONEY = 'FREE_MONEY',
}

export enum PaymentMethod {
  MOBILE_MONEY = 'MOBILE_MONEY',
  CREDIT_CARD = 'CREDIT_CARD',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
}

export class InitiateTicketPurchaseDto {
  @ApiProperty({
    description: 'ID du voyage pour lequel acheter le ticket',
    example: 1,
  })
  @IsNotEmpty({ message: "L'ID du voyage est requis" })
  @IsNumber({}, { message: "L'ID du voyage doit être un nombre" })
  @Type(() => Number)
  tripId: number;

  @ApiProperty({
    description: 'ID de la tarification choisie',
    example: 1,
  })
  @IsNotEmpty({ message: 'La tarification est requise' })
  @IsNumber({}, { message: "L'ID de tarification doit être un nombre" })
  @Type(() => Number)
  pricingId: number;

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

  @ApiPropertyOptional({
    description: 'Fournisseur de paiement préféré',
    enum: PaymentProvider,
    example: PaymentProvider.PAYDUNYA,
    default: PaymentProvider.PAYDUNYA,
  })
  @IsOptional()
  @IsEnum(PaymentProvider, {
    message: 'Le fournisseur de paiement doit être une valeur valide',
  })
  provider?: PaymentProvider = PaymentProvider.PAYDUNYA;

  @ApiPropertyOptional({
    description: 'Méthode de paiement',
    enum: PaymentMethod,
    example: PaymentMethod.MOBILE_MONEY,
  })
  @IsOptional()
  @IsEnum(PaymentMethod, {
    message: 'La méthode de paiement doit être une valeur valide',
  })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Nom du client pour la facture',
    example: 'Amadou Diallo',
  })
  @IsOptional()
  @IsString({ message: 'Le nom du client doit être une chaîne' })
  customerName?: string;

  @ApiPropertyOptional({
    description: 'Email du client pour la facture',
    example: 'amadou.diallo@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Veuillez fournir un email valide' })
  customerEmail?: string;

  @ApiPropertyOptional({
    description: 'Téléphone du client pour la facture',
    example: '+221701234567',
  })
  @IsOptional()
  @IsPhoneNumber('SN', {
    message: 'Veuillez fournir un numéro de téléphone sénégalais valide',
  })
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Code de promotion à appliquer',
    example: 'NOEL2024',
  })
  @IsOptional()
  @IsString({ message: 'Le code promotion doit être une chaîne' })
  promoCode?: string;
}

export class GetAvailablePricingDto {
  @ApiProperty({
    description: 'ID du voyage',
    example: 1,
  })
  @IsNotEmpty({ message: "L'ID du voyage est requis" })
  @IsNumber({}, { message: "L'ID du voyage doit être un nombre" })
  @Type(() => Number)
  tripId: number;

  @ApiProperty({
    description: 'Nombre de passagers',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Le nombre de passagers doit être un nombre' })
  @Type(() => Number)
  passengers?: number = 1;
}

export class PurchaseResponseDto {
  @ApiProperty({
    description: 'ID du paiement initié',
    example: 123,
  })
  paymentId: number;

  @ApiProperty({
    description: 'URL de paiement pour redirection',
    example:
      'https://app.paydunya.com/sandbox-checkout/checkout-invoice/token123',
  })
  paymentUrl: string;

  @ApiProperty({
    description: 'Token de paiement',
    example: 'paydunya_token_abc123',
  })
  paymentToken: string;

  @ApiProperty({
    description: 'Montant à payer',
    example: 500,
  })
  amount: number;

  @ApiProperty({
    description: 'Devise',
    example: 'XOF',
  })
  currency: string;

  @ApiProperty({
    description: 'Statut du paiement',
    example: 'PENDING',
  })
  status: string;

  @ApiProperty({
    description: 'Informations du voyage',
  })
  tripInfo: {
    id: number;
    routeName: string;
    startTime: string;
    busNumber: string;
    availableSeats: number;
  };

  @ApiProperty({
    description: 'Informations de la tarification',
  })
  pricingInfo: {
    id: number;
    name: string;
    type: string;
    originalPrice: number;
    finalPrice: number;
    discountPercent: number;
    validityDuration: number;
    validityPeriodType: string;
  };

  @ApiPropertyOptional({
    description: 'Siège réservé temporairement',
    example: 'A15',
  })
  reservedSeat?: string;

  @ApiProperty({
    description: 'Durée de validité de cette réservation en minutes',
    example: 15,
  })
  reservationValidityMinutes: number;

  @ApiProperty({
    description: "Date d'expiration de la réservation",
    example: '2024-01-20T10:45:00Z',
  })
  reservationExpiresAt: string;
}
