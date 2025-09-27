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
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';

import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService, UserQueryOptions } from './users.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto, CreateUserResponseDto } from './dto/create-user.dto';
import {
  UpdateUserDto,
  UpdateUserResponseDto,
  UpdateProfileDto,
} from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { Role } from '@prisma/client';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Create a new user (admin only)' })
  @ApiCreatedResponse({
    description: 'User created successfully',
    type: CreateUserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBody({ type: CreateUserDto })
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

  @ApiOperation({ summary: 'Get paginated list of users (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({
    name: 'isVerified',
    required: false,
    type: String,
    description: 'true or false',
  })
  @ApiOkResponse({ description: 'Users retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
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

  @ApiOperation({
    summary: 'Search users by name, email or phone (admin only)',
  })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({ description: 'Search completed successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
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

  @ApiOperation({ summary: 'Get user statistics (admin only)' })
  @ApiOkResponse({ description: 'User statistics retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
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

  @ApiOperation({ summary: 'Get users by role (admin only)' })
  @ApiParam({ name: 'role', enum: Role })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Users with role retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
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

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'Profile retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: Request & { user: { id: string } }) {
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

  @ApiOperation({ summary: 'Get a user by id (admin only)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'User retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
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

  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({ description: 'Profile updated successfully' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Req() req: Request & { user: { id: string } },
    @Body(ValidationPipe) updateProfileDto: UpdateProfileDto,
  ): Promise<UpdateUserResponseDto> {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  @ApiOperation({ summary: 'Update a user (admin only)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'User updated successfully' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @Patch(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ): Promise<UpdateUserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  @ApiOperation({ summary: 'Verify a user (admin only)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'User verified successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
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

  @ApiOperation({ summary: 'Unverify a user (admin only)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'User unverified successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
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

  @ApiOperation({ summary: 'Update a user role (admin only)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { role: { type: 'string', enum: Object.values(Role) } },
      required: ['role'],
    },
  })
  @ApiOkResponse({ description: 'User role updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
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

  @ApiOperation({ summary: 'Delete a user (admin only)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'User deleted successfully' })
  @ApiBadRequestResponse({
    description: 'Cannot delete user with associated records',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  @ApiOperation({ summary: 'Check if a user exists (admin only)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'Existence check completed' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
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

  @ApiOperation({ summary: 'Bulk create users (admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: { $ref: '#/components/schemas/CreateUserDto' },
        },
      },
      required: ['users'],
    },
  })
  @ApiCreatedResponse({ description: 'Bulk user creation completed' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push({
          index: i,

          success: false,

          error: message,
          user: body.users[i]?.email,
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

  @ApiOperation({ summary: 'Bulk delete users (admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
      },
      required: ['userIds'],
    },
  })
  @ApiOkResponse({ description: 'Bulk user deletion completed' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push({
          userId,

          success: false,

          error: message,
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
