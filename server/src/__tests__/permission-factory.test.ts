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
            scopes: ["*", "managed"],
        });

        expect(Object.keys(result).sort()).toEqual(["APPROVE_ALL", "APPROVE_MANAGED", "READ_ALL", "READ_MANAGED"]);
    });

    it("produces the correct permission strings", () => {
        const result = definePermissions("leaves", {
            actions: ["read", "approve"],
            scopes: ["*", "managed"],
        });

        expect(result.READ_ALL).toBe("leaves:read:*");
        expect(result.APPROVE_MANAGED).toBe("leaves:approve:managed");
    });

    it('converts wildcard action "*" to "ALL" in the key', () => {
        const result = definePermissions("test", {
            actions: ["*"],
            scopes: ["department"],
        });

        expect(result.ALL_DEPARTMENT).toBe("test:*:department");
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
            scopes: ["department"],
        });

        expect(Object.keys(result)).toEqual(["EXPORT_DEPARTMENT"]);
        expect(result.EXPORT_DEPARTMENT).toBe("payroll:export:department");
    });
});

// ─── prefixedKeys ─────────────────────────────────────────────────────────────

describe("prefixedKeys()", () => {
    it("prepends the prefix to every key", () => {
        const input = { READ_ALL: "leaves:read:*", WRITE_DEPARTMENT: "leaves:write:department" };
        const result = prefixedKeys("LEAVES", input);

        expect(result).toEqual({
            LEAVES_READ_ALL: "leaves:read:*",
            LEAVES_WRITE_DEPARTMENT: "leaves:write:department",
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

    it("covers 6 scopes for each of the 2 actions (12 keys total)", () => {
        expect(Object.keys(USERS_MANAGEMENT_PERMISSIONS)).toHaveLength(12);
    });
});

describe("COUNTRIES_MANAGEMENT_PERMISSIONS", () => {
    it("has READ_ALL equal to 'countriesManagement:read:*'", () => {
        expect(COUNTRIES_MANAGEMENT_PERMISSIONS.READ_ALL).toBe("countriesManagement:read:*");
    });

    it("covers 1 scope × 2 actions (2 keys total)", () => {
        expect(Object.keys(COUNTRIES_MANAGEMENT_PERMISSIONS)).toHaveLength(2);
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
        expect(PermissionKeys.USERS_MANAGEMENT_READ_ALL).toBe("usersManagement:read:*");
        expect(PermissionKeys.USERS_MANAGEMENT_WRITE_ALL).toBe("usersManagement:write:*");
        expect(PermissionKeys.COUNTRIES_MANAGEMENT_READ_ALL).toBe("countriesManagement:read:*");
        expect(PermissionKeys.USER_PROFILE_READ_SELF).toBe("userProfile:read:self");
        expect(PermissionKeys.USER_PROFILE_WRITE_ALL).toBe("userProfile:write:*");
        expect(PermissionKeys.ROLES_MANAGEMENT_WRITE_ALL).toBe("rolesManagement:write:*");
    });

    it("includes department-country key", () => {
        expect(PermissionKeys.USERS_MANAGEMENT_READ_DEPARTMENT_COUNTRY).toBe("usersManagement:read:department-country");
    });
});
