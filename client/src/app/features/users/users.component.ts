import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    companyId?: string;
    departmentId?: string;
    isActive: boolean;
    createdAt?: string;
}

@Component({
    selector: "app-users",
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: "./users.component.html",
    styleUrls: ["./users.component.scss"],
})
export class UsersComponent implements OnInit {
    users: User[] = [];
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

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.loading = true;
        this.error = "";

        const token = localStorage.getItem("token");
        this.http
            .get<{ success: boolean; data: User[] }>(`${environment.apiUrl}/users`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .subscribe({
                next: response => {
                    this.users = response.data;
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

        const token = localStorage.getItem("token");
        this.http
            .post<{ success: boolean; data: User }>(
                `${environment.apiUrl}/users`,
                this.newUser,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            )
            .subscribe({
                next: response => {
                    this.users.push(response.data);
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

    formatDate(date?: string): string {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString();
    }
}
