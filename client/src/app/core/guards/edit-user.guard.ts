import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { PermissionService } from "../services/permission.service";
import { AuthService } from "../services/auth.service";
import { first, map } from "rxjs";
import { IUser } from "../interfaces/user.interface";

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
