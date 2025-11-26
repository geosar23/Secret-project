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
        return (
            ctx.user._id?.toString() === ctx.resource._id?.toString() ||
            ctx.user._id?.toString() === ctx.resource.userId?.toString()
        );
    },

    /**
     * User is the direct manager of the resource owner
     */
    isDirectManager: (ctx: AccessContext): boolean => {
        return ctx.user._id?.toString() === ctx.resource.managerId?.toString();
    },

    /**
     * User manages the department that the resource belongs to
     */
    managesDepartment: (ctx: AccessContext): boolean => {
        if (!ctx.user.managedDepartments || !ctx.resource.departmentId) {
            return false;
        }
        return ctx.user.managedDepartments.map(d => d?.toString()).includes(ctx.resource.departmentId?.toString());
    },

    /**
     * Resource is in the same department as the user
     */
    sameDepartment: (ctx: AccessContext): boolean => {
        return !!ctx.user.departmentId && ctx.user.departmentId?.toString() === ctx.resource.departmentId?.toString();
    },

    /**
     * Resource belongs to the same company (multi-tenant isolation)
     */
    sameCompany: (ctx: AccessContext): boolean => {
        return ctx.user.companyId?.toString() === ctx.resource.companyId?.toString();
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
        const isDirectManager = ctx.user._id?.toString() === ctx.resource.managerId?.toString();

        // Check if user manages the department
        const resourceDeptId = ctx.resource.departmentId?.toString();
        const managesDept = resourceDeptId
            ? ctx.user.managedDepartments?.map(d => d?.toString()).includes(resourceDeptId) || false
            : false;

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
