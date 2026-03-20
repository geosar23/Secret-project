import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import {
    ICreateUserRequest,
    IUpdateUserRequest,
    IUsersListResponse,
    IUserResponse,
    IUsersQueryParams,
    IUser,
} from "../interfaces/user.interface";

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

    createUser(data: ICreateUserRequest): Observable<JsonResponse<IUserResponse>> {
        return this.apiService.post<JsonResponse<IUserResponse>>("users", data);
    }

    updateUser(userId: string, data: IUpdateUserRequest): Observable<JsonResponse<{ user: { _id: string } }>> {
        return this.apiService.put<JsonResponse<{ user: { _id: string } }>>(`users/${userId}`, data);
    }

    changePassword(
        userId: string,
        payload: { currentPassword: string; newPassword: string },
    ): Observable<JsonResponse<void>> {
        return this.apiService.put<JsonResponse<void>>(`users/${userId}/change-password`, payload);
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
