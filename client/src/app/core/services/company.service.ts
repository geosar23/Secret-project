import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import { ILogoUrlResponse } from "../interfaces/company.interface";

@Injectable({
    providedIn: "root",
})
export class CompanyService {
    private apiService = inject(ApiService);

    getLogoUrl(companyId: string): Observable<JsonResponse<ILogoUrlResponse>> {
        return this.apiService.get<JsonResponse<ILogoUrlResponse>>(`companies/${companyId}/logo-url`);
    }
}
