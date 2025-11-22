import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatListModule } from "@angular/material/list";
import { PermissionService } from "../../core/services/permission.service";
import { AuthService } from "../../core/services/auth.service";

interface PermissionCategory {
    name: string;
    permissions: PermissionItem[];
}

interface PermissionItem {
    permission: string;
    description: string;
    hasPermission: boolean;
}

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
        this.permissionService.fetchEffectivePermissions().subscribe(permissions => {
            this.effectivePermissions = permissions;
            this.buildPermissionCategories();
        });
    }

    private buildPermissionCategories(): void {
        const allPermissions = [
            {
                category: "System",
                items: [
                    { perm: "company:impersonate", desc: "Impersonate users" },
                    { perm: "system:companies:create", desc: "Create companies" },
                    { perm: "system:companies:delete", desc: "Delete companies" },
                ],
            },
            {
                category: "Company Settings",
                items: [
                    { perm: "company:settings:view", desc: "View company settings" },
                    { perm: "company:settings:edit", desc: "Edit company settings" },
                    { perm: "company:delete", desc: "Delete company" },
                    { perm: "company:billing:view", desc: "View billing information" },
                ],
            },
            {
                category: "Employees",
                items: [
                    { perm: "employees:view:all", desc: "View all employees" },
                    { perm: "employees:view:department", desc: "View department employees" },
                    { perm: "employees:view:managed", desc: "View managed employees" },
                    { perm: "employees:view:self", desc: "View own profile" },
                    { perm: "employees:create:all", desc: "Create employees" },
                    { perm: "employees:edit:all", desc: "Edit all employees" },
                    { perm: "employees:edit:managed", desc: "Edit managed employees" },
                    { perm: "employees:edit:self", desc: "Edit own profile" },
                    { perm: "employees:delete:all", desc: "Delete employees" },
                    { perm: "employees:salary:view", desc: "View salaries" },
                    { perm: "employees:salary:edit", desc: "Edit salaries" },
                ],
            },
            {
                category: "Leaves",
                items: [
                    { perm: "leaves:view:all", desc: "View all leaves" },
                    { perm: "leaves:view:department", desc: "View department leaves" },
                    { perm: "leaves:view:managed", desc: "View managed leaves" },
                    { perm: "leaves:view:self", desc: "View own leaves" },
                    { perm: "leaves:request:self", desc: "Request leave" },
                    { perm: "leaves:approve:all", desc: "Approve all leaves" },
                    { perm: "leaves:approve:managed", desc: "Approve managed leaves" },
                    { perm: "leaves:cancel:all", desc: "Cancel all leaves" },
                    { perm: "leaves:cancel:self", desc: "Cancel own leave" },
                ],
            },
            {
                category: "Departments",
                items: [
                    { perm: "departments:view:all", desc: "View departments" },
                    { perm: "departments:create:all", desc: "Create departments" },
                    { perm: "departments:edit:all", desc: "Edit departments" },
                    { perm: "departments:delete:all", desc: "Delete departments" },
                ],
            },
            {
                category: "Reports",
                items: [
                    { perm: "reports:view:all", desc: "View all reports" },
                    { perm: "reports:view:department", desc: "View department reports" },
                    { perm: "reports:export:all", desc: "Export reports" },
                ],
            },
            {
                category: "Users & Permissions",
                items: [
                    { perm: "users:view:all", desc: "View users" },
                    { perm: "users:create:all", desc: "Create users" },
                    { perm: "users:roles:edit", desc: "Edit user roles" },
                    { perm: "users:delete:all", desc: "Delete users" },
                    { perm: "users:permissions:manage", desc: "Manage permissions" },
                ],
            },
        ];

        this.permissionCategories = allPermissions.map(cat => ({
            name: cat.category,
            permissions: cat.items.map(item => ({
                permission: item.perm,
                description: item.desc,
                hasPermission: this.checkPermission(item.perm),
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
