import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { PermissionService } from "../services/permission.service";
import { AuthService } from "../services/auth.service";
import { filter, map, take } from "rxjs";
import { IUser } from "../interfaces/user.interface";

export const editUserGuard = () => {
    const permissionService = inject(PermissionService);
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.localUser$.pipe(
        filter((user): user is IUser => user !== null),
        take(1),
        map(() => {
            if (permissionService.canEditUser()) {
                return true;
            }
            router.navigate(["/non-authorized"]);
            return false;
        }),
    );
};
