import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  Length,
  Matches,
} from 'class-validator';

export class CreateLineDto {
  @ApiProperty({
    description: 'Nom de la ligne',
    example: 'Ligne 1',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  name: string;

  @ApiProperty({
    description: 'Numéro unique de la ligne',
    example: '1',
    minLength: 1,
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  @Matches(/^[A-Z0-9]+$/, {
    message:
      'Le numéro de ligne ne peut contenir que des lettres majuscules et des chiffres',
  })
  number: string;

  @ApiProperty({
    description: "Couleur de la ligne pour l'affichage (format hexadécimal)",
    example: '#FF5722',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'La couleur doit être au format hexadécimal (#RRGGBB)',
  })
  color?: string;

  @ApiProperty({
    description: 'Description de la ligne',
    example: 'Ligne principale reliant le centre-ville aux banlieues',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @ApiProperty({
    description: 'Statut actif/inactif de la ligne',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
