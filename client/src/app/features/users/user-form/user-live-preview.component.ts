import { AppDatePipe } from "../../../shared/pipes/app-date.pipe";
import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";

export interface UserPreview {
    name: string;
    email: string;
    roleName: string;
    isActive: boolean;
    department: string;
    title: string;
    office: string;
    startDate: Date | null;
    imageUrl: string | null;
}

export interface UserRequirement {
    label: string;
    done: boolean;
}

@Component({
    selector: "app-user-live-preview",
    standalone: true,
    imports: [AppDatePipe, MatIconModule],
    templateUrl: "./user-live-preview.component.html",
    styleUrls: ["./user-live-preview.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserLivePreviewComponent {
    preview = input.required<UserPreview>();
    requirements = input.required<readonly UserRequirement[]>();
    requirementsTitle = input("Required fields");

    readonly initial = computed(() => this.preview().name.trim().charAt(0).toUpperCase());
    readonly doneCount = computed(() => this.requirements().filter(r => r.done).length);
    readonly progress = computed(() => {
        const total = this.requirements().length;
        return total ? (this.doneCount() / total) * 100 : 100;
    });
}
