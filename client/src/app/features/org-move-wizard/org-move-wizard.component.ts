import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSelectModule } from "@angular/material/select";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { Observable, catchError, forkJoin, map, of } from "rxjs";
import { IDepartment } from "../../core/interfaces/department.interface";
import { ISubDepartment } from "../../core/interfaces/sub-department.interface";
import { IEmploymentTitle } from "../../core/interfaces/employment-title.interface";
import {
    IOrgMovePreview,
    IOrgMoveUser,
    OrgMoveAction,
    OrgMoveOperation,
} from "../../core/interfaces/org-move.interface";
import { DepartmentService } from "../../core/services/department.service";
import { SubDepartmentService } from "../../core/services/sub-department.service";
import { EmploymentTitleService } from "../../core/services/employment-title.service";
import { OrgMoveService } from "../../core/services/org-move.service";
import { ToastService } from "../../core/services/toast.service";
import { refId, titlesOf } from "../../core/utils/user-form-options";
import {
    OrgMoveChoice,
    blockers,
    choiceProblem,
    defaultChoice,
    reassignNeeds,
    toResolution,
} from "../../core/utils/org-move";

export type OrgMoveWizardData =
    | { kind: "subDepartment"; subDepartment: ISubDepartment }
    | { kind: "title"; title: IEmploymentTitle };

interface Option {
    id: string;
    label: string;
}

type Step = 1 | 2 | 3 | 4;

const toOption = (id: string | undefined, label: string): Option => ({ id: id ?? "", label });

@Component({
    selector: "app-org-move-wizard",
    standalone: true,
    imports: [
        MatDialogModule,
        MatButtonModule,
        ReactiveFormsModule,
        MatButtonToggleModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressBarModule,
        MatSelectModule,
        MatSlideToggleModule,
    ],
    templateUrl: "./org-move-wizard.component.html",
    styleUrls: ["./org-move-wizard.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgMoveWizardComponent {
    private readonly orgMove = inject(OrgMoveService);
    private readonly toast = inject(ToastService);
    private readonly dialogRef = inject(MatDialogRef<OrgMoveWizardComponent>);
    private readonly subDepartmentService = inject(SubDepartmentService);
    private readonly employmentTitleService = inject(EmploymentTitleService);
    private readonly fb = inject(FormBuilder);
    readonly data = inject<OrgMoveWizardData>(MAT_DIALOG_DATA);

    readonly step = signal<Step>(1);
    readonly loading = signal(true);
    readonly busy = signal(false);

    readonly mode = signal<"edit" | "move" | "merge">("edit");
    readonly targetId = signal("");
    readonly preview = signal<IOrgMovePreview | null>(null);
    readonly choices = signal<Record<string, OrgMoveChoice>>({});
    readonly errorMessage = signal("");
    readonly errorDetails = signal<string[]>([]);
    readonly moveId = signal("");
    readonly updated = signal(0);
    readonly undone = signal(false);

    private readonly departments = signal<IDepartment[]>([]);
    private readonly subDepartments = signal<ISubDepartment[]>([]);
    private readonly titles = signal<IEmploymentTitle[]>([]);

    private readonly entity = this.data.kind === "subDepartment" ? this.data.subDepartment : this.data.title;

    /** Name, description and status; where the entity sits can only change through move or merge. */
    readonly detailsForm = this.fb.nonNullable.group({
        name: [this.entity.name, [Validators.required, Validators.minLength(2)]],
        description: [this.entity.description ?? ""],
        isActive: [this.entity.isActive ?? true],
    });

    readonly parentName =
        this.data.kind === "subDepartment"
            ? this.data.subDepartment.department?.name
            : this.data.title.subDepartment?.name;
    readonly parentLabel = this.data.kind === "subDepartment" ? "Department" : "Sub-department";

    readonly isSubDepartment = this.data.kind === "subDepartment";
    readonly sourceId = this.data.kind === "subDepartment" ? this.data.subDepartment._id : this.data.title._id;
    readonly sourceName = this.data.kind === "subDepartment" ? this.data.subDepartment.name : this.data.title.name;
    readonly entityLabel = this.isSubDepartment ? "sub-department" : "employment title";

    readonly operation = computed<OrgMoveOperation>(() => {
        const merge = this.mode() === "merge";
        return this.isSubDepartment
            ? merge
                ? "mergeSubDepartment"
                : "moveSubDepartment"
            : merge
              ? "mergeTitle"
              : "moveTitle";
    });

    private departmentName(id: string): string {
        return this.departments().find(d => d._id === id)?.name ?? "";
    }

    private subLabel(sub: ISubDepartment): string {
        const department = this.departmentName(refId(sub.department));
        return department ? `${department} › ${sub.name}` : sub.name;
    }

    /** Active sub-departments as "Department › Sub-department", without the one being changed. */
    private readonly subOptions = computed<Option[]>(() =>
        this.subDepartments()
            .filter(s => s.isActive !== false && !(this.isSubDepartment && s._id === this.sourceId))
            .map(s => toOption(s._id, this.subLabel(s))),
    );

    readonly targetOptions = computed<Option[]>(() => {
        if (this.mode() === "edit") {
            return [];
        }
        if (this.data.kind === "subDepartment") {
            if (this.mode() === "merge") {
                return this.subOptions();
            }
            const current = refId(this.data.subDepartment.department);
            return this.departments()
                .filter(d => d.isActive !== false && d._id !== current)
                .map(d => toOption(d._id, d.name));
        }
        if (this.mode() === "move") {
            const current = refId(this.data.title.subDepartment);
            return this.subOptions().filter(o => o.id !== current);
        }
        return this.titles()
            .filter(t => t.isActive !== false && t._id !== this.sourceId)
            .map(t => toOption(t._id, `${t.subDepartment?.name ?? ""} › ${t.name}`));
    });

    readonly targetLabel = computed(() =>
        this.mode() === "move"
            ? this.isSubDepartment
                ? "Destination department"
                : "Destination sub-department"
            : `${this.isSubDepartment ? "Sub-department" : "Employment title"} to merge into`,
    );

    readonly targetName = computed(() => this.preview()?.target.name ?? "");

    readonly users = computed(() => this.preview()?.users ?? []);
    readonly blocked = computed(() => blockers(this.operation(), this.users(), this.choices()));
    readonly canContinueToReview = computed(() => this.blocked().incomplete === 0 && this.blocked().forbidden === 0);

    readonly counts = computed(() => {
        const tally: Record<OrgMoveAction, number> = { follow: 0, reassign: 0, clear: 0 };
        for (const user of this.users()) {
            tally[this.choiceOf(user).action]++;
        }
        return tally;
    });

    constructor() {
        const quiet = <T>(source$: Observable<{ data?: T[] }>) =>
            source$.pipe(
                map(res => res.data ?? []),
                catchError(() => of([] as T[])),
            );

        forkJoin([
            quiet(inject(DepartmentService).getDepartments()),
            quiet(inject(SubDepartmentService).getSubDepartments()),
            quiet(inject(EmploymentTitleService).getEmploymentTitles()),
        ]).subscribe(([departments, subDepartments, titles]) => {
            this.departments.set(departments);
            this.subDepartments.set(subDepartments);
            this.titles.set(titles);
            this.loading.set(false);
        });
    }

    // ── Step 1 ───────────────────────────────────────────────────────────────

    setMode(mode: "edit" | "move" | "merge"): void {
        this.mode.set(mode);
        this.targetId.set("");
        this.errorMessage.set("");
    }

    setTarget(id: string): void {
        this.targetId.set(id);
        this.errorMessage.set("");
    }

    saveDetails(): void {
        if (this.detailsForm.invalid) {
            this.detailsForm.markAllAsTouched();
            return;
        }
        const { name, description, isActive } = this.detailsForm.getRawValue();
        const body = { name: name.trim(), description: description.trim(), isActive };
        const id = this.sourceId ?? "";
        const request$: Observable<{ success: boolean; message?: string }> =
            this.data.kind === "subDepartment"
                ? this.subDepartmentService.updateSubDepartment(id, body)
                : this.employmentTitleService.updateEmploymentTitle(id, body);

        this.busy.set(true);
        request$.subscribe({
            next: res => {
                this.busy.set(false);
                if (!res.success) {
                    this.errorMessage.set(res.message || "Could not save the changes");
                    return;
                }
                this.toast.success(`${this.entityLabel[0].toUpperCase()}${this.entityLabel.slice(1)} updated`);
                this.dialogRef.close();
            },
            error: err => {
                this.busy.set(false);
                this.errorMessage.set(err.error?.message || "Could not save the changes");
            },
        });
    }

    loadPreview(): void {
        this.busy.set(true);
        this.errorMessage.set("");
        this.orgMove
            .preview({ operation: this.operation(), sourceId: this.sourceId ?? "", targetId: this.targetId() })
            .subscribe({
                next: res => {
                    this.busy.set(false);
                    if (!res.success || !res.data) {
                        this.errorMessage.set(res.message || "Could not preview this change");
                        return;
                    }
                    this.preview.set(res.data);
                    this.choices.set(Object.fromEntries(res.data.users.map(u => [u.id, defaultChoice()])));
                    this.step.set(res.data.users.length ? 2 : 3);
                },
                error: err => {
                    this.busy.set(false);
                    this.errorMessage.set(err.error?.message || "Could not preview this change");
                },
            });
    }

    // ── Step 2 ───────────────────────────────────────────────────────────────

    choiceOf(user: IOrgMoveUser): OrgMoveChoice {
        return this.choices()[user.id] ?? defaultChoice();
    }

    private patchChoice(userId: string, patch: Partial<OrgMoveChoice>): void {
        this.choices.update(all => ({ ...all, [userId]: { ...(all[userId] ?? defaultChoice()), ...patch } }));
    }

    setAction(user: IOrgMoveUser, action: OrgMoveAction): void {
        this.patchChoice(user.id, { action, subDepartmentId: "", titleId: "" });
    }

    setSubDepartment(user: IOrgMoveUser, subDepartmentId: string): void {
        this.patchChoice(user.id, { subDepartmentId, titleId: "" });
    }

    setTitle(user: IOrgMoveUser, titleId: string): void {
        this.patchChoice(user.id, { titleId });
    }

    setActionForAll(action: OrgMoveAction): void {
        this.choices.update(all =>
            Object.fromEntries(
                Object.keys(all).map(id => [id, { action, subDepartmentId: "", titleId: "" } as OrgMoveChoice]),
            ),
        );
    }

    needs(user: IOrgMoveUser): { subDepartment: boolean; title: boolean } {
        return reassignNeeds(this.operation(), user);
    }

    problem(user: IOrgMoveUser): string | null {
        return choiceProblem(this.operation(), user, this.choiceOf(user));
    }

    subOptionsFor(): Option[] {
        return this.subOptions();
    }

    titleOptionsFor(user: IOrgMoveUser): Option[] {
        if (this.isSubDepartment) {
            return titlesOf(this.titles(), this.choiceOf(user).subDepartmentId).map(t => toOption(t._id, t.name));
        }
        return this.titles()
            .filter(t => t.isActive !== false && t._id !== this.sourceId)
            .map(t => toOption(t._id, `${t.subDepartment?.name ?? ""} › ${t.name}`));
    }

    followLabel(): string {
        return this.mode() === "move" ? "Follow the move" : `Switch to ${this.targetName()}`;
    }

    // ── Step 3 / 4 ───────────────────────────────────────────────────────────

    apply(): void {
        this.busy.set(true);
        this.errorMessage.set("");
        this.errorDetails.set([]);
        this.orgMove
            .apply({
                operation: this.operation(),
                sourceId: this.sourceId ?? "",
                targetId: this.targetId(),
                resolutions: this.users().map(u => toResolution(this.operation(), u, this.choiceOf(u))),
            })
            .subscribe({
                next: res => {
                    this.busy.set(false);
                    if (!res.success || !res.data) {
                        this.errorMessage.set(res.message || "The change could not be applied");
                        this.errorDetails.set(Array.isArray(res.error) ? res.error : []);
                        return;
                    }
                    this.moveId.set(res.data.moveId);
                    this.updated.set(res.data.updated);
                    this.step.set(4);
                },
                error: err => {
                    this.busy.set(false);
                    this.errorMessage.set(err.error?.message || "The change could not be applied");
                },
            });
    }

    undo(): void {
        this.busy.set(true);
        this.orgMove.undo(this.moveId()).subscribe({
            next: res => {
                this.busy.set(false);
                if (!res.success) {
                    this.toast.error(res.message || "Could not undo this change");
                    return;
                }
                this.undone.set(true);
                this.toast.success("The change was undone");
            },
            error: err => {
                this.busy.set(false);
                this.toast.error(err.error?.message || "Could not undo this change");
            },
        });
    }

    back(): void {
        this.errorMessage.set("");
        this.errorDetails.set([]);
        this.step.set(this.step() === 3 && this.users().length === 0 ? 1 : ((this.step() - 1) as Step));
    }
}
