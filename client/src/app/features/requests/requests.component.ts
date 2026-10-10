import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { Observable } from "rxjs";
import { AppDatePipe } from "../../shared/pipes/app-date.pipe";
import { LoadingButtonComponent } from "../../shared/components/loading-button/loading-button.component";
import { PageHeaderComponent } from "../../shared/components/page-header/page-header.component";
import { RequestsService } from "../../core/services/requests.service";
import { CurrentUserService } from "../../core/services/current-user.service";
import { PermissionService } from "../../core/services/permission.service";
import { ToastService } from "../../core/services/toast.service";
import { JsonResponse } from "../../core/interfaces/generics.interface";
import {
    IRequestAction,
    IRequestDetail,
    IRequestListItem,
    IRequestListQuery,
    IRequestTypeInfo,
    RequestStatusFilter,
} from "../../core/interfaces/request.interface";
import { initialsOf } from "../../core/utils/name.utils";
import { toIsoDate } from "../../core/utils/date-format";
import { NEEDS_ROUTING_LABEL, REQUEST_STATUSES, REQUEST_STATUS_LABEL } from "../../core/enums/request-status.enum";
import { RequestStatusBadgeComponent } from "../../shared/components/request-status-badge/request-status-badge.component";
import { REQUEST_CREATORS } from "./request-creators";

type Tab = "inbox" | "mine" | "team";
const TABS: readonly Tab[] = ["inbox", "mine", "team"];
type PendingAction = "reject" | "cancel" | null;

interface TimelineEntry {
    key: string;
    icon: string;
    tone: "neutral" | "success" | "error" | "warning";
    text: string;
    note?: string;
    date: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

@Component({
    selector: "app-requests",
    standalone: true,
    imports: [
        FormsModule,
        AppDatePipe,
        PageHeaderComponent,
        LoadingButtonComponent,
        RequestStatusBadgeComponent,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatSelectModule,
        MatDatepickerModule,
        MatProgressSpinnerModule,
    ],
    templateUrl: "./requests.component.html",
    styleUrls: ["./requests.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestsComponent {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private destroyRef = inject(DestroyRef);
    private requests = inject(RequestsService);
    private permissions = inject(PermissionService);
    private toast = inject(ToastService);
    private dialog = inject(MatDialog);

    readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
    readonly statusOptions = REQUEST_STATUSES;
    readonly statusLabels = REQUEST_STATUS_LABEL;
    readonly needsRoutingLabel = NEEDS_ROUTING_LABEL;
    readonly initials = initialsOf;

    readonly summary = this.requests.summary;
    private currentUser = inject(CurrentUserService);

    readonly types = signal<IRequestTypeInfo[]>([]);

    /** Enabled types this user can start. Follows the user signal because the user loads after the page does. */
    readonly creatableTypes = computed(() =>
        this.currentUser.user() === null
            ? []
            : this.types().filter(type => REQUEST_CREATORS[type.key]?.canCreate(this.permissions)),
    );

    private listTab: Tab | null = null;
    /** Status a summary card wants applied once the tab it opens has reset its filters. */
    private pendingStatus: RequestStatusFilter | "" = "";

    readonly tab = signal<Tab>("mine");
    readonly type = signal("");
    readonly status = signal<RequestStatusFilter | "">("");
    readonly from = signal<Date | null>(null);
    readonly to = signal<Date | null>(null);
    readonly page = signal(0);
    readonly pageSize = signal(10);

    readonly items = signal<IRequestListItem[]>([]);
    readonly total = signal(0);
    readonly loading = signal(true);
    readonly loadFailed = signal(false);

    readonly selectedId = signal<string | null>(null);
    readonly detail = signal<IRequestDetail | null>(null);
    readonly detailLoading = signal(false);
    readonly detailFailed = signal(false);

    readonly pendingAction = signal<PendingAction>(null);
    readonly actionText = signal("");
    readonly acting = signal(false);

    /** The inbox tab is for people who can approve: something is waiting, they oversee a team, or they are on it now. */
    readonly showInboxTab = computed(
        () => (this.summary()?.pendingForMe ?? 0) > 0 || !!this.summary()?.hasTeam || this.tab() === "inbox",
    );
    readonly showTeamTab = computed(() => !!this.summary()?.hasTeam || this.tab() === "team");
    /** Everything in the inbox is pending, so the status filter only applies to the other lists. */
    readonly showStatusFilter = computed(() => this.tab() !== "inbox");
    readonly hasFilters = computed(
        () => !!this.type() || (this.showStatusFilter() && !!this.status()) || !!this.from() || !!this.to(),
    );

    readonly timeline = computed<TimelineEntry[]>(() => {
        const detail = this.detail();
        return detail ? this.buildTimeline(detail) : [];
    });

    readonly actionNeedsText = computed(() => this.pendingAction() === "cancel");
    readonly canConfirmAction = computed(
        () => !this.acting() && (!this.actionNeedsText() || this.actionText().trim().length > 0),
    );

    constructor() {
        this.requests
            .getTypes()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: res => this.types.set(res.data ?? []), error: () => undefined });

        // Land on "Needs my action" only when something is waiting; everyone else starts on their own requests.
        this.requests
            .getSummary()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    const params = this.route.snapshot.queryParamMap;
                    if ((res.data?.pendingForMe ?? 0) > 0 && !params.get("tab") && !params.get("id")) {
                        this.router.navigate([], {
                            relativeTo: this.route,
                            queryParams: { tab: "inbox" },
                            queryParamsHandling: "merge",
                            replaceUrl: true,
                        });
                    }
                },
                error: () => undefined,
            });

        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            const requestedTab = TABS.find(tab => tab === params.get("tab")) ?? "mine";
            const tabChanged = requestedTab !== this.listTab;
            this.listTab = requestedTab;
            this.tab.set(requestedTab);

            const id = params.get("id");
            if (id !== this.selectedId()) {
                this.selectedId.set(id);
                this.resetAction();
                if (id) {
                    this.loadDetail(id);
                } else {
                    this.detail.set(null);
                }
            }
            if (tabChanged) {
                this.resetFilters();
                this.page.set(0);
                this.loadList();
            }
        });
    }

    selectTab(tab: Tab): void {
        this.navigate({ tab, id: null });
    }

    /** A summary card opens the list it counts, with the filter that matches the number. */
    openCard(tab: Tab, status: RequestStatusFilter | "" = ""): void {
        if (this.tab() === tab) {
            this.closeDetail();
            this.pendingStatus = status;
            this.resetFilters();
            this.reloadFromStart();
            return;
        }
        this.pendingStatus = status;
        this.selectTab(tab);
    }

    select(item: IRequestListItem): void {
        this.navigate({ id: item.id });
    }

    closeDetail(): void {
        this.navigate({ id: null });
    }

    onTypeChange(value: string): void {
        this.type.set(value);
        this.reloadFromStart();
    }

    onStatusChange(value: RequestStatusFilter | ""): void {
        this.status.set(value);
        this.reloadFromStart();
    }

    /** The range input emits once per bound; load only when the range is complete or empty. */
    onDates(from: Date | null, to: Date | null): void {
        this.from.set(from);
        this.to.set(to);
        if ((from && to) || (!from && !to)) {
            this.reloadFromStart();
        }
    }

    clearFilters(): void {
        this.resetFilters();
        this.reloadFromStart();
    }

    onPage(event: PageEvent): void {
        this.page.set(event.pageIndex);
        this.pageSize.set(event.pageSize);
        this.loadList();
    }

    reload(): void {
        this.loadList();
    }

    startRequest(type: IRequestTypeInfo): void {
        REQUEST_CREATORS[type.key].open(this.dialog).subscribe(requestId => {
            if (requestId) {
                this.requests.refreshSummary();
                this.navigate({ tab: "mine", id: requestId });
                this.loadList();
            }
        });
    }

    iconOf(type: IRequestTypeInfo): string {
        return REQUEST_CREATORS[type.key]?.icon ?? "add";
    }

    approve(): void {
        this.act(id => this.requests.decide(id, "approve"), "Request approved.");
    }

    startAction(kind: "reject" | "cancel"): void {
        this.pendingAction.set(kind);
        this.actionText.set("");
    }

    resetAction(): void {
        this.pendingAction.set(null);
        this.actionText.set("");
    }

    confirmAction(): void {
        const kind = this.pendingAction();
        const text = this.actionText().trim();
        if (!kind || !this.canConfirmAction()) {
            return;
        }
        if (kind === "reject") {
            this.act(id => this.requests.decide(id, "reject", text || undefined), "Request rejected.");
        } else {
            this.act(id => this.requests.cancel(id, text), "Request canceled.");
        }
    }

    trackById(_: number, item: IRequestListItem): string {
        return item.id;
    }

    private resetFilters(): void {
        this.type.set("");
        this.status.set(this.pendingStatus);
        this.pendingStatus = "";
        this.from.set(null);
        this.to.set(null);
    }

    private reloadFromStart(): void {
        this.page.set(0);
        this.loadList();
    }

    private navigate(params: { tab?: Tab; id?: string | null }): void {
        const current = this.route.snapshot.queryParamMap;
        const next: Record<string, string | null> = {
            tab: params.tab ?? current.get("tab"),
            id: params.id === undefined ? current.get("id") : params.id,
        };
        this.router.navigate([], { relativeTo: this.route, queryParams: next, queryParamsHandling: "merge" });
    }

    private loadList(): void {
        this.loading.set(true);
        this.loadFailed.set(false);
        const from = this.from();
        const to = this.to();
        const query: IRequestListQuery = {
            page: this.page() + 1,
            limit: this.pageSize(),
            type: this.type() || undefined,
            status: this.showStatusFilter() ? this.status() || undefined : undefined,
            from: from ? toIsoDate(from) : undefined,
            to: to ? toIsoDate(to) : undefined,
        };
        const request$ = {
            inbox: () => this.requests.getInbox(query),
            mine: () => this.requests.getMine(query),
            team: () => this.requests.getTeam(query),
        }[this.tab()]();
        request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: res => {
                this.loading.set(false);
                if (!res.success || !res.data) {
                    this.loadFailed.set(true);
                    return;
                }
                this.items.set(res.data.items);
                this.total.set(res.data.total);
            },
            error: () => {
                this.loading.set(false);
                this.loadFailed.set(true);
            },
        });
    }

    private loadDetail(id: string): void {
        this.detailLoading.set(true);
        this.detailFailed.set(false);
        this.requests
            .getById(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    this.detailLoading.set(false);
                    if (!res.success || !res.data) {
                        this.detailFailed.set(true);
                        return;
                    }
                    this.detail.set(res.data);
                },
                error: () => {
                    this.detailLoading.set(false);
                    this.detailFailed.set(true);
                },
            });
    }

    private act(call: (id: string) => Observable<JsonResponse<IRequestDetail>>, doneMessage: string): void {
        const id = this.selectedId();
        if (!id || this.acting()) {
            return;
        }
        this.acting.set(true);
        call(id).subscribe({
            next: res => {
                this.acting.set(false);
                if (!res.success || !res.data) {
                    this.toast.error(res.message || "That action could not be completed.");
                    return;
                }
                this.detail.set(res.data);
                this.resetAction();
                this.toast.success(doneMessage);
                this.loadList();
            },
            error: err => {
                this.acting.set(false);
                this.toast.error(err.error?.message || "That action could not be completed.");
                // The request may have changed under the user (for example already decided): show the truth.
                this.loadDetail(id);
                this.loadList();
            },
        });
    }

    private buildTimeline(detail: IRequestDetail): TimelineEntry[] {
        const name = (id: string): string => detail.people?.[id]?.name ?? (id === "system" ? "System" : "Someone");
        const entries: TimelineEntry[] = [];
        detail.actionsHistory.forEach((entry: IRequestAction, index) => {
            const data = entry.data ?? {};
            const note = typeof data["comment"] === "string" ? data["comment"] : (data["reason"] as string | undefined);
            const base = { key: `${entry.action}-${index}`, date: entry.date };
            switch (entry.action) {
                case "submitted":
                    entries.push({
                        ...base,
                        icon: "send",
                        tone: "neutral",
                        text:
                            detail.requester.id !== detail.subject.id
                                ? `${name(entry.user)} submitted this for ${detail.subject.name ?? "the employee"}`
                                : `${name(entry.user)} submitted the request`,
                    });
                    break;
                case "stepActivated": {
                    const assignees = Array.isArray(data["assignees"]) ? (data["assignees"] as string[]) : [];
                    entries.push({
                        ...base,
                        icon: "hourglass_top",
                        tone: "warning",
                        text: assignees.length ? `Assigned to ${assignees.map(name).join(", ")}` : "Sent for approval",
                    });
                    break;
                }
                case "approved":
                    entries.push({
                        ...base,
                        icon: "check_circle",
                        tone: "success",
                        text: `${name(entry.user)} approved`,
                        note,
                    });
                    break;
                case "rejected":
                    entries.push({
                        ...base,
                        icon: "cancel",
                        tone: "error",
                        text: `${name(entry.user)} rejected`,
                        note,
                    });
                    break;
                case "needsRouting":
                    entries.push({
                        ...base,
                        icon: "alt_route",
                        tone: "warning",
                        text: "No approver was found. HR needs to assign one.",
                    });
                    break;
                case "canceled":
                    entries.push({
                        ...base,
                        icon: "block",
                        tone: "neutral",
                        text: `${name(entry.user)} canceled`,
                        note,
                    });
                    break;
                case "stepSkipped":
                    entries.push({ ...base, icon: "skip_next", tone: "neutral", text: "A step was skipped" });
                    break;
                default:
                    break;
            }
        });
        return entries;
    }
}
