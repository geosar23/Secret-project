import { Injectable, inject } from "@angular/core";
import { BehaviorSubject, Observable, map, catchError, of, tap } from "rxjs";
import { ApiService } from "./api.service";
import { AuthService } from "./auth.service";
import { IPermissionDefinition } from "../interfaces/permission.interface";

@Injectable({
    providedIn: "root",
})
export class PermissionService {
    private apiService = inject(ApiService);
    private authService = inject(AuthService);
    private effectivePermissions$ = new BehaviorSubject<string[]>([]);

    hasPermission(permission: string): Observable<boolean> {
        return this.effectivePermissions$.pipe(map(permissions => permissions.includes(permission)));
    }

    private fetchEffectivePermissions(): Observable<string[]> {
        const currentUser = this.authService.getCurrentUser();

        if (!currentUser || !currentUser._id) {
            this.effectivePermissions$.next([]);
            return of([]);
        }

        return this.apiService.get<{ permissions: string[] }>(`permissions/users/${currentUser._id}/effective`).pipe(
            tap(response => {
                this.effectivePermissions$.next(response.permissions);
            }),
            map(response => response.permissions),
            catchError(error => {
                console.error("Error fetching permissions:", error);
                this.effectivePermissions$.next([]);
                return of([]);
            }),
        );
    }

    getEffectivePermissions(): Observable<string[]> {
        const cached = this.effectivePermissions$.getValue();

        if (cached.length > 0) {
            return of(cached);
        }

        return this.fetchEffectivePermissions();
    }

    fetchAllPermissionDefinitions(): Observable<IPermissionDefinition[]> {
        return this.apiService.get<{ permissions: IPermissionDefinition[] }>("permissions/definitions").pipe(
            map(response => response.permissions),
            catchError(error => {
                console.error("Error fetching permission definitions:", error);
                return of([]);
            }),
        );
    }

    fetchPermissionsForRole(role: string): Observable<string[]> {
        return this.apiService.get<{ permissions: string[] }>(`permissions/roles/${role}`).pipe(
            map(response => response.permissions),
            catchError(error => {
                console.error(`Error fetching permissions for role ${role}:`, error);
                return of([]);
            }),
        );
    }
}
