import { User as PrismaUser, Role } from '@prisma/client';
import { Exclude } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiHideProperty,
} from '@nestjs/swagger';

/**
 * User entity with helpers and Swagger metadata
 */
export class UserEntity implements PrismaUser {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  email: string;

  @ApiHideProperty()
  @Exclude()
  password: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName: string;

  @ApiPropertyOptional({
    description: 'Phone number (Senegal) in international format',
    example: '+221771234567',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    description: 'User role',
    enum: Role,
    enumName: 'Role',
    example: 'USER',
  })
  role: Role;

  @ApiProperty({
    description: 'Email verification status',
    example: true,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-05-23T10:20:30.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-05-24T11:22:33.000Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get initials(): string {
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
  }

  get displayName(): string {
    return this.fullName;
  }

  isAdmin(): boolean {
    return this.role === Role.ADMIN;
  }

  isDriver(): boolean {
    return this.role === Role.DRIVER;
  }

  isUser(): boolean {
    return this.role === Role.USER;
  }

  hasRole(role: Role): boolean {
    return this.role === role;
  }

  canAccess(requiredRoles: Role[]): boolean {
    return requiredRoles.includes(this.role);
  }

  toJSON() {
    const { password, ...result } = this;
    return result;
  }

  toPublicProfile() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      role: this.role,
      isVerified: this.isVerified,
      fullName: this.fullName,
      initials: this.initials,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toBasicProfile() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      initials: this.initials,
      role: this.role,
    };
  }
}
