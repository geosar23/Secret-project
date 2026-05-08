import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { PermissionService } from "../services/permission.service";

export const createUserGuard = () => {
    const permissionService = inject(PermissionService);
    const router = inject(Router);

    if (permissionService.canCreateUser()) {
        return true;
    }

    router.navigate(["/non-authorized"]);
    return false;
};
