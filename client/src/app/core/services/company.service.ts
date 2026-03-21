import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import { ICompany, ICreateCompanyRequest, IUpdateCompanyRequest } from "../interfaces/company.interface";

@Injectable({
    providedIn: "root",
})
export class CompanyService {
    private apiService = inject(ApiService);

    getCompanies(): Observable<JsonResponse<ICompany[]>> {
        return this.apiService.get<JsonResponse<ICompany[]>>("companies");
    }

    getCompanyById(id: string): Observable<JsonResponse<ICompany>> {
        return this.apiService.get<JsonResponse<ICompany>>(`companies/${id}`);
    }

    createCompany(data: ICreateCompanyRequest): Observable<JsonResponse<{ company: ICompany }>> {
        return this.apiService.post<JsonResponse<{ company: ICompany }>>("companies", data);
    }

    updateCompany(id: string, data: IUpdateCompanyRequest): Observable<JsonResponse<{ company: ICompany }>> {
        return this.apiService.put<JsonResponse<{ company: ICompany }>>(`companies/${id}`, data);
    }

    deleteCompany(id: string): Observable<JsonResponse<void>> {
        return this.apiService.delete<JsonResponse<void>>(`companies/${id}`);
    }
}
