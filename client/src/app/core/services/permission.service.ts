import { Injectable, inject } from "@angular/core";
import { BehaviorSubject, Observable, map } from "rxjs";
import { AuthService } from "./auth.service";

export interface GrantedPermission {
    permission: string;
    grantedBy: string;
    grantedAt: Date;
    expiresAt?: Date;
    reason?: string;
    scope?: string;
}

export interface PermissionHistory {
    granted: GrantedPermission[];
    revoked: string[];
}

@Injectable({
    providedIn: "root",
})
export class PermissionService {
    private authService = inject(AuthService);
    private effectivePermissions$ = new BehaviorSubject<string[]>([]);

    /**
     * Check if current user has a specific permission
     */
    hasPermission(permission: string): Observable<boolean> {
        return this.effectivePermissions$.pipe(
            map((permissions) => {
                // Check for wildcard
                if (permissions.includes("*")) {
                    return true;
                }
                
                // Exact match
                if (permissions.includes(permission)) {
                    return true;
                }
                
                // Check for wildcard patterns (e.g., "employees:*")
                return permissions.some((p) => {
                    if (!p.includes("*")) return false;
                    const pattern = p.replace(/\*/g, ".*");
                    return new RegExp(`^${pattern}$`).test(permission);
                });
            }),
        );
    }

    /**
     * Check if user has ANY of the permissions
     */
    hasAnyPermission(permissions: string[]): Observable<boolean> {
        return this.effectivePermissions$.pipe(
            map((userPerms) => {
                if (userPerms.includes("*")) return true;
                return permissions.some((p) => userPerms.includes(p));
            }),
        );
    }

    /**
     * Check if user has ALL of the permissions
     */
    hasAllPermissions(permissions: string[]): Observable<boolean> {
        return this.effectivePermissions$.pipe(
            map((userPerms) => {
                if (userPerms.includes("*")) return true;
                return permissions.every((p) => userPerms.includes(p));
            }),
        );
    }

    /**
     * Get effective permissions from the decoded JWT token
     */
    getEffectivePermissionsFromToken(): string[] {
        const token = localStorage.getItem("token");
        if (!token) return [];

        // Decode JWT token to get role
        const payload = this.decodeToken(token);
        if (!payload || !payload.role) return [];

        // For now, return basic role-based permissions
        // In a real app, you'd fetch this from the server or include it in the JWT
        const rolePermissions: Record<string, string[]> = {
            GOD: ["*"],
            SUPER_ADMIN: [
                "company:settings:*",
                "employees:*:all",
                "leaves:*:all",
                "departments:*:all",
                "reports:*:all",
                "users:*:all",
            ],
            ADMIN: [
                "company:settings:view",
                "company:settings:edit",
                "employees:view:all",
                "employees:create:all",
                "employees:edit:all",
                "leaves:*:all",
                "departments:view:all",
                "departments:create:all",
                "departments:edit:all",
                "reports:*:all",
                "users:view:all",
            ],
            HR: [
                "employees:*:all",
                "leaves:*:all",
                "departments:view:all",
                "reports:view:all",
                "users:view:all",
            ],
            MANAGER: [
                "employees:view:managed",
                "employees:edit:managed",
                "leaves:view:managed",
                "leaves:approve:managed",
                "departments:view:all",
                "reports:view:department",
            ],
            EMPLOYEE: [
                "employees:view:self",
                "employees:edit:self",
                "leaves:view:self",
                "leaves:request:self",
                "leaves:cancel:self",
                "departments:view:all",
            ],
        };

        const permissions = rolePermissions[payload.role] || [];
        this.effectivePermissions$.next(permissions);
        return permissions;
    }

    private decodeToken(token: string): { role?: string; id?: string } | null {
        try {
            const payload = token.split(".")[1];
            return JSON.parse(atob(payload));
        } catch {
            return null;
        }
    }

    /**
     * Get current effective permissions
     */
    get permissions$(): Observable<string[]> {
        return this.effectivePermissions$.asObservable();
    }
}
