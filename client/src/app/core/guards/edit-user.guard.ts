import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { PermissionService } from "../services/permission.service";

export const editUserGuard = () => {
    const permissionService = inject(PermissionService);
    const router = inject(Router);

    if (permissionService.canEditUser()) {
        return true;
    }

    router.navigate(["/non-authorized"]);
    return false;
};
