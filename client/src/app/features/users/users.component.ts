import { Component, OnInit, ViewChild, AfterViewInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatTableModule, MatTableDataSource } from "@angular/material/table";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatPaginatorModule, MatPaginator } from "@angular/material/paginator";
import { MatSortModule, MatSort } from "@angular/material/sort";
import { UsersService } from "../../core/services/users.service";
import { IUser } from "../../core/interfaces/user.interface";

@Component({
    selector: "app-users",
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatPaginatorModule,
        MatSortModule,
    ],
    templateUrl: "./users.component.html",
    styleUrls: ["./users.component.scss"],
})
export class UsersComponent implements OnInit, AfterViewInit {
    @ViewChild("paginator", { static: false }) public paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

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
    userCreationError = "";
    showCreateModal = false;

    // New user form
    newUser = {
        name: "",
        email: "",
        password: "",
        role: "employee",
        companyId: "",
        departmentId: "",
    };

    roles = [
        { value: "god", label: "God" },
        { value: "super_admin", label: "Super Admin" },
        { value: "admin", label: "Admin" },
        { value: "hr", label: "HR Manager" },
        { value: "manager", label: "Manager" },
        { value: "employee", label: "Employee" },
    ];

    constructor(private usersService: UsersService) {}

    ngOnInit() {
        this.loadUsers();
    }

    ngAfterViewInit() {
        if (this.paginator) {
            this.paginator.pageSizeOptions = [10, 25, 50, 100];
            this.paginator.pageSize = 10;
            this.tableData.paginator = this.paginator;
        }
        if (this.sort) {
            this.tableData.sort = this.sort;
        }
    }

    loadUsers() {
        this.loading = true;
        this.userFetchingError = "";
        this.usersService.getUsers().subscribe({
            next: response => {
                this.tableData.data = response.users;
                console.log(response);
                this.loading = false;
            },
            error: err => {
                this.userFetchingError = err.error?.message || "Failed to load users";
                this.loading = false;
            },
        });
    }

    openCreateModal() {
        this.showCreateModal = true;
        this.resetForm();
    }

    closeCreateModal() {
        this.showCreateModal = false;
        this.resetForm();
    }

    resetForm() {
        this.newUser = {
            name: "",
            email: "",
            password: "",
            role: "employee",
            companyId: "",
            departmentId: "",
        };
    }

    createUser() {
        if (!this.newUser.name || !this.newUser.email || !this.newUser.password) {
            this.userCreationError = "Name, email, and password are required";
            return;
        }

        this.loading = true;
        this.userCreationError = "";
        this.usersService.createUser(this.newUser).subscribe({
            next: response => {
                const currentData = this.tableData.data;
                currentData.unshift(response.user);
                this.tableData.data = currentData;
                this.closeCreateModal();
                this.loading = false;
            },
            error: err => {
                this.userCreationError = err.error?.message || "Failed to create user";
                this.loading = false;
            },
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
