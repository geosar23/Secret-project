import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

@Injectable({
    providedIn: "root",
})
export class ApiService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    get<T>(endpoint: string): Observable<T> {
        return this.http.get<T>(`${this.apiUrl}/${endpoint}`, { headers: this.getHeaders() });
    }

    post<T>(endpoint: string, data: unknown): Observable<T> {
        return this.http.post<T>(`${this.apiUrl}/${endpoint}`, data, {
            headers: this.getHeaders(),
        });
    }

    put<T>(endpoint: string, data: unknown): Observable<T> {
        return this.http.put<T>(`${this.apiUrl}/${endpoint}`, data, {
            headers: this.getHeaders(),
        });
    }

    delete<T>(endpoint: string): Observable<T> {
        return this.http.delete<T>(`${this.apiUrl}/${endpoint}`, { headers: this.getHeaders() });
    }

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem("token");
        return new HttpHeaders({
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
        });
    }
}
