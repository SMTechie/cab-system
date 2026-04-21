export const userRoles = ['RIDER', 'DRIVER', 'ADMIN'] as const;

export type UserRole = (typeof userRoles)[number];

export function isValidRole(role: string): role is UserRole {
  return (userRoles as readonly string[]).includes(role);
}

export function hasRole(role: UserRole, allowed: readonly UserRole[]) {
  return allowed.includes(role);
}
