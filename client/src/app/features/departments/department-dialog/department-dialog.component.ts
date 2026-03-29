import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { DepartmentService } from "../../../core/services/department.service";
import { ToastService } from "../../../core/services/toast.service";
import { IDepartment } from "../../../core/interfaces/department.interface";
import { LoadingButtonComponent } from "../../../shared/components/loading-button/loading-button.component";

export interface DepartmentDialogData {
    mode: "create" | "edit";
    department?: IDepartment;
}

@Component({
    selector: "app-department-dialog",
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
        LoadingButtonComponent,
    ],
    templateUrl: "./department-dialog.component.html",
    styleUrls: ["./department-dialog.component.scss"],
})
export class DepartmentDialogComponent {
    private fb = inject(FormBuilder);
    private departmentService = inject(DepartmentService);
    private toast = inject(ToastService);
    private dialogRef = inject(MatDialogRef<DepartmentDialogComponent, IDepartment | undefined>);
    data = inject<DepartmentDialogData>(MAT_DIALOG_DATA);

    loading = false;
    isEdit = this.data.mode === "edit";

    form: FormGroup = this.fb.group({
        name: [this.data.department?.name ?? "", [Validators.required, Validators.minLength(2)]],
        description: [this.data.department?.description ?? ""],
        isActive: [this.data.department?.isActive ?? true],
    });

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.dialogRef.disableClose = true;

        const { name, description, isActive } = this.form.value as {
            name: string;
            description: string;
            isActive: boolean;
        };

        const request$ = this.isEdit
            ? this.departmentService.updateDepartment(this.data.department!._id as string, {
                  name,
                  description,
                  isActive,
              })
            : this.departmentService.createDepartment({ name, description });

        request$.subscribe({
            next: res => {
                if (!res.success || !res.data?.department) {
                    this.toast.error(res.message || "Operation failed");
                    this.loading = false;
                    this.dialogRef.disableClose = false;
                    return;
                }
                this.dialogRef.close(res.data.department);
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
