import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  IsEmail,
  IsPhoneNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PaymentProvider {
  PAYDUNYA = 'PAYDUNYA',
  ORANGE_MONEY = 'ORANGE_MONEY',
  WAVE = 'WAVE',
  FREE_MONEY = 'FREE_MONEY',
  CREDIT_CARD = 'CREDIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum PaymentMethod {
  MOBILE_MONEY = 'MOBILE_MONEY',
  CREDIT_CARD = 'CREDIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  CASH = 'CASH',
}

export class CreateTicketPaymentDto {
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
    description: 'URL de retour après paiement réussi',
    example: 'https://app.sunubrt.com/payment/success',
  })
  @IsOptional()
  @IsUrl({}, { message: "L'URL de retour doit être valide" })
  returnUrl?: string;

  @ApiPropertyOptional({
    description: 'URL de retour après annulation du paiement',
    example: 'https://app.sunubrt.com/payment/cancel',
  })
  @IsOptional()
  @IsUrl({}, { message: "L'URL d'annulation doit être valide" })
  cancelUrl?: string;

  @ApiPropertyOptional({
    description: 'Code de promotion à appliquer',
    example: 'NOEL2024',
  })
  @IsOptional()
  @IsString({ message: 'Le code promotion doit être une chaîne' })
  promoCode?: string;

  @ApiPropertyOptional({
    description: 'Devise du paiement',
    example: 'XOF',
    default: 'XOF',
  })
  @IsOptional()
  @IsString({ message: 'La devise doit être une chaîne' })
  currency?: string = 'XOF';
}

export class CreatePaymentDto {
  @ApiPropertyOptional({
    description: 'ID du ticket à payer (optionnel pour rétrocompatibilité)',
    example: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: "L'ID du ticket doit être un nombre" })
  @Type(() => Number)
  ticketId?: number;

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
    description: 'URL de retour après paiement réussi',
    example: 'https://app.sunubrt.com/payment/success',
  })
  @IsOptional()
  @IsUrl({}, { message: "L'URL de retour doit être valide" })
  returnUrl?: string;

  @ApiPropertyOptional({
    description: 'URL de retour après annulation du paiement',
    example: 'https://app.sunubrt.com/payment/cancel',
  })
  @IsOptional()
  @IsUrl({}, { message: "L'URL d'annulation doit être valide" })
  cancelUrl?: string;

  @ApiPropertyOptional({
    description: 'Données personnalisées à associer au paiement',
    example: {
      source: 'mobile_app',
      referrer: 'promotion_2024',
    },
  })
  @IsOptional()
  customData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Notes additionnelles pour le paiement',
    example: 'Paiement pour voyage familial',
  })
  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Code de promotion à appliquer',
    example: 'NOEL2024',
  })
  @IsOptional()
  @IsString({ message: 'Le code promotion doit être une chaîne' })
  promoCode?: string;

  @ApiPropertyOptional({
    description: 'Devise du paiement',
    example: 'XOF',
    default: 'XOF',
  })
  @IsOptional()
  @IsString({ message: 'La devise doit être une chaîne' })
  currency?: string = 'XOF';
}

export class PaymentCallbackDto {
  @ApiProperty({
    description: 'Token de paiement du fournisseur',
    example: 'paydunya_token_abc123',
  })
  @IsNotEmpty({ message: 'Le token de paiement est requis' })
  @IsString({ message: 'Le token doit être une chaîne' })
  token: string;

  @ApiProperty({
    description: 'Statut du paiement',
    example: 'completed',
  })
  @IsNotEmpty({ message: 'Le statut du paiement est requis' })
  @IsString({ message: 'Le statut doit être une chaîne' })
  status: string;

  @ApiPropertyOptional({
    description: 'Référence de transaction du fournisseur',
    example: 'TXN_123456789',
  })
  @IsOptional()
  @IsString({ message: 'La référence doit être une chaîne' })
  transactionRef?: string;

  @ApiPropertyOptional({
    description: 'Hash de sécurité pour vérifier la validité du callback',
  })
  @IsOptional()
  @IsString({ message: 'Le hash doit être une chaîne' })
  hash?: string;

  @ApiPropertyOptional({
    description: 'Données additionnelles du fournisseur de paiement',
  })
  @IsOptional()
  additionalData?: Record<string, any>;
}

export class RefundPaymentDto {
  @ApiProperty({
    description: 'Montant à rembourser (en centimes)',
    example: 50000,
    minimum: 100,
  })
  @IsNotEmpty({ message: 'Le montant du remboursement est requis' })
  @IsNumber({}, { message: 'Le montant doit être un nombre' })
  @Min(100, {
    message: 'Le montant minimum de remboursement est de 100 centimes (1 FCFA)',
  })
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Raison du remboursement',
    example: 'Voyage annulé par la compagnie',
  })
  @IsNotEmpty({ message: 'La raison du remboursement est requise' })
  @IsString({ message: 'La raison doit être une chaîne' })
  reason: string;

  @ApiPropertyOptional({
    description: 'Notes administratives internes',
    example: 'Remboursement approuvé par le superviseur',
  })
  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne' })
  adminNotes?: string;

  @ApiPropertyOptional({
    description: 'Indique si un email de confirmation doit être envoyé',
    example: true,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  sendEmail?: boolean = true;
}

export class VerifyPaymentDto {
  @ApiProperty({
    description: 'Token ou référence de paiement à vérifier',
    example: 'paydunya_token_abc123',
  })
  @IsNotEmpty({ message: 'Le token de paiement est requis' })
  @IsString({ message: 'Le token doit être une chaîne' })
  paymentToken: string;

  @ApiPropertyOptional({
    description: 'Fournisseur de paiement',
    enum: PaymentProvider,
    example: PaymentProvider.PAYDUNYA,
  })
  @IsOptional()
  @IsEnum(PaymentProvider, {
    message: 'Le fournisseur de paiement doit être une valeur valide',
  })
  provider?: PaymentProvider;
}

export class PaymentStatisticsDto {
  @ApiPropertyOptional({
    description: 'Date de début pour les statistiques',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString({ message: 'La date de début doit être une chaîne' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Date de fin pour les statistiques',
    example: '2024-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsString({ message: 'La date de fin doit être une chaîne' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Fournisseur de paiement à filtrer',
    enum: PaymentProvider,
  })
  @IsOptional()
  @IsEnum(PaymentProvider, {
    message: 'Le fournisseur de paiement doit être une valeur valide',
  })
  provider?: PaymentProvider;

  @ApiPropertyOptional({
    description: 'Méthode de paiement à filtrer',
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod, {
    message: 'La méthode de paiement doit être une valeur valide',
  })
  paymentMethod?: PaymentMethod;
}
