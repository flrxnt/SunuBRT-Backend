import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsUUID,
} from 'class-validator';

import { Transform } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @ApiProperty({
    description: 'Email address associated with the account',
    example: 'john.doe@example.com',
    format: 'email',
  })
  email: string;
}

export class ResetPasswordDto {
  @IsString({ message: 'Reset token must be a string' })
  @IsNotEmpty({ message: 'Reset token is required' })
  @IsUUID(4, { message: 'Reset token must be a valid UUID' })
  @ApiProperty({
    description: 'Password reset token (UUID v4) sent to the user',
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  token: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  @ApiProperty({
    description: 'New password meeting complexity requirements',
    minLength: 8,
    maxLength: 128,
    example: 'N3wP@ssw0rd!',
  })
  newPassword: string;

  @IsString({ message: 'Password confirmation must be a string' })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  @ApiProperty({
    description: 'Confirmation of the new password',
    example: 'N3wP@ssw0rd!',
  })
  confirmPassword: string;
}

export class ChangePasswordDto {
  @IsString({ message: 'Current password must be a string' })
  @IsNotEmpty({ message: 'Current password is required' })
  @ApiProperty({
    description: 'Current password of the authenticated user',
    example: 'OldP@ssw0rd!',
  })
  currentPassword: string;

  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @MaxLength(128, { message: 'New password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'New password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  @ApiProperty({
    description: 'New password meeting complexity requirements',
    minLength: 8,
    maxLength: 128,
    example: 'N3wP@ssw0rd!',
  })
  newPassword: string;

  @IsString({ message: 'Password confirmation must be a string' })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  @ApiProperty({
    description: 'Confirmation of the new password',
    example: 'N3wP@ssw0rd!',
  })
  confirmPassword: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    description: 'Operation message describing the result',
    example:
      'If an account with this email exists, we have sent password reset instructions.',
  })
  message: string;

  @ApiProperty({
    description: 'Email for which the password reset was requested',
    example: 'john.doe@example.com',
    format: 'email',
  })
  email: string;
}

export class ResetPasswordResponseDto {
  @ApiProperty({
    description: 'Operation message describing the result',
    example: 'Password reset successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Email of the account whose password was reset',
    example: 'john.doe@example.com',
    format: 'email',
  })
  email: string;
}

export class ChangePasswordResponseDto {
  @ApiProperty({
    description: 'Operation message describing the result',
    example: 'Password changed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Timestamp of the password change operation',
    example: '2024-05-23T10:20:30.000Z',
  })
  timestamp: Date;
}
