import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';

import { Transform } from 'class-transformer';

import { Role } from '@prisma/client';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
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
  @ApiProperty({
    description: 'User password',
    example: 'P@ssw0rd!',
    format: 'password',
  })
  password: string;

  @IsOptional()
  @IsBoolean({ message: 'Remember me must be a boolean' })
  @ApiPropertyOptional({
    description: 'Whether to keep the user logged in on this device',
    default: false,
  })
  rememberMe?: boolean = false;
}

export class LoginUserInfo {
  @ApiProperty({
    description: 'User ID',
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
    description: 'Phone number',
    example: '+221771234567',
    nullable: true,
  })
  phone?: string;

  @ApiProperty({ description: 'User role', enum: Role, enumName: 'Role' })
  role: Role;

  @ApiProperty({ description: 'Email verification status', example: true })
  isVerified: boolean;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token used to obtain a new access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Authenticated user information',

    type: LoginUserInfo,
  })
  user: LoginUserInfo;

  @ApiProperty({
    description: 'Access token expiration duration',
    example: '24h',
  })
  expiresIn: string;

  @ApiProperty({
    description: 'Operation message',
    example: 'Login successful',
  })
  message: string;
}

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  @ApiProperty({
    description: 'Valid refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: 'New JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'New JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Access token expiration duration',
    example: '24h',
  })
  expiresIn: string;

  @ApiProperty({
    description: 'Operation message',
    example: 'Token refreshed successfully',
  })
  message: string;
}
