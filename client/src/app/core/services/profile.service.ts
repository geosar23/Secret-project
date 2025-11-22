import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import {
    UserProfile,
    UpdateProfileRequest,
    ChangePasswordRequest,
} from "../interfaces/profile.interface";

@Injectable({
    providedIn: "root",
})
export class ProfileService {
    private apiService = inject(ApiService);

    /**
     * Get current user's profile
     */
    getProfile(userId: string): Observable<{ user: UserProfile }> {
        return this.apiService.get<{ user: UserProfile }>(`users/${userId}`);
    }

    /**
     * Update current user's profile
     */
    updateProfile(userId: string, data: UpdateProfileRequest): Observable<{ user: UserProfile }> {
        return this.apiService.put<{ user: UserProfile }>(`users/${userId}`, data);
    }

    /**
     * Change password
     */
    changePassword(userId: string, data: ChangePasswordRequest): Observable<{ message: string }> {
        return this.apiService.post<{ message: string }>(`users/${userId}/change-password`, data);
    }
}
