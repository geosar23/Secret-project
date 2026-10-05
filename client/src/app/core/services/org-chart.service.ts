import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import { IOrgChartData } from "../interfaces/org-chart.interface";

@Injectable({
    providedIn: "root",
})
export class OrgChartService {
    private apiService = inject(ApiService);

    getOrgChart(): Observable<JsonResponse<IOrgChartData>> {
        return this.apiService.get<JsonResponse<IOrgChartData>>("users/org-chart");
    }
}
