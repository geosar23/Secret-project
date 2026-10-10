import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { catchError, debounceTime, distinctUntilChanged, filter, map, of, switchMap, tap } from "rxjs";
import { LoadingButtonComponent } from "../../../shared/components/loading-button/loading-button.component";
import { LeavesService } from "../../../core/services/leaves.service";
import { ToastService } from "../../../core/services/toast.service";
import { JsonResponse } from "../../../core/interfaces/generics.interface";
import { ILeaveCreated, ILeaveInput, ILeavePreview } from "../../../core/interfaces/leave.interface";
import { ILeaveBalance } from "../../../core/interfaces/request.interface";
import { toIsoDate } from "../../../core/utils/date-format";

export interface RequestLeaveDialogData {
    /** Leave type to preselect (from a balance card). */
    leaveTypeId?: string;
}

type PreviewState =
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; data: ILeavePreview }
    | { kind: "error"; message: string };

const dayLabel = (count: number): string => `${count} ${count === 1 ? "day" : "days"}`;

@Component({
    selector: "app-request-leave-dialog",
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        LoadingButtonComponent,
    ],
    templateUrl: "./request-leave-dialog.component.html",
    styleUrls: ["./request-leave-dialog.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestLeaveDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private leaves = inject(LeavesService);
    private toast = inject(ToastService);
    private destroyRef = inject(DestroyRef);
    private dialogRef = inject(MatDialogRef<RequestLeaveDialogComponent, ILeaveCreated | undefined>);
    private data = inject<RequestLeaveDialogData | null>(MAT_DIALOG_DATA, { optional: true });

    readonly typesLoading = signal(true);
    readonly typesError = signal(false);
    readonly balances = signal<ILeaveBalance[]>([]);
    readonly preview = signal<PreviewState>({ kind: "idle" });
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);

    readonly form = this.fb.group({
        leaveType: ["", Validators.required],
        start: [null as Date | null, Validators.required],
        end: [null as Date | null, Validators.required],
        reason: [""],
    });

    /** "Annual leave balance 12 → 7 days" for tracked types, a plain note for untracked ones. */
    readonly balanceLine = computed(() => {
        const state = this.preview();
        if (state.kind !== "ok") {
            return null;
        }
        const { balance, tracked, totals, leaveType } = state.data;
        if (!tracked || !balance) {
            return `${leaveType.name} is not tracked: no balance is checked.`;
        }
        const after = balance.available - totals.quantity;
        return `${leaveType.name} balance ${balance.available} → ${after} days available`;
    });

    readonly daysLine = computed(() => {
        const state = this.preview();
        return state.kind === "ok" ? `${dayLabel(state.data.totals.quantity)} counted` : null;
    });

    readonly errorMessage = computed(() => {
        const state = this.preview();
        return state.kind === "error" ? state.message : "";
    });

    readonly canSubmit = computed(() => this.preview().kind === "ok" && !this.submitting());

    ngOnInit(): void {
        this.leaves
            .getMyBalances()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    this.typesLoading.set(false);
                    if (!res.success || !res.data) {
                        this.typesError.set(true);
                        return;
                    }
                    this.balances.set(res.data.items);
                    const preselect = this.data?.leaveTypeId;
                    if (preselect && res.data.items.some(item => item.leaveType.id === preselect)) {
                        this.form.controls.leaveType.setValue(preselect);
                    }
                },
                error: () => {
                    this.typesLoading.set(false);
                    this.typesError.set(true);
                },
            });

        this.form.valueChanges
            .pipe(
                tap(() => this.submitError.set(null)),
                // The preview depends on type and dates only; typing a reason must not call the API again.
                map(() => this.previewInput()),
                distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
                tap(input => this.preview.set(input ? { kind: "loading" } : { kind: "idle" })),
                debounceTime(300),
                filter(input => input !== null),
                switchMap(input =>
                    this.leaves.preview(input).pipe(
                        catchError(err =>
                            of<JsonResponse<ILeavePreview>>({
                                success: false,
                                message: err.error?.message || "These dates could not be checked. Try again.",
                            }),
                        ),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(res => {
                if (res.success && res.data) {
                    this.preview.set({ kind: "ok", data: res.data });
                } else {
                    this.preview.set({ kind: "error", message: res.message || "These dates cannot be requested." });
                }
            });
    }

    submit(): void {
        const input = this.currentInput();
        if (!input || !this.canSubmit()) {
            return;
        }
        this.submitting.set(true);
        this.dialogRef.disableClose = true;
        this.submitError.set(null);
        this.leaves.create(input).subscribe({
            next: res => {
                if (!res.success || !res.data) {
                    this.failSubmit(res.message || "The request could not be submitted.");
                    return;
                }
                this.toast.success(
                    res.data.needsRouting
                        ? "Request submitted. HR will assign an approver."
                        : "Leave request submitted.",
                );
                this.dialogRef.close(res.data);
            },
            error: err => this.failSubmit(err.error?.message || "The request could not be submitted."),
        });
    }

    cancel(): void {
        this.dialogRef.close();
    }

    /** What the preview needs: leave type and dates, once all three are valid. */
    private previewInput(): ILeaveInput | null {
        const { leaveType, start, end } = this.form.getRawValue();
        if (!leaveType || !start || !end || end < start) {
            return null;
        }
        return { leaveType, startDate: toIsoDate(start), endDate: toIsoDate(end) };
    }

    /** The full request body for submitting: the preview input plus the optional reason. */
    private currentInput(): ILeaveInput | null {
        const input = this.previewInput();
        const reason = this.form.getRawValue().reason?.trim();
        return input && { ...input, reason: reason || undefined };
    }

    private failSubmit(message: string): void {
        this.submitError.set(message);
        this.submitting.set(false);
        this.dialogRef.disableClose = false;
    }
}
