import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { OfficeService } from "../../../core/services/office.service";
import { CountryService } from "../../../core/services/country.service";
import { ToastService } from "../../../core/services/toast.service";
import { IOffice } from "../../../core/interfaces/user.interface";
import { ICountry } from "../../../core/interfaces/country.interface";

export interface OfficeDialogData {
    mode: "create" | "edit";
    office?: IOffice;
}

@Component({
    selector: "app-office-dialog",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatSlideToggleModule,
    ],
    templateUrl: "./office-dialog.component.html",
    styleUrls: ["./office-dialog.component.scss"],
})
export class OfficeDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private officeService = inject(OfficeService);
    private countryService = inject(CountryService);
    private toast = inject(ToastService);
    private dialogRef = inject(MatDialogRef<OfficeDialogComponent, IOffice | undefined>);
    data = inject<OfficeDialogData>(MAT_DIALOG_DATA);

    loading = false;
    isEdit = this.data.mode === "edit";
    countries: ICountry[] = [];

    form: FormGroup = this.fb.group({
        name: [this.data.office?.name ?? "", [Validators.required]],
        countryId: [this.data.office?.country?._id ?? ""],
        line1: [this.data.office?.address?.line1 ?? ""],
        line2: [this.data.office?.address?.line2 ?? ""],
        city: [this.data.office?.address?.city ?? ""],
        state: [this.data.office?.address?.state ?? ""],
        postalCode: [this.data.office?.address?.postalCode ?? ""],
        isActive: [this.data.office?.isActive ?? true],
    });

    ngOnInit(): void {
        // Only active countries can be assigned; the current one stays visible when editing.
        this.countryService.getCountries().subscribe({
            next: res => {
                const currentId = this.data.office?.country?._id;
                this.countries = (res.data ?? []).filter(c => c.isActive || c._id === currentId);
            },
            error: () => {
                this.countries = this.data.office?.country ? [this.data.office.country] : [];
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

        const { name, countryId, line1, line2, city, state, postalCode, isActive } = this.form.value as Record<
            string,
            string
        > & { isActive: boolean };
        const payload = { name, countryId, address: { line1, line2, city, state, postalCode } };

        const request$ = this.isEdit
            ? this.officeService.updateOffice(this.data.office!._id, { ...payload, isActive })
            : this.officeService.createOffice(payload);

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
