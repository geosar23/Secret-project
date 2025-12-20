import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatListModule } from "@angular/material/list";
import { PermissionService } from "../../core/services/permission.service";
import { AuthService } from "../../core/services/auth.service";
import { IPermissionCategory, IPermissionDefinition } from "../../core/interfaces/permission.interface";
import { forkJoin } from "rxjs";
import { RoleUtils } from "../../core/utils/role.utils";
import { PermissionCategories, PermissionCategoriesStrings } from "../../core/enums/permissions.enum";

@Component({
    selector: "app-permissions",
    standalone: true,
    imports: [CommonModule, MatToolbarModule, MatCardModule, MatChipsModule, MatIconModule, MatListModule],
    templateUrl: "./permissions.component.html",
    styleUrls: ["./permissions.component.scss"],
})
export class PermissionsComponent implements OnInit {
    private permissionService = inject(PermissionService);
    private authService = inject(AuthService);

    currentUser$ = this.authService.currentUser$;
    effectivePermissions: string[] = [];
    permissionCategories: IPermissionCategory[] = [];
    readonly PermissionCategoriesStrings = PermissionCategoriesStrings;
    readonly rolesHierarchy = RoleUtils.getAllRolesWithMetadata();

    ngOnInit(): void {
        // Fetch both effective permissions and all permission definitions from backend
        forkJoin({
            effectivePermissions: this.permissionService.fetchEffectivePermissions(),
            allDefinitions: this.permissionService.fetchAllPermissionDefinitions(),
        }).subscribe(({ effectivePermissions, allDefinitions }) => {
            console.log("Effective Permissions:", effectivePermissions);
            console.log("All Permission Definitions:", allDefinitions);
            this.effectivePermissions = effectivePermissions;
            this.buildPermissionCategoriesFromBackend(allDefinitions);
        });
    }

    private buildPermissionCategoriesFromBackend(definitions: IPermissionDefinition[]): void {
        // Group permissions by category
        const categoryMap = new Map<PermissionCategories, IPermissionDefinition[]>();

        definitions.forEach(def => {
            if (!categoryMap.has(def.category)) {
                categoryMap.set(def.category, []);
            }
            categoryMap.get(def.category)!.push(def);
        });

        // Convert to array format
        this.permissionCategories = Array.from(categoryMap.entries()).map(([category, perms]) => ({
            category,
            permissions: perms.map(p => ({
                ...p,
                hasPermission: this.checkPermission(p._id),
            })),
        }));
    }

    private checkPermission(permission: string): boolean {
        // Simple check - backend already expanded permissions with scope hierarchy
        // effectivePermissions contains all computed permissions from backend
        return this.effectivePermissions.includes(permission);
    }

    getRoleColor(role: string): string {
        return RoleUtils.getRoleColor(role);
    }

    getRoleName(role: string): string {
        return RoleUtils.getRoleName(role);
    }
}
