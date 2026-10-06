import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { MatTableModule, MatTableDataSource } from "@angular/material/table";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatPaginatorModule, MatPaginator } from "@angular/material/paginator";
import { MatSortModule, MatSort } from "@angular/material/sort";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatSlideToggleModule, MatSlideToggleChange } from "@angular/material/slide-toggle";
import { MatMenuModule } from "@angular/material/menu";
import { MatTooltipModule } from "@angular/material/tooltip";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Subject } from "rxjs";
import { takeUntil, debounceTime, distinctUntilChanged } from "rxjs/operators";
import { RoleService } from "../../core/services/role.service";
import { IRole } from "../../core/interfaces/role.interface";
import { ToastService } from "../../core/services/toast.service";
import { PermissionService } from "../../core/services/permission.service";
import { RoleUtils } from "../../core/utils/role.utils";
import { LEAF_KEYS, countGrantedLeaf } from "../../core/utils/permission-matrix";

type TypeFilter = "all" | "system" | "custom";
type StatusFilter = "all" | "active" | "inactive";

interface RoleStats {
    total: number;
    system: number;
    custom: number;
    inactive: number;
}

@Component({
    selector: "app-roles",
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        MatTableModule,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatProgressBarModule,
        MatPaginatorModule,
        MatSortModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonToggleModule,
        MatSlideToggleModule,
        MatMenuModule,
        MatTooltipModule,
    ],
    templateUrl: "./roles.component.html",
    styleUrls: ["./roles.component.scss"],
})
export class RolesComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild("paginator") paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    private destroy$ = new Subject<void>();
    private roleService = inject(RoleService);
    private router = inject(Router);
    private toast = inject(ToastService);
    readonly canWrite = inject(PermissionService).canWriteArea("roles");
    readonly totalPermissions = LEAF_KEYS.length;

    loading = false;
    searchControl = new FormControl("", { nonNullable: true });
    systemRoleFilterControl = new FormControl<TypeFilter>("all", { nonNullable: true });
    statusFilterControl = new FormControl<StatusFilter>("all", { nonNullable: true });
    allRoles: IRole[] = [];
    stats: RoleStats = { total: 0, system: 0, custom: 0, inactive: 0 };
    tableData = new MatTableDataSource<IRole>([]);
    displayedColumns: string[] = [
        "name",
        "level",
        "permissions",
        "type",
        "status",
        ...(this.canWrite ? ["actions"] : []),
    ];

    ngOnInit(): void {
        this.tableData.filterPredicate = (data: IRole, filter: string) => {
            const parsed = JSON.parse(filter) as { search: string; roleType: TypeFilter; status: StatusFilter };
            const isSystem = this.isSystemRole(data);

            const matchesType = parsed.roleType === "all" || (parsed.roleType === "system" ? isSystem : !isSystem);
            const matchesStatus =
                parsed.status === "all" || (parsed.status === "active" ? !!data.isActive : !data.isActive);
            const matchesSearch =
                data.name.toLowerCase().includes(parsed.search) ||
                (data.description ?? "").toLowerCase().includes(parsed.search) ||
                (data.role ?? "").toLowerCase().includes(parsed.search);

            return matchesType && matchesStatus && matchesSearch;
        };

        this.tableData.sortingDataAccessor = (role, column) => {
            switch (column) {
                case "name":
                    return role.name.toLowerCase();
                case "level":
                    return role.level ?? 0;
                case "permissions":
                    return this.grantedCount(role);
                default:
                    return 0;
            }
        };

        this.loadRoles();

        this.searchControl.valueChanges
            .pipe(takeUntil(this.destroy$), debounceTime(300), distinctUntilChanged())
            .subscribe(() => this.applyFilters());

        this.systemRoleFilterControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.applyFilters());
        this.statusFilterControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.applyFilters());
    }

    ngAfterViewInit(): void {
        this.tableData.paginator = this.paginator;
        this.tableData.sort = this.sort;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadRoles(): void {
        this.loading = true;
        this.roleService.getRoles().subscribe({
            next: res => {
                if (!res.success || !res.data) {
                    this.toast.error(res.message || "Failed to load roles");
                    this.loading = false;
                    return;
                }
                this.setRoles(res.data);
                this.loading = false;
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to load roles");
                this.loading = false;
            },
        });
    }

    openEditor(role: IRole): void {
        if (this.canWrite) {
            this.router.navigate(["/roles", role._id, "edit"]);
        }
    }

    duplicate(role: IRole): void {
        this.router.navigate(["/roles/create"], { queryParams: { copyFrom: role._id } });
    }

    toggleActive(role: IRole, event: MatSlideToggleChange): void {
        const isActive = event.checked;
        this.roleService.updateRole(role._id, { isActive }).subscribe({
            next: res => {
                if (!res.success || !res.data?.role) {
                    event.source.checked = !!role.isActive;
                    this.toast.error(res.message || "Failed to update role");
                    return;
                }
                this.setRoles(this.allRoles.map(r => (r._id === role._id ? res.data!.role : r)));
                this.toast.success(`${role.name} is now ${isActive ? "active" : "inactive"}`);
            },
            error: err => {
                event.source.checked = !!role.isActive;
                this.toast.error(err.error?.message || "Failed to update role");
            },
        });
    }

    isSystemRole(role: IRole): boolean {
        return Boolean(role.isSystemRole);
    }

    grantedCount(role: IRole): number {
        return countGrantedLeaf(role.permissions);
    }

    roleColor(role: IRole): string {
        return RoleUtils.getRoleColor(role.role);
    }

    private setRoles(roles: IRole[]): void {
        this.allRoles = roles;
        this.tableData.data = roles;
        this.stats = {
            total: roles.length,
            system: roles.filter(r => r.isSystemRole).length,
            custom: roles.filter(r => !r.isSystemRole).length,
            inactive: roles.filter(r => !r.isActive).length,
        };
        this.applyFilters();
    }

    private applyFilters(): void {
        this.tableData.filter = JSON.stringify({
            search: this.searchControl.value.trim().toLowerCase(),
            roleType: this.systemRoleFilterControl.value,
            status: this.statusFilterControl.value,
        });

        if (this.paginator) {
            this.paginator.firstPage();
        }
    }
}
