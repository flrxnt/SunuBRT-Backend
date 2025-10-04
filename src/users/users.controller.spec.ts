import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    phone: '+221771234567',
    role: Role.USER,
    isVerified: true,
  };

  const mockUsersService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateProfile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const paginatedResult = {
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };

      mockUsersService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({});

      expect(result).toEqual(paginatedResult);
      expect(service.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.findOne('user-1');

      expect(result).toEqual(mockUser);
      expect(service.findById).toHaveBeenCalledWith('user-1');
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const updateResult = {
        user: { ...mockUser, ...updateUserDto },
        message: 'User updated successfully',
      };

      mockUsersService.update.mockResolvedValue(updateResult);

      const result = await controller.update('user-1', updateUserDto);

      expect(result).toEqual(updateResult);
      expect(service.update).toHaveBeenCalledWith('user-1', updateUserDto);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove('user-1');

      expect(service.remove).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateProfileDto = {
        firstName: 'Updated',
        lastName: 'Profile',
      };

      const updateResult = {
        user: { ...mockUser, ...updateProfileDto },
        message: 'Profile updated successfully',
      };

      mockUsersService.updateProfile.mockResolvedValue(updateResult);

      const result = await controller.updateProfile(
        updateProfileDto,
        mockUser as any,
      );

      expect(result).toEqual(updateResult);
      expect(service.updateProfile).toHaveBeenCalledWith(
        'user-1',
        updateProfileDto,
      );
    });
  });
});
