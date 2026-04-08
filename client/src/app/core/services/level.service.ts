import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import { ILevel } from "../interfaces/user.interface";

@Injectable({
    providedIn: "root",
})
export class LevelService {
    private apiService = inject(ApiService);

    getLevels(): Observable<JsonResponse<ILevel[]>> {
        return this.apiService.get<JsonResponse<ILevel[]>>("levels");
    }
}
