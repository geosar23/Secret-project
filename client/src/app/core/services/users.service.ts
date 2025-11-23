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

@Injectable({
    providedIn: "root",
})
export class UsersService {
    private apiService = inject(ApiService);

    getUsers(params?: IUsersQueryParams): Observable<IUsersListResponse> {
        const queryString = params ? this.buildQueryString(params) : "";
        return this.apiService.get<IUsersListResponse>(`users${queryString}`);
    }

    getUserById(userId: string): Observable<UserResponse> {
        return this.apiService.get<UserResponse>(`users/${userId}`);
    }

    createUser(data: ICreateUserRequest): Observable<UserResponse> {
        return this.apiService.post<UserResponse>("users", data);
    }

    updateUser(userId: string, data: IUpdateUserRequest): Observable<UserResponse> {
        return this.apiService.put<UserResponse>(`users/${userId}`, data);
    }

    deleteUser(userId: string): Observable<{ message: string }> {
        return this.apiService.delete<{ message: string }>(`users/${userId}`);
    }

    deactivateUser(userId: string): Observable<UserResponse> {
        return this.apiService.put<UserResponse>(`users/${userId}/deactivate`, {});
    }

    activateUser(userId: string): Observable<UserResponse> {
        return this.apiService.put<UserResponse>(`users/${userId}/activate`, {});
    }

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
