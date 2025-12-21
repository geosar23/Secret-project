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
}

interface MenuItem {
    label: string;
    icon: string;
    route?: string;
    action?: () => void;
    divider?: boolean;
}

@Component({
    selector: "app-header",
    standalone: true,
    imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatDivider],
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss"],
})
export class HeaderComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    localUser$ = this.authService.localUser$;

    adminNavItems: NavItem[] = [
        {
            label: "Users Management",
            icon: "people",
            route: "/users",
        },
        {
            label: "Permissions Management",
            icon: "security",
            route: "/permissions",
        },
    ];

    userMenuItems: MenuItem[] = [
        {
            label: "My Profile",
            icon: "person",
            route: "/profile",
        },
        {
            label: "Dashboard",
            icon: "dashboard",
            route: "/dashboard",
        },
        {
            label: "Settings",
            icon: "settings",
            route: "/settings",
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
