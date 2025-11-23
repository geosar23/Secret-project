import { AccessContext } from "../interfaces/permission.interface";

// Re-export for backwards compatibility
export type { AccessContext };

/**
 * Attribute rules for ABAC (Attribute-Based Access Control)
 * These functions determine if a user has access based on attributes/relationships
 */
export const ATTRIBUTE_RULES = {
    /**
     * User is the resource owner (viewing/editing own profile)
     */
    isSelf: (ctx: AccessContext): boolean => {
        return ctx.user._id === ctx.resource._id || ctx.user._id === ctx.resource.userId;
    },

    /**
     * User is the direct manager of the resource owner
     */
    isDirectManager: (ctx: AccessContext): boolean => {
        return ctx.user._id === ctx.resource.managerId;
    },

    /**
     * User manages the department that the resource belongs to
     */
    managesDepartment: (ctx: AccessContext): boolean => {
        if (!ctx.user.managedDepartments || !ctx.resource.departmentId) {
            return false;
        }
        return ctx.user.managedDepartments.includes(ctx.resource.departmentId as string);
    },

    /**
     * Resource is in the same department as the user
     */
    sameDepartment: (ctx: AccessContext): boolean => {
        return !!ctx.user.departmentId && ctx.user.departmentId === ctx.resource.departmentId;
    },

    /**
     * Resource belongs to the same company (multi-tenant isolation)
     */
    sameCompany: (ctx: AccessContext): boolean => {
        return ctx.user.companyId === ctx.resource.companyId;
    },

    /**
     * Resource belongs to user's managed team
     * (Either direct manager OR manages the department)
     */
    inManagedTeam: (ctx: AccessContext): boolean => {
        if (!ctx.resource.managerId && !ctx.resource.departmentId) {
            return false;
        }

        // Check if user is the direct manager
        const isDirectManager = ctx.user._id === ctx.resource.managerId;

        // Check if user manages the department
        const managesDept = ctx.user.managedDepartments?.includes(ctx.resource.departmentId as string) || false;

        return isDirectManager || managesDept;
    },
};

/**
 * Scope handlers map permission scopes to attribute rules
 * Used to evaluate permissions like "employees:view:managed"
 */
// eslint-disable-next-line no-unused-vars
export const SCOPE_HANDLERS: Record<string, (ctx: AccessContext) => boolean> = {
    self: ATTRIBUTE_RULES.isSelf,
    managed: ATTRIBUTE_RULES.inManagedTeam,
    department: ATTRIBUTE_RULES.managesDepartment,
    company: ATTRIBUTE_RULES.sameCompany,
    all: () => true, // No restriction
};
