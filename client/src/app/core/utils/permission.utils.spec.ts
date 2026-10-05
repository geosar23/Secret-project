import { hasAnyPermission, hasPermission } from "./permission.utils";

describe("hasPermission", () => {
    it("matches exact and wildcard grants", () => {
        expect(hasPermission(["*:*:*"], "usersManagement:write:self")).toBeTrue();
        expect(hasPermission(["usersManagement:*:*"], "usersManagement:read:country")).toBeTrue();
        expect(hasPermission(["usersManagement:read:*"], "usersManagement:read:country")).toBeTrue();
        expect(hasPermission(["usersManagement:read:country"], "usersManagement:read:country")).toBeTrue();
    });

    it("does not let a narrower grant cover a broader one", () => {
        expect(hasPermission(["usersManagement:read:self"], "usersManagement:read:*")).toBeFalse();
        expect(hasPermission(["usersManagement:read:*"], "usersManagement:write:*")).toBeFalse();
    });

    it("lets a parent category cover its sub-category", () => {
        expect(hasPermission(["userProfile:read:*"], "userProfile.compensation:read:*")).toBeTrue();
        expect(hasPermission(["userProfile:write:self"], "userProfile.identity:write:self")).toBeTrue();
    });

    it("does not let a sub-category cover its parent or siblings", () => {
        expect(hasPermission(["userProfile.identity:read:*"], "userProfile:read:*")).toBeFalse();
        expect(hasPermission(["userProfile.identity:read:*"], "userProfile.contact:read:*")).toBeFalse();
    });

    it("returns false for empty input", () => {
        expect(hasPermission([], "usersManagement:read:*")).toBeFalse();
        expect(hasPermission(["*:*:*"], "")).toBeFalse();
    });
});

describe("hasAnyPermission", () => {
    it("is true when at least one required key is held", () => {
        expect(
            hasAnyPermission(["rolesManagement:read:*"], ["usersManagement:read:*", "rolesManagement:read:*"]),
        ).toBeTrue();
    });

    it("is false when none are held", () => {
        expect(hasAnyPermission(["rolesManagement:read:*"], ["usersManagement:read:*"])).toBeFalse();
    });
});
