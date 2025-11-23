import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { AuthService } from "../../../core/services/auth.service";
import { MatDivider } from "@angular/material/divider";

interface NavItem {
    label: string;
    icon: string;
    route: string;
    roles?: string[];
}

interface MenuItem {
    label: string;
    icon: string;
    route?: string;
    action?: () => void;
    divider?: boolean;
    roles?: string[];
}

@Component({
    selector: "app-header",
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatDivider,
    ],
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss"],
})
export class HeaderComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    currentUser$ = this.authService.currentUser$;

    navItems: NavItem[] = [
        {
            label: "Dashboard",
            icon: "dashboard",
            route: "/dashboard",
        },
        {
            label: "Users",
            icon: "people",
            route: "/users",
            roles: ["god", "super-admin", "admin", "hr"],
        },
        {
            label: "Permissions",
            icon: "security",
            route: "/permissions",
            roles: ["god", "super-admin", "admin"],
        },
    ];

    menuItems: MenuItem[] = [
        {
            label: "My Profile",
            icon: "person",
            route: "/profile",
        },
        {
            label: "Settings",
            icon: "settings",
            route: "/settings",
            roles: ["god", "super-admin", "admin"],
        },
        {
            divider: true,
            label: "",
            icon: "",
        },
        {
            label: "Logout",
            icon: "logout",
            action: () => this.logout(),
        },
    ];

    get filteredNavItems(): NavItem[] {
        const user = this.authService.getCurrentUser();
        if (!user || !user.role) return [];

        return this.navItems.filter(item => {
            if (!item.roles || item.roles.length === 0) return true;
            return item.roles.includes(user.role!);
        });
    }

    get filteredMenuItems(): MenuItem[] {
        const user = this.authService.getCurrentUser();
        if (!user || !user.role) return [];

        return this.menuItems.filter(item => {
            if (item.divider) return true;
            if (!item.roles || item.roles.length === 0) return true;
            return item.roles.includes(user.role!);
        });
    }

    handleMenuClick(item: MenuItem): void {
        if (item.action) {
            item.action();
        } else if (item.route) {
            this.router.navigate([item.route]);
        }
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(["/login"]);
    }
}
