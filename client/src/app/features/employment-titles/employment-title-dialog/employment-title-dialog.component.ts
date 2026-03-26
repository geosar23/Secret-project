import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSelectModule } from "@angular/material/select";
import { ToastService } from "../../../core/services/toast.service";
import { IEmploymentTitle } from "../../../core/interfaces/employment-title.interface";
import { EmploymentTitleService } from "../../../core/services/employment-title.service";
import { SubDepartmentService } from "../../../core/services/sub-department.service";
import { ISubDepartment } from "../../../core/interfaces/sub-department.interface";

export interface EmploymentTitleDialogData {
    mode: "create" | "edit";
    employmentTitle?: IEmploymentTitle;
}

@Component({
    selector: "app-employment-title-dialog",
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
        MatSelectModule,
    ],
    templateUrl: "./employment-title-dialog.component.html",
    styleUrls: ["./employment-title-dialog.component.scss"],
})
export class EmploymentTitleDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private employmentTitleService = inject(EmploymentTitleService);
    private subDepartmentService = inject(SubDepartmentService);
    private toast = inject(ToastService);
    private dialogRef = inject(MatDialogRef<EmploymentTitleDialogComponent, IEmploymentTitle | undefined>);
    data = inject<EmploymentTitleDialogData>(MAT_DIALOG_DATA);

    loading = false;
    subDepartmentsLoading = false;
    isEdit = this.data.mode === "edit";
    subDepartments: ISubDepartment[] = [];

    private initialSubDepartmentId =
        typeof this.data.employmentTitle?.subDepartment === "string"
            ? this.data.employmentTitle.subDepartment
            : this.data.employmentTitle?.subDepartment?._id || "";

    form: FormGroup = this.fb.group({
        name: [this.data.employmentTitle?.name ?? "", [Validators.required, Validators.minLength(2)]],
        description: [this.data.employmentTitle?.description ?? ""],
        subDepartmentId: [this.initialSubDepartmentId, Validators.required],
        isActive: [this.data.employmentTitle?.isActive ?? true],
    });

    ngOnInit(): void {
        this.subDepartmentsLoading = true;
        this.subDepartmentService.getSubDepartments().subscribe({
            next: res => {
                this.subDepartments = res.data ?? [];
                this.subDepartmentsLoading = false;
            },
            error: () => {
                this.subDepartmentsLoading = false;
            },
        });
    }

    getSubDepartmentName(item: ISubDepartment): string {
        return item.name;
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.dialogRef.disableClose = true;

        const { name, description, subDepartmentId, isActive } = this.form.value as {
            name: string;
            description: string;
            subDepartmentId: string;
            isActive: boolean;
        };

        const request$ = this.isEdit
            ? this.employmentTitleService.updateEmploymentTitle(this.data.employmentTitle!._id as string, {
                  name,
                  description,
                  subDepartmentId,
                  isActive,
              })
            : this.employmentTitleService.createEmploymentTitle({ name, description, subDepartmentId });

        request$.subscribe({
            next: res => {
                if (!res.success || !res.data?.employmentTitle) {
                    this.toast.error(res.message || "Operation failed");
                    this.loading = false;
                    this.dialogRef.disableClose = false;
                    return;
                }
                this.dialogRef.close(res.data.employmentTitle);
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
