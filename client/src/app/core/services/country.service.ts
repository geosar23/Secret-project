import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import { ICountry, ICreateCountryRequest, IUpdateCountryRequest } from "../interfaces/country.interface";

@Injectable({
    providedIn: "root",
})
export class CountryService {
    private apiService = inject(ApiService);

    getCountries(): Observable<JsonResponse<ICountry[]>> {
        return this.apiService.get<JsonResponse<ICountry[]>>("countries");
    }

    getCountryById(id: string): Observable<JsonResponse<ICountry>> {
        return this.apiService.get<JsonResponse<ICountry>>(`countries/${id}`);
    }

    createCountry(data: ICreateCountryRequest): Observable<JsonResponse<{ country: ICountry }>> {
        return this.apiService.post<JsonResponse<{ country: ICountry }>>("countries", data);
    }

    updateCountry(id: string, data: IUpdateCountryRequest): Observable<JsonResponse<{ country: ICountry }>> {
        return this.apiService.put<JsonResponse<{ country: ICountry }>>(`countries/${id}`, data);
    }

    deleteCountry(id: string): Observable<JsonResponse<void>> {
        return this.apiService.delete<JsonResponse<void>>(`countries/${id}`);
    }
}
