import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { PermissionService } from "../services/permission.service";
import { AuthService } from "../services/auth.service";
import { first, map } from "rxjs";
import { IUser } from "../interfaces/user.interface";

/**
 * Broad guard: allows navigation to the create-user route only if the actor holds
 * at least one usersManagement:write scope. Scope-specific enforcement
 * (which country/department/manager the actor may assign) is handled server-side
 * when the form is submitted via canCreateUser() in user.policy.ts.
 */
export const createUserGuard = () => {
    const permissionService = inject(PermissionService);
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.localUser$.pipe(
        first((user): user is IUser => user !== null),
        map(() => {
            if (permissionService.canCreateUser()) {
                return true;
            }
            router.navigate(["/non-authorized"]);
            return false;
        }),
    );
};
