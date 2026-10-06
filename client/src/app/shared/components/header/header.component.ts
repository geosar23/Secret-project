import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { HeaderSearchComponent } from "../header-search/header-search.component";
import { AuthService } from "../../../core/services/auth.service";
import { CompanyService } from "../../../core/services/company.service";
import { MatDivider } from "@angular/material/divider";
import { take } from "rxjs";
import { decodeToken } from "../../../core/utils/token.util";
import { tokenPayload } from "../../../core/interfaces/auth.interface";
import { SidebarService } from "../../../core/services/sidebar.service";
import { CurrentUserService } from "../../../core/services/current-user.service";

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
    imports: [
        CommonModule,
        RouterModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatDivider,
        HeaderSearchComponent,
    ],
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnInit {
    private authService = inject(AuthService);
    private router = inject(Router);
    private companyService = inject(CompanyService);

    localUser$ = this.authService.localUser$;
    protected sidebar = inject(SidebarService);
    protected currentUser = inject(CurrentUserService);

    companyName = signal<string>("");
    companyLogoUrl = signal<string | null>(null);

    userMenuItems: MenuItem[] = [
        {
            label: "My Profile",
            icon: "person",
            route: "/profile/me",
        },
        {
            label: "Dashboard",
            icon: "dashboard",
            route: "/dashboard",
        },
        {
            label: "Org Chart",
            icon: "account_tree",
            route: "/org-chart",
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

    ngOnInit(): void {
        const token = this.authService.getToken();
        if (token) {
            const payload = decodeToken(token) as tokenPayload | null;
            const companyId = payload?.companyId;

            this.companyName.set("");

            if (companyId) {
                this.companyService
                    .getCompanyData(companyId)
                    .pipe(take(1))
                    .subscribe({
                        next: res => {
                            if (res.success && res.data) {
                                this.companyLogoUrl.set(res.data.url);
                                this.companyName.set(res.data.name || "");
                            }
                        },
                        error: () => {
                            /* no logo — silent */
                        },
                    });
            }
        }
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
