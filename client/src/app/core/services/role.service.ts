import { inject, Injectable } from "@angular/core";
import { ApiService } from "./api.service";
import { Observable } from "rxjs";
import { IRole } from "../interfaces/role.interface";
import { JsonResponse } from "../interfaces/generics.interface";
@Injectable({
    providedIn: "root",
})
export class RoleService {
    private apiService = inject(ApiService);

    getAllRoles(): Observable<JsonResponse<IRole[]>> {
        return this.apiService.get<JsonResponse<IRole[]>>("roles");
    }

    getRoleById(roleId: string): Observable<JsonResponse<IRole>> {
        return this.apiService.get<JsonResponse<IRole>>(`roles/${roleId}`);
    }
}
