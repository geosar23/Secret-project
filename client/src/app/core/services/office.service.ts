import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import { IAddress, IOffice } from "../interfaces/user.interface";

export interface IOfficePayload {
    name?: string;
    countryId?: string;
    address?: IAddress;
    isActive?: boolean;
}

@Injectable({
    providedIn: "root",
})
export class OfficeService {
    private apiService = inject(ApiService);

    getOffices(): Observable<JsonResponse<IOffice[]>> {
        return this.apiService.get<JsonResponse<IOffice[]>>("offices");
    }

    createOffice(data: IOfficePayload): Observable<JsonResponse<IOffice>> {
        return this.apiService.post<JsonResponse<IOffice>>("offices", data);
    }

    updateOffice(id: string, data: IOfficePayload): Observable<JsonResponse<IOffice>> {
        return this.apiService.put<JsonResponse<IOffice>>(`offices/${id}`, data);
    }

    deleteOffice(id: string): Observable<JsonResponse<void>> {
        return this.apiService.delete<JsonResponse<void>>(`offices/${id}`);
    }
}
