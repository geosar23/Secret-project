import { Injectable, inject, signal } from "@angular/core";
import { Observable, tap } from "rxjs";
import { ApiService } from "./api.service";
import { JsonResponse } from "../interfaces/generics.interface";
import {
    IPagedList,
    IRequestDetail,
    IRequestListItem,
    IRequestListQuery,
    IRequestSummary,
    IRequestTypeInfo,
} from "../interfaces/request.interface";

const queryString = (params: object): string => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
            search.set(key, String(value));
        }
    }
    const text = search.toString();
    return text ? `?${text}` : "";
};

/** The shared approval-engine endpoints: inbox, "my requests", the detail and the decisions. */
@Injectable({ providedIn: "root" })
export class RequestsService {
    private api = inject(ApiService);

    /** Latest counts for the header bell and the dashboard. Updated by every refresh and decision. */
    readonly summary = signal<IRequestSummary | null>(null);

    getSummary(): Observable<JsonResponse<IRequestSummary>> {
        return this.api.get<JsonResponse<IRequestSummary>>("requests/summary").pipe(
            tap(res => {
                if (res.success && res.data) {
                    this.summary.set(res.data);
                }
            }),
        );
    }

    /** Fire and forget: keeps the shared summary signal current. */
    refreshSummary(): void {
        this.getSummary().subscribe({ error: () => undefined });
    }

    /** Request types the company has enabled. Which of them the user may start is decided by the caller. */
    getTypes(): Observable<JsonResponse<IRequestTypeInfo[]>> {
        return this.api.get<JsonResponse<IRequestTypeInfo[]>>("request-types");
    }

    getInbox(query: IRequestListQuery = {}): Observable<JsonResponse<IPagedList<IRequestListItem>>> {
        return this.api.get<JsonResponse<IPagedList<IRequestListItem>>>(`requests/inbox${queryString(query)}`);
    }

    getMine(query: IRequestListQuery = {}): Observable<JsonResponse<IPagedList<IRequestListItem>>> {
        return this.api.get<JsonResponse<IPagedList<IRequestListItem>>>(`requests/mine${queryString(query)}`);
    }

    /** Requests about other people the caller may read (their team, or everyone for HR). */
    getTeam(query: IRequestListQuery = {}): Observable<JsonResponse<IPagedList<IRequestListItem>>> {
        return this.api.get<JsonResponse<IPagedList<IRequestListItem>>>(`requests/team${queryString(query)}`);
    }

    /** Requests about one employee, limited to what the caller may read. */
    getAbout(userId: string, query: IRequestListQuery = {}): Observable<JsonResponse<IPagedList<IRequestListItem>>> {
        return this.api.get<JsonResponse<IPagedList<IRequestListItem>>>(`requests/user/${userId}${queryString(query)}`);
    }

    getById(id: string): Observable<JsonResponse<IRequestDetail>> {
        return this.api.get<JsonResponse<IRequestDetail>>(`requests/${id}`);
    }

    decide(id: string, decision: "approve" | "reject", comment?: string): Observable<JsonResponse<IRequestDetail>> {
        return this.api
            .post<JsonResponse<IRequestDetail>>(`requests/${id}/decision`, { decision, comment })
            .pipe(tap(() => this.refreshSummary()));
    }

    cancel(id: string, reason: string): Observable<JsonResponse<IRequestDetail>> {
        return this.api
            .post<JsonResponse<IRequestDetail>>(`requests/${id}/cancel`, { reason })
            .pipe(tap(() => this.refreshSummary()));
    }
}
