import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { User, Role, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  UpdateUserDto,
  UpdateUserResponseDto,
  UpdateProfileDto,
} from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { BcryptUtil } from '../common/utils/bcrypt.util';

export interface UserQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  role?: Role;
  isVerified?: boolean;
  includeDeleted?: boolean;
}

export interface PaginatedUsers {
  users: UserEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.findByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Check if phone number is already taken
      if (createUserDto.phone) {
        const existingPhoneUser = await this.findByPhone(createUserDto.phone);
        if (existingPhoneUser) {
          throw new ConflictException(
            'User with this phone number already exists',
          );
        }
      }

      // Hash password if not already hashed
      let hashedPassword = createUserDto.password;
      if (!createUserDto.password.startsWith('$2b$')) {
        hashedPassword = await BcryptUtil.hashPassword(createUserDto.password);
      }

      const userData: Prisma.UserCreateInput = {
        email: createUserDto.email,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        phone: createUserDto.phone,
        role: createUserDto.role || Role.USER,
        isVerified: false,
      };

      const user = await this.prisma.user.create({
        data: userData,
      });

      return user;
      throw new InternalServerErrorException('Failed to create user');
    } catch (error: any) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('email')) {
          throw new ConflictException('User with this email already exists');
        }
        if (error.meta?.target?.includes('phone')) {
          throw new ConflictException(
            'User with this phone number already exists',
          );
        }
      }
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findAll(options: UserQueryOptions = {}): Promise<PaginatedUsers> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        role,
        isVerified,
        // includeDeleted = false,
      } = options;

      const skip = (page - 1) * limit;

      const where: Prisma.UserWhereInput = {};

      // Add search filter
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Add role filter
      if (role) {
        where.role = role;
      }

      // Add verification filter
      if (typeof isVerified === 'boolean') {
        where.isVerified = isVerified;
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        this.prisma.user.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        users: users.map((user) => new UserEntity(user)),
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve users');
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to find user');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to find user');
    }
  }

  async findByPhone(phone: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { phone },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to find user');
    }
  }

  async findOne(identifier: string): Promise<User | null> {
    try {
      // Try to find by email first, then by ID
      const userByEmail = await this.findByEmail(identifier);
      if (userByEmail) {
        return userByEmail;
      }

      return await this.findById(identifier);
    } catch (error) {
      throw new InternalServerErrorException('Failed to find user');
    }
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UpdateUserResponseDto> {
    try {
      // Check if user exists
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      // Check email uniqueness if email is being updated
      if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
        const emailExists = await this.findByEmail(updateUserDto.email);
        if (emailExists) {
          throw new ConflictException('User with this email already exists');
        }
      }

      // Check phone uniqueness if phone is being updated
      if (updateUserDto.phone && updateUserDto.phone !== existingUser.phone) {
        const phoneExists = await this.findByPhone(updateUserDto.phone);
        if (phoneExists) {
          throw new ConflictException(
            'User with this phone number already exists',
          );
        }
      }

      const updateData: Prisma.UserUpdateInput = {
        ...updateUserDto,
        email: updateUserDto.email?.toLowerCase(),
        updatedAt: new Date(),
      };

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
      });

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone || undefined,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        message: 'User updated successfully',
      };
      throw new InternalServerErrorException('Failed to update user');
    } catch (error: any) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('email')) {
          throw new ConflictException('User with this email already exists');
        }
        if (error.meta?.target?.includes('phone')) {
          throw new ConflictException(
            'User with this phone number already exists',
          );
        }
      }
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UpdateUserResponseDto> {
    try {
      // Check if user exists
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      // Check phone uniqueness if phone is being updated
      if (
        updateProfileDto.phone &&
        updateProfileDto.phone !== existingUser.phone
      ) {
        const phoneExists = await this.findByPhone(updateProfileDto.phone);
        if (phoneExists) {
          throw new ConflictException(
            'User with this phone number already exists',
          );
        }
      }

      const updateData: Prisma.UserUpdateInput = {
        ...updateProfileDto,
        updatedAt: new Date(),
      };

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
      });

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone || undefined,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        message: 'Profile updated successfully',
      };
      throw new InternalServerErrorException('Failed to update profile');
    } catch (error: any) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('phone')) {
          throw new ConflictException(
            'User with this phone number already exists',
          );
        }
      }
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  async updatePassword(id: string, hashedPassword: string): Promise<User> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      return await this.prisma.user.update({
        where: { id },
        data: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update password');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      await this.prisma.user.delete({
        where: { id },
      });

      return {
        message: 'User deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete user with associated records',
        );
      }
      throw new InternalServerErrorException('Failed to delete user');
    }
  }

  async verifyUser(id: string): Promise<User> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.isVerified) {
        throw new BadRequestException('User is already verified');
      }

      return await this.prisma.user.update({
        where: { id },
        data: {
          isVerified: true,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to verify user');
    }
  }

  async unverifyUser(id: string): Promise<User> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.isVerified) {
        throw new BadRequestException('User is not verified');
      }

      return await this.prisma.user.update({
        where: { id },
        data: {
          isVerified: false,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to unverify user');
    }
  }

  async updateRole(id: string, role: Role): Promise<User> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role === role) {
        throw new BadRequestException(`User already has role: ${role}`);
      }

      return await this.prisma.user.update({
        where: { id },
        data: {
          role,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update user role');
    }
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    verifiedUsers: number;
    unverifiedUsers: number;
    usersByRole: Record<string, number>;
    recentUsers: number;
  }> {
    try {
      const [
        totalUsers,
        verifiedUsers,
        unverifiedUsers,
        usersByRole,
        recentUsers,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isVerified: true } }),
        this.prisma.user.count({ where: { isVerified: false } }),
        this.prisma.user.groupBy({
          by: ['role'],
          _count: {
            role: true,
          },
        }),
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
      ]);

      const roleStats = usersByRole.reduce(
        (acc, curr) => {
          acc[curr.role] = curr._count.role;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        totalUsers,
        verifiedUsers,
        unverifiedUsers,
        usersByRole: roleStats,
        recentUsers,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get user statistics');
    }
  }

  async searchUsers(query: string, limit: number = 10): Promise<UserEntity[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return users.map((user) => new UserEntity(user));
    } catch (error) {
      throw new InternalServerErrorException('Failed to search users');
    }
  }

  async findUsersByRole(role: Role, limit?: number): Promise<UserEntity[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: { role },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return users.map((user) => new UserEntity(user));
    } catch (error) {
      throw new InternalServerErrorException('Failed to find users by role');
    }
  }

  async validateUserExists(id: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });

      return !!user;
    } catch {
      return false;
    }
  }
}
