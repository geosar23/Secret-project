import { AppDatePipe } from "../../shared/pipes/app-date.pipe";
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    OnInit,
    computed,
    effect,
    inject,
    signal,
    untracked,
} from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { CurrentUserService } from "../../core/services/current-user.service";
import { LeavesService } from "../../core/services/leaves.service";
import { PermissionService } from "../../core/services/permission.service";
import { RequestsService } from "../../core/services/requests.service";
import { ILeaveBalance, IRequestListItem } from "../../core/interfaces/request.interface";
import { ILeaveCreated } from "../../core/interfaces/leave.interface";
import { RequestStatusBadgeComponent } from "../../shared/components/request-status-badge/request-status-badge.component";
import {
    RequestLeaveDialogComponent,
    RequestLeaveDialogData,
} from "../leaves/request-leave-dialog/request-leave-dialog.component";

interface WorkspaceCard {
    label: string;
    description: string;
    icon: string;
    route?: string;
    comingSoon?: boolean;
}

interface PlaceholderKpi {
    label: string;
    value: string;
    hint: string;
    icon: string;
    tone: "leave" | "attend" | "tasks" | "pay";
    route?: string;
    queryParams?: Record<string, string>;
}

type LoadState = "loading" | "ready" | "error";

interface PlaceholderEvent {
    day: string;
    month: string;
    title: string;
    sub: string;
}

@Component({
    selector: "app-dashboard",
    standalone: true,
    imports: [
        AppDatePipe,
        RequestStatusBadgeComponent,
        NgTemplateOutlet,
        RouterLink,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
    ],
    templateUrl: "./dashboard.component.html",
    styleUrls: ["./dashboard.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
    private currentUser = inject(CurrentUserService);
    private leaves = inject(LeavesService);
    private requests = inject(RequestsService);
    private permissions = inject(PermissionService);
    private dialog = inject(MatDialog);
    private destroyRef = inject(DestroyRef);

    readonly today = new Date();
    readonly user = this.currentUser.user;
    readonly profileImageUrl = this.currentUser.profileImageUrl;
    readonly initials = this.currentUser.initials;

    readonly firstName = computed(() => {
        const user = this.user();
        return user?.firstName || user?.name?.split(" ")[0] || "";
    });

    readonly greeting = computed(() => {
        const hour = this.today.getHours();
        return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    });

    /** "Software Engineer · Frontend Team" style subtitle, built from whatever org data is populated. */
    readonly subtitle = computed(() => {
        const user = this.user();
        return [user?.employmentTitle?.name, user?.primarySubDepartment?.name, user?.office?.name]
            .filter(Boolean)
            .join(" · ");
    });

    readonly yearsAtCompany = computed(() => {
        const date = this.user()?.employmentDate;
        if (!date) {
            return null;
        }
        const years = (this.today.getTime() - new Date(date).getTime()) / (365.25 * 24 * 3600 * 1000);
        return years > 0 ? years.toFixed(1) : null;
    });

    /** Share of self-maintained profile fields that are filled in, and what is still missing. */
    readonly completion = computed(() => {
        const user = this.user();
        if (!user) {
            return { percent: 0, missing: [] as string[] };
        }
        const checks: [string, boolean][] = [
            ["profile photo", !!user.profileImage],
            ["personal phone number", !!user.personalPhone],
            ["personal email", !!user.personalEmail],
            ["birthday", !!user.birthday],
            ["current address", !!user.currentAddress?.line1],
            ["emergency contact", !!user.emergencyContact?.name],
        ];
        const missing = checks.filter(([, done]) => !done).map(([label]) => label);
        return { percent: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
    });

    /** Personal self-service shortcuts only; admin pages live in the header menu. */
    readonly workspaceCards: WorkspaceCard[] = [
        { label: "My Profile", description: "View & edit your info", icon: "person", route: "/profile/me" },
        { label: "Org Chart", description: "Teams & reporting lines", icon: "account_tree", route: "/org-chart" },
        { label: "My Leave", description: "Request & track leave", icon: "beach_access", route: "/requests" },
        { label: "My Payslips", description: "Download payslips", icon: "receipt_long", comingSoon: true },
        { label: "My Documents", description: "Contracts & files", icon: "folder_open", comingSoon: true },
        { label: "My Schedule", description: "Shifts & calendar", icon: "event", comingSoon: true },
        { label: "Performance", description: "Goals & reviews", icon: "trending_up", comingSoon: true },
    ];

    // ── Leave data (real) ──

    // The user loads after the component is created (hard refresh), so permissions must follow the user signal.
    readonly canRequestLeave = computed(() => this.user() !== null && this.permissions.canRequestLeave());
    readonly canSeeBalances = computed(() => this.user() !== null && this.permissions.canReadLeaveBalances());

    readonly balancesState = signal<LoadState>("loading");
    readonly balances = signal<ILeaveBalance[]>([]);
    readonly myRequests = signal<IRequestListItem[]>([]);
    readonly myRequestsState = signal<LoadState>("loading");
    readonly waiting = signal<IRequestListItem[]>([]);
    readonly summary = this.requests.summary;
    readonly pendingForMe = computed(() => this.summary()?.pendingForMe ?? 0);

    /** Days still bookable across the leave types that have an allowance. */
    private readonly daysLeft = computed(() =>
        this.balances()
            .filter(item => item.tracked)
            .reduce((sum, item) => sum + item.available, 0),
    );

    // ── Placeholder content: no backend yet, rendered with a "Sample data" badge ──

    readonly kpis = computed<PlaceholderKpi[]>(() => {
        const leaveTile: PlaceholderKpi = {
            label: "Leave Days Left",
            value: this.balancesState() === "ready" && this.canSeeBalances() ? String(this.daysLeft()) : "–",
            hint: `${this.summary()?.myPending ?? 0} pending`,
            icon: "beach_access",
            tone: "leave",
            route: "/requests",
            queryParams: { tab: "mine" },
        };
        const waitingTile: PlaceholderKpi = {
            label: "Waiting for you",
            value: String(this.pendingForMe()),
            hint: this.pendingForMe() === 1 ? "1 request to review" : `${this.pendingForMe()} requests to review`,
            icon: "inbox",
            tone: "tasks",
            route: "/requests",
            queryParams: { tab: "inbox" },
        };
        const sample: PlaceholderKpi[] = [
            { label: "Attendance", value: "97%", hint: "This month · 1 late", icon: "fingerprint", tone: "attend" },
            this.pendingForMe() > 0
                ? waitingTile
                : { label: "Open Tasks", value: "3", hint: "2 due this week", icon: "task_alt", tone: "tasks" },
            { label: "Next Payday", value: "Month end", hint: "Salary deposit", icon: "payments", tone: "pay" },
        ];
        return [leaveTile, ...sample];
    });

    readonly upcoming: PlaceholderEvent[] = [
        { day: "10", month: "Jun", title: "Sprint Review Meeting", sub: "10:00 AM · Room 3B" },
        { day: "15", month: "Jun", title: "Annual Leave Starts", sub: "Approved · 5 days" },
        { day: "20", month: "Jun", title: "Company Picnic", sub: "All day" },
    ];

    readonly announcements = [
        { color: "var(--color-primary-700)", title: "Company Picnic — June 20", sub: "Families welcome! — HR" },
        { color: "var(--color-info)", title: "New Leave Policy", sub: "Effective June 1st" },
        { color: "var(--color-success)", title: "Q1 Reviews Open", sub: "Complete by May 15" },
    ];

    constructor() {
        // Load balances as soon as the user is known and allowed to see them.
        effect(() => {
            if (this.canSeeBalances()) {
                untracked(() => this.loadBalances());
            }
        });
    }

    ngOnInit(): void {
        this.loadRequests();
    }

    loadBalances(): void {
        if (!this.canSeeBalances()) {
            this.balancesState.set("ready");
            return;
        }
        this.balancesState.set("loading");
        this.leaves
            .getMyBalances()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    if (!res.success || !res.data) {
                        this.balancesState.set("error");
                        return;
                    }
                    this.balances.set(res.data.items);
                    this.balancesState.set("ready");
                },
                error: () => this.balancesState.set("error"),
            });
    }

    loadRequests(): void {
        this.myRequestsState.set("loading");
        this.requests
            .getMine({ limit: 4 })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    if (!res.success || !res.data) {
                        this.myRequestsState.set("error");
                        return;
                    }
                    this.myRequests.set(res.data.items);
                    this.myRequestsState.set("ready");
                },
                error: () => this.myRequestsState.set("error"),
            });

        this.requests
            .getSummary()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    if ((res.data?.pendingForMe ?? 0) > 0) {
                        this.loadWaiting();
                    } else {
                        this.waiting.set([]);
                    }
                },
                error: () => undefined,
            });
    }

    openRequestLeave(leaveTypeId?: string): void {
        this.dialog
            .open<RequestLeaveDialogComponent, RequestLeaveDialogData, ILeaveCreated | undefined>(
                RequestLeaveDialogComponent,
                { data: { leaveTypeId }, width: "32rem", maxWidth: "95vw" },
            )
            .afterClosed()
            .subscribe(created => {
                if (created) {
                    this.loadBalances();
                    this.loadRequests();
                }
            });
    }

    /** Used and pending as shares of the yearly allowance, for the two-tone progress bar. */
    usedPercent(item: ILeaveBalance): number {
        const total = item.granted + item.adjusted;
        return total > 0 ? Math.min(100, (item.used / total) * 100) : 0;
    }

    pendingPercent(item: ILeaveBalance): number {
        const total = item.granted + item.adjusted;
        return total > 0 ? Math.min(100 - this.usedPercent(item), (item.pending / total) * 100) : 0;
    }

    private loadWaiting(): void {
        this.requests
            .getInbox({ limit: 3 })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => this.waiting.set(res.data?.items ?? []),
                error: () => this.waiting.set([]),
            });
    }
}
