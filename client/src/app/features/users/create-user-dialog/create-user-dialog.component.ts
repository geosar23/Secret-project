import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { UsersService } from "../../../core/services/users.service";
import { CompanyService } from "../../../core/services/company.service";
import { CountryService } from "../../../core/services/country.service";
import { EmploymentTitleService } from "../../../core/services/employment-title.service";
import { ToastService } from "../../../core/services/toast.service";
import { ICompany } from "../../../core/interfaces/company.interface";
import { ICountry } from "../../../core/interfaces/country.interface";
import { IEmploymentTitle } from "../../../core/interfaces/employment-title.interface";

@Component({
    selector: "app-create-user-dialog",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
    ],
    templateUrl: "./create-user-dialog.component.html",
    styleUrls: ["./create-user-dialog.component.scss"],
})
export class CreateUserDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private usersService = inject(UsersService);
    private companyService = inject(CompanyService);
    private countryService = inject(CountryService);
    private employmentTitleService = inject(EmploymentTitleService);
    private dialogRef = inject(MatDialogRef<CreateUserDialogComponent>);
    private toast = inject(ToastService);

    loading = false;
    hidePassword = true;
    companiesLoading = false;
    countriesLoading = false;
    employmentTitlesLoading = false;
    companies: ICompany[] = [];
    countries: ICountry[] = [];
    employmentTitles: IEmploymentTitle[] = [];

    userForm: FormGroup = this.fb.group({
        name: ["", [Validators.required, Validators.minLength(2)]],
        email: ["", [Validators.required, Validators.email]],
        password: ["", [Validators.required, Validators.minLength(6)]],
        role: ["employee", Validators.required],
        companyId: [""],
        countryId: [""],
        employmentTitleId: [""],
        departmentId: [""],
    });

    roles = [
        { value: "god", label: "God" },
        { value: "super_admin", label: "Super Admin" },
        { value: "admin", label: "Admin" },
        { value: "hr", label: "HR Manager" },
        { value: "manager", label: "Manager" },
        { value: "employee", label: "Employee" },
    ];

    ngOnInit(): void {
        this.companiesLoading = true;
        this.countriesLoading = true;
        this.employmentTitlesLoading = true;

        this.companyService.getCompanies().subscribe({
            next: res => {
                this.companies = res.data ?? [];
                this.companiesLoading = false;
            },
            error: () => {
                this.companiesLoading = false;
            },
        });

        this.employmentTitleService.getEmploymentTitles().subscribe({
            next: res => {
                this.employmentTitles = res.data ?? [];
                this.employmentTitlesLoading = false;
            },
            error: () => {
                this.employmentTitlesLoading = false;
            },
        });

        this.countryService.getCountries().subscribe({
            next: res => {
                this.countries = res.data ?? [];
                this.countriesLoading = false;
            },
            error: () => {
                this.countriesLoading = false;
            },
        });
    }

    onSubmit(): void {
        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            return;
        }

        this.loading = true;

        this.usersService.createUser(this.userForm.value).subscribe({
            next: response => {
                this.dialogRef.close(response.data!.user);
            },
            error: err => {
                this.toast.error(err.error?.message || "Failed to create user");
                this.loading = false;
            },
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
