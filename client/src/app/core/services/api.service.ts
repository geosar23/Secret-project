import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, map } from "rxjs";
import { environment } from "../../../environments/environment";

@Injectable({
    providedIn: "root",
})
export class ApiService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    // Server returns { success: boolean; data: T } on success, or { success: false; message; error }
    get<T>(endpoint: string): Observable<T> {
        return this.http
            .get<{ success: true; data: T }>(`${this.apiUrl}/${endpoint}`)
            .pipe(map(response => response.data));
    }

    post<T>(endpoint: string, data: unknown): Observable<T> {
        return this.http
            .post<{ success: true; data: T }>(`${this.apiUrl}/${endpoint}`, data)
            .pipe(map(response => response.data));
    }

    put<T>(endpoint: string, data: unknown): Observable<T> {
        return this.http
            .put<{ success: true; data: T }>(`${this.apiUrl}/${endpoint}`, data)
            .pipe(map(response => response.data));
    }

    delete<T>(endpoint: string): Observable<T> {
        return this.http
            .delete<{ success: true; data: T }>(`${this.apiUrl}/${endpoint}`)
            .pipe(map(response => response.data));
    }
}
