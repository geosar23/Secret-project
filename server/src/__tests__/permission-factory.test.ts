import {
    definePermissions,
    prefixedKeys,
    PermissionKeys,
    USERS_MANAGEMENT_PERMISSIONS,
    COUNTRIES_MANAGEMENT_PERMISSIONS,
    USER_PROFILE_PERMISSIONS,
    ROLES_MANAGEMENT_PERMISSIONS,
} from "../enums/permissions.enum";

// ─── definePermissions ────────────────────────────────────────────────────────

describe("definePermissions()", () => {
    it("generates all action × scope combinations as keys", () => {
        const result = definePermissions("leaves", {
            actions: ["read", "approve"],
            scopes: ["*", "company"],
        });

        expect(Object.keys(result).sort()).toEqual(["APPROVE_ALL", "APPROVE_COMPANY", "READ_ALL", "READ_COMPANY"]);
    });

    it("produces the correct permission strings", () => {
        const result = definePermissions("leaves", {
            actions: ["read", "approve"],
            scopes: ["*", "company", "managed"],
        });

        expect(result.READ_ALL).toBe("leaves:read:*");
        expect(result.READ_COMPANY).toBe("leaves:read:company");
        expect(result.APPROVE_MANAGED).toBe("leaves:approve:managed");
    });

    it('converts wildcard action "*" to "ALL" in the key', () => {
        const result = definePermissions("test", {
            actions: ["*"],
            scopes: ["company"],
        });

        expect(result.ALL_COMPANY).toBe("test:*:company");
    });

    it('converts wildcard scope "*" to "ALL" in the key', () => {
        const result = definePermissions("test", {
            actions: ["read"],
            scopes: ["*"],
        });

        expect(result.READ_ALL).toBe("test:read:*");
    });

    it('converts "department-country" scope to "DEPARTMENT_COUNTRY" in the key', () => {
        const result = definePermissions("test", {
            actions: ["read"],
            scopes: ["department-country"],
        });

        expect(result.READ_DEPARTMENT_COUNTRY).toBe("test:read:department-country");
    });

    it("handles a single action and single scope", () => {
        const result = definePermissions("payroll", {
            actions: ["export"],
            scopes: ["company"],
        });

        expect(Object.keys(result)).toEqual(["EXPORT_COMPANY"]);
        expect(result.EXPORT_COMPANY).toBe("payroll:export:company");
    });
});

// ─── prefixedKeys ─────────────────────────────────────────────────────────────

describe("prefixedKeys()", () => {
    it("prepends the prefix to every key", () => {
        const input = { READ_ALL: "leaves:read:*", WRITE_COMPANY: "leaves:write:company" };
        const result = prefixedKeys("LEAVES", input);

        expect(result).toEqual({
            LEAVES_READ_ALL: "leaves:read:*",
            LEAVES_WRITE_COMPANY: "leaves:write:company",
        });
    });

    it("preserves the original values unchanged", () => {
        const input = { READ_ALL: "leaves:read:*" };
        const result = prefixedKeys("LEAVES", input);

        expect(result.LEAVES_READ_ALL).toBe("leaves:read:*");
    });
});

// ─── Per-category objects ─────────────────────────────────────────────────────

describe("USERS_MANAGEMENT_PERMISSIONS", () => {
    it("has READ_ALL equal to 'usersManagement:read:*'", () => {
        expect(USERS_MANAGEMENT_PERMISSIONS.READ_ALL).toBe("usersManagement:read:*");
    });

    it("has ALL_COMPANY equal to 'usersManagement:*:company'", () => {
        expect(USERS_MANAGEMENT_PERMISSIONS.ALL_COMPANY).toBe("usersManagement:*:company");
    });

    it("covers all 8 scopes for each of the 2 actions (16 keys total)", () => {
        expect(Object.keys(USERS_MANAGEMENT_PERMISSIONS)).toHaveLength(16);
    });
});

describe("COUNTRIES_MANAGEMENT_PERMISSIONS", () => {
    it("has READ_ALL equal to 'countriesManagement:read:*'", () => {
        expect(COUNTRIES_MANAGEMENT_PERMISSIONS.READ_ALL).toBe("countriesManagement:read:*");
    });

    it("covers 2 scopes × 2 actions (4 keys total)", () => {
        expect(Object.keys(COUNTRIES_MANAGEMENT_PERMISSIONS)).toHaveLength(4);
    });
});

describe("USER_PROFILE_PERMISSIONS", () => {
    it("has READ_DEPARTMENT_COUNTRY equal to 'userProfile:read:department-country'", () => {
        expect(USER_PROFILE_PERMISSIONS.READ_DEPARTMENT_COUNTRY).toBe("userProfile:read:department-country");
    });
});

describe("ROLES_MANAGEMENT_PERMISSIONS", () => {
    it("has READ_ALL equal to 'rolesManagement:read:*'", () => {
        expect(ROLES_MANAGEMENT_PERMISSIONS.READ_ALL).toBe("rolesManagement:read:*");
    });
});

// ─── PermissionKeys backward-compatibility ────────────────────────────────────

describe("PermissionKeys (flat map)", () => {
    it("preserves all existing key names and values", () => {
        expect(PermissionKeys.ALL).toBe("*:*:*");
        expect(PermissionKeys.ALL_COMPANY).toBe("*:*:company");
        expect(PermissionKeys.USERS_MANAGEMENT_READ_ALL).toBe("usersManagement:read:*");
        expect(PermissionKeys.USERS_MANAGEMENT_ALL_COMPANY).toBe("usersManagement:*:company");
        expect(PermissionKeys.COUNTRIES_MANAGEMENT_READ_ALL).toBe("countriesManagement:read:*");
        expect(PermissionKeys.COUNTRIES_MANAGEMENT_ALL_COMPANY).toBe("countriesManagement:*:company");
        expect(PermissionKeys.USER_PROFILE_READ_SELF).toBe("userProfile:read:self");
        expect(PermissionKeys.USER_PROFILE_ALL_ALL).toBe("userProfile:*:*");
        expect(PermissionKeys.ROLES_MANAGEMENT_ALL_ALL).toBe("rolesManagement:*:*");
        expect(PermissionKeys.ROLES_MANAGEMENT_ALL_COMPANY).toBe("rolesManagement:*:company");
    });

    it("keeps legacy VIEW aliases pointing to the same strings as READ", () => {
        expect(PermissionKeys.ROLES_MANAGEMENT_VIEW_ALL).toBe("rolesManagement:read:*");
        expect(PermissionKeys.ROLES_MANAGEMENT_VIEW_COMPANY).toBe("rolesManagement:read:company");
        // Aliases share the same value as their READ counterparts
        expect(PermissionKeys.ROLES_MANAGEMENT_VIEW_ALL).toBe(PermissionKeys.ROLES_MANAGEMENT_READ_ALL);
        expect(PermissionKeys.ROLES_MANAGEMENT_VIEW_COMPANY).toBe(PermissionKeys.ROLES_MANAGEMENT_READ_COMPANY);
    });

    it("includes department-country key", () => {
        expect(PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT_COUNTRY).toBe(
            "usersManagement:read:department-country",
        );
    });
});
