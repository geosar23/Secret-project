import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import {
    ICreateUserRequest,
    IUpdateUserRequest,
    IUsersListResponse,
    UserResponse,
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

    createUser(data: ICreateUserRequest): Observable<JsonResponse<UserResponse>> {
        return this.apiService.post<JsonResponse<UserResponse>>("users", data);
    }

    updateUser(userId: string, data: IUpdateUserRequest): Observable<JsonResponse<UserResponse>> {
        return this.apiService.put<JsonResponse<UserResponse>>(`users/${userId}`, data);
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
