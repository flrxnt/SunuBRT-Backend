import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TicketPricingType {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
  PREMIUM = 'PREMIUM',
  STUDENT = 'STUDENT',
  SENIOR = 'SENIOR',
  DISABLED = 'DISABLED',
}

export enum ValidityPeriodType {
  HOURS = 'HOURS',
  DAYS = 'DAYS',
  WEEKS = 'WEEKS',
  MONTHS = 'MONTHS',
}

export class CreateTicketPricingDto {
  @ApiProperty({
    description: 'Nom de la tarification',
    example: 'Tarif Standard Ligne 1',
  })
  @IsNotEmpty({ message: 'Le nom de la tarification est requis' })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  name: string;

  @ApiProperty({
    description: 'Type de tarification',
    enum: TicketPricingType,
    example: TicketPricingType.STANDARD,
  })
  @IsNotEmpty({ message: 'Le type de tarification est requis' })
  @IsEnum(TicketPricingType, {
    message: 'Le type doit être une valeur valide',
  })
  type: TicketPricingType;

  @ApiProperty({
    description: 'Prix du ticket en FCFA',
    example: 500,
    minimum: 50,
    maximum: 10000,
  })
  @IsNotEmpty({ message: 'Le prix est requis' })
  @IsNumber({}, { message: 'Le prix doit être un nombre' })
  @Min(50, { message: 'Le prix minimum est de 50 FCFA' })
  @Max(10000, { message: 'Le prix maximum est de 10000 FCFA' })
  @Type(() => Number)
  price: number;

  @ApiProperty({
    description: 'Durée de validité du ticket',
    example: 24,
    minimum: 1,
    maximum: 365,
  })
  @IsNotEmpty({ message: 'La durée de validité est requise' })
  @IsNumber({}, { message: 'La durée doit être un nombre' })
  @Min(1, { message: 'La durée minimum est de 1' })
  @Max(365, { message: 'La durée maximum est de 365' })
  @Type(() => Number)
  validityDuration: number;

  @ApiProperty({
    description: 'Unité de la période de validité',
    enum: ValidityPeriodType,
    example: ValidityPeriodType.HOURS,
  })
  @IsNotEmpty({ message: "L'unité de validité est requise" })
  @IsEnum(ValidityPeriodType, {
    message: "L'unité doit être une valeur valide",
  })
  validityPeriodType: ValidityPeriodType;

  @ApiPropertyOptional({
    description: 'ID de la ligne spécifique (optionnel)',
    example: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: "L'ID de ligne doit être un nombre" })
  @Type(() => Number)
  lineId?: number;

  @ApiPropertyOptional({
    description: 'ID de la route spécifique (optionnel)',
    example: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: "L'ID de route doit être un nombre" })
  @Type(() => Number)
  routeId?: number;

  @ApiPropertyOptional({
    description: 'Description de la tarification',
    example: 'Tarif standard pour la ligne 1, valable 24h',
  })
  @IsOptional()
  @IsString({ message: 'La description doit être une chaîne' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Pourcentage de remise appliqué',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La remise doit être un nombre' })
  @Min(0, { message: 'La remise minimum est de 0%' })
  @Max(100, { message: 'La remise maximum est de 100%' })
  @Type(() => Number)
  discountPercent?: number;

  @ApiPropertyOptional({
    description: 'Date de début de validité de cette tarification',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La date de début doit être au format ISO 8601' },
  )
  validFrom?: string;

  @ApiPropertyOptional({
    description: 'Date de fin de validité de cette tarification',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La date de fin doit être au format ISO 8601' })
  validTo?: string;

  @ApiPropertyOptional({
    description: 'Indique si cette tarification est active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Le statut actif doit être un booléen' })
  @Type(() => Boolean)
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Nombre maximum de tickets vendus avec cette tarification',
    example: 1000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La limite doit être un nombre' })
  @Min(1, { message: 'La limite minimum est de 1' })
  @Type(() => Number)
  maxTickets?: number;

  @ApiPropertyOptional({
    description: 'Conditions spéciales pour cette tarification',
    example: 'Réservé aux étudiants avec carte valide',
  })
  @IsOptional()
  @IsString({ message: 'Les conditions doivent être une chaîne' })
  specialConditions?: string;
}

export class UpdateTicketPricingDto {
  @ApiPropertyOptional({
    description: 'Nom de la tarification',
    example: 'Tarif Standard Ligne 1 - Mis à jour',
  })
  @IsOptional()
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Prix du ticket en FCFA',
    example: 600,
    minimum: 50,
    maximum: 10000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Le prix doit être un nombre' })
  @Min(50, { message: 'Le prix minimum est de 50 FCFA' })
  @Max(10000, { message: 'Le prix maximum est de 10000 FCFA' })
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({
    description: 'Durée de validité du ticket',
    example: 48,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La durée doit être un nombre' })
  @Min(1, { message: 'La durée minimum est de 1' })
  @Max(365, { message: 'La durée maximum est de 365' })
  @Type(() => Number)
  validityDuration?: number;

  @ApiPropertyOptional({
    description: 'Unité de la période de validité',
    enum: ValidityPeriodType,
    example: ValidityPeriodType.HOURS,
  })
  @IsOptional()
  @IsEnum(ValidityPeriodType, {
    message: "L'unité doit être une valeur valide",
  })
  validityPeriodType?: ValidityPeriodType;

  @ApiPropertyOptional({
    description: 'Description de la tarification',
  })
  @IsOptional()
  @IsString({ message: 'La description doit être une chaîne' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Pourcentage de remise appliqué',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La remise doit être un nombre' })
  @Min(0, { message: 'La remise minimum est de 0%' })
  @Max(100, { message: 'La remise maximum est de 100%' })
  @Type(() => Number)
  discountPercent?: number;

  @ApiPropertyOptional({
    description: 'Date de début de validité de cette tarification',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La date de début doit être au format ISO 8601' },
  )
  validFrom?: string;

  @ApiPropertyOptional({
    description: 'Date de fin de validité de cette tarification',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La date de fin doit être au format ISO 8601' })
  validTo?: string;

  @ApiPropertyOptional({
    description: 'Indique si cette tarification est active',
  })
  @IsOptional()
  @IsBoolean({ message: 'Le statut actif doit être un booléen' })
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Nombre maximum de tickets vendus avec cette tarification',
  })
  @IsOptional()
  @IsNumber({}, { message: 'La limite doit être un nombre' })
  @Min(1, { message: 'La limite minimum est de 1' })
  @Type(() => Number)
  maxTickets?: number;

  @ApiPropertyOptional({
    description: 'Conditions spéciales pour cette tarification',
  })
  @IsOptional()
  @IsString({ message: 'Les conditions doivent être une chaîne' })
  specialConditions?: string;
}

export class BulkUpdatePricingDto {
  @ApiProperty({
    description: 'Liste des IDs de tarifications à mettre à jour',
    example: [1, 2, 3],
  })
  @IsNotEmpty({ message: 'La liste des IDs est requise' })
  @IsArray({ message: 'Les IDs doivent être dans un tableau' })
  @IsNumber({}, { each: true, message: 'Chaque ID doit être un nombre' })
  @Type(() => Number)
  pricingIds: number[];

  @ApiProperty({
    description: 'Données à mettre à jour pour toutes les tarifications',
  })
  @IsNotEmpty({ message: 'Les données de mise à jour sont requises' })
  @ValidateNested()
  @Type(() => UpdateTicketPricingDto)
  updateData: UpdateTicketPricingDto;
}

export class ApplyDiscountDto {
  @ApiProperty({
    description: 'Pourcentage de remise à appliquer',
    example: 20,
    minimum: 5,
    maximum: 50,
  })
  @IsNotEmpty({ message: 'Le pourcentage de remise est requis' })
  @IsNumber({}, { message: 'La remise doit être un nombre' })
  @Min(5, { message: 'La remise minimum est de 5%' })
  @Max(50, { message: 'La remise maximum est de 50%' })
  @Type(() => Number)
  discountPercent: number;

  @ApiProperty({
    description: 'Date de début de la promotion',
    example: '2024-01-01T00:00:00Z',
  })
  @IsNotEmpty({ message: 'La date de début est requise' })
  @IsDateString(
    {},
    { message: 'La date de début doit être au format ISO 8601' },
  )
  validFrom: string;

  @ApiProperty({
    description: 'Date de fin de la promotion',
    example: '2024-01-31T23:59:59Z',
  })
  @IsNotEmpty({ message: 'La date de fin est requise' })
  @IsDateString({}, { message: 'La date de fin doit être au format ISO 8601' })
  validTo: string;

  @ApiPropertyOptional({
    description: 'Description de la promotion',
    example: 'Promotion du Nouvel An - 20% de réduction',
  })
  @IsOptional()
  @IsString({ message: 'La description doit être une chaîne' })
  description?: string;
}
