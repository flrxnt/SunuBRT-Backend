import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsPhoneNumber,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  email?: string;

  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  @ApiPropertyOptional({
    description: 'First name',
    minLength: 2,
    maxLength: 50,
    example: 'John',
  })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  @ApiPropertyOptional({
    description: 'Last name',
    minLength: 2,
    maxLength: 50,
    example: 'Doe',
  })
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber('SN', {
    message: 'Please provide a valid Senegalese phone number',
  })
  @Transform(({ value }) => value?.replace(/\s/g, ''))
  @ApiPropertyOptional({
    description: 'Senegalese phone number in international format',
    example: '+221771234567',
    nullable: true,
  })
  phone?: string | null;

  @IsOptional()
  @IsEnum(Role, { message: 'Role must be USER, DRIVER, or ADMIN' })
  @ApiPropertyOptional({
    description: 'User role',
    enum: Role,
    enumName: 'Role',
    example: 'USER',
  })
  role?: Role;

  @IsOptional()
  @IsBoolean({ message: 'isVerified must be a boolean' })
  @ApiPropertyOptional({
    description: 'Email verification status',
    example: true,
  })
  isVerified?: boolean;
}

export class UpdateUserResponseDto {
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
    example: true,
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

  @ApiProperty({
    description: 'Operation message',
    example: 'User updated successfully',
  })
  message: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  @ApiPropertyOptional({
    description: 'First name',
    minLength: 2,
    maxLength: 50,
    example: 'John',
  })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  @ApiPropertyOptional({
    description: 'Last name',
    minLength: 2,
    maxLength: 50,
    example: 'Doe',
  })
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber('SN', {
    message: 'Please provide a valid Senegalese phone number',
  })
  @Transform(({ value }) => value?.replace(/\s/g, ''))
  @ApiPropertyOptional({
    description: 'Senegalese phone number in international format',
    example: '+221771234567',
    nullable: true,
  })
  phone?: string | null;
}
