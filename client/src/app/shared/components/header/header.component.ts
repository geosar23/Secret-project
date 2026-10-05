import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { AuthService } from "../../../core/services/auth.service";
import { UsersService } from "../../../core/services/users.service";
import { CompanyService } from "../../../core/services/company.service";
import { MatDivider } from "@angular/material/divider";
import { debounceTime, distinctUntilChanged, map, switchMap, take } from "rxjs";
import { IUser } from "../../../core/interfaces/user.interface";
import { decodeToken } from "../../../core/utils/token.util";
import { tokenPayload } from "../../../core/interfaces/auth.interface";
import { PermissionService } from "../../../core/services/permission.service";
import { ManagementArea } from "../../../core/utils/permission-areas";

interface NavItem {
    label: string;
    icon: string;
    route: string;
    area?: ManagementArea;
}

interface MenuItem {
    label: string;
    icon: string;
    route?: string;
    action?: () => void;
    divider?: boolean;
}

interface SearchResult {
    id: string;
    name: string;
    type: "route" | "user";
    icon: string;
    route?: string;
    description?: string;
    area?: ManagementArea;
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
        MatAutocompleteModule,
        MatInputModule,
        MatFormFieldModule,
        ReactiveFormsModule,
    ],
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnInit {
    private authService = inject(AuthService);
    private router = inject(Router);
    private usersService = inject(UsersService);
    private companyService = inject(CompanyService);
    private permissionService = inject(PermissionService);

    searchControl = new FormControl("");
    filteredResults = signal<SearchResult[]>([]);

    localUser$ = this.authService.localUser$;
    visibleNavItems$ = this.localUser$.pipe(map(() => this.adminNavItems.filter(item => this.isAllowed(item.area))));

    companyName = signal<string>("");
    companyLogoUrl = signal<string | null>(null);

    private navigationRoutes: SearchResult[] = [
        {
            id: "dashboard",
            name: "Dashboard",
            type: "route",
            icon: "dashboard",
            route: "/dashboard",
            description: "View dashboard",
        },
        {
            id: "users",
            name: "Users Management",
            type: "route",
            icon: "people",
            route: "/users",
            description: "Manage users",
            area: "users",
        },
        {
            id: "roles",
            name: "Roles Management",
            type: "route",
            icon: "admin_panel_settings",
            route: "/roles",
            description: "Manage roles",
            area: "roles",
        },
        {
            id: "departments",
            name: "Departments Management",
            type: "route",
            icon: "account_tree",
            route: "/departments",
            description: "Manage departments",
            area: "departments",
        },
        {
            id: "countries",
            name: "Countries Management",
            type: "route",
            icon: "public",
            route: "/countries",
            description: "Manage countries",
            area: "countries",
        },
        {
            id: "sub-departments",
            name: "Sub-Departments Management",
            type: "route",
            icon: "schema",
            route: "/sub-departments",
            description: "Manage sub-departments",
            area: "subDepartments",
        },
        {
            id: "employment-titles",
            name: "Employment Titles Management",
            type: "route",
            icon: "badge",
            route: "/employment-titles",
            description: "Manage employment titles",
            area: "employmentTitles",
        },
        {
            id: "permissions",
            name: "Permissions Management",
            type: "route",
            icon: "security",
            route: "/permissions",
            description: "Manage permissions",
            area: "roles",
        },
        {
            id: "profile",
            name: "Profile",
            type: "route",
            icon: "person",
            route: "/profile/me",
            description: "My profile",
        },
    ];

    adminNavItems: NavItem[] = [
        {
            label: "Users Management",
            icon: "people",
            route: "/users",
            area: "users",
        },
        {
            label: "Roles Management",
            icon: "admin_panel_settings",
            route: "/roles",
            area: "roles",
        },
        {
            label: "Departments Management",
            icon: "account_tree",
            route: "/departments",
            area: "departments",
        },
        {
            label: "Countries Management",
            icon: "public",
            route: "/countries",
            area: "countries",
        },
        {
            label: "Sub-Departments Management",
            icon: "schema",
            route: "/sub-departments",
            area: "subDepartments",
        },
        {
            label: "Employment Titles Management",
            icon: "badge",
            route: "/employment-titles",
            area: "employmentTitles",
        },
        {
            label: "Permissions Management",
            icon: "security",
            route: "/permissions",
            area: "roles",
        },
    ];

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

        this.searchControl.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                switchMap(searchTerm => Promise.resolve(this.getSearchResults(searchTerm || ""))),
            )
            .subscribe((results: SearchResult[]) => {
                this.filteredResults.set(results);
            });
    }

    private getSearchResults(searchTerm: string | null | undefined): SearchResult[] {
        // Ensure searchTerm is a string to avoid trim() errors
        const term = typeof searchTerm === "string" ? searchTerm : "";

        if (!term || term.trim().length < 2) {
            return [];
        }

        const lowerSearchTerm = term.toLowerCase();
        const routeResults = this.navigationRoutes.filter(
            route =>
                this.isAllowed(route.area) &&
                (route.name.toLowerCase().includes(lowerSearchTerm) ||
                    route.description?.toLowerCase().includes(lowerSearchTerm)),
        );

        // Return routes immediately, user search happens in parallel
        this.usersService.getUsers({ search: lowerSearchTerm }).subscribe(
            response => {
                const userResults = (response.data!.users || []).map<SearchResult>((user: IUser) => ({
                    id: user._id || "",
                    name: user.name,
                    type: "user",
                    icon: "person",
                    route: `/users`,
                    description: user.email,
                }));

                this.filteredResults.set([...routeResults, ...userResults].slice(0, 8));
            },
            () => {
                this.filteredResults.set(routeResults.slice(0, 8));
            },
        );

        return routeResults.slice(0, 8);
    }

    private isAllowed(area?: ManagementArea): boolean {
        return !area || this.permissionService.canViewArea(area);
    }

    selectResult(resultId: string | SearchResult): void {
        // Handle both string ID and SearchResult object for compatibility
        const result = typeof resultId === "string" ? this.filteredResults().find(r => r.id === resultId) : resultId;

        if (result && result.route) {
            this.router.navigate([result.route]);
            this.searchControl.setValue("");
            this.filteredResults.set([]);
        }
    }

    clearSearch(): void {
        this.searchControl.setValue("");
        this.filteredResults.set([]);
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
