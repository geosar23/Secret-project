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
import { AuthService } from "../../core/services/auth.service";
import { StickyAlertComponent } from "../../shared/components/sticky-alert/sticky-alert.component";
import { IPermissionItem, IUserPermissionItem } from "../../core/interfaces/permission.interface";
import { RoleUtils } from "../../core/utils/role.utils";
import { PermissionCategories, PermissionCategoriesStrings, PermissionKeys } from "../../core/enums/permissions.enum";
import { IUser } from "../../core/interfaces/user.interface";
import { RoleService } from "../../core/services/role.service";
import { IRole } from "../../core/interfaces/role.interface";

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
    private authService = inject(AuthService);
    private roleService = inject(RoleService);

    localUser: IUser | null = null;
    roleData: IRole[] = [];
    permissions: IPermissionItem[] = [];
    readonly PermissionCategories = PermissionCategories;
    readonly PermissionCategoriesStrings = PermissionCategoriesStrings;

    selectedRole: string = "";
    viewAsRoleActive: boolean = false;
    isLoading: boolean = false;

    constructor() {}

    ngOnInit(): void {
        this.authService.localUser$.subscribe(user => {
            this.localUser = user;
            this.permissions = [];
            this.buildForRole(user?.role.permissions, user?.grantedPermissions, user?.revokedPermissions);
        });
        this.roleService.getRoles("active").subscribe(res => {
            if (res.success) {
                this.roleData = (res.data || []).sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
            }
        });
    }

    private buildPermissionCategoriesFromConstants(effectivePermissions: string[] = []): void {
        const grouped = new Map<string, string[]>();

        Object.values(PermissionKeys).forEach(key => {
            const category = key.split(":")[0];
            if (!grouped.has(category)) {
                grouped.set(category, []);
            }
            grouped.get(category)!.push(key);
        });

        this.permissions = Array.from(grouped.entries()).map(([category, keys]) => ({
            category: category as PermissionCategories,
            permissions: keys.map(
                (key): IUserPermissionItem => ({
                    key,
                    hasPermission: effectivePermissions.includes(key),
                }),
            ),
        }));
    }

    private buildForRole(
        rolePermissions: string[] = [],
        grantedPermissions: string[] = [],
        revokedPermissions: string[] = [],
    ): void {
        const effectivePermissions = Array.from(
            new Set([...rolePermissions, ...grantedPermissions].filter(p => !revokedPermissions.includes(p))),
        );
        this.buildPermissionCategoriesFromConstants(effectivePermissions);
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
            this.buildForRole(
                this.localUser?.role.permissions,
                this.localUser?.grantedPermissions,
                this.localUser?.revokedPermissions,
            );
            this.viewAsRoleActive = false;
            this.selectedRole = "";
            return;
        }

        // Enable view as role
        const role = this.roleData?.find(r => r.role === this.selectedRole);
        if (role) {
            this.buildForRole(role.permissions);
            this.viewAsRoleActive = true;
        }
    }
}
