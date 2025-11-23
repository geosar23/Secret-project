import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import {
    UserProfile,
    UpdateProfileRequest,
    ChangePasswordRequest,
} from "../interfaces/profile.interface";

/**
 * ProfileService - Current user's personal profile management
 *
 * This service is for self-service profile operations where a user
 * manages their own information. Use UsersService for admin operations
 * on other users.
 *
 * Responsibilities:
 * - View and edit own profile
 * - Change own password
 * - Personal settings and preferences
 * - Profile picture management
 *
 * Use case: User profile page, account settings
 */
@Injectable({
    providedIn: "root",
})
export class ProfileService {
    private apiService = inject(ApiService);

    /**
     * Get current user's own profile
     * Self-service operation
     */
    getProfile(userId: string): Observable<{ user: UserProfile }> {
        return this.apiService.get<{ user: UserProfile }>(`users/${userId}`);
    }

    /**
     * Update current user's own profile
     * Self-service operation - limited fields (name, email only)
     */
    updateProfile(userId: string, data: UpdateProfileRequest): Observable<{ user: UserProfile }> {
        return this.apiService.put<{ user: UserProfile }>(`users/${userId}`, data);
    }

    /**
     * Change current user's own password
     * Self-service operation - requires current password verification
     */
    changePassword(userId: string, data: ChangePasswordRequest): Observable<{ message: string }> {
        return this.apiService.post<{ message: string }>(`users/${userId}/change-password`, data);
    }
}
