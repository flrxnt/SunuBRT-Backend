import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: Role.USER,
  };

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        phone: '+221771234567',
        role: Role.USER,
      };

      const registerResult = {
        id: 'user-1',
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone,
        role: registerDto.role,
        isVerified: false,
        createdAt: new Date(),
        message: 'User registered successfully',
      };

      mockAuthService.register.mockResolvedValue(registerResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(registerResult);
      expect(service.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const loginResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
        expiresIn: '24h',
        message: 'Login successful',
      };

      mockAuthService.login.mockResolvedValue(loginResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(loginResult);
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens', async () => {
      const refreshTokenDto = {
        refreshToken: 'refresh-token',
      };

      const refreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: '24h',
        message: 'Token refreshed successfully',
      };

      mockAuthService.refreshToken.mockResolvedValue(refreshResult);

      const result = await controller.refreshToken(refreshTokenDto);

      expect(result).toEqual(refreshResult);
      expect(service.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
    });
  });

  describe('forgotPassword', () => {
    it('should handle forgot password request', async () => {
      const forgotPasswordDto = {
        email: 'test@example.com',
      };

      const forgotPasswordResult = {
        message: 'If an account with this email exists, we have sent password reset instructions.',
        email: forgotPasswordDto.email,
      };

      mockAuthService.forgotPassword.mockResolvedValue(forgotPasswordResult);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result).toEqual(forgotPasswordResult);
      expect(service.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto);
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      const changePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
        confirmPassword: 'newpassword',
      };

      const changePasswordResult = {
        message: 'Password changed successfully',
        email: 'test@example.com',
      };

      mockAuthService.changePassword.mockResolvedValue(changePasswordResult);

      const result = await controller.changePassword(
        changePasswordDto,
        mockUser as any,
      );

      expect(result).toEqual(changePasswordResult);
      expect(service.changePassword).toHaveBeenCalledWith(
        'user-1',
        changePasswordDto,
      );
    });
  });
});
