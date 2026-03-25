import { inject, Injectable } from "@angular/core";
import { ApiService } from "./api.service";
import { Observable } from "rxjs";
import { IRole, ICreateRoleRequest, IUpdateRoleRequest } from "../interfaces/role.interface";
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

    createRole(data: ICreateRoleRequest): Observable<JsonResponse<{ role: IRole }>> {
        return this.apiService.post<JsonResponse<{ role: IRole }>>("roles", data);
    }

    updateRole(id: string, data: IUpdateRoleRequest): Observable<JsonResponse<{ role: IRole }>> {
        return this.apiService.put<JsonResponse<{ role: IRole }>>(`roles/${id}`, data);
    }

    deleteRole(id: string): Observable<JsonResponse<void>> {
        return this.apiService.delete<JsonResponse<void>>(`roles/${id}`);
    }

    getRoleHierarchy(): Observable<JsonResponse<IRole[]>> {
        return this.apiService.get<JsonResponse<IRole[]>>("roles/hierarchy");
    }
}
