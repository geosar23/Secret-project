import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import { ICreateDepartmentRequest, IDepartment, IUpdateDepartmentRequest } from "../interfaces/department.interface";

@Injectable({
    providedIn: "root",
})
export class DepartmentService {
    private apiService = inject(ApiService);

    getDepartments(): Observable<JsonResponse<IDepartment[]>> {
        return this.apiService.get<JsonResponse<IDepartment[]>>("departments");
    }

    getDepartmentById(id: string): Observable<JsonResponse<IDepartment>> {
        return this.apiService.get<JsonResponse<IDepartment>>(`departments/${id}`);
    }

    createDepartment(data: ICreateDepartmentRequest): Observable<JsonResponse<{ department: IDepartment }>> {
        return this.apiService.post<JsonResponse<{ department: IDepartment }>>("departments", data);
    }

    updateDepartment(
        id: string,
        data: IUpdateDepartmentRequest,
    ): Observable<JsonResponse<{ department: IDepartment }>> {
        return this.apiService.put<JsonResponse<{ department: IDepartment }>>(`departments/${id}`, data);
    }

    deleteDepartment(id: string): Observable<JsonResponse<void>> {
        return this.apiService.delete<JsonResponse<void>>(`departments/${id}`);
    }
}
