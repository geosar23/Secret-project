import { AppDatePipe } from "../../shared/pipes/app-date.pipe";
import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { CurrentUserService } from "../../core/services/current-user.service";

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
}

interface PlaceholderLeave {
    label: string;
    used: number;
    total: number;
    color: string;
}

interface PlaceholderEvent {
    day: string;
    month: string;
    title: string;
    sub: string;
}

@Component({
    selector: "app-dashboard",
    standalone: true,
    imports: [AppDatePipe, RouterLink, MatButtonModule, MatIconModule],
    templateUrl: "./dashboard.component.html",
    styleUrls: ["./dashboard.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
    private currentUser = inject(CurrentUserService);

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
        { label: "My Leave", description: "Request & track leave", icon: "beach_access", comingSoon: true },
        { label: "My Payslips", description: "Download payslips", icon: "receipt_long", comingSoon: true },
        { label: "My Documents", description: "Contracts & files", icon: "folder_open", comingSoon: true },
        { label: "My Schedule", description: "Shifts & calendar", icon: "event", comingSoon: true },
        { label: "Performance", description: "Goals & reviews", icon: "trending_up", comingSoon: true },
    ];

    // ── Placeholder content: no backend yet, rendered with a "Sample data" badge ──

    readonly kpis: PlaceholderKpi[] = [
        { label: "Leave Days Left", value: "12", hint: "3 pending", icon: "beach_access", tone: "leave" },
        { label: "Attendance", value: "97%", hint: "This month · 1 late", icon: "fingerprint", tone: "attend" },
        { label: "Open Tasks", value: "3", hint: "2 due this week", icon: "task_alt", tone: "tasks" },
        { label: "Next Payday", value: "Month end", hint: "Salary deposit", icon: "payments", tone: "pay" },
    ];

    readonly leaveBalances: PlaceholderLeave[] = [
        { label: "Annual Leave", used: 12, total: 20, color: "var(--color-primary-700)" },
        { label: "Sick Leave", used: 2, total: 10, color: "var(--color-info)" },
        { label: "Remote Days", used: 9, total: 20, color: "var(--color-success)" },
        { label: "Unpaid Leave", used: 0, total: 5, color: "var(--color-warning)" },
    ];

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

    barWidth(item: PlaceholderLeave): string {
        return `${(item.used / item.total) * 100}%`;
    }
}
