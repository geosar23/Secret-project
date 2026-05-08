import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatTableModule, MatTableDataSource } from "@angular/material/table";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatPaginatorModule, MatPaginator } from "@angular/material/paginator";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDialog } from "@angular/material/dialog";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Subject } from "rxjs";
import { takeUntil, debounceTime, distinctUntilChanged } from "rxjs/operators";
import { RoleService } from "../../core/services/role.service";
import { IRole } from "../../core/interfaces/role.interface";
import { ToastService } from "../../core/services/toast.service";
import { RoleDialogComponent, RoleDialogData } from "./role-dialog/role-dialog.component";
import { AuthService } from "../../core/services/auth.service";
import { IUser } from "../../core/interfaces/user.interface";

@Component({
    selector: "app-roles",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule,
    ],
    templateUrl: "./roles.component.html",
    styleUrls: ["./roles.component.scss"],
})
export class RolesComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild("paginator") paginator!: MatPaginator;

    private destroy$ = new Subject<void>();
    private authService = inject(AuthService);
    private roleService = inject(RoleService);
    private dialog = inject(MatDialog);
    private toast = inject(ToastService);

    localUser: IUser | null = null;
    loading = false;
    searchControl = new FormControl("");
    systemRoleFilterControl = new FormControl<"all" | "system" | "custom">("all", { nonNullable: true });
    allRoles: IRole[] = [];
    tableData = new MatTableDataSource<IRole>([]);
    displayedColumns: string[] = ["name", "description", "permissions", "type", "status", "createdAt", "actions"];

    ngOnInit(): void {
        this.authService.localUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
            this.localUser = user;
        });

        this.tableData.filterPredicate = (data: IRole, filter: string) => {
            const parsed = JSON.parse(filter) as { search: string; roleType: "all" | "system" | "custom" };
            const term = parsed.search;
            const isSystem = this.isSystemRole(data);

            const matchesType = parsed.roleType === "all" || (parsed.roleType === "system" ? isSystem : !isSystem);

            const matchesSearch =
                data.name.toLowerCase().includes(term) ||
                (data.company?.name ?? "").toLowerCase().includes(term) ||
                (data.description ?? "").toLowerCase().includes(term) ||
                (data.role ?? "").toLowerCase().includes(term) ||
                (data.permissions ?? []).join(" ").toLowerCase().includes(term);

            return matchesType && matchesSearch;
        };

        this.loadRoles();

        this.searchControl.valueChanges
            .pipe(takeUntil(this.destroy$), debounceTime(300), distinctUntilChanged())
            .subscribe(() => this.applyFilters());

        this.systemRoleFilterControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.applyFilters());
    }

    ngAfterViewInit(): void {
        this.tableData.paginator = this.paginator;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadRoles(): void {
        this.loading = true;
        this.roleService.getAllRoles().subscribe({
            next: res => {
                if (!res.success || !res.data) {
                    this.toast.error(res.message || "Failed to load roles");
                    this.loading = false;
                    return;
                }
                this.allRoles = res.data;
                this.tableData.data = res.data;
                this.applyFilters();
                this.loading = false;
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to load roles");
                this.loading = false;
            },
        });
    }

    openCreateDialog(): void {
        this.dialog
            .open(RoleDialogComponent, {
                width: "460px",
                maxWidth: "95vw",
                data: { mode: "create" } as RoleDialogData,
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((role?: IRole) => {
                if (!role) return;
                this.allRoles = [role, ...this.allRoles];
                this.tableData.data = this.allRoles;
                this.applyFilters();
                this.toast.success("Role created successfully");
            });
    }

    openEditDialog(role: IRole): void {
        this.dialog
            .open(RoleDialogComponent, {
                width: "460px",
                maxWidth: "95vw",
                data: { mode: "edit", role } as RoleDialogData,
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((updated?: IRole) => {
                if (!updated) return;
                this.allRoles = this.allRoles.map(r => (r._id === updated._id ? updated : r));
                this.tableData.data = this.allRoles;
                this.applyFilters();
                this.toast.success("Role updated successfully");
            });
    }

    isSystemRole(role: IRole): boolean {
        return Boolean(role.isSystemRole);
    }

    private applyFilters(): void {
        const filter = {
            search: (this.searchControl.value ?? "").trim().toLowerCase(),
            roleType: this.systemRoleFilterControl.value,
        };
        this.tableData.filter = JSON.stringify(filter);

        if (this.paginator) {
            this.paginator.firstPage();
        }
    }
}
