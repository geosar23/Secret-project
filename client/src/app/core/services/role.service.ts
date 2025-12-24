import { inject, Injectable } from "@angular/core";
import { ApiService } from "./api.service";
import { Observable } from "rxjs";
import { IRole } from "../interfaces/role.interface";

@Injectable({
    providedIn: "root",
})
export class RoleService {
    private apiService = inject(ApiService);

    getAllRoles(): Observable<IRole[]> {
        return this.apiService.get<IRole[]>("roles");
    }

    getRoleById(roleId: string): Observable<IRole> {
        return this.apiService.get<IRole>(`roles/${roleId}`);
    }
}