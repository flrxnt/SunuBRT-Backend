import {
  IsNotEmpty,
  IsString,
  IsObject,
  IsOptional,
  ValidateNested,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PaydunyaInvoiceDto {
  @ApiProperty({
    description: 'Token unique de la facture PayDunya',
    example: 'b99ce65b63a4cbe87dc1b8bb07b094b5',
  })
  @IsNotEmpty({ message: 'Le token de la facture est requis' })
  @IsString({ message: 'Le token doit être une chaîne' })
  token: string;

  @ApiProperty({
    description: 'Total de la facture',
    example: 500,
  })
  @IsNotEmpty({ message: 'Le total est requis' })
  @IsNumber({}, { message: 'Le total doit être un nombre' })
  @Type(() => Number)
  total_amount: number;

  @ApiProperty({
    description: 'Description de la facture',
    example: 'Ticket pour Ligne 1 - Dakar Centre → Guédiawaye',
  })
  @IsNotEmpty({ message: 'La description est requise' })
  @IsString({ message: 'La description doit être une chaîne' })
  description: string;

  @ApiPropertyOptional({
    description: 'URL de la facture',
    example: 'https://app.paydunya.com/sandbox-checkout/checkout-invoice/b99ce65b63a4cbe87dc1b8bb07b094b5',
  })
  @IsOptional()
  @IsString({ message: 'L\'URL doit être une chaîne' })
  url?: string;

  @ApiPropertyOptional({
    description: 'Date de création de la facture',
    example: '2024-01-15 10:30:00',
  })
  @IsOptional()
  @IsString({ message: 'La date doit être une chaîne' })
  created_at?: string;

  @ApiPropertyOptional({
    description: 'Date d\'expiration de la facture',
    example: '2024-01-16 10:30:00',
  })
  @IsOptional()
  @IsString({ message: 'La date d\'expiration doit être une chaîne' })
  expires_at?: string;

  @ApiPropertyOptional({
    description: 'Statut de la facture',
    example: 'pending',
  })
  @IsOptional()
  @IsString({ message: 'Le statut doit être une chaîne' })
  status?: string;
}

export class PaydunyaCustomerDto {
  @ApiPropertyOptional({
    description: 'Nom du client',
    example: 'Amadou Diallo',
  })
  @IsOptional()
  @IsString({ message: 'Le nom doit être une chaîne' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Email du client',
    example: 'amadou.diallo@example.com',
  })
  @IsOptional()
  @IsString({ message: 'L\'email doit être une chaîne' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Téléphone du client',
    example: '+221701234567',
  })
  @IsOptional()
  @IsString({ message: 'Le téléphone doit être une chaîne' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Méthode de paiement utilisée',
    example: 'orange-money-senegal',
  })
  @IsOptional()
  @IsString({ message: 'La méthode doit être une chaîne' })
  payment_method?: string;
}

export class PaydunyaCallbackDataDto {
  @ApiProperty({
    description: 'Hash de sécurité pour valider le callback',
    example: 'a7b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
  })
  @IsNotEmpty({ message: 'Le hash de sécurité est requis' })
  @IsString({ message: 'Le hash doit être une chaîne' })
  hash: string;

  @ApiProperty({
    description: 'Statut du paiement',
    example: 'completed',
    enum: ['pending', 'completed', 'cancelled', 'failed'],
  })
  @IsNotEmpty({ message: 'Le statut est requis' })
  @IsString({ message: 'Le statut doit être une chaîne' })
  status: string;

  @ApiProperty({
    description: 'Informations de la facture PayDunya',
    type: PaydunyaInvoiceDto,
  })
  @IsNotEmpty({ message: 'Les informations de facture sont requises' })
  @IsObject({ message: 'La facture doit être un objet' })
  @ValidateNested()
  @Type(() => PaydunyaInvoiceDto)
  invoice: PaydunyaInvoiceDto;

  @ApiPropertyOptional({
    description: 'Informations du client',
    type: PaydunyaCustomerDto,
  })
  @IsOptional()
  @IsObject({ message: 'Les informations client doivent être un objet' })
  @ValidateNested()
  @Type(() => PaydunyaCustomerDto)
  customer?: PaydunyaCustomerDto;

  @ApiPropertyOptional({
    description: 'Référence de transaction PayDunya',
    example: 'TXN_PAYDUNYA_123456789',
  })
  @IsOptional()
  @IsString({ message: 'La référence doit être une chaîne' })
  transaction_id?: string;

  @ApiPropertyOptional({
    description: 'Données personnalisées envoyées lors de la création',
    example: {
      paymentId: 123,
      ticketId: 456,
      userId: 'clxxx-xxxx-xxxx-xxxx'
    },
  })
  @IsOptional()
  @IsObject({ message: 'Les données personnalisées doivent être un objet' })
  custom_data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Timestamp du callback',
    example: '2024-01-15T12:30:45Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Le timestamp doit être au format ISO 8601' })
  timestamp?: string;

  @ApiPropertyOptional({
    description: 'Mode PayDunya (test ou live)',
    example: 'test',
  })
  @IsOptional()
  @IsString({ message: 'Le mode doit être une chaîne' })
  mode?: string;

  @ApiPropertyOptional({
    description: 'Montant réellement payé',
    example: 500,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Le montant payé doit être un nombre' })
  @Type(() => Number)
  amount_paid?: number;

  @ApiPropertyOptional({
    description: 'Frais de transaction PayDunya',
    example: 25,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Les frais doivent être un nombre' })
  @Type(() => Number)
  fees?: number;

  @ApiPropertyOptional({
    description: 'Montant net reçu (après déduction des frais)',
    example: 475,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Le montant net doit être un nombre' })
  @Type(() => Number)
  net_amount?: number;

  @ApiPropertyOptional({
    description: 'Devise utilisée pour le paiement',
    example: 'XOF',
  })
  @IsOptional()
  @IsString({ message: 'La devise doit être une chaîne' })
  currency?: string;
}

export class PaydunyaCallbackDto {
  @ApiProperty({
    description: 'Données du callback PayDunya',
    type: PaydunyaCallbackDataDto,
  })
  @IsNotEmpty({ message: 'Les données du callback sont requises' })
  @IsObject({ message: 'Les données doivent être un objet' })
  @ValidateNested()
  @Type(() => PaydunyaCallbackDataDto)
  data: PaydunyaCallbackDataDto;
}

export class PaydunyaWebhookDto {
  @ApiProperty({
    description: 'Type d\'événement PayDunya',
    example: 'invoice.payment.completed',
  })
  @IsNotEmpty({ message: 'Le type d\'événement est requis' })
  @IsString({ message: 'Le type doit être une chaîne' })
  event_type: string;

  @ApiProperty({
    description: 'Données de l\'événement',
    type: PaydunyaCallbackDataDto,
  })
  @IsNotEmpty({ message: 'Les données de l\'événement sont requises' })
  @IsObject({ message: 'Les données doivent être un objet' })
  @ValidateNested()
  @Type(() => PaydunyaCallbackDataDto)
  data: PaydunyaCallbackDataDto;

  @ApiPropertyOptional({
    description: 'Timestamp de l\'événement',
    example: '2024-01-15T12:30:45Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Le timestamp doit être au format ISO 8601' })
  created_at?: string;

  @ApiPropertyOptional({
    description: 'ID unique de l\'événement',
    example: 'evt_123456789abcdef',
  })
  @IsOptional()
  @IsString({ message: 'L\'ID événement doit être une chaîne' })
  event_id?: string;
}
