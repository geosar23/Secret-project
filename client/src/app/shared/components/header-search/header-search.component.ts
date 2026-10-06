import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatInputModule } from "@angular/material/input";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { debounceTime, distinctUntilChanged, switchMap } from "rxjs";
import { UsersService } from "../../../core/services/users.service";
import { IUser } from "../../../core/interfaces/user.interface";
import { PermissionService } from "../../../core/services/permission.service";
import { ManagementArea } from "../../../core/utils/permission-areas";

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
    selector: "app-header-search",
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatAutocompleteModule, MatInputModule, ReactiveFormsModule],
    templateUrl: "./header-search.component.html",
    styleUrls: ["./header-search.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderSearchComponent implements OnInit {
    private router = inject(Router);
    private usersService = inject(UsersService);
    private permissionService = inject(PermissionService);

    searchControl = new FormControl("");
    filteredResults = signal<SearchResult[]>([]);

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
            id: "levels",
            name: "Levels Management",
            type: "route",
            icon: "stairs",
            route: "/levels",
            description: "Manage levels",
            area: "levels",
        },
        {
            id: "offices",
            name: "Offices Management",
            type: "route",
            icon: "location_city",
            route: "/offices",
            description: "Manage offices",
            area: "offices",
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
            id: "org-chart",
            name: "Org Chart",
            type: "route",
            icon: "account_tree",
            route: "/org-chart",
            description: "Company structure and reporting lines",
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

    ngOnInit(): void {
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
}
