import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { PermissionService } from "../services/permission.service";
import { AuthService } from "../services/auth.service";
import { first, map } from "rxjs";
import { IUser } from "../interfaces/user.interface";

/**
 * Broad guard: allows navigation to the edit-user route only if the actor holds
 * at least one usersManagement:write scope. Subject-specific access control
 * (scope vs. the actual target user) is enforced by editUserContextResolver,
 * which calls the server's access endpoint.
 */
export const editUserGuard = () => {
    const permissionService = inject(PermissionService);
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.localUser$.pipe(
        first((user): user is IUser => user !== null),
        map(() => {
            if (permissionService.canEditUser()) {
                return true;
            }
            router.navigate(["/non-authorized"]);
            return false;
        }),
    );
};
