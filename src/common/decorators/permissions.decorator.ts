import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export enum Permission {
  // Bus permissions
  CREATE_BUS = 'create:bus',
  READ_BUS = 'read:bus',
  UPDATE_BUS = 'update:bus',
  DELETE_BUS = 'delete:bus',
  UPDATE_BUS_POSITION = 'update:bus:position',
  READ_BUS_STATISTICS = 'read:bus:statistics',
  READ_OWN_BUS = 'read:own:bus',
  UPDATE_OWN_BUS_POSITION = 'update:own:bus:position',

  // User permissions
  CREATE_USER = 'create:user',
  READ_USER = 'read:user',
  UPDATE_USER = 'update:user',
  DELETE_USER = 'delete:user',
  READ_USER_STATISTICS = 'read:user:statistics',
  UPDATE_USER_ROLE = 'update:user:role',
  VERIFY_USER = 'verify:user',
  READ_OWN_PROFILE = 'read:own:profile',
  UPDATE_OWN_PROFILE = 'update:own:profile',

  // Line permissions
  CREATE_LINE = 'create:line',
  READ_LINE = 'read:line',
  UPDATE_LINE = 'update:line',
  DELETE_LINE = 'delete:line',

  // Route permissions
  CREATE_ROUTE = 'create:route',
  READ_ROUTE = 'read:route',
  UPDATE_ROUTE = 'update:route',
  DELETE_ROUTE = 'delete:route',

  // Stop permissions
  CREATE_STOP = 'create:stop',
  READ_STOP = 'read:stop',
  UPDATE_STOP = 'update:stop',
  DELETE_STOP = 'delete:stop',

  // Trip permissions
  CREATE_TRIP = 'create:trip',
  READ_TRIP = 'read:trip',
  UPDATE_TRIP = 'update:trip',
  DELETE_TRIP = 'delete:trip',

  // Ticket permissions
  CREATE_TICKET = 'create:ticket',
  READ_TICKET = 'read:ticket',
  UPDATE_TICKET = 'update:ticket',
  DELETE_TICKET = 'delete:ticket',
  READ_OWN_TICKET = 'read:own:ticket',

  // Payment permissions
  CREATE_PAYMENT = 'create:payment',
  READ_PAYMENT = 'read:payment',
  UPDATE_PAYMENT = 'update:payment',
  READ_OWN_PAYMENT = 'read:own:payment',

  // System permissions
  READ_SYSTEM_STATS = 'read:system:stats',
  MANAGE_SYSTEM = 'manage:system',
}

export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Map des permissions par rôle
 */
export const RolePermissions = {
  USER: [
    Permission.READ_BUS,
    Permission.READ_LINE,
    Permission.READ_ROUTE,
    Permission.READ_STOP,
    Permission.READ_TRIP,
    Permission.CREATE_TICKET,
    Permission.READ_OWN_TICKET,
    Permission.CREATE_PAYMENT,
    Permission.READ_OWN_PAYMENT,
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
  ],
  DRIVER: [
    // Permissions des utilisateurs
    Permission.READ_BUS,
    Permission.READ_LINE,
    Permission.READ_ROUTE,
    Permission.READ_STOP,
    Permission.READ_TRIP,
    Permission.CREATE_TICKET,
    Permission.READ_OWN_TICKET,
    Permission.CREATE_PAYMENT,
    Permission.READ_OWN_PAYMENT,
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
    // Permissions spécifiques aux conducteurs
    Permission.READ_OWN_BUS,
    Permission.UPDATE_OWN_BUS_POSITION,
    Permission.UPDATE_TRIP,
  ],
  ADMIN: [
    // Toutes les permissions
    ...Object.values(Permission),
  ],
};

/**
 * Vérifie si un rôle a une permission spécifique
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const rolePerms = RolePermissions[role as keyof typeof RolePermissions];
  return rolePerms?.includes(permission) ?? false;
}

/**
 * Récupère toutes les permissions pour un rôle
 */
export function getPermissionsForRole(role: string): Permission[] {
  return RolePermissions[role as keyof typeof RolePermissions] || [];
}

/**
 * Décorateurs de permissions courantes
 */
export const RequiresBusManagement = () =>
  Permissions(
    Permission.CREATE_BUS,
    Permission.UPDATE_BUS,
    Permission.DELETE_BUS,
  );

export const RequiresBusRead = () => Permissions(Permission.READ_BUS);

export const RequiresBusPositionUpdate = () =>
  Permissions(
    Permission.UPDATE_BUS_POSITION,
    Permission.UPDATE_OWN_BUS_POSITION,
  );

export const RequiresUserManagement = () =>
  Permissions(
    Permission.CREATE_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
  );

export const RequiresUserRead = () => Permissions(Permission.READ_USER);

export const RequiresAdminAccess = () =>
  Permissions(Permission.MANAGE_SYSTEM, Permission.READ_SYSTEM_STATS);

export const RequiresOwnResourceAccess = () =>
  Permissions(Permission.READ_OWN_PROFILE, Permission.UPDATE_OWN_PROFILE);

export const RequiresLineManagement = () =>
  Permissions(
    Permission.CREATE_LINE,
    Permission.UPDATE_LINE,
    Permission.DELETE_LINE,
  );

export const RequiresLineRead = () => Permissions(Permission.READ_LINE);

export const RequiresRouteManagement = () =>
  Permissions(
    Permission.CREATE_ROUTE,
    Permission.UPDATE_ROUTE,
    Permission.DELETE_ROUTE,
  );

export const RequiresRouteRead = () => Permissions(Permission.READ_ROUTE);

export const RequiresStopManagement = () =>
  Permissions(
    Permission.CREATE_STOP,
    Permission.UPDATE_STOP,
    Permission.DELETE_STOP,
  );

export const RequiresStopRead = () => Permissions(Permission.READ_STOP);

export const RequiresTripManagement = () =>
  Permissions(
    Permission.CREATE_TRIP,
    Permission.UPDATE_TRIP,
    Permission.DELETE_TRIP,
  );

export const RequiresTripRead = () => Permissions(Permission.READ_TRIP);
