import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { MatTableModule } from "@angular/material/table";
import { AppDatePipe } from "../../../shared/pipes/app-date.pipe";
import { RequestStatusBadgeComponent } from "../../../shared/components/request-status-badge/request-status-badge.component";
import { RequestsService } from "../../../core/services/requests.service";
import { IRequestListItem, IRequestTypeInfo, RequestStatus } from "../../../core/interfaces/request.interface";
import { REQUEST_STATUSES, REQUEST_STATUS_LABEL } from "../../../core/enums/request-status.enum";
import { toIsoDate } from "../../../core/utils/date-format";

/** The requests about one employee, with type, status and submission date filters. Opening one goes to /requests. */
@Component({
    selector: "app-profile-requests",
    standalone: true,
    imports: [
        FormsModule,
        AppDatePipe,
        RequestStatusBadgeComponent,
        MatButtonModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatIconModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatTableModule,
    ],
    templateUrl: "./profile-requests.component.html",
    styleUrls: ["./profile-requests.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileRequestsComponent {
    private requests = inject(RequestsService);
    private router = inject(Router);
    private destroyRef = inject(DestroyRef);

    readonly userId = input.required<string>();

    readonly statusOptions = REQUEST_STATUSES;
    readonly statusLabels = REQUEST_STATUS_LABEL;
    readonly columns = ["request", "type", "status", "submitted"];
    readonly pageSizeOptions = [10, 25, 50];

    readonly types = signal<IRequestTypeInfo[]>([]);
    readonly type = signal("");
    readonly status = signal<RequestStatus | "">("");
    readonly from = signal<Date | null>(null);
    readonly to = signal<Date | null>(null);
    readonly page = signal(0);
    readonly pageSize = signal(10);

    readonly items = signal<IRequestListItem[]>([]);
    readonly total = signal(0);
    readonly loading = signal(true);
    readonly loadFailed = signal(false);

    readonly hasFilters = computed(() => !!this.type() || !!this.status() || !!this.from() || !!this.to());

    constructor() {
        this.requests
            .getTypes()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: res => this.types.set(res.data ?? []), error: () => undefined });

        // Runs on first render and whenever the shown user changes; filters reset with it.
        effect(() => {
            this.userId();
            this.resetFilters();
        });
    }

    onType(value: string): void {
        this.type.set(value);
        this.reloadFromStart();
    }

    onStatus(value: RequestStatus | ""): void {
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
    }

    onPage(event: PageEvent): void {
        this.page.set(event.pageIndex);
        this.pageSize.set(event.pageSize);
        this.load();
    }

    typeName(key: string): string {
        return this.types().find(type => type.key === key)?.name ?? key;
    }

    open(item: IRequestListItem): void {
        this.router.navigate(["/requests"], { queryParams: { id: item.id } });
    }

    reload(): void {
        this.load();
    }

    private resetFilters(): void {
        this.type.set("");
        this.status.set("");
        this.from.set(null);
        this.to.set(null);
        this.reloadFromStart();
    }

    private reloadFromStart(): void {
        this.page.set(0);
        this.load();
    }

    private load(): void {
        const from = this.from();
        const to = this.to();
        this.loading.set(true);
        this.loadFailed.set(false);
        this.requests
            .getAbout(this.userId(), {
                page: this.page() + 1,
                limit: this.pageSize(),
                type: this.type() || undefined,
                status: this.status() || undefined,
                from: from ? toIsoDate(from) : undefined,
                to: to ? toIsoDate(to) : undefined,
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
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
}
