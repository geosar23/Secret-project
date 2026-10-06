import { Component, DestroyRef, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { debounceTime, distinctUntilChanged, forkJoin, of } from "rxjs";
import { MatCardModule } from "@angular/material/card";
import { MatTabsModule } from "@angular/material/tabs";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatButtonModule } from "@angular/material/button";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatMenuModule } from "@angular/material/menu";
import { MatIconModule } from "@angular/material/icon";
import { MatTableModule } from "@angular/material/table";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTooltipModule } from "@angular/material/tooltip";
import { RoleService } from "../../../core/services/role.service";
import { ToastService } from "../../../core/services/toast.service";
import { IRole } from "../../../core/interfaces/role.interface";
import { PermissionCategoriesStrings, PermissionScopes } from "../../../core/enums/permissions.enum";
import { hasPermission } from "../../../core/utils/permission.utils";
import {
    AREA_GROUPS,
    LEAF_KEYS,
    MATRIX_ACTIONS,
    MatrixAction,
    SCOPE_LABELS,
    SCOPE_ORDER,
    SUPPORTED_SCOPES,
    isLeafKey,
} from "../../../core/utils/permission-matrix";

type AreaFilter = "all" | "granted" | "none";
type Preset = "read" | "self" | "clear" | "full";

interface GroupRow {
    isGroup: true;
    label: string;
}

interface AreaRow {
    isGroup: false;
    category: string;
    name: string;
    read: PermissionScopes[];
    write: PermissionScopes[];
}

type MatrixRow = GroupRow | AreaRow;

interface RankItem {
    name: string;
    level: number;
    me: boolean;
}

@Component({
    selector: "app-role-editor-page",
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        MatCardModule,
        MatTabsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatMenuModule,
        MatIconModule,
        MatTableModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
    ],
    templateUrl: "./role-editor.component.html",
    styleUrls: ["./role-editor.component.scss"],
})
export class RoleEditorPageComponent implements OnInit {
    private fb = inject(FormBuilder);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private roleService = inject(RoleService);
    private toast = inject(ToastService);
    private destroyRef = inject(DestroyRef);

    readonly roleId = this.route.snapshot.paramMap.get("id");
    readonly isEdit = !!this.roleId;
    readonly totalPermissions = LEAF_KEYS.length;
    readonly displayedColumns = ["area", "read", "write"];
    readonly groupColumns = ["group"];

    loading = true;
    saving = false;
    role: IRole | null = null;
    allRoles: IRole[] = [];
    isSystemRole = false;

    form = this.fb.group({
        name: ["", [Validators.required, Validators.minLength(2)]],
        description: ["", [Validators.maxLength(255)]],
        level: [
            55 as number | null,
            [Validators.required, Validators.min(1), Validators.max(100), Validators.pattern(/^\d+$/)],
        ],
        isActive: [true],
    });

    selectedIndex = 0;
    searchControl = new FormControl("", { nonNullable: true });
    areaFilter: AreaFilter = "all";
    rows: MatrixRow[] = [];
    areaCount = 0;

    /** Explicitly assigned matrix permissions. */
    private selected = new Set<string>();
    private original = new Set<string>();
    /** Stored permissions that are not individual matrix keys (e.g. `*:*:*`); kept untouched on save. */
    extraPermissions: string[] = [];

    ngOnInit(): void {
        this.searchControl.valueChanges
            .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.buildRows());

        const copyFrom = this.route.snapshot.queryParamMap.get("copyFrom");
        forkJoin({
            roles: this.roleService.getRoles(),
            role: this.roleId ? this.roleService.getRoleById(this.roleId) : of(null),
        }).subscribe({
            next: ({ roles, role }) => {
                this.allRoles = roles.data ?? [];
                if (this.isEdit) {
                    if (!role?.success || !role.data) {
                        this.toast.error(role?.message || "Role not found");
                        this.back();
                        return;
                    }
                    this.role = role.data;
                    this.initFrom(role.data, false);
                } else if (copyFrom) {
                    const source = this.allRoles.find(r => r._id === copyFrom);
                    if (source) {
                        this.initFrom(source, true);
                    }
                }
                this.loading = false;
                this.buildRows();
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to load role");
                this.back();
            },
        });
        this.buildRows();
    }

    // ── Header / summary ─────────────────────────────────────────────────────

    get title(): string {
        return this.isEdit ? "Edit Role" : "Create Role";
    }

    get grantedCount(): number {
        return LEAF_KEYS.filter(key => this.isOn(key)).length;
    }

    get changeCount(): number {
        let changes = 0;
        LEAF_KEYS.forEach(key => {
            if (this.selected.has(key) !== this.original.has(key)) {
                changes++;
            }
        });
        return changes;
    }

    get canSave(): boolean {
        return this.form.valid && !this.saving && !this.loading;
    }

    get rank(): RankItem[] {
        const { name, level } = this.form.getRawValue();
        return [
            ...this.allRoles
                .filter(r => r._id !== this.role?._id)
                .map((r): RankItem => ({ name: r.name, level: r.level ?? 0, me: false })),
            { name: name || "This role", level: Number(level) || 0, me: true },
        ].sort((a, b) => b.level - a.level);
    }

    /** Roles that can be used as a starting point when creating a role. */
    get copySources(): IRole[] {
        return this.allRoles;
    }

    onCopyFrom(roleId: string): void {
        const source = this.allRoles.find(r => r._id === roleId);
        this.selected = new Set<string>();
        this.extraPermissions = [];
        if (source) {
            this.splitPermissions(source.permissions ?? []);
        }
        this.buildRows();
    }

    // ── Permission matrix ────────────────────────────────────────────────────

    isGroup = (_: number, row: MatrixRow): boolean => row.isGroup;

    /** Granted through a wildcard permission the role already holds, so it can't be toggled individually. */
    isCovered(key: string): boolean {
        return this.extraPermissions.length > 0 && hasPermission(this.extraPermissions, key);
    }

    isOn(key: string): boolean {
        return this.selected.has(key) || this.isCovered(key);
    }

    selectedScopes(category: string, action: MatrixAction, scopes: PermissionScopes[]): PermissionScopes[] {
        return scopes.filter(scope => this.isOn(`${category}:${action}:${scope}`));
    }

    scopeLabel(scope: PermissionScopes): string {
        return SCOPE_LABELS[scope];
    }

    keyFor(category: string, action: MatrixAction, scope: PermissionScopes): string {
        return `${category}:${action}:${scope}`;
    }

    onScopesChange(
        category: string,
        action: MatrixAction,
        scopes: PermissionScopes[],
        values: PermissionScopes[],
    ): void {
        scopes.forEach(scope => {
            const key = this.keyFor(category, action, scope);
            if (this.isCovered(key)) {
                return;
            }
            if (values.includes(scope)) {
                this.selected.add(key);
            } else {
                this.selected.delete(key);
            }
        });
        this.buildRows();
    }

    onSingleChange(key: string, checked: boolean): void {
        if (checked) {
            this.selected.add(key);
        } else {
            this.selected.delete(key);
        }
        this.buildRows();
    }

    onFilterChange(value: AreaFilter): void {
        this.areaFilter = value;
        this.buildRows();
    }

    applyPreset(preset: Preset): void {
        this.selected = new Set<string>();
        AREA_GROUPS.flatMap(g => g.categories).forEach(category => {
            const supported = SUPPORTED_SCOPES.get(category);
            MATRIX_ACTIONS.forEach(action => {
                const scopes = supported?.[action] ?? [];
                if (preset === "full") {
                    scopes.forEach(scope => this.selected.add(this.keyFor(category, action, scope)));
                } else if (preset === "read" && action === "read" && scopes.length) {
                    const widest = scopes.includes(PermissionScopes.ALL) ? PermissionScopes.ALL : scopes[0];
                    this.selected.add(this.keyFor(category, action, widest));
                } else if (
                    preset === "self" &&
                    scopes.includes(PermissionScopes.SELF) &&
                    category.startsWith("user") &&
                    category !== "userCreate"
                ) {
                    this.selected.add(this.keyFor(category, action, PermissionScopes.SELF));
                }
            });
        });
        this.buildRows();
    }

    resetPermissions(): void {
        this.selected = new Set(this.original);
        this.buildRows();
    }

    // ── Save / navigation ────────────────────────────────────────────────────

    save(): void {
        if (!this.canSave) {
            this.form.markAllAsTouched();
            return;
        }
        this.saving = true;

        const { name, description, level, isActive } = this.form.value;
        const permissions = [...LEAF_KEYS.filter(key => this.selected.has(key)), ...this.extraPermissions];
        const levelValue = level === null || level === undefined ? undefined : Number(level);

        const request$ = this.isEdit
            ? this.roleService.updateRole(this.roleId as string, {
                  name: name ?? undefined,
                  description: description ?? "",
                  level: levelValue,
                  isActive: isActive ?? true,
                  permissions,
              })
            : this.roleService.createRole({
                  name: name ?? "",
                  description: description ?? "",
                  level: levelValue,
                  isActive: isActive ?? true,
                  permissions,
              });

        request$.subscribe({
            next: res => {
                if (!res.success || !res.data?.role) {
                    this.toast.error(res.message || "Operation failed");
                    this.saving = false;
                    return;
                }
                this.toast.success(this.isEdit ? "Role updated successfully" : "Role created successfully");
                this.back();
            },
            error: err => {
                this.toast.error(err.error?.message || "Operation failed");
                this.saving = false;
            },
        });
    }

    back(): void {
        this.router.navigate(["/roles"]);
    }

    // ── Internals ────────────────────────────────────────────────────────────

    private initFrom(source: IRole, asCopy: boolean): void {
        this.isSystemRole = !asCopy && !!source.isSystemRole;
        this.form.patchValue({
            name: asCopy ? `${source.name} (copy)` : source.name,
            description: source.description ?? "",
            level: source.level ?? 55,
            isActive: asCopy ? true : (source.isActive ?? true),
        });
        this.splitPermissions(source.permissions ?? []);
        if (!asCopy) {
            this.original = new Set(this.selected);
        }
        if (this.isSystemRole) {
            this.form.controls.name.disable();
            this.form.controls.level.disable();
        }
    }

    private splitPermissions(permissions: string[]): void {
        this.selected = new Set(permissions.filter(isLeafKey));
        this.extraPermissions = permissions.filter(p => !isLeafKey(p));
    }

    private buildRows(): void {
        const term = this.searchControl.value.trim().toLowerCase();
        const rows: MatrixRow[] = [];
        let areaCount = 0;

        AREA_GROUPS.forEach(group => {
            const areas: AreaRow[] = [];
            group.categories.forEach(category => {
                const label = PermissionCategoriesStrings[category];
                if (term && !label.toLowerCase().includes(term)) {
                    return;
                }
                const supported = SUPPORTED_SCOPES.get(category);
                const read = SCOPE_ORDER.filter(s => supported?.read.includes(s));
                const write = SCOPE_ORDER.filter(s => supported?.write.includes(s));
                const granted = [
                    ...read.map(s => this.keyFor(category, "read", s)),
                    ...write.map(s => this.keyFor(category, "write", s)),
                ].some(key => this.isOn(key));
                if (this.areaFilter === "granted" && !granted) {
                    return;
                }
                if (this.areaFilter === "none" && granted) {
                    return;
                }
                areas.push({
                    isGroup: false,
                    category,
                    name: label.replace(/^User Profile – /, ""),
                    read,
                    write,
                });
            });
            if (areas.length) {
                rows.push({ isGroup: true, label: group.label }, ...areas);
                areaCount += areas.length;
            }
        });

        this.rows = rows;
        this.areaCount = areaCount;
    }
}
