import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { UsersService } from "../../../core/services/users.service";
import { PasswordInputComponent } from "../../../shared/components/password-input/password-input.component";
import { CompanyService } from "../../../core/services/company.service";
import { CountryService } from "../../../core/services/country.service";
import { EmploymentTitleService } from "../../../core/services/employment-title.service";
import { RoleService } from "../../../core/services/role.service";
import { ToastService } from "../../../core/services/toast.service";
import { AuthService } from "../../../core/services/auth.service";
import { ICompany } from "../../../core/interfaces/company.interface";
import { ICountry } from "../../../core/interfaces/country.interface";
import { IEmploymentTitle } from "../../../core/interfaces/employment-title.interface";
import { IRole } from "../../../core/interfaces/role.interface";
import { IUser } from "../../../core/interfaces/user.interface";
import { first } from "rxjs";
import { UserRole } from "../../../core/enums/user-role.enum";
import { ProfileImageUploadComponent } from "../../../shared/components/profile-image-upload/profile-image-upload.component";

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
        MatProgressSpinnerModule,
        PasswordInputComponent,
        ProfileImageUploadComponent,
    ],
    templateUrl: "./create-user-dialog.component.html",
    styleUrls: ["./create-user-dialog.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
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
    private authService = inject(AuthService);

    private localUser = this.authService.getLocalUser();

    loading = signal(false);
    companiesLoading = signal(false);
    countriesLoading = signal(false);
    rolesLoading = signal(false);
    employmentTitlesLoading = signal(false);
    usersLoading = signal(false);
    companies = signal<ICompany[]>([]);
    countries = signal<ICountry[]>([]);
    roles = signal<IRole[]>([]);
    employmentTitles = signal<IEmploymentTitle[]>([]);
    users = signal<IUser[]>([]);
    selectedProfileImage = signal<File | null>(null);
    selectedProfileImagePreviewUrl = signal<string | null>(null);

    userForm: FormGroup = this.fb.group({
        name: ["", [Validators.required, Validators.minLength(2)]],
        email: ["", [Validators.required, Validators.email]],
        password: ["", [Validators.required, Validators.minLength(6)]],
        role: ["", Validators.required],
        companyId: [{ value: this.localUser?.company?._id ?? "", disabled: true }, Validators.required],
        countryId: ["", Validators.required],
        employmentTitleId: ["", Validators.required],
        managerId: ["", Validators.required],
    });

    private toObjectIdOrUndefined(value: unknown): string | undefined {
        if (typeof value !== "string") return undefined;
        const trimmed = value.trim();
        return /^[a-fA-F0-9]{24}$/.test(trimmed) ? trimmed : undefined;
    }

    ngOnInit(): void {
        if (this.localUser?.role.role !== UserRole.GOD) {
            //undisable company field for non-GOD users and set their company as the value
            this.userForm.get("companyId")?.enable();
        }
        this.loadInitialData();
    }

    private loadInitialData(): void {
        this.companiesLoading.set(true);
        this.countriesLoading.set(true);
        this.rolesLoading.set(true);
        this.employmentTitlesLoading.set(true);
        this.usersLoading.set(true);

        this.companyService
            .getCompanies()
            .pipe(first())
            .subscribe({
                next: res => {
                    this.companies.set(res.data ?? []);
                    this.companiesLoading.set(false);
                },
                error: () => {
                    this.companiesLoading.set(false);
                },
            });

        this.employmentTitleService
            .getEmploymentTitles()
            .pipe(first())
            .subscribe({
                next: res => {
                    this.employmentTitles.set(res.data ?? []);
                    this.employmentTitlesLoading.set(false);
                },
                error: () => {
                    this.employmentTitlesLoading.set(false);
                },
            });

        this.countryService
            .getCountries()
            .pipe(first())
            .subscribe({
                next: res => {
                    this.countries.set(res.data ?? []);
                    this.countriesLoading.set(false);
                },
                error: () => {
                    this.countriesLoading.set(false);
                },
            });

        this.roleService
            .getAllRoles()
            .pipe(first())
            .subscribe({
                next: res => {
                    this.roles.set(res.data ?? []);
                    this.rolesLoading.set(false);

                    const employeeRoleId = this.roles().find(r => r.role === "employee")?._id;
                    if (employeeRoleId) {
                        this.userForm.patchValue({ role: employeeRoleId });
                    }
                },
                error: () => {
                    this.rolesLoading.set(false);
                },
            });
        this.usersService
            .getUsers({ companyId: this.localUser?.company?._id ?? "", limit: 200 })
            .pipe(first())
            .subscribe({
                next: res => {
                    this.users.set(res.data?.users ?? []);
                    this.usersLoading.set(false);
                },
                error: () => {
                    this.usersLoading.set(false);
                },
            });
    }

    onSubmit(): void {
        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            return;
        }

        this.loading.set(true);

        const formValue = this.userForm.getRawValue() as {
            name: string;
            email: string;
            password: string;
            role: string;
            companyId: string;
            countryId: string;
            employmentTitleId: string;
            managerId: string;
        };

        const payload = {
            name: formValue.name,
            email: formValue.email,
            password: formValue.password,
            role: this.toObjectIdOrUndefined(formValue.role),
            companyId: this.toObjectIdOrUndefined(formValue.companyId),
            countryId: this.toObjectIdOrUndefined(formValue.countryId),
            employmentTitleId: this.toObjectIdOrUndefined(formValue.employmentTitleId),
            managerId: this.toObjectIdOrUndefined(formValue.managerId),
        };

        if (!payload.role) {
            this.toast.error("Please select a valid role");
            this.loading.set(false);
            return;
        }

        const createPayload = {
            ...payload,
            role: payload.role,
        };

        this.usersService
            .createUser(createPayload)
            .pipe(first())
            .subscribe({
                next: response => {
                    if (!response.success) {
                        this.toast.error(response.message || "Failed to create user");
                        this.loading.set(false);
                        return;
                    }

                    const createdUser = response.data?.user;
                    if (!createdUser) {
                        this.toast.error(response.message || "User was created but response payload was empty");
                        this.loading.set(false);
                        return;
                    }

                    const selectedImage = this.selectedProfileImage();
                    if (!selectedImage || !createdUser._id) {
                        this.dialogRef.close(createdUser);
                        return;
                    }

                    this.usersService
                        .uploadProfileImage(createdUser._id, selectedImage)
                        .pipe(first())
                        .subscribe({
                            next: uploadResponse => {
                                if (!uploadResponse.success) {
                                    this.toast.warning(
                                        uploadResponse.message || "User created but profile image upload failed",
                                    );
                                    this.dialogRef.close(createdUser);
                                    return;
                                }

                                const uploadedProfileImage = uploadResponse.data?.user?.profileImage;
                                this.dialogRef.close({
                                    ...createdUser,
                                    ...(uploadedProfileImage ? { profileImage: uploadedProfileImage } : {}),
                                });
                            },
                            error: () => {
                                this.toast.warning("User created but profile image upload failed");
                                this.dialogRef.close(createdUser);
                            },
                        });
                },
                error: err => {
                    this.toast.error(err.error?.message || "Failed to create user");
                    this.loading.set(false);
                },
            });
    }

    onProfileImageSelected(file: File): void {
        this.selectedProfileImage.set(file);
        this.selectedProfileImagePreviewUrl.set(URL.createObjectURL(file));
    }

    clearSelectedProfileImage(): void {
        this.selectedProfileImage.set(null);
        this.selectedProfileImagePreviewUrl.set(null);
    }

    onProfileImageValidationError(message: string): void {
        this.selectedProfileImage.set(null);
        this.selectedProfileImagePreviewUrl.set(null);
        this.toast.warning(message);
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
