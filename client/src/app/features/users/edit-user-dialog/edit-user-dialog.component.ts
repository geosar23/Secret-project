import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { UsersService } from "../../../core/services/users.service";
import { CountryService } from "../../../core/services/country.service";
import { EmploymentTitleService } from "../../../core/services/employment-title.service";
import { RoleService } from "../../../core/services/role.service";
import { ToastService } from "../../../core/services/toast.service";
import { AuthService } from "../../../core/services/auth.service";
import { IUser, IUpdateUserRequest } from "../../../core/interfaces/user.interface";
import { ICompany } from "../../../core/interfaces/company.interface";
import { ICountry } from "../../../core/interfaces/country.interface";
import { IEmploymentTitle } from "../../../core/interfaces/employment-title.interface";
import { IRole } from "../../../core/interfaces/role.interface";
import { LoadingButtonComponent } from "../../../shared/components/loading-button/loading-button.component";

export interface EditUserDialogData {
    user: IUser;
}

@Component({
    selector: "app-edit-user-dialog",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatSlideToggleModule,
        LoadingButtonComponent,
    ],
    templateUrl: "./edit-user-dialog.component.html",
    styleUrls: ["./edit-user-dialog.component.scss"],
})
export class EditUserDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private usersService = inject(UsersService);
    private countryService = inject(CountryService);
    private employmentTitleService = inject(EmploymentTitleService);
    private roleService = inject(RoleService);
    private toast = inject(ToastService);
    private authService = inject(AuthService);
    private dialogRef = inject(MatDialogRef<EditUserDialogComponent, IUser | undefined>);
    data = inject<EditUserDialogData>(MAT_DIALOG_DATA);
    private localUser = this.authService.getLocalUser();

    loading = false;
    companiesLoading = false;
    countriesLoading = false;
    rolesLoading = false;
    employmentTitlesLoading = false;
    usersLoading = false;
    companies: ICompany[] = this.localUser?.company ? [this.localUser.company] : [];
    countries: ICountry[] = [];
    roles: IRole[] = [];
    employmentTitles: IEmploymentTitle[] = [];
    users: IUser[] = [];

    userForm: FormGroup = this.fb.group({
        name: [this.data.user.name, [Validators.required, Validators.minLength(2)]],
        email: [this.data.user.email, [Validators.required, Validators.email]],
        role: [this.data.user.role?._id ?? "", Validators.required],
        companyId: [{ value: this.localUser?.company?._id ?? "", disabled: true }, Validators.required],
        countryId: [this.data.user.country?._id ?? "", Validators.required],
        employmentTitleId: [this.data.user.employmentTitle?._id ?? "", Validators.required],
        departmentId: [this.data.user.department?._id ?? "", Validators.required],
        managerId: [this.data.user.manager?._id ?? ""],
        isActive: [this.data.user.isActive ?? true],
    });

    private initialUpdateValues = {
        name: (this.data.user.name ?? "").trim(),
        email: (this.data.user.email ?? "").trim(),
        role: this.data.user.role?._id ?? undefined,
        companyId: this.localUser?.company?._id ?? undefined,
        countryId: this.data.user.country?._id ?? undefined,
        employmentTitleId: this.data.user.employmentTitle?._id ?? undefined,
        managerId: this.data.user.manager?._id ?? undefined,
        isActive: this.data.user.isActive ?? true,
    };

    ngOnInit(): void {
        this.userForm.get("companyId")?.disable();
        this.countriesLoading = true;
        this.rolesLoading = true;
        this.employmentTitlesLoading = true;

        const companyId = this.localUser?.company?._id;
        if (companyId) {
            this.usersLoading = true;
            this.usersService.getUsers({ companyId, limit: 200 }).subscribe({
                next: res => {
                    this.users = (res.data?.users ?? []).filter(u => u._id !== this.data.user._id);
                    this.usersLoading = false;
                },
                error: () => {
                    this.usersLoading = false;
                },
            });
        }

        this.roleService.getAllRoles().subscribe({
            next: res => {
                this.roles = res.data ?? [];
                this.rolesLoading = false;
            },
            error: () => {
                this.rolesLoading = false;
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

        this.employmentTitleService.getEmploymentTitles().subscribe({
            next: res => {
                this.employmentTitles = res.data ?? [];
                this.employmentTitlesLoading = false;
            },
            error: () => {
                this.employmentTitlesLoading = false;
            },
        });
    }

    onSubmit(): void {
        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            return;
        }

        const { name, email, role, companyId, countryId, employmentTitleId, managerId, isActive } =
            this.userForm.getRawValue() as {
                name: string;
                email: string;
                role?: string;
                companyId?: string;
                countryId?: string;
                employmentTitleId?: string;
                managerId?: string;
                isActive: boolean;
            };

        const currentValues = {
            name: (name ?? "").trim(),
            email: (email ?? "").trim(),
            role: role || undefined,
            companyId: companyId || undefined,
            countryId: countryId || undefined,
            employmentTitleId: employmentTitleId || undefined,
            managerId: managerId || undefined,
            isActive: !!isActive,
        };

        const payload: IUpdateUserRequest = {};
        (Object.keys(currentValues) as Array<keyof typeof currentValues>).forEach(key => {
            if (currentValues[key] !== this.initialUpdateValues[key]) {
                (payload as Record<string, string | boolean | undefined>)[key] = currentValues[key];
            }
        });

        if (Object.keys(payload).length === 0) {
            this.toast.info("No changes to save");
            return;
        }

        this.loading = true;
        this.dialogRef.disableClose = true;

        this.usersService.updateUser(this.data.user._id as string, payload).subscribe({
            next: res => {
                if (!res.success) {
                    this.toast.error(res.message || "Failed to update user");
                    this.loading = false;
                    this.dialogRef.disableClose = false;
                    return;
                }
                // Return an updated user object merging the form changes
                const updatedUser: IUser = {
                    ...this.data.user,
                    name: currentValues.name,
                    email: currentValues.email,
                    isActive: currentValues.isActive,
                    role: this.roles.find(r => r._id === currentValues.role) ?? this.data.user.role,
                    company: this.companies.find(c => c._id === currentValues.companyId) ?? this.data.user.company,
                    country: this.countries.find(c => c._id === currentValues.countryId) ?? this.data.user.country,
                    employmentTitle:
                        this.employmentTitles.find(t => t._id === currentValues.employmentTitleId) ??
                        this.data.user.employmentTitle,
                    manager: this.users.find(u => u._id === currentValues.managerId) ?? this.data.user.manager,
                };
                this.dialogRef.close(updatedUser);
            },
            error: err => {
                this.toast.error(err.error?.error || "Failed to update user");
                this.loading = false;
                this.dialogRef.disableClose = false;
            },
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
