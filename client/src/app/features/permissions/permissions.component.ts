import { Component, DestroyRef, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { debounceTime, distinctUntilChanged } from "rxjs";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatListModule } from "@angular/material/list";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTableModule } from "@angular/material/table";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { AuthService } from "../../core/services/auth.service";
import { RoleService } from "../../core/services/role.service";
import { RoleUtils } from "../../core/utils/role.utils";
import { hasPermission } from "../../core/utils/permission.utils";
import {
    PermissionCategories,
    PermissionCategoriesStrings,
    PermissionKeys,
    PermissionScopes,
} from "../../core/enums/permissions.enum";
import { IUser } from "../../core/interfaces/user.interface";
import { IRole } from "../../core/interfaces/role.interface";

type PermissionAction = "read" | "write";
type ChipState = "granted" | "revoked" | "lost" | "gain";
type AreaFilter = "all" | "granted" | "none" | "diff";

interface ScopeChip {
    label: string;
    state: ChipState;
    title?: string;
}

interface GroupRow {
    isGroup: true;
    label: string;
}

interface AreaRow {
    isGroup: false;
    category: string;
    name: string;
    read: ScopeChip[] | null;
    write: ScopeChip[] | null;
}

type MatrixRow = GroupRow | AreaRow;

interface Tiles {
    granted: number;
    total: number;
    delta: number;
    read: number;
    write: number;
    widest: string;
}

export interface OverrideItem {
    key: string;
    kind: "granted" | "revoked";
}

const SCOPE_ORDER: PermissionScopes[] = [
    PermissionScopes.ALL,
    PermissionScopes.DEPARTMENT_COUNTRY,
    PermissionScopes.DEPARTMENT,
    PermissionScopes.COUNTRY,
    PermissionScopes.MANAGED,
    PermissionScopes.SELF,
];

const SCOPE_LABELS: Record<PermissionScopes, string> = {
    [PermissionScopes.ALL]: "All",
    [PermissionScopes.DEPARTMENT_COUNTRY]: "Dept + Country",
    [PermissionScopes.DEPARTMENT]: "Dept",
    [PermissionScopes.COUNTRY]: "Country",
    [PermissionScopes.MANAGED]: "Managed",
    [PermissionScopes.SELF]: "Self",
};

const AREA_GROUPS: { label: string; categories: PermissionCategories[] }[] = [
    {
        label: "Users",
        categories: [
            PermissionCategories.USERS_MANAGEMENT,
            PermissionCategories.USER_CREATE,
            PermissionCategories.RESET_PASSWORD,
        ],
    },
    {
        label: "User profile",
        categories: [
            PermissionCategories.USER_PROFILE_IDENTITY,
            PermissionCategories.USER_PROFILE_CONTACT,
            PermissionCategories.USER_PROFILE_EMPLOYMENT,
            PermissionCategories.USER_PROFILE_EDUCATION,
            PermissionCategories.USER_PROFILE_COMPENSATION,
        ],
    },
    {
        label: "Organization",
        categories: [
            PermissionCategories.COUNTRIES_MANAGEMENT,
            PermissionCategories.DEPARTMENTS_MANAGEMENT,
            PermissionCategories.SUB_DEPARTMENTS_MANAGEMENT,
            PermissionCategories.EMPLOYMENT_TITLES_MANAGEMENT,
            PermissionCategories.LEVELS_MANAGEMENT,
            PermissionCategories.OFFICES_MANAGEMENT,
        ],
    },
    { label: "Access", categories: [PermissionCategories.ROLES_MANAGEMENT] },
];

/** category → action → scopes that exist for it, derived from the permission key map. */
const SUPPORTED_SCOPES = new Map<string, Record<PermissionAction, PermissionScopes[]>>();
Object.values(PermissionKeys).forEach(key => {
    const [category, action, scope] = key.split(":");
    if (action !== "read" && action !== "write") {
        return;
    }
    const entry = SUPPORTED_SCOPES.get(category) ?? { read: [], write: [] };
    entry[action].push(scope as PermissionScopes);
    SUPPORTED_SCOPES.set(category, entry);
});

const LEAF_KEYS: string[] = AREA_GROUPS.flatMap(g => g.categories).flatMap(category => {
    const supported = SUPPORTED_SCOPES.get(category);
    return (["read", "write"] as const).flatMap(action =>
        (supported?.[action] ?? []).map(scope => `${category}:${action}:${scope}`),
    );
});

@Component({
    selector: "app-permissions",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatToolbarModule,
        MatCardModule,
        MatIconModule,
        MatListModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatSlideToggleModule,
        MatTableModule,
        MatExpansionModule,
        MatProgressBarModule,
    ],
    templateUrl: "./permissions.component.html",
    styleUrls: ["./permissions.component.scss"],
})
export class PermissionsComponent implements OnInit {
    private authService = inject(AuthService);
    private roleService = inject(RoleService);
    private destroyRef = inject(DestroyRef);

    localUser: IUser | null = null;
    roleData: IRole[] = [];

    viewRole: IRole | null = null;
    compare = false;
    areaFilter: AreaFilter = "all";
    searchControl = new FormControl("", { nonNullable: true });

    rows: MatrixRow[] = [];
    areaCount = 0;
    tiles: Tiles = { granted: 0, total: LEAF_KEYS.length, delta: 0, read: 0, write: 0, widest: "None" };
    overrides: OverrideItem[] = [];
    previewSummary = "";

    readonly displayedColumns = ["area", "read", "write"];
    readonly groupColumns = ["group"];

    private minePermissions: string[] = [];
    private revokedPermissions: string[] = [];

    ngOnInit(): void {
        this.authService.localUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(user => {
            this.localUser = user;
            this.minePermissions = [...(user?.role?.permissions ?? []), ...(user?.grantedPermissions ?? [])];
            this.revokedPermissions = user?.revokedPermissions ?? [];
            this.overrides = [
                ...(user?.grantedPermissions ?? []).map((key): OverrideItem => ({ key, kind: "granted" })),
                ...this.revokedPermissions.map((key): OverrideItem => ({ key, kind: "revoked" })),
            ];
            this.refresh();
        });

        this.roleService.getRoles("active").subscribe(res => {
            if (res.success) {
                this.roleData = (res.data || []).sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
            }
        });

        this.searchControl.valueChanges
            .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.refresh());
    }

    isGroup = (_: number, row: MatrixRow): boolean => row.isGroup;

    getRoleColor(role: string): string {
        return RoleUtils.getRoleColor(role);
    }

    getRoleName(role: string): string {
        return RoleUtils.getRoleName(role);
    }

    isMyRole(role: IRole): boolean {
        return !!this.localUser && role.role === this.localUser.role?.role;
    }

    /** Click a role in the hierarchy: preview it, or stop previewing when it is already selected / is mine. */
    selectRole(role: IRole): void {
        const stop = this.viewRole?.role === role.role || this.isMyRole(role);
        this.setPreview(stop ? null : role);
    }

    stopPreview(): void {
        this.setPreview(null);
    }

    onCompareChange(value: boolean): void {
        this.compare = value;
        if (!value && this.areaFilter === "diff") {
            this.areaFilter = "all";
        }
        this.refresh();
    }

    onFilterChange(value: AreaFilter): void {
        this.areaFilter = value;
        this.refresh();
    }

    private setPreview(role: IRole | null): void {
        this.viewRole = role;
        this.compare = false;
        this.areaFilter = "all";
        this.refresh();
    }

    private canMine(key: string): boolean {
        return hasPermission(this.minePermissions, key) && !this.revokedPermissions.includes(key);
    }

    private canView(key: string): boolean {
        return this.viewRole ? hasPermission(this.viewRole.permissions ?? [], key) : this.canMine(key);
    }

    private isRevokedForMe(key: string): boolean {
        return hasPermission(this.minePermissions, key) && this.revokedPermissions.includes(key);
    }

    private buildCell(category: string, action: PermissionAction): ScopeChip[] | null {
        const supported = SUPPORTED_SCOPES.get(category)?.[action];
        if (!supported?.length) {
            return null;
        }
        const chips: ScopeChip[] = [];
        SCOPE_ORDER.filter(scope => supported.includes(scope)).forEach(scope => {
            const key = `${category}:${action}:${scope}`;
            const label = SCOPE_LABELS[scope];
            const inView = this.canView(key);
            const inMine = this.canMine(key);
            if (!this.viewRole) {
                if (inMine) {
                    chips.push({ label, state: "granted" });
                } else if (this.isRevokedForMe(key)) {
                    chips.push({ label, state: "revoked", title: "Revoked for your account" });
                }
            } else if (this.compare) {
                if (inView && inMine) {
                    chips.push({ label, state: "granted" });
                } else if (inMine) {
                    chips.push({ label, state: "lost", title: `You have this, ${this.viewRole.name} does not` });
                } else if (inView) {
                    chips.push({ label, state: "gain", title: `${this.viewRole.name} has this, you do not` });
                }
            } else if (inView) {
                chips.push({ label, state: "granted" });
            }
        });
        return chips;
    }

    private refresh(): void {
        this.buildRows();
        this.buildTiles();
    }

    private buildRows(): void {
        const term = this.searchControl.value.trim().toLowerCase();
        const rows: MatrixRow[] = [];
        let areaCount = 0;

        AREA_GROUPS.forEach(group => {
            const areas: AreaRow[] = [];
            group.categories.forEach(category => {
                const name = PermissionCategoriesStrings[category];
                if (term && !name.toLowerCase().includes(term)) {
                    return;
                }
                const read = this.buildCell(category, "read");
                const write = this.buildCell(category, "write");
                const chips = [...(read ?? []), ...(write ?? [])];
                const hasAccess = chips.some(c => c.state === "granted" || c.state === "gain");
                const differs = chips.some(c => c.state === "lost" || c.state === "gain");
                if (this.areaFilter === "granted" && !hasAccess) {
                    return;
                }
                if (this.areaFilter === "none" && hasAccess) {
                    return;
                }
                if (this.areaFilter === "diff" && !differs) {
                    return;
                }
                areas.push({ isGroup: false, category, name: name.replace(/^User Profile – /, ""), read, write });
            });
            if (areas.length) {
                rows.push({ isGroup: true, label: group.label }, ...areas);
                areaCount += areas.length;
            }
        });

        this.rows = rows;
        this.areaCount = areaCount;
    }

    private buildTiles(): void {
        const viewKeys = LEAF_KEYS.filter(key => this.canView(key));
        const mineKeys = LEAF_KEYS.filter(key => this.canMine(key));
        const viewScopes = new Set(viewKeys.map(key => key.split(":")[2]));
        const widest = SCOPE_ORDER.find(scope => viewScopes.has(scope));

        this.tiles = {
            granted: viewKeys.length,
            total: LEAF_KEYS.length,
            delta: this.viewRole ? viewKeys.length - mineKeys.length : 0,
            read: viewKeys.filter(key => key.split(":")[1] === "read").length,
            write: viewKeys.filter(key => key.split(":")[1] === "write").length,
            widest: widest ? SCOPE_LABELS[widest] : "None",
        };

        const fewer = mineKeys.filter(key => !this.canView(key)).length;
        this.previewSummary = fewer
            ? `${fewer} permission${fewer === 1 ? "" : "s"} fewer than your account.`
            : "Same access as your account.";
    }
}
