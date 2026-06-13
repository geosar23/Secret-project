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
     * True if the actor holds ANY usersManagement:write scope.
     * Use this for broad UI gating (e.g. showing the Create button).
     * The server enforces which specific attributes (country, department, manager)
     * the actor is allowed to assign when the form is submitted.
     */
    canCreateUser(): boolean {
        const user = this.authService.getLocalUser();
        if (!user) {
            return false;
        }
        const effective = this.computeEffective(user);
        return [
            PermissionKeys.USERS_MANAGEMENT_WRITE_ALL,
            PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT,
            PermissionKeys.USERS_MANAGEMENT_WRITE_COUNTRY,
            PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT_COUNTRY,
            PermissionKeys.USERS_MANAGEMENT_WRITE_MANAGED,
            PermissionKeys.USERS_MANAGEMENT_WRITE_SELF,
        ].some(key => hasPermission(effective, key));
    }

    /**
     * Synchronous check for user edit access.
     * True if the actor holds ANY usersManagement:write scope.
     * Use this for broad UI gating (e.g. showing the Edit button in the users list)
     * where the subject user is not yet known. For subject-specific access use the
     * editUserContextResolver which calls the server capabilities endpoint.
     */
    canEditUser(): boolean {
        const user = this.authService.getLocalUser();
        if (!user) {
            return false;
        }
        const effective = this.computeEffective(user);
        return [
            PermissionKeys.USERS_MANAGEMENT_WRITE_ALL,
            PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT,
            PermissionKeys.USERS_MANAGEMENT_WRITE_COUNTRY,
            PermissionKeys.USERS_MANAGEMENT_WRITE_DEPARTMENT_COUNTRY,
            PermissionKeys.USERS_MANAGEMENT_WRITE_MANAGED,
            PermissionKeys.USERS_MANAGEMENT_WRITE_SELF,
        ].some(key => hasPermission(effective, key));
    }

    /**
     * Synchronous check: can the actor reset another user's password?
     * True if the actor holds any resetPassword:write scope.
     */
    canResetPassword(): boolean {
        const user = this.authService.getLocalUser();
        if (!user) {
            return false;
        }
        const effective = this.computeEffective(user);
        return [
            PermissionKeys.RESET_PASSWORD_WRITE_ALL,
            PermissionKeys.RESET_PASSWORD_WRITE_DEPARTMENT,
            PermissionKeys.RESET_PASSWORD_WRITE_COUNTRY,
            PermissionKeys.RESET_PASSWORD_WRITE_DEPARTMENT_COUNTRY,
            PermissionKeys.RESET_PASSWORD_WRITE_MANAGED,
            PermissionKeys.RESET_PASSWORD_WRITE_SELF,
        ].some(key => hasPermission(effective, key));
    }

    /**
     * Synchronous check: can the actor view compensation data?
     */
    canViewCompensation(): boolean {
        const user = this.authService.getLocalUser();
        if (!user) {
            return false;
        }
        const effective = this.computeEffective(user);
        return [
            PermissionKeys.USER_PROFILE_COMPENSATION_READ_ALL,
            PermissionKeys.USER_PROFILE_COMPENSATION_READ_DEPARTMENT,
            PermissionKeys.USER_PROFILE_COMPENSATION_READ_COUNTRY,
            PermissionKeys.USER_PROFILE_COMPENSATION_READ_DEPARTMENT_COUNTRY,
            PermissionKeys.USER_PROFILE_COMPENSATION_READ_MANAGED,
            PermissionKeys.USER_PROFILE_COMPENSATION_READ_SELF,
        ].some(key => hasPermission(effective, key));
    }

    /**
     * Synchronous check: can the actor write/edit compensation data?
     */
    canEditCompensation(): boolean {
        const user = this.authService.getLocalUser();
        if (!user) {
            return false;
        }
        const effective = this.computeEffective(user);
        return [
            PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_ALL,
            PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_DEPARTMENT,
            PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_COUNTRY,
            PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_DEPARTMENT_COUNTRY,
            PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_MANAGED,
            PermissionKeys.USER_PROFILE_COMPENSATION_WRITE_SELF,
        ].some(key => hasPermission(effective, key));
    }

    private computeEffective(user: IUser): string[] {
        const rolePerms = user.role?.permissions ?? [];
        const grantedPerms = user.grantedPermissions ?? [];
        const revokedPerms = new Set(user.revokedPermissions ?? []);
        return [...rolePerms, ...grantedPerms].filter(p => !revokedPerms.has(p));
    }
}
