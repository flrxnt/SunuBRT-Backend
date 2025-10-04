import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { BcryptUtil } from '../common/utils/bcrypt.util';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    phone: '+221771234567',
    role: Role.USER,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
      phone: '+221771234567',
      role: Role.USER,
    };

    it('should successfully register a new user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByPhone.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      jest.spyOn(service as any, 'sendVerificationEmail').mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email', mockUser.email);
      expect(result).toHaveProperty('message');
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockUsersService.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
    });

    it('should throw ConflictException if phone number already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByPhone.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUsersService.findByPhone).toHaveBeenCalledWith(registerDto.phone);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login a user', async () => {
      jest.spyOn(service as any, 'validateUser').mockResolvedValue(mockUser);
      jest.spyOn(service as any, 'generateTokens').mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      jest.spyOn(service as any, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not verified', async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      jest.spyOn(service as any, 'validateUser').mockResolvedValue(unverifiedUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(BcryptUtil, 'comparePassword').mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(BcryptUtil, 'comparePassword').mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('changePassword', () => {
    const changePasswordDto = {
      currentPassword: 'oldpassword',
      newPassword: 'newpassword',
      confirmPassword: 'newpassword',
    };

    it('should successfully change password', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      jest.spyOn(BcryptUtil, 'comparePassword')
        .mockResolvedValueOnce(true)  // current password check
        .mockResolvedValueOnce(false); // new password different check
      jest.spyOn(BcryptUtil, 'hashPassword').mockResolvedValue('$2b$10$newhashed');
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.changePassword('1', changePasswordDto);

      expect(result).toHaveProperty('message');
      expect(mockUsersService.findById).toHaveBeenCalledWith('1');
    });

    it('should throw BadRequestException if passwords do not match', async () => {
      const invalidDto = {
        ...changePasswordDto,
        confirmPassword: 'different',
      };

      await expect(service.changePassword('1', invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.changePassword('1', changePasswordDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      jest.spyOn(BcryptUtil, 'comparePassword').mockResolvedValue(false);

      await expect(service.changePassword('1', changePasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should send password reset email if user exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      jest.spyOn(service as any, 'sendPasswordResetEmail').mockResolvedValue(undefined);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toHaveProperty('message');
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(forgotPasswordDto.email);
    });

    it('should return generic message if user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toHaveProperty('message');
      expect(result.email).toBe(forgotPasswordDto.email);
    });
  });
});
