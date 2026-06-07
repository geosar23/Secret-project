import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import { ICompanyDataResponse } from "../interfaces/company.interface";

@Injectable({
    providedIn: "root",
})
export class CompanyService {
    private apiService = inject(ApiService);

    getCompanyData(companyId: string): Observable<JsonResponse<ICompanyDataResponse>> {
        return this.apiService.get<JsonResponse<ICompanyDataResponse>>(`companies/${companyId}/logo-url`);
    }
}
