import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import {
    ICreateUserRequest,
    IUpdateUserRequest,
    IUsersListResponse,
    UserResponse,
    IUsersQueryParams,
} from "../interfaces/user.interface";

/**
 * UsersService - Administrative user management
 *
 * This service is for HR/Admin operations managing other users.
 * Use ProfileService for current user's own profile operations.
 *
 * Responsibilities:
 * - Admin CRUD operations on any user
 * - Bulk operations, filtering, searching users
 * - User activation/deactivation
 * - Department and role-based queries
 */
@Injectable({
    providedIn: "root",
})
export class UsersService {
    private apiService = inject(ApiService);

    /**
     * Get all users with optional filtering and pagination
     * Admin/HR operation to view and manage users
     */
    getUsers(params?: IUsersQueryParams): Observable<IUsersListResponse> {
        const queryString = params ? this.buildQueryString(params) : "";
        return this.apiService.get<IUsersListResponse>(`users${queryString}`);
    }

    /**
     * Get a specific user by ID
     * Admin operation to view any user's details
     */
    getUserById(userId: string): Observable<UserResponse> {
        return this.apiService.get<UserResponse>(`users/${userId}`);
    }

    /**
     * Create a new user
     * Admin/HR operation
     */
    createUser(data: ICreateUserRequest): Observable<UserResponse> {
        return this.apiService.post<UserResponse>("users", data);
    }

    /**
     * Update an existing user
     * Admin operation to modify any user's information
     */
    updateUser(userId: string, data: IUpdateUserRequest): Observable<UserResponse> {
        return this.apiService.put<UserResponse>(`users/${userId}`, data);
    }

    /**
     * Delete a user permanently
     * Admin operation
     */
    deleteUser(userId: string): Observable<{ message: string }> {
        return this.apiService.delete<{ message: string }>(`users/${userId}`);
    }

    /**
     * Deactivate a user (soft delete)
     * Admin/HR operation to disable user access
     */
    deactivateUser(userId: string): Observable<UserResponse> {
        return this.apiService.put<UserResponse>(`users/${userId}/deactivate`, {});
    }

    /**
     * Activate a user
     * Admin/HR operation to enable user access
     */
    activateUser(userId: string): Observable<UserResponse> {
        return this.apiService.put<UserResponse>(`users/${userId}/activate`, {});
    }

    /**
     * Get users by department
     * Admin/HR operation for department management
     */
    getUsersByDepartment(departmentId: string): Observable<IUsersListResponse> {
        return this.apiService.get<IUsersListResponse>(`users?departmentId=${departmentId}`);
    }

    /**
     * Get users by role
     * Admin/HR operation for role-based queries
     */
    getUsersByRole(role: string): Observable<IUsersListResponse> {
        return this.apiService.get<IUsersListResponse>(`users?role=${role}`);
    }

    /**
     * Build query string from params object
     */
    private buildQueryString(params: IUsersQueryParams): string {
        const queryParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                queryParams.append(key, String(value));
            }
        });

        const queryString = queryParams.toString();
        return queryString ? `?${queryString}` : "";
    }
}
