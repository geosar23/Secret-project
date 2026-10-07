import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import {
    IOrgMoveApplyRequest,
    IOrgMoveApplyResult,
    IOrgMovePreview,
    IOrgMoveRequest,
} from "../interfaces/org-move.interface";

@Injectable({
    providedIn: "root",
})
export class OrgMoveService {
    private apiService = inject(ApiService);

    preview(request: IOrgMoveRequest): Observable<JsonResponse<IOrgMovePreview>> {
        return this.apiService.post<JsonResponse<IOrgMovePreview>>("org-moves/preview", request);
    }

    apply(request: IOrgMoveApplyRequest): Observable<JsonResponse<IOrgMoveApplyResult>> {
        return this.apiService.post<JsonResponse<IOrgMoveApplyResult>>("org-moves/apply", request);
    }

    undo(moveId: string): Observable<JsonResponse<{ restored: number }>> {
        return this.apiService.post<JsonResponse<{ restored: number }>>(`org-moves/${moveId}/undo`, {});
    }
}
