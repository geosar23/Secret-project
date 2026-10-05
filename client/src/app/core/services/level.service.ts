import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import { ILevel } from "../interfaces/user.interface";

export interface ILevelPayload {
    name?: string;
    order?: number;
    isActive?: boolean;
}

@Injectable({
    providedIn: "root",
})
export class LevelService {
    private apiService = inject(ApiService);

    getLevels(): Observable<JsonResponse<ILevel[]>> {
        return this.apiService.get<JsonResponse<ILevel[]>>("levels");
    }

    createLevel(data: ILevelPayload): Observable<JsonResponse<ILevel>> {
        return this.apiService.post<JsonResponse<ILevel>>("levels", data);
    }

    updateLevel(id: string, data: ILevelPayload): Observable<JsonResponse<ILevel>> {
        return this.apiService.put<JsonResponse<ILevel>>(`levels/${id}`, data);
    }

    deleteLevel(id: string): Observable<JsonResponse<void>> {
        return this.apiService.delete<JsonResponse<void>>(`levels/${id}`);
    }
}
