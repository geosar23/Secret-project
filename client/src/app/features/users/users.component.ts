import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatTableModule } from "@angular/material/table";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
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
    ],
    templateUrl: "./users.component.html",
    styleUrls: ["./users.component.scss"],
})
export class UsersComponent implements OnInit {
    users: IUser[] = [];
    displayedColumns: string[] = ["name", "email", "role", "companyId", "status", "createdAt", "actions"];
    loading = false;
    error = "";
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

    loadUsers() {
        this.loading = true;
        this.error = "";
        this.usersService.getUsers().subscribe({
            next: response => {
                this.users = response.users;
                console.log(response);
                this.loading = false;
            },
            error: err => {
                this.error = err.error?.message || "Failed to load users";
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
            this.error = "Name, email, and password are required";
            return;
        }

        this.loading = true;
        this.error = "";
        this.usersService.createUser(this.newUser).subscribe({
            next: response => {
                this.users.push(response.user);
                this.closeCreateModal();
                this.loading = false;
            },
            error: err => {
                this.error = err.error?.message || "Failed to create user";
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
