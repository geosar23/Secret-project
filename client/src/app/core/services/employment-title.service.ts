import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import {
    ICreateEmploymentTitleRequest,
    IEmploymentTitle,
    IUpdateEmploymentTitleRequest,
} from "../interfaces/employment-title.interface";

@Injectable({
    providedIn: "root",
})
export class EmploymentTitleService {
    private apiService = inject(ApiService);

    getEmploymentTitles(): Observable<JsonResponse<IEmploymentTitle[]>> {
        return this.apiService.get<JsonResponse<IEmploymentTitle[]>>("employment-titles");
    }

    getEmploymentTitleById(id: string): Observable<JsonResponse<IEmploymentTitle>> {
        return this.apiService.get<JsonResponse<IEmploymentTitle>>(`employment-titles/${id}`);
    }

    createEmploymentTitle(
        data: ICreateEmploymentTitleRequest,
    ): Observable<JsonResponse<{ employmentTitle: IEmploymentTitle }>> {
        return this.apiService.post<JsonResponse<{ employmentTitle: IEmploymentTitle }>>("employment-titles", data);
    }

    updateEmploymentTitle(
        id: string,
        data: IUpdateEmploymentTitleRequest,
    ): Observable<JsonResponse<{ employmentTitle: IEmploymentTitle }>> {
        return this.apiService.put<JsonResponse<{ employmentTitle: IEmploymentTitle }>>(
            `employment-titles/${id}`,
            data,
        );
    }

    deleteEmploymentTitle(id: string): Observable<JsonResponse<void>> {
        return this.apiService.delete<JsonResponse<void>>(`employment-titles/${id}`);
    }
}
