import { User as PrismaUser, Role } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserEntity implements PrismaUser {
  id: string;
  email: string;

  @Exclude()
  password: string;

  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  isVerified: boolean;
  createdAt: Date;
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
