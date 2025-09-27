import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { UsersService, UserQueryOptions } from './users.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CreateUserDto, CreateUserResponseDto } from './dto/create-user.dto';
import {
  UpdateUserDto,
  UpdateUserResponseDto,
  UpdateProfileDto,
} from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) createUserDto: CreateUserDto,
  ): Promise<CreateUserResponseDto> {
    const user = await this.usersService.create(createUserDto);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
    @Query('role', new ParseEnumPipe(Role, { optional: true })) role?: Role,
    @Query('isVerified') isVerified?: string,
  ) {
    const options: UserQueryOptions = {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      role,
      isVerified: isVerified ? isVerified === 'true' : undefined,
    };

    const result = await this.usersService.findAll(options);
    return {
      ...result,
      message: 'Users retrieved successfully',
    };
  }

  @Get('search')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async searchUsers(
    @Query('q') query: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    if (!query || query.trim().length === 0) {
      return {
        users: [],
        message: 'Search query is required',
      };
    }

    const users = await this.usersService.searchUsers(query.trim(), limit);
    return {
      users,
      total: users.length,
      message: 'Search completed successfully',
    };
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getUserStats() {
    const stats = await this.usersService.getUserStats();
    return {
      ...stats,
      message: 'User statistics retrieved successfully',
    };
  }

  @Get('by-role/:role')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async findUsersByRole(
    @Param('role', new ParseEnumPipe(Role)) role: Role,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const users = await this.usersService.findUsersByRole(role, limit);
    return {
      users,
      total: users.length,
      role,
      message: `Users with role ${role} retrieved successfully`,
    };
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      throw new Error('User not found');
    }

    const userEntity = new UserEntity(user);
    return {
      user: userEntity.toPublicProfile(),
      message: 'Profile retrieved successfully',
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return {
        user: null,
        message: 'User not found',
      };
    }

    const userEntity = new UserEntity(user);
    return {
      user: userEntity.toPublicProfile(),
      message: 'User retrieved successfully',
    };
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req,
    @Body(ValidationPipe) updateProfileDto: UpdateProfileDto,
  ): Promise<UpdateUserResponseDto> {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ): Promise<UpdateUserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/verify')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async verifyUser(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.verifyUser(id);
    const userEntity = new UserEntity(user);
    return {
      user: userEntity.toPublicProfile(),
      message: 'User verified successfully',
    };
  }

  @Patch(':id/unverify')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async unverifyUser(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.unverifyUser(id);
    const userEntity = new UserEntity(user);
    return {
      user: userEntity.toPublicProfile(),
      message: 'User unverified successfully',
    };
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { role: Role },
  ) {
    const user = await this.usersService.updateRole(id, body.role);
    const userEntity = new UserEntity(user);
    return {
      user: userEntity.toPublicProfile(),
      message: `User role updated to ${body.role} successfully`,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  @Get(':id/exists')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async checkUserExists(@Param('id', ParseUUIDPipe) id: string) {
    const exists = await this.usersService.validateUserExists(id);
    return {
      exists,
      message: exists ? 'User exists' : 'User does not exist',
    };
  }

  @Post('bulk-create')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(@Body() body: { users: CreateUserDto[] }) {
    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < body.users.length; i++) {
      try {
        const user = await this.usersService.create(body.users[i]);
        results.push({
          index: i,
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        });
      } catch (error: any) {
        errors.push({
          index: i,
          success: false,
          error: error.message,
          user: body.users[i].email,
        });
      }
    }

    return {
      results,
      errors,
      summary: {
        total: body.users.length,
        successful: results.length,
        failed: errors.length,
      },
      message: `Bulk user creation completed. ${results.length} successful, ${errors.length} failed.`,
    };
  }

  @Delete('bulk-delete')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() body: { userIds: string[] }) {
    const results: any[] = [];
    const errors: any[] = [];

    for (const userId of body.userIds) {
      try {
        await this.usersService.remove(userId);
        results.push({
          userId,
          success: true,
        });
      } catch (error: any) {
        errors.push({
          userId,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      results,
      errors,
      summary: {
        total: body.userIds.length,
        successful: results.length,
        failed: errors.length,
      },
      message: `Bulk user deletion completed. ${results.length} successful, ${errors.length} failed.`,
    };
  }
}
