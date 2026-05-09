import { Injectable, inject } from "@angular/core";
import { AuthService } from "./auth.service";
import { IUser } from "../interfaces/user.interface";
import { PermissionKeys } from "../enums/permissions.enum";
import { hasPermission } from "../utils/permission.utils";

@Injectable({
    providedIn: "root",
})
export class PermissionService {
    private authService = inject(AuthService);

    /**
     * Synchronous check for user creation access.
     */
    canCreateUser(): boolean {
        const user = this.authService.getLocalUser();
        if (!user) return false;
        const effective = this.computeEffective(user);
        return hasPermission(effective, PermissionKeys.USERS_MANAGEMENT_WRITE_ALL);
    }

    /**
     * Synchronous check for user edit access. Same permission requirement as create.
     */
    canEditUser(): boolean {
        const user = this.authService.getLocalUser();
        if (!user) return false;
        const effective = this.computeEffective(user);
        return hasPermission(effective, PermissionKeys.USERS_MANAGEMENT_WRITE_ALL);
    }

    private computeEffective(user: IUser): string[] {
        const rolePerms = user.role?.permissions ?? [];
        const grantedPerms = user.grantedPermissions ?? [];
        const revokedPerms = new Set(user.revokedPermissions ?? []);
        return [...rolePerms, ...grantedPerms].filter(p => !revokedPerms.has(p));
    }
}
