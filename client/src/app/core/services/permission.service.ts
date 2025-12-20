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

    /**
     * Check if current user has a specific permission
     * Backend returns expanded permissions, so just check for inclusion
     */
    hasPermission(permission: string): Observable<boolean> {
        return this.effectivePermissions$.pipe(map(permissions => permissions.includes(permission)));
    }

    /**
     * Check if user has ANY of the permissions
     */
    hasAnyPermission(permissions: string[]): Observable<boolean> {
        return this.effectivePermissions$.pipe(
            map(userPerms => {
                if (userPerms.includes("*")) return true;
                return permissions.some(p => userPerms.includes(p));
            }),
        );
    }

    /**
     * Check if user has ALL of the permissions
     */
    hasAllPermissions(permissions: string[]): Observable<boolean> {
        return this.effectivePermissions$.pipe(
            map(userPerms => {
                if (userPerms.includes("*")) return true;
                return permissions.every(p => userPerms.includes(p));
            }),
        );
    }

    /**
     * Fetch effective permissions from server
     */
    fetchEffectivePermissions(): Observable<string[]> {
        const currentUser = this.authService.getCurrentUser();

        if (!currentUser || !currentUser.id) {
            this.effectivePermissions$.next([]);
            return of([]);
        }

        return this.apiService.get<{ permissions: string[] }>(`permissions/users/${currentUser.id}/effective`).pipe(
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

    /**
     * Get effective permissions (synchronous, returns cached value)
     * Use fetchEffectivePermissions() to refresh from server
     */
    getEffectivePermissions(): string[] {
        return this.effectivePermissions$.getValue();
    }

    /**
     * Get current effective permissions
     */
    get permissions$(): Observable<string[]> {
        return this.effectivePermissions$.asObservable();
    }

    /**
     * Fetch all permission definitions from server
     */
    fetchAllPermissionDefinitions(): Observable<IPermissionDefinition[]> {
        return this.apiService.get<{ permissions: IPermissionDefinition[] }>("permissions/definitions").pipe(
            map(response => response.permissions),
            catchError(error => {
                console.error("Error fetching permission definitions:", error);
                return of([]);
            }),
        );
    }
}
