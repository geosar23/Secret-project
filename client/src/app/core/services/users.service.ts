import { Injectable, inject } from "@angular/core";
import { Observable, catchError, from, map, mergeMap, of, toArray } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import {
    ICreateUserRequest,
    IUpdateUserRequest,
    IUsersListResponse,
    IUserResponse,
    IUsersQueryParams,
    IUser,
    IProfileImageUrlResponse,
    IActorAccessOnSubject,
} from "../interfaces/user.interface";

export interface IBulkUserUpdate {
    id: string;
    data: IUpdateUserRequest;
}

export interface IBulkUpdateResult {
    succeeded: string[];
    failed: { id: string; message: string }[];
}

@Injectable({
    providedIn: "root",
})
export class UsersService {
    private apiService = inject(ApiService);

    getUsers(params?: IUsersQueryParams): Observable<JsonResponse<IUsersListResponse>> {
        const queryString = params ? this.buildQueryString(params) : "";
        return this.apiService.get<JsonResponse<IUsersListResponse>>(`users${queryString}`);
    }

    getUserById(
        userId: string,
        selectModes: "full" | "partial" = "full",
        fields = [],
    ): Observable<JsonResponse<IUser>> {
        const queryString = selectModes === "partial" && fields.length > 0 ? `?fields=${fields.join(",")}` : "";
        return this.apiService.get<JsonResponse<IUser>>(`users/${userId}${queryString}`);
    }

    getAccessForSubject(userId: string): Observable<JsonResponse<IActorAccessOnSubject>> {
        return this.apiService.get<JsonResponse<IActorAccessOnSubject>>(`users/${userId}/accessForSubject`);
    }

    createUser(data: ICreateUserRequest): Observable<JsonResponse<IUserResponse>> {
        return this.apiService.post<JsonResponse<IUserResponse>>("users", data);
    }

    updateUser(userId: string, data: IUpdateUserRequest): Observable<JsonResponse<{ user: { _id: string } }>> {
        return this.apiService.put<JsonResponse<{ user: { _id: string } }>>(`users/${userId}`, data);
    }

    /**
     * Applies one update per user (the server has no bulk endpoint, so each user is still
     * authorised and validated individually). Never errors: failures are reported per user.
     */
    bulkUpdate(updates: readonly IBulkUserUpdate[], concurrency = 5): Observable<IBulkUpdateResult> {
        return from(updates).pipe(
            mergeMap(
                ({ id, data }) =>
                    this.updateUser(id, data).pipe(
                        map(res => ({ id, error: res.success ? null : res.message || "Update rejected" })),
                        catchError(err => of({ id, error: err?.error?.message || "Request failed" })),
                    ),
                concurrency,
            ),
            toArray(),
            map(results => ({
                succeeded: results.filter(r => !r.error).map(r => r.id),
                failed: results.filter(r => r.error).map(r => ({ id: r.id, message: r.error as string })),
            })),
        );
    }

    changePassword(
        userId: string,
        payload: { currentPassword: string; newPassword: string },
    ): Observable<JsonResponse<void>> {
        return this.apiService.put<JsonResponse<void>>(`users/${userId}/change-password`, payload);
    }

    /** Admin action: the server emails the user a temporary password. */
    resetPasswordForUser(userId: string): Observable<JsonResponse<void>> {
        return this.apiService.post<JsonResponse<void>>("auth/reset-password", { userId });
    }

    uploadProfileImage(userId: string, file: File): Observable<JsonResponse<IUserResponse>> {
        const formData = new FormData();
        formData.append("image", file);
        return this.apiService.post<JsonResponse<IUserResponse>>(`users/${userId}/profile-image`, formData);
    }

    getProfileImageUrl(userId: string): Observable<JsonResponse<IProfileImageUrlResponse>> {
        return this.apiService.get<JsonResponse<IProfileImageUrlResponse>>(`users/${userId}/profile-image-url`);
    }

    deleteProfileImage(userId: string): Observable<JsonResponse<void>> {
        return this.apiService.delete<JsonResponse<void>>(`users/${userId}/profile-image`);
    }

    getEffectivePermissions(): Observable<JsonResponse<{ permissions: string[] }>> {
        return this.apiService.get<JsonResponse<{ permissions: string[] }>>("users/effective-permissions");
    }

    // deleteUser(userId: string): Observable<{ message: string }> {
    //     return this.apiService.delete<{ message: string }>(`users/${userId}`);
    // }

    // deactivateUser(userId: string): Observable<UserResponse> {
    //     return this.apiService.put<UserResponse>(`users/${userId}/deactivate`, {});
    // }

    // activateUser(userId: string): Observable<UserResponse> {
    //     return this.apiService.put<UserResponse>(`users/${userId}/activate`, {});
    // }

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
