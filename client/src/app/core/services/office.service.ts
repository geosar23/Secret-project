import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import { IOffice } from "../interfaces/user.interface";

@Injectable({
    providedIn: "root",
})
export class OfficeService {
    private apiService = inject(ApiService);

    getOffices(): Observable<JsonResponse<IOffice[]>> {
        return this.apiService.get<JsonResponse<IOffice[]>>("offices");
    }
}
