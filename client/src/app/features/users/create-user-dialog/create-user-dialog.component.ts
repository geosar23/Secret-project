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
import { RoleService } from "../../../core/services/role.service";
import { ToastService } from "../../../core/services/toast.service";
import { ICompany } from "../../../core/interfaces/company.interface";
import { ICountry } from "../../../core/interfaces/country.interface";
import { IEmploymentTitle } from "../../../core/interfaces/employment-title.interface";
import { IRole } from "../../../core/interfaces/role.interface";

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
    private roleService = inject(RoleService);
    private dialogRef = inject(MatDialogRef<CreateUserDialogComponent>);
    private toast = inject(ToastService);

    loading = false;
    hidePassword = true;
    companiesLoading = false;
    countriesLoading = false;
    rolesLoading = false;
    employmentTitlesLoading = false;
    companies: ICompany[] = [];
    countries: ICountry[] = [];
    roles: IRole[] = [];
    employmentTitles: IEmploymentTitle[] = [];

    userForm: FormGroup = this.fb.group({
        name: ["", [Validators.required, Validators.minLength(2)]],
        email: ["", [Validators.required, Validators.email]],
        password: ["", [Validators.required, Validators.minLength(6)]],
        role: ["", Validators.required],
        companyId: [""],
        countryId: [""],
        employmentTitleId: [""],
        departmentId: [""],
    });

    private toObjectIdOrUndefined(value: unknown): string | undefined {
        if (typeof value !== "string") return undefined;
        const trimmed = value.trim();
        return /^[a-fA-F0-9]{24}$/.test(trimmed) ? trimmed : undefined;
    }

    ngOnInit(): void {
        this.companiesLoading = true;
        this.countriesLoading = true;
        this.rolesLoading = true;
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

        this.roleService.getAllRoles().subscribe({
            next: res => {
                this.roles = res.data ?? [];
                this.rolesLoading = false;

                const employeeRoleId = this.roles.find(r => r.role === "employee")?._id;
                if (employeeRoleId) {
                    this.userForm.patchValue({ role: employeeRoleId });
                }
            },
            error: () => {
                this.rolesLoading = false;
            },
        });
    }

    onSubmit(): void {
        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            return;
        }

        this.loading = true;

        const formValue = this.userForm.value as {
            name: string;
            email: string;
            password: string;
            role: string;
            companyId?: string;
            countryId?: string;
            employmentTitleId?: string;
            departmentId?: string;
        };

        const payload = {
            name: formValue.name,
            email: formValue.email,
            password: formValue.password,
            role: this.toObjectIdOrUndefined(formValue.role),
            companyId: this.toObjectIdOrUndefined(formValue.companyId),
            countryId: this.toObjectIdOrUndefined(formValue.countryId),
            employmentTitleId: this.toObjectIdOrUndefined(formValue.employmentTitleId),
            departmentId: this.toObjectIdOrUndefined(formValue.departmentId),
        };

        if (!payload.role) {
            this.toast.error("Please select a valid role");
            this.loading = false;
            return;
        }

        const createPayload = {
            ...payload,
            role: payload.role,
        };

        this.usersService.createUser(createPayload).subscribe({
            next: response => {
                if (!response.success) {
                    this.toast.error(response.message || "Failed to create user");
                    this.loading = false;
                    return;
                }

                const createdUser = response.data?.user;
                if (!createdUser) {
                    this.toast.error(response.message || "User was created but response payload was empty");
                    this.loading = false;
                    return;
                }

                this.dialogRef.close(createdUser);
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
