import { Component, OnInit, ViewChild, AfterViewInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatTableModule, MatTableDataSource } from "@angular/material/table";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatPaginatorModule, MatPaginator } from "@angular/material/paginator";
import { MatSelectModule } from "@angular/material/select";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatDialog } from "@angular/material/dialog";
import { UsersService } from "../../core/services/users.service";
import { IUser, IUsersQueryParams } from "../../core/interfaces/user.interface";
import { CreateUserDialogComponent } from "./create-user-dialog/create-user-dialog.component";

@Component({
    selector: "app-users",
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatPaginatorModule,
        MatSelectModule,
        MatFormFieldModule,
    ],
    templateUrl: "./users.component.html",
    styleUrls: ["./users.component.scss"],
})
export class UsersComponent implements OnInit, AfterViewInit {
    @ViewChild("paginator", { static: false }) public paginator!: MatPaginator;

    public tableData: MatTableDataSource<IUser> = new MatTableDataSource<IUser>([]);
    public displayedColumns: string[] = [
        "name",
        "email",
        "role",
        "companyId",
        "status",
        "createdAt",
        "actions",
    ];
    loading = false;
    userFetchingError = "";

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
        private dialog: MatDialog,
    ) {}

    ngOnInit() {
        this.loadUsers();
    }

    ngAfterViewInit() {
        if (this.paginator) {
            this.paginator.pageSizeOptions = [10, 25, 50, 100];
            this.paginator.pageSize = 10;
            // Listen to paginator changes
            this.paginator.page.subscribe(() => {
                this.queryParams.page = this.paginator.pageIndex + 1;
                this.queryParams.limit = this.paginator.pageSize;
                this.loadUsers();
            });
        }
    }

    loadUsers() {
        this.loading = true;
        this.userFetchingError = "";
        this.usersService.getUsers(this.queryParams).subscribe({
            next: response => {
                this.tableData.data = response.users;
                if (this.paginator) {
                    this.paginator.length = response.total;
                }
                console.log(response);
                this.loading = false;
            },
            error: err => {
                this.userFetchingError = err.error?.message || "Failed to load users";
                this.loading = false;
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

    openCreateModal() {
        const dialogRef = this.dialog.open(CreateUserDialogComponent, {
            width: "500px",
            disableClose: false,
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                const currentData = this.tableData.data;
                currentData.unshift(result);
                this.tableData.data = currentData;
            }
        });
    }

    getRoleBadgeClass(role: string): string {
        const roleMap: Record<string, string> = {
            god: "badge-god",
            super_admin: "badge-super-admin",
            admin: "badge-admin",
            hr: "badge-hr",
            manager: "badge-manager",
            employee: "badge-employee",
        };
        return roleMap[role] || "badge-default";
    }
}
