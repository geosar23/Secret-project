import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatListModule } from "@angular/material/list";
import { PermissionService } from "../../core/services/permission.service";
import { AuthService } from "../../core/services/auth.service";
import {
    PermissionCategory,
    PermissionDefinition,
} from "../../core/interfaces/permission.interface";
import { forkJoin } from "rxjs";

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
    ],
    templateUrl: "./permissions.component.html",
    styleUrls: ["./permissions.component.scss"],
})
export class PermissionsComponent implements OnInit {
    private permissionService = inject(PermissionService);
    private authService = inject(AuthService);

    currentUser$ = this.authService.currentUser$;
    effectivePermissions: string[] = [];
    permissionCategories: PermissionCategory[] = [];

    ngOnInit(): void {
        // Fetch both effective permissions and all permission definitions from backend
        forkJoin({
            effectivePermissions: this.permissionService.fetchEffectivePermissions(),
            allDefinitions: this.permissionService.fetchAllPermissionDefinitions(),
        }).subscribe(({ effectivePermissions, allDefinitions }) => {
            this.effectivePermissions = effectivePermissions;
            this.buildPermissionCategoriesFromBackend(allDefinitions);
        });
    }

    private buildPermissionCategoriesFromBackend(definitions: PermissionDefinition[]): void {
        // Group permissions by category
        const categoryMap = new Map<string, PermissionDefinition[]>();

        definitions.forEach(def => {
            if (!categoryMap.has(def.category)) {
                categoryMap.set(def.category, []);
            }
            categoryMap.get(def.category)!.push(def);
        });

        // Convert to array format
        this.permissionCategories = Array.from(categoryMap.entries()).map(([category, perms]) => ({
            name: category,
            permissions: perms.map(p => ({
                permission: p.permission,
                description: p.description,
                hasPermission: this.checkPermission(p.permission),
            })),
        }));
    }

    private checkPermission(permission: string): boolean {
        // Check for wildcard
        if (this.effectivePermissions.includes("*")) {
            return true;
        }

        // Exact match
        if (this.effectivePermissions.includes(permission)) {
            return true;
        }

        // Check for wildcard patterns (e.g., "employees:*:all")
        return this.effectivePermissions.some(p => {
            if (!p.includes("*")) return false;
            const pattern = p.replace(/\*/g, ".*");
            return new RegExp(`^${pattern}$`).test(permission);
        });
    }

    getRoleColor(role: string): string {
        role = role.toUpperCase();
        const colors: Record<string, string> = {
            GOD: "purple",
            SUPER_ADMIN: "red",
            ADMIN: "orange",
            HR: "blue",
            MANAGER: "green",
            EMPLOYEE: "gray",
        };
        return colors[role] || "gray";
    }
}
