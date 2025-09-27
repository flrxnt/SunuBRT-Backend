import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Param,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiParam,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { Public } from '../common/decorators/public.decorator';
import {
  RegisterDto,
  RegisterResponseDto,
  LoginDto,
  LoginResponseDto,
  RefreshTokenDto,
  RefreshTokenResponseDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
  ChangePasswordDto,
  ChangePasswordResponseDto,
} from './dto';

type AuthenticatedRequest = Request & {
  user: { id: string } & Record<string, unknown>;
};

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({
    description:
      'User registered successfully. Please check your email for verification.',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'User with this email/phone exists' })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body(ValidationPipe) registerDto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ description: 'Login successful', type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiBody({ type: LoginDto })
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
  ): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiOkResponse({
    description: 'Token refreshed successfully',
    type: RefreshTokenResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(
    @Body(ValidationPipe) refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshTokenResponseDto> {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiOkResponse({
    description:
      'If an account with this email exists, password reset instructions are sent.',
    type: ForgotPasswordResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(
    @Body(ValidationPipe) forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a valid reset token' })
  @ApiOkResponse({
    description: 'Password reset successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid token or validation error' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(
    @Body(ValidationPipe) resetPasswordDto: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiOkResponse({
    description: 'Password changed successfully',
    type: ChangePasswordResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized or incorrect password',
  })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout by revoking a refresh token' })
  @ApiOkResponse({
    description: 'Logged out successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  async logout(
    @Body() body: { refreshToken: string },
  ): Promise<{ message: string }> {
    return this.authService.logout(body.refreshToken);
  }

  @Public()
  @Get('verify-email/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email using a verification token' })
  @ApiParam({ name: 'token', type: String })
  @ApiOkResponse({
    description: 'Email verification processed',
    schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
    },
  })
  @ApiBadRequestResponse({
    description: 'Verification not implemented or invalid',
  })
  async verifyEmail(
    @Param('token') token: string,
  ): Promise<{ message: string }> {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiOkResponse({
    description: 'Verification email sent successfully',
    schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
    },
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Email already verified or invalid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'john.doe@example.com',
        },
      },
      required: ['email'],
    },
  })
  async resendVerificationEmail(
    @Body() body: { email: string },
  ): Promise<{ message: string }> {
    return this.authService.resendVerificationEmail(body.email);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiOkResponse({
    description: 'Profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        user: { type: 'object' },
        message: { type: 'string', example: 'Profile retrieved successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getProfile(@Req() req: AuthenticatedRequest) {
    return {
      user: req.user,
      message: 'Profile retrieved successfully',
    };
  }

  @UseGuards(AuthGuard)
  @Get('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate current access token' })
  @ApiOkResponse({
    description: 'Token is valid',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
        user: { type: 'object' },
        message: { type: 'string', example: 'Token is valid' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  validateToken(@Req() req: AuthenticatedRequest) {
    return {
      valid: true,
      user: req.user,
      message: 'Token is valid',
    };
  }

  @UseGuards(AuthGuard)
  @Post('revoke-all-tokens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all refresh tokens for the current user' })
  @ApiOkResponse({
    description: 'All refresh tokens revoked successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'All refresh tokens revoked successfully',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async revokeAllTokens(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.authService.revokeAllUserTokens(req.user.id);
    return {
      message: 'All refresh tokens revoked successfully',
    };
  }
}
