import { Injectable, inject } from "@angular/core";
import { Observable, tap } from "rxjs";
import { ApiService } from "./api.service";
import { RequestsService } from "./requests.service";
import { JsonResponse } from "../interfaces/generics.interface";
import { ILeaveBalancesResponse, ILeaveCreated, ILeaveInput, ILeavePreview } from "../interfaces/leave.interface";

@Injectable({ providedIn: "root" })
export class LeavesService {
    private api = inject(ApiService);
    private requests = inject(RequestsService);

    getMyBalances(year?: string): Observable<JsonResponse<ILeaveBalancesResponse>> {
        return this.api.get<JsonResponse<ILeaveBalancesResponse>>(`leaves/balances/me${year ? `?year=${year}` : ""}`);
    }

    /** Days, policy and balance impact without saving anything. */
    preview(input: ILeaveInput): Observable<JsonResponse<ILeavePreview>> {
        return this.api.post<JsonResponse<ILeavePreview>>("leaves/preview", input);
    }

    create(input: ILeaveInput): Observable<JsonResponse<ILeaveCreated>> {
        return this.api
            .post<JsonResponse<ILeaveCreated>>("leaves", input)
            .pipe(tap(res => res.success && this.requests.refreshSummary()));
    }
}
