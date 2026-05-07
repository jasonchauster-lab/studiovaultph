export type UserRole = 'admin' | 'studio' | 'instructor' | 'customer' | 'staff';

export const ROLES = {
    ADMIN: 'admin' as UserRole,
    STUDIO: 'studio' as UserRole,
    AGENCY: 'studio' as UserRole, // Alias for rebranding
    INSTRUCTOR: 'instructor' as UserRole,
    STAFF: 'instructor' as UserRole, // Alias for rebranding staff/instructors
    CUSTOMER: 'customer' as UserRole,
} as const;

export function isAdmin(role?: string | null): boolean {
    return role === ROLES.ADMIN;
}

export function isStudio(role?: string | null): boolean {
    return role === ROLES.STUDIO;
}

export function isAgency(role?: string | null): boolean {
    return isStudio(role);
}

export function isInstructor(role?: string | null): boolean {
    return role === ROLES.INSTRUCTOR;
}

export function isCustomer(role?: string | null): boolean {
    return role === ROLES.CUSTOMER;
}

export function canAccessStudioPortal(role?: string | null): boolean {
    return isAdmin(role) || isStudio(role);
}

export function canAccessAdminPortal(role?: string | null): boolean {
    return isAdmin(role);
}

export function canAccessCustomerPortal(role?: string | null): boolean {
    return isAdmin(role) || isCustomer(role);
}
