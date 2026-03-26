import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import {
    ICreateSubDepartmentRequest,
    ISubDepartment,
    IUpdateSubDepartmentRequest,
} from "../interfaces/sub-department.interface";

@Injectable({
    providedIn: "root",
})
export class SubDepartmentService {
    private apiService = inject(ApiService);

    getSubDepartments(): Observable<JsonResponse<ISubDepartment[]>> {
        return this.apiService.get<JsonResponse<ISubDepartment[]>>("sub-departments");
    }

    getSubDepartmentById(id: string): Observable<JsonResponse<ISubDepartment>> {
        return this.apiService.get<JsonResponse<ISubDepartment>>(`sub-departments/${id}`);
    }

    createSubDepartment(
        data: ICreateSubDepartmentRequest,
    ): Observable<JsonResponse<{ subDepartment: ISubDepartment }>> {
        return this.apiService.post<JsonResponse<{ subDepartment: ISubDepartment }>>("sub-departments", data);
    }

    updateSubDepartment(
        id: string,
        data: IUpdateSubDepartmentRequest,
    ): Observable<JsonResponse<{ subDepartment: ISubDepartment }>> {
        return this.apiService.put<JsonResponse<{ subDepartment: ISubDepartment }>>(`sub-departments/${id}`, data);
    }

    deleteSubDepartment(id: string): Observable<JsonResponse<void>> {
        return this.apiService.delete<JsonResponse<void>>(`sub-departments/${id}`);
    }
}
