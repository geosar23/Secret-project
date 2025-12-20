import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatListModule } from "@angular/material/list";
import { MatSelectModule } from "@angular/material/select";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { PermissionService } from "../../core/services/permission.service";
import { AuthService } from "../../core/services/auth.service";
import { StickyAlertComponent } from "../../shared/components/sticky-alert/sticky-alert.component";
import { IPermissionCategory, IPermissionDefinition } from "../../core/interfaces/permission.interface";
import { forkJoin, Observable } from "rxjs";
import { RoleUtils } from "../../core/utils/role.utils";
import { PermissionCategories, PermissionCategoriesStrings } from "../../core/enums/permissions.enum";
import { IUser } from "../../core/interfaces/user.interface";

@Component({
    selector: "app-permissions",
    standalone: true,
    imports: [
        CommonModule,
        MatToolbarModule,
        MatCardModule,
        MatChipsModule,
        MatIconModule,
        MatListModule,
        MatSelectModule,
        MatFormFieldModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        StickyAlertComponent,
    ],
    templateUrl: "./permissions.component.html",
    styleUrls: ["./permissions.component.scss"],
})
export class PermissionsComponent implements OnInit {
    private permissionService = inject(PermissionService);
    private authService = inject(AuthService);

    localUser$: Observable<IUser | null>;
    permissionsDefinitions: IPermissionDefinition[] = [];
    effectivePermissions: string[] = [];
    permissionCategories: IPermissionCategory[] = [];
    readonly PermissionCategoriesStrings = PermissionCategoriesStrings;
    readonly rolesHierarchy = RoleUtils.getAllRolesWithMetadata();

    selectedRole: string = "";
    viewAsRoleActive: boolean = false;
    isLoading: boolean = false;

    constructor() {
        this.localUser$ = this.authService.localUser$;
    }

    ngOnInit(): void {
        this.getUserPermissions();
    }

    private getUserPermissions(): void {
        forkJoin({
            effectivePermissions: this.permissionService.getEffectivePermissions(),
            allDefinitions: this.permissionService.fetchAllPermissionDefinitions(),
        }).subscribe(({ effectivePermissions, allDefinitions }) => {
            this.effectivePermissions = effectivePermissions;
            this.permissionsDefinitions = allDefinitions;
            this.buildPermissionCategoriesFromBackend();
        });
    }

    private buildPermissionCategoriesFromBackend(): void {
        // Group permissions by category
        const categoryMap = new Map<PermissionCategories, IPermissionDefinition[]>();

        this.permissionsDefinitions.forEach(def => {
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

    toggleRoleImpersonation(): void {
        if (this.viewAsRoleActive) {
            // Disable view as role
            this.getUserPermissions();
            this.viewAsRoleActive = false;
            this.selectedRole = "";
            return;
        }
        // Enable view as role
        this.permissionService.fetchPermissionsForRole(this.selectedRole).subscribe(permissions => {
            this.effectivePermissions = permissions;
            this.viewAsRoleActive = true;
            this.buildPermissionCategoriesFromBackend();
        });
    }
}
