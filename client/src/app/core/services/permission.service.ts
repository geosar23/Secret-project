import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { map, distinctUntilChanged, shareReplay } from "rxjs/operators";
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
     * Reactive observable that emits true when the current user has cross-company
     * view access (i.e. can see data across all companies). Use this in components
     * that need to react to auth state changes.
     */
    canViewCrossCompany$: Observable<boolean> = this.authService.localUser$.pipe(
        map(user =>
            user ? hasPermission(this.computeEffective(user), PermissionKeys.USERS_MANAGEMENT_READ_ALL) : false,
        ),
        distinctUntilChanged(),
        shareReplay(1),
    );

    /**
     * Synchronous check for cross-company view access. Safe to call in constructors
     * and field initializers after auth has been bootstrapped.
     */
    canViewCrossCompany(): boolean {
        const user = this.authService.getLocalUser();
        if (!user) return false;
        return hasPermission(this.computeEffective(user), PermissionKeys.USERS_MANAGEMENT_READ_ALL);
    }

    canCreateUser$: Observable<boolean> = this.authService.localUser$.pipe(
        map(user => (user ? hasPermission(this.computeEffective(user), PermissionKeys.CAN_CREATE_USER) : false)),
        distinctUntilChanged(),
        shareReplay(1),
    );

    canCreateUser(): boolean {
        const user = this.authService.getLocalUser();
        if (!user) return false;
        return hasPermission(this.computeEffective(user), PermissionKeys.CAN_CREATE_USER);
    }

    canEditUserIdentity(): boolean {
        const user = this.authService.getLocalUser();
        if (!user) return false;
        return hasPermission(this.computeEffective(user), PermissionKeys.CAN_EDIT_USER_IDENTITY);
    }

    canEditUserContact(): boolean {
        const user = this.authService.getLocalUser();
        if (!user) return false;
        return hasPermission(this.computeEffective(user), PermissionKeys.CAN_EDIT_USER_CONTACT);
    }

    canEditUserEmployment(): boolean {
        const user = this.authService.getLocalUser();
        if (!user) return false;
        return hasPermission(this.computeEffective(user), PermissionKeys.CAN_EDIT_USER_EMPLOYMENT);
    }

    canEditUserEducation(): boolean {
        const user = this.authService.getLocalUser();
        if (!user) return false;
        return hasPermission(this.computeEffective(user), PermissionKeys.CAN_EDIT_USER_EDUCATION);
    }

    canEditUserCompensation(): boolean {
        const user = this.authService.getLocalUser();
        if (!user) return false;
        return hasPermission(this.computeEffective(user), PermissionKeys.CAN_EDIT_USER_COMPENSATION);
    }

    private computeEffective(user: IUser): string[] {
        const rolePerms = user.role?.permissions ?? [];
        const grantedPerms = user.grantedPermissions ?? [];
        const revokedPerms = new Set(user.revokedPermissions ?? []);
        return [...rolePerms, ...grantedPerms].filter(p => !revokedPerms.has(p));
    }
}
