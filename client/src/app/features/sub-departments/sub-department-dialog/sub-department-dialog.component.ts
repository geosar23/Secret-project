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
import { ISubDepartment } from "../../../core/interfaces/sub-department.interface";
import { SubDepartmentService } from "../../../core/services/sub-department.service";
import { DepartmentService } from "../../../core/services/department.service";
import { IDepartment } from "../../../core/interfaces/department.interface";

export interface SubDepartmentDialogData {
    mode: "create" | "edit";
    subDepartment?: ISubDepartment;
}

@Component({
    selector: "app-sub-department-dialog",
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
    templateUrl: "./sub-department-dialog.component.html",
    styleUrls: ["./sub-department-dialog.component.scss"],
})
export class SubDepartmentDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private subDepartmentService = inject(SubDepartmentService);
    private departmentService = inject(DepartmentService);
    private toast = inject(ToastService);
    private dialogRef = inject(MatDialogRef<SubDepartmentDialogComponent, ISubDepartment | undefined>);
    data = inject<SubDepartmentDialogData>(MAT_DIALOG_DATA);

    loading = false;
    departmentsLoading = false;
    isEdit = this.data.mode === "edit";
    departments: IDepartment[] = [];

    private initialDepartmentId =
        typeof this.data.subDepartment?.department === "string"
            ? this.data.subDepartment.department
            : this.data.subDepartment?.department?._id || "";

    form: FormGroup = this.fb.group({
        name: [this.data.subDepartment?.name ?? "", [Validators.required, Validators.minLength(2)]],
        description: [this.data.subDepartment?.description ?? ""],
        departmentId: [this.initialDepartmentId, Validators.required],
        isActive: [this.data.subDepartment?.isActive ?? true],
    });

    ngOnInit(): void {
        this.departmentsLoading = true;
        this.departmentService.getDepartments().subscribe({
            next: res => {
                this.departments = res.data ?? [];
                this.departmentsLoading = false;
            },
            error: () => {
                this.departmentsLoading = false;
            },
        });
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.dialogRef.disableClose = true;

        const { name, description, departmentId, isActive } = this.form.value as {
            name: string;
            description: string;
            departmentId: string;
            isActive: boolean;
        };

        const request$ = this.isEdit
            ? this.subDepartmentService.updateSubDepartment(this.data.subDepartment!._id as string, {
                  name,
                  description,
                  departmentId,
                  isActive,
              })
            : this.subDepartmentService.createSubDepartment({ name, description, departmentId });

        request$.subscribe({
            next: res => {
                if (!res.success || !res.data?.subDepartment) {
                    this.toast.error(res.message || "Operation failed");
                    this.loading = false;
                    this.dialogRef.disableClose = false;
                    return;
                }
                this.dialogRef.close(res.data.subDepartment);
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
