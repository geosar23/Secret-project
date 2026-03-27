import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { CountryService } from "../../../core/services/country.service";
import { ToastService } from "../../../core/services/toast.service";
import { ICountry } from "../../../core/interfaces/country.interface";

export interface CountryDialogData {
    mode: "create" | "edit";
    country?: ICountry;
}

@Component({
    selector: "app-country-dialog",
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
    templateUrl: "./country-dialog.component.html",
    styleUrls: ["./country-dialog.component.scss"],
})
export class CountryDialogComponent {
    private fb = inject(FormBuilder);
    private countryService = inject(CountryService);
    private toast = inject(ToastService);
    private dialogRef = inject(MatDialogRef<CountryDialogComponent, ICountry | undefined>);
    data = inject<CountryDialogData>(MAT_DIALOG_DATA);

    loading = false;
    isEdit = this.data.mode === "edit";

    form: FormGroup = this.fb.group({
        name: [this.data.country?.name ?? "", [Validators.required, Validators.minLength(2)]],
        description: [this.data.country?.description ?? ""],
        isActive: [this.data.country?.isActive ?? true],
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
            ? this.countryService.updateCountry(this.data.country!._id as string, {
                  name,
                  description,
                  isActive,
              })
            : this.countryService.createCountry({ name, description });

        request$.subscribe({
            next: res => {
                if (!res.success || !res.data?.country) {
                    this.toast.error(res.message || "Operation failed");
                    this.loading = false;
                    this.dialogRef.disableClose = false;
                    return;
                }
                this.dialogRef.close(res.data.country);
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
