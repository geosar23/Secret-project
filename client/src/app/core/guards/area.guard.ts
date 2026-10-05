import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { first, map } from "rxjs";
import { AuthService } from "../services/auth.service";
import { PermissionService } from "../services/permission.service";
import { IUser } from "../interfaces/user.interface";
import { ManagementArea } from "../utils/permission-areas";

/** Lets the route load only if the actor can view the given management area. */
export const areaGuard =
    (area: ManagementArea): CanActivateFn =>
    () => {
        const permissionService = inject(PermissionService);
        const authService = inject(AuthService);
        const router = inject(Router);

        return authService.localUser$.pipe(
            first((user): user is IUser => user !== null),
            map(() => permissionService.canViewArea(area) || router.createUrlTree(["/non-authorized"])),
        );
    };
