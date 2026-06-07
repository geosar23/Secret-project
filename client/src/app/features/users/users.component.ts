import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatTableModule, MatTableDataSource } from "@angular/material/table";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatPaginatorModule, MatPaginator } from "@angular/material/paginator";
import { MatSelectModule } from "@angular/material/select";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatBadgeModule } from "@angular/material/badge";
import { MatDialogModule, MatDialog } from "@angular/material/dialog";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Subject } from "rxjs";
import { takeUntil, debounceTime, distinctUntilChanged, finalize } from "rxjs/operators";
import { Router } from "@angular/router";
import { UsersService } from "../../core/services/users.service";
import { IUser, IUsersListResponse, IUsersQueryParams } from "../../core/interfaces/user.interface";

import { RoleUtils } from "../../core/utils/role.utils";
import { JsonResponse } from "../../core/interfaces/generics.interface";
import { ToastService } from "../../core/services/toast.service";
import { RoleService } from "../../core/services/role.service";
import { CountryService } from "../../core/services/country.service";
import { DepartmentService } from "../../core/services/department.service";
import { IRole } from "../../core/interfaces/role.interface";
import { ICountry } from "../../core/interfaces/country.interface";
import { IDepartment } from "../../core/interfaces/department.interface";
import { ColumnDef, ColumnSelectorDialogComponent } from "./column-selector-dialog/column-selector-dialog.component";

interface IUserTableData extends IUser {
    roleColor?: string;
    roleName?: string;
}

@Component({
    selector: "app-users",
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
        MatSelectModule,
        MatFormFieldModule,
        MatInputModule,
        MatBadgeModule,
        MatDialogModule,
    ],
    templateUrl: "./users.component.html",
    styleUrls: ["./users.component.scss"],
})
export class UsersComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild("paginator", { static: false }) public paginator!: MatPaginator;

    private destroy$ = new Subject<void>();
    private readonly columnStorageKey = "users.table.selectedColumns";

    searchControl = new FormControl("");

    public tableData: MatTableDataSource<IUserTableData> = new MatTableDataSource<IUserTableData>([]);
    public displayedColumns: string[] = ["name", "actions"];
    private toast = inject(ToastService);

    loading = false;

    // Fixed base columns (always shown)
    private readonly BASE_COLUMNS = ["name", "actions"];
    private readonly BASE_COLUMN_SET = new Set(this.BASE_COLUMNS);
    readonly MAX_EXTRA_COLUMNS = 10;

    // All available optional columns
    readonly availableColumns: ColumnDef[] = [
        // Organization
        { key: "country", label: "Country", group: "Organization" },
        { key: "department", label: "Department", group: "Organization" },
        { key: "employmentTitle", label: "Employment Title", group: "Organization" },
        { key: "manager", label: "Manager", group: "Organization" },
        { key: "level", label: "Level", group: "Organization" },
        { key: "office", label: "Office", group: "Organization" },
        { key: "hrRepresentative", label: "HR Representative", group: "Organization" },
        { key: "role", label: "Role", group: "Organization" },
        // Identity
        { key: "legalName", label: "Legal Name", group: "Identity" },
        { key: "firstName", label: "First Name", group: "Identity" },
        { key: "lastName", label: "Last Name", group: "Identity" },
        { key: "gender", label: "Gender", group: "Identity" },
        { key: "birthday", label: "Birthday", group: "Identity" },
        { key: "maritalStatus", label: "Marital Status", group: "Identity" },
        { key: "nationalities", label: "Nationalities", group: "Identity" },
        { key: "religion", label: "Religion", group: "Identity" },
        // Contact
        { key: "email", label: "Email", group: "Contact" },
        { key: "personalEmail", label: "Personal Email", group: "Contact" },
        { key: "workPhone", label: "Work Phone", group: "Contact" },
        { key: "personalPhone", label: "Personal Phone", group: "Contact" },
        { key: "homeCountryPhone", label: "Home Country Phone", group: "Contact" },
        // Employment
        { key: "status", label: "Status", group: "Employment" },
        { key: "createdAt", label: "Created At", group: "Employment" },
        { key: "employmentDate", label: "Employment Date", group: "Employment" },
        { key: "employmentType", label: "Employment Type", group: "Employment" },
        { key: "payrollId", label: "Payroll ID", group: "Employment" },
        { key: "isOutsourced", label: "Outsourced", group: "Employment" },
        { key: "salary", label: "Salary", group: "Employment" },
        { key: "updatedAt", label: "Updated At", group: "Employment" },
    ];

    readonly selectableColumns = this.availableColumns.filter(column => !this.BASE_COLUMN_SET.has(column.key));
    private readonly SELECTABLE_COLUMN_SET = new Set(this.selectableColumns.map(column => column.key));

    // Resolver: maps column key to a display value
    readonly columnValueMap: Record<string, (user: IUserTableData) => string> = {
        email: u => u.email || "—",
        role: u => u.roleName || u.role?.role || "—",
        status: u => (u.isActive ? "Active" : "Inactive"),
        createdAt: u => (u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"),
        country: u => u.country?.name || "—",
        department: u => u.employmentTitle?.subDepartment?.department?.name || "—",
        employmentTitle: u => u.employmentTitle?.name || "—",
        manager: u => u.manager?.name || "—",
        level: u => u.level?.name || "—",
        office: u => u.office?.name || "—",
        hrRepresentative: u => u.hrRepresentative?.name || "—",
        legalName: u => u.legalName || "—",
        firstName: u => u.firstName || "—",
        lastName: u => u.lastName || "—",
        gender: u => u.gender || "—",
        birthday: u => (u.birthday ? new Date(u.birthday).toLocaleDateString() : "—"),
        maritalStatus: u => u.maritalStatus || "—",
        nationalities: u => u.nationalities?.join(", ") || "—",
        religion: u => u.religion || "—",
        personalEmail: u => u.personalEmail || "—",
        workPhone: u => u.workPhone || "—",
        personalPhone: u => u.personalPhone || "—",
        homeCountryPhone: u => u.homeCountryPhone || "—",
        employmentDate: u => (u.employmentDate ? new Date(u.employmentDate).toLocaleDateString() : "—"),
        employmentType: u => u.employmentType || "—",
        payrollId: u => u.payrollId || "—",
        isOutsourced: u => (u.isOutsourced != null ? (u.isOutsourced ? "Yes" : "No") : "—"),
        salary: u => u.salary || "—",
        updatedAt: u => (u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : "—"),
    };

    // Currently selected extra column keys (persisted across sessions would need localStorage)
    selectedExtraColumnKeys: string[] = [];

    // Derived: only the selected extra ColumnDef objects (for template rendering)
    get activeExtraColumns(): ColumnDef[] {
        return this.selectableColumns.filter(c => this.selectedExtraColumnKeys.includes(c.key));
    }

    getCellValue(user: IUserTableData, key: string): string {
        return this.columnValueMap[key]?.(user) ?? "—";
    }

    roles: IRole[] = [];
    departments: IDepartment[] = [];
    countries: ICountry[] = [];
    roleControl = new FormControl<string>("");
    departmentControl = new FormControl<string>("");
    countryControl = new FormControl<string>("");
    isActiveControl = new FormControl<string>("");

    // Sorting options
    sortOptions = [
        { value: "name:asc", label: "Name (A-Z)" },
        { value: "name:desc", label: "Name (Z-A)" },
        { value: "email:asc", label: "Email (A-Z)" },
        { value: "email:desc", label: "Email (Z-A)" },
        { value: "createdAt:desc", label: "Newest First" },
        { value: "createdAt:asc", label: "Oldest First" },
        { value: "role:asc", label: "Role (A-Z)" },
        { value: "role:desc", label: "Role (Z-A)" },
    ];
    selectedSort = "createdAt:desc";

    // Query params
    queryParams: IUsersQueryParams = {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
    };

    constructor(
        private usersService: UsersService,
        private router: Router,
        private roleService: RoleService,
        private countryService: CountryService,
        private departmentService: DepartmentService,
        private dialog: MatDialog,
    ) {}

    ngOnInit() {
        this.restoreColumnSelection();
        this.loadUsers();
        this.loadFilterOptions();

        // Listen to search input with debounce
        this.searchControl.valueChanges
            .pipe(takeUntil(this.destroy$), debounceTime(500), distinctUntilChanged())
            .subscribe(searchValue => {
                this.queryParams.search = searchValue || undefined;
                this.queryParams.page = 1; // Reset to first page
                if (this.paginator) {
                    this.paginator.pageIndex = 0;
                }
                this.loadUsers();
            });

        const filterControls: {
            control: FormControl<string | null>;
            key: "roleId" | "departmentId" | "countryId";
        }[] = [
            { control: this.roleControl, key: "roleId" },
            { control: this.departmentControl, key: "departmentId" },
            { control: this.countryControl, key: "countryId" },
        ];

        for (const { control, key } of filterControls) {
            control.valueChanges.pipe(takeUntil(this.destroy$), distinctUntilChanged()).subscribe(value => {
                this.queryParams[key] = value || undefined;
                this.queryParams.page = 1;
                if (this.paginator) {
                    this.paginator.pageIndex = 0;
                }
                this.loadUsers();
            });
        }

        this.isActiveControl.valueChanges.pipe(takeUntil(this.destroy$), distinctUntilChanged()).subscribe(value => {
            this.queryParams.isActive = value === "" ? undefined : value === "true";
            this.queryParams.page = 1;
            if (this.paginator) {
                this.paginator.pageIndex = 0;
            }
            this.loadUsers();
        });
    }

    ngAfterViewInit() {
        if (this.paginator) {
            // Listen to paginator changes (page and pageSize)
            this.paginator.page.pipe(takeUntil(this.destroy$)).subscribe(event => {
                this.queryParams.page = event.pageIndex + 1;
                this.queryParams.limit = event.pageSize;
                console.log("Paginator changed:", this.queryParams);
                this.loadUsers();
            });
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadFilterOptions() {
        this.roleService
            .getAllRoles()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    if (res.success && res.data) {
                        this.roles = res.data;
                    }
                },
            });

        this.countryService
            .getCountries()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    if (res.success && res.data) {
                        this.countries = res.data;
                    }
                },
            });

        this.departmentService
            .getDepartments()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    if (res.success && res.data) {
                        this.departments = res.data;
                    }
                },
            });
    }

    loadUsers() {
        this.loading = true;

        this.usersService
            .getUsers(this.queryParams)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: (res: JsonResponse<IUsersListResponse>) => {
                    if (!res.success || !res.data) {
                        this.toast.error(res.message || "Failed to load users");
                        return;
                    }

                    const response = res.data;

                    this.tableData.data = response.users.map(user => ({
                        ...user,
                        roleColor: RoleUtils.getRoleColor(user.role?.role),
                        roleName: RoleUtils.getRoleName(user.role?.role),
                    }));

                    setTimeout(() => {
                        if (this.paginator) {
                            this.paginator.length = response.total;
                            this.paginator.pageSize = this.queryParams.limit || 10;
                            this.paginator.pageIndex = (this.queryParams.page || 1) - 1;
                        }
                    });
                },
                error: err => {
                    this.toast.error(err.error?.message || "Unexpected error occurred");
                },
            });
    }

    onSortChange(sortValue: string) {
        const [sortBy, sortOrder] = sortValue.split(":");
        this.queryParams.sortBy = sortBy;
        this.queryParams.sortOrder = sortOrder as "asc" | "desc";
        this.queryParams.page = 1; // Reset to first page
        if (this.paginator) {
            this.paginator.pageIndex = 0;
        }
        this.loadUsers();
    }

    navigateToEdit(user: IUser) {
        this.router.navigate(["/users", user._id, "edit"]);
    }

    navigateToCreate() {
        this.router.navigate(["/users/create"]);
    }

    navigateToUserProfile(userId: string) {
        this.router.navigate(["/profile", userId]);
    }

    getRoleColor(role: string): string {
        return RoleUtils.getRoleColor(role);
    }

    private syncDisplayedColumns() {
        const uniqueSelectedColumns = [...new Set(this.selectedExtraColumnKeys)].filter(
            key => !this.BASE_COLUMN_SET.has(key) && this.SELECTABLE_COLUMN_SET.has(key),
        );
        this.selectedExtraColumnKeys = uniqueSelectedColumns;
        this.displayedColumns = ["name", ...uniqueSelectedColumns, "actions"];
    }

    private persistColumnSelection() {
        if (typeof localStorage === "undefined") {
            return;
        }

        localStorage.setItem(this.columnStorageKey, JSON.stringify(this.selectedExtraColumnKeys));
    }

    private restoreColumnSelection() {
        if (typeof localStorage === "undefined") {
            this.syncDisplayedColumns();
            return;
        }

        const rawValue = localStorage.getItem(this.columnStorageKey);

        if (!rawValue) {
            this.syncDisplayedColumns();
            return;
        }

        try {
            const parsedValue = JSON.parse(rawValue);
            this.selectedExtraColumnKeys = Array.isArray(parsedValue) ? parsedValue : [];
        } catch {
            this.selectedExtraColumnKeys = [];
        }

        this.syncDisplayedColumns();
    }

    openColumnSelector() {
        const ref = this.dialog.open(ColumnSelectorDialogComponent, {
            data: {
                availableColumns: this.selectableColumns,
                selectedKeys: this.selectedExtraColumnKeys.filter(key => !this.BASE_COLUMN_SET.has(key)),
                maxColumns: this.MAX_EXTRA_COLUMNS,
            },
            width: "600px",
            maxWidth: "95vw",
        });

        ref.afterClosed().subscribe((result: string[] | undefined) => {
            if (!Array.isArray(result)) {
                return;
            }
            this.selectedExtraColumnKeys = result.filter(key => !this.BASE_COLUMN_SET.has(key));
            this.syncDisplayedColumns();
            this.persistColumnSelection();
        });
    }

    downloadUsersAsCSV() {
        if (this.tableData.data.length === 0) {
            return;
        }

        const exportColumns = this.displayedColumns.filter(column => column !== "actions");
        const columnLabels: Record<string, string> = {
            name: "Name",
            email: "Email",
            role: "Role",
            status: "Status",
            createdAt: "Created Date",
        };

        const headers = exportColumns.map(column => {
            if (column === "name") {
                return "Name";
            }

            return (
                columnLabels[column] ||
                this.availableColumns.find(availableColumn => availableColumn.key === column)?.label ||
                column
            );
        });

        const rows = this.tableData.data.map(user =>
            exportColumns.map(column => {
                if (column === "name") {
                    return user.name;
                }

                return this.columnValueMap[column]?.(user) || "N/A";
            }),
        );

        // Combine headers and rows
        const csvContent = [headers, ...rows]
            .map(row =>
                row
                    .map(cell => {
                        // Escape quotes and wrap in quotes if contains comma or newline
                        const escaped = String(cell).replace(/"/g, '""');
                        return escaped.includes(",") || escaped.includes("\n") ? `"${escaped}"` : escaped;
                    })
                    .join(","),
            )
            .join("\n");

        console.log(csvContent);
        // Create blob and download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute("download", `users_${new Date().getTime()}.csv`);
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
