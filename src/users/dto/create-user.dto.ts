import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsPhoneNumber,
  IsEnum,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  @ApiProperty({
    description:
      'Password that contains uppercase, lowercase, number, and special character',
    minLength: 8,
    maxLength: 128,
    example: 'P@ssw0rd!',
    format: 'password',
    pattern:
      '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]',
  })
  password: string;

  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  @ApiProperty({
    description: 'First name',
    minLength: 2,
    maxLength: 50,
    example: 'John',
  })
  firstName: string;

  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  @ApiProperty({
    description: 'Last name',
    minLength: 2,
    maxLength: 50,
    example: 'Doe',
  })
  lastName: string;

  @IsOptional()
  @IsPhoneNumber('SN', {
    message: 'Please provide a valid Senegalese phone number',
  })
  @Transform(({ value }) => value?.replace(/\s/g, ''))
  @ApiPropertyOptional({
    description: 'Senegalese phone number in international format',
    example: '+221771234567',
  })
  phone?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Role must be USER, DRIVER, or ADMIN' })
  @ApiPropertyOptional({
    description: 'User role',
    enum: Role,
    enumName: 'Role',
    default: Role.USER,
  })
  role?: Role = Role.USER;
}

export class CreateUserResponseDto {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  email: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName: string;

  @ApiPropertyOptional({
    description: 'Phone number in international format',
    example: '+221771234567',
    nullable: true,
  })
  phone?: string | null;

  @ApiProperty({
    description: 'User role',
    enum: Role,
    enumName: 'Role',
    example: 'USER',
  })
  role: Role;

  @ApiProperty({
    description: 'Email verification status',
    example: false,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-05-23T10:20:30.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-05-24T11:22:33.000Z',
  })
  updatedAt: Date;
}
