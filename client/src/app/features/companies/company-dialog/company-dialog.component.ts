import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { CompanyService } from "../../../core/services/company.service";
import { ToastService } from "../../../core/services/toast.service";
import { ICompany } from "../../../core/interfaces/company.interface";

export interface CompanyDialogData {
    mode: "create" | "edit";
    company?: ICompany;
}

@Component({
    selector: "app-company-dialog",
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
    templateUrl: "./company-dialog.component.html",
    styleUrls: ["./company-dialog.component.scss"],
})
export class CompanyDialogComponent {
    private fb = inject(FormBuilder);
    private companyService = inject(CompanyService);
    private toast = inject(ToastService);
    private dialogRef = inject(MatDialogRef<CompanyDialogComponent, ICompany | undefined>);
    data = inject<CompanyDialogData>(MAT_DIALOG_DATA);

    loading = false;
    isEdit = this.data.mode === "edit";

    form: FormGroup = this.fb.group({
        name: [this.data.company?.name ?? "", [Validators.required, Validators.minLength(2)]],
        slug: [this.data.company?.slug ?? "", [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
        isActive: [this.data.company?.isActive ?? true],
    });

    onSlugInput(): void {
        const ctrl = this.form.get("slug");
        if (ctrl) {
            ctrl.setValue(ctrl.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"), { emitEvent: false });
        }
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.dialogRef.disableClose = true;

        const { name, slug, isActive } = this.form.value as { name: string; slug: string; isActive: boolean };

        const request$ = this.isEdit
            ? this.companyService.updateCompany(this.data.company!._id as string, { name, slug, isActive })
            : this.companyService.createCompany({ name, slug });

        request$.subscribe({
            next: res => {
                if (!res.success || !res.data?.company) {
                    this.toast.error(res.message || "Operation failed");
                    this.loading = false;
                    this.dialogRef.disableClose = false;
                    return;
                }
                this.dialogRef.close(res.data.company);
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
