import { Injectable, computed, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { AuthService } from "./auth.service";
import { PermissionService } from "./permission.service";
import { ManagementArea } from "../utils/permission-areas";

export interface SidebarItem {
    label: string;
    icon: string;
    route: string;
    area: ManagementArea;
}

export interface SidebarSection {
    label: string;
    items: SidebarItem[];
}

const SIDEBAR_SECTIONS: SidebarSection[] = [
    {
        label: "People",
        items: [
            { label: "Users Management", icon: "group", route: "/users", area: "users" },
            { label: "Roles Management", icon: "admin_panel_settings", route: "/roles", area: "roles" },
            { label: "Permissions", icon: "security", route: "/permissions", area: "roles" },
        ],
    },
    {
        label: "Organization",
        items: [
            { label: "Departments", icon: "account_tree", route: "/departments", area: "departments" },
            { label: "Sub-Departments", icon: "schema", route: "/sub-departments", area: "subDepartments" },
            { label: "Countries", icon: "public", route: "/countries", area: "countries" },
            { label: "Offices", icon: "location_city", route: "/offices", area: "offices" },
            { label: "Employment Titles", icon: "badge", route: "/employment-titles", area: "employmentTitles" },
            { label: "Levels", icon: "stairs", route: "/levels", area: "levels" },
        ],
    },
];

export const SIDEBAR_MOBILE_BREAKPOINT = 900;

/** Admin navigation sidebar: which links the user may see, and whether it is open. */
@Injectable({ providedIn: "root" })
export class SidebarService {
    private authService = inject(AuthService);
    private permissionService = inject(PermissionService);
    private user = toSignal(this.authService.localUser$, { initialValue: null });

    readonly open = signal(window.innerWidth >= SIDEBAR_MOBILE_BREAKPOINT);

    /** Sections filtered to what the current user can open; empty sections are dropped. */
    readonly sections = computed<SidebarSection[]>(() => {
        this.user();
        return SIDEBAR_SECTIONS.map(section => ({
            ...section,
            items: section.items.filter(item => this.permissionService.canViewArea(item.area)),
        })).filter(section => section.items.length > 0);
    });

    readonly hasItems = computed(() => this.sections().length > 0);

    toggle(): void {
        this.open.update(open => !open);
    }

    close(): void {
        this.open.set(false);
    }

    /** Close after navigating, but only when the sidebar is an overlay (small screens). */
    closeIfOverlay(): void {
        if (window.innerWidth < SIDEBAR_MOBILE_BREAKPOINT) {
            this.close();
        }
    }
}
