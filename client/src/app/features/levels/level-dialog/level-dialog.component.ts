import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { LevelService } from "../../../core/services/level.service";
import { ToastService } from "../../../core/services/toast.service";
import { ILevel } from "../../../core/interfaces/user.interface";

export interface LevelDialogData {
    mode: "create" | "edit";
    level?: ILevel;
}

@Component({
    selector: "app-level-dialog",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatSlideToggleModule,
    ],
    templateUrl: "./level-dialog.component.html",
    styleUrls: ["./level-dialog.component.scss"],
})
export class LevelDialogComponent {
    private fb = inject(FormBuilder);
    private levelService = inject(LevelService);
    private toast = inject(ToastService);
    private dialogRef = inject(MatDialogRef<LevelDialogComponent, ILevel | undefined>);
    data = inject<LevelDialogData>(MAT_DIALOG_DATA);

    loading = false;
    isEdit = this.data.mode === "edit";

    form: FormGroup = this.fb.group({
        name: [this.data.level?.name ?? "", [Validators.required, Validators.minLength(1)]],
        order: [this.data.level?.order ?? 0, [Validators.required, Validators.min(0)]],
        isActive: [this.data.level?.isActive ?? true],
    });

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.dialogRef.disableClose = true;

        const { name, order, isActive } = this.form.value as { name: string; order: number; isActive: boolean };

        const request$ = this.isEdit
            ? this.levelService.updateLevel(this.data.level!._id, { name, order, isActive })
            : this.levelService.createLevel({ name, order });

        request$.subscribe({
            next: res => {
                if (!res.success || !res.data) {
                    this.toast.error(res.message || "Operation failed");
                    this.loading = false;
                    this.dialogRef.disableClose = false;
                    return;
                }
                this.dialogRef.close(res.data);
            },
            error: err => {
                this.toast.error(err.error?.message || "Operation failed");
                this.loading = false;
                this.dialogRef.disableClose = false;
            },
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
