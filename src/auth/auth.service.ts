import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { BcryptUtil } from '../common/utils/bcrypt.util';
import { DateUtil } from '../common/utils/date.util';
import { PrismaService } from '../database/prisma.service';
import { User, Role } from '@prisma/client';
import {
  RegisterDto,
  RegisterResponseDto,
  LoginDto,
  LoginResponseDto,
  RefreshTokenDto,
  RefreshTokenResponseDto,
} from './dto';
import {
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
  ChangePasswordDto,
  ChangePasswordResponseDto,
} from './dto/reset-password.dto';
import { JwtPayload, JwtRefreshPayload } from '../config/jwt.config';
import { UserEntity } from '../users/entities/user.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  private refreshTokens: Map<
    string,
    { userId: string; expiresAt: Date; version: number }
  > = new Map();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    try {
      // Check if user already exists
      const existingUser = await this.usersService.findByEmail(
        registerDto.email,
      );
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Check if phone number is already taken
      if (registerDto.phone) {
        const existingPhoneUser = await this.usersService.findByPhone(
          registerDto.phone,
        );
        if (existingPhoneUser) {
          throw new ConflictException(
            'User with this phone number already exists',
          );
        }
      }

      // Hash password
      const hashedPassword = await BcryptUtil.hashPassword(
        registerDto.password,
      );

      // Create user
      const userData = {
        email: registerDto.email,
        password: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone,
        role: registerDto.role || Role.USER,
        isVerified: false,
      };

      const user = await this.usersService.create(userData);

      // TODO: Send verification email
      await this.sendVerificationEmail(user);

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        message:
          'User registered successfully. Please check your email for verification.',
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to register user');
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    try {
      // Validate user credentials
      const user = await this.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Check if user is verified
      if (!user.isVerified) {
        throw new UnauthorizedException(
          'Please verify your email address before logging in',
        );
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
        },
        expiresIn: '24h',
        message: 'Login successful',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Login failed');
    }
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshTokenResponseDto> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync(
        refreshTokenDto.refreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET,
        },
      );

      // Check if refresh token exists and is valid
      const storedToken = this.refreshTokens.get(refreshTokenDto.refreshToken);
      if (!storedToken || storedToken.version !== payload.tokenVersion) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is expired
      if (DateUtil.isExpired(storedToken.expiresAt)) {
        this.refreshTokens.delete(refreshTokenDto.refreshToken);
        throw new UnauthorizedException('Refresh token expired');
      }

      // Get user
      const user = await this.usersService.findById(storedToken.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Remove old refresh token
      this.refreshTokens.delete(refreshTokenDto.refreshToken);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: '24h',
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Token refresh failed');
    }
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    try {
      const user = await this.usersService.findByEmail(forgotPasswordDto.email);
      if (!user) {
        // Don't reveal that user doesn't exist
        return {
          message:
            'If an account with this email exists, we have sent password reset instructions.',
          email: forgotPasswordDto.email,
        };
      }

      // Generate reset token
      const resetToken = randomUUID();
      const expiresAt = DateUtil.addHours(new Date(), 1); // Token expires in 1 hour

      // Store reset token in database
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          // You might want to add resetToken and resetTokenExpiresAt fields to your User model
          updatedAt: new Date(),
        },
      });

      // TODO: Send password reset email
      await this.sendPasswordResetEmail(user, resetToken);

      return {
        message:
          'If an account with this email exists, we have sent password reset instructions.',
        email: forgotPasswordDto.email,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to process password reset request',
      );
    }
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    try {
      // Validate passwords match
      if (resetPasswordDto.newPassword !== resetPasswordDto.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }

      // TODO: Verify reset token from database
      // For now, we'll just find a user - in production, you'd verify the token

      // Hash new password
      const hashedPassword = await BcryptUtil.hashPassword(
        resetPasswordDto.newPassword,
      );

      // Update user password
      // You would typically find user by reset token
      // const user = await this.usersService.findByResetToken(resetPasswordDto.token);

      // For demo purposes, we'll throw an error since we don't have reset token storage
      throw new BadRequestException(
        'Reset token functionality requires database schema update',
      );

      // This would be the actual implementation:
      // await this.usersService.updatePassword(user.id, hashedPassword);

      // return {
      //   message: 'Password reset successfully',
      //   email: user.email,
      // };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Password reset failed');
    }
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    try {
      // Validate passwords match
      if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
        throw new BadRequestException('New passwords do not match');
      }

      // Get user
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await BcryptUtil.comparePassword(
        changePasswordDto.currentPassword,
        user.password,
      );

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Check if new password is different from current
      const isSamePassword = await BcryptUtil.comparePassword(
        changePasswordDto.newPassword,
        user.password,
      );

      if (isSamePassword) {
        throw new BadRequestException(
          'New password must be different from current password',
        );
      }

      // Hash new password
      const hashedPassword = await BcryptUtil.hashPassword(
        changePasswordDto.newPassword,
      );

      // Update password
      await this.usersService.updatePassword(userId, hashedPassword);

      return {
        message: 'Password changed successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Password change failed');
    }
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    try {
      // Remove refresh token
      this.refreshTokens.delete(refreshToken);

      return {
        message: 'Logged out successfully',
      };
    } catch (error) {
      throw new InternalServerErrorException('Logout failed');
    }
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        return null;
      }

      const isPasswordValid = await BcryptUtil.comparePassword(
        password,
        user.password,
      );
      if (!isPasswordValid) {
        return null;
      }

      return user;
    } catch (error) {
      return null;
    }
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      // TODO: Implement email verification logic
      // This would require storing verification tokens in the database
      throw new BadRequestException(
        'Email verification functionality requires implementation',
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Email verification failed');
    }
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.isVerified) {
        throw new BadRequestException('Email is already verified');
      }

      // TODO: Send verification email
      await this.sendVerificationEmail(user);

      return {
        message: 'Verification email sent successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to resend verification email',
      );
    }
  }

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const tokenVersion = Date.now();
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      tokenVersion,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }),
    ]);

    // Store refresh token
    const expiresAt = DateUtil.addDays(new Date(), 7);
    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt,
      version: tokenVersion,
    });

    return { accessToken, refreshToken };
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    // TODO: Implement email sending logic
    // This would integrate with an email service like SendGrid, AWS SES, etc.
    console.log(`Sending verification email to ${user.email}`);

    // Generate verification token
    const verificationToken = randomUUID();
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    console.log(`Verification URL: ${verificationUrl}`);

    // In a real implementation, you would:
    // 1. Store the verification token in the database
    // 2. Send an email with the verification link
    // 3. Handle the verification when the user clicks the link
  }

  private async sendPasswordResetEmail(
    user: User,
    resetToken: string,
  ): Promise<void> {
    // TODO: Implement email sending logic
    console.log(`Sending password reset email to ${user.email}`);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    console.log(`Password reset URL: ${resetUrl}`);

    // In a real implementation, you would:
    // 1. Store the reset token in the database with expiration
    // 2. Send an email with the reset link
    // 3. Handle the password reset when the user submits the form
  }

  // Helper method to clean up expired refresh tokens
  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.refreshTokens.entries()) {
      if (DateUtil.isExpired(data.expiresAt)) {
        this.refreshTokens.delete(token);
      }
    }
  }

  // Method to revoke all refresh tokens for a user (useful for security)
  async revokeAllUserTokens(userId: string): Promise<void> {
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.userId === userId) {
        this.refreshTokens.delete(token);
      }
    }
  }
}
