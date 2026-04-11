import { Component, inject, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
    FormBuilder,
    FormGroup,
    Validators,
    ReactiveFormsModule,
    FormArray,
    FormControl,
    FormsModule,
} from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { provideNativeDateAdapter } from "@angular/material/core";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { UsersService } from "../../../core/services/users.service";
import { CompanyService } from "../../../core/services/company.service";
import { CountryService } from "../../../core/services/country.service";
import { EmploymentTitleService } from "../../../core/services/employment-title.service";
import { RoleService } from "../../../core/services/role.service";
import { DepartmentService } from "../../../core/services/department.service";
import { LevelService } from "../../../core/services/level.service";
import { OfficeService } from "../../../core/services/office.service";
import { ToastService } from "../../../core/services/toast.service";
import { AuthService } from "../../../core/services/auth.service";
import { PermissionService } from "../../../core/services/permission.service";
import { IUser, IUpdateUserRequest, ILevel, IOffice } from "../../../core/interfaces/user.interface";
import { ICompany } from "../../../core/interfaces/company.interface";
import { ICountry } from "../../../core/interfaces/country.interface";
import { IEmploymentTitle } from "../../../core/interfaces/employment-title.interface";
import { IRole } from "../../../core/interfaces/role.interface";
import { IDepartment } from "../../../core/interfaces/department.interface";
import { LoadingButtonComponent } from "../../../shared/components/loading-button/loading-button.component";
import { firstValueFrom } from "rxjs";
import { ProfileImageUploadComponent } from "../../../shared/components/profile-image-upload/profile-image-upload.component";
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, EMPLOYMENT_TYPE_OPTIONS } from "../../../core/enums/profile.enum";

export interface EditUserDialogData {
    user: IUser;
}

@Component({
    selector: "app-edit-user-dialog",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatDatepickerModule,
        MatChipsModule,
        MatIconModule,
        LoadingButtonComponent,
        ProfileImageUploadComponent,
    ],
    templateUrl: "./edit-user-dialog.component.html",
    styleUrls: ["./edit-user-dialog.component.scss"],
    providers: [provideNativeDateAdapter()],
})
export class EditUserDialogComponent implements OnInit, OnDestroy {
    private fb = inject(FormBuilder);
    private usersService = inject(UsersService);
    private companyService = inject(CompanyService);
    private countryService = inject(CountryService);
    private employmentTitleService = inject(EmploymentTitleService);
    private roleService = inject(RoleService);
    private departmentService = inject(DepartmentService);
    private levelService = inject(LevelService);
    private officeService = inject(OfficeService);
    private toast = inject(ToastService);
    private authService = inject(AuthService);
    private permissionService = inject(PermissionService);
    private dialogRef = inject(MatDialogRef<EditUserDialogComponent, IUser | undefined>);
    data = inject<EditUserDialogData>(MAT_DIALOG_DATA);
    private localUser = this.authService.getLocalUser();

    readonly genderOptions = GENDER_OPTIONS;
    readonly maritalStatusOptions = MARITAL_STATUS_OPTIONS;
    readonly employmentTypeOptions = EMPLOYMENT_TYPE_OPTIONS;

    loading = false;
    companiesLoading = false;
    countriesLoading = false;
    rolesLoading = false;
    employmentTitlesLoading = false;
    usersLoading = false;
    departmentsLoading = false;
    levelsLoading = false;
    officesLoading = false;

    canViewCrossCompany = this.permissionService.canViewCrossCompany();
    canEditIdentity = this.permissionService.canEditUserIdentity();
    canEditContact = this.permissionService.canEditUserContact();
    canEditEmployment = this.permissionService.canEditUserEmployment();
    canEditEducation = this.permissionService.canEditUserEducation();
    canEditCompensation = this.permissionService.canEditUserCompensation();

    companies: ICompany[] = this.localUser?.company ? [this.localUser.company] : [];
    countries: ICountry[] = [];
    roles: IRole[] = [];
    employmentTitles: IEmploymentTitle[] = [];
    users: IUser[] = [];
    departments: IDepartment[] = [];
    levels: ILevel[] = [];
    offices: IOffice[] = [];

    selectedProfileImage: File | null = null;
    removeProfileImageRequested = false;
    currentProfileImageUrl: string | null = null;
    selectedProfileImagePreviewUrl: string | null = null;
    profileImageLoading = false;

    nationalityInput = "";

    private readonly u = this.data.user;

    userForm: FormGroup = this.fb.group({
        // Core
        name: [this.u.name, [Validators.required, Validators.minLength(2)]],
        email: [this.u.email, [Validators.required, Validators.email]],
        role: [{ value: this.u.role?._id ?? "", disabled: !this.canEditEmployment }, Validators.required],
        companyId: [this.u.company?._id ?? this.localUser?.company?._id ?? ""],
        countryId: [this.u.country?._id ?? "", Validators.required],
        employmentTitleId: [
            { value: this.u.employmentTitle?._id ?? "", disabled: !this.canEditEmployment },
            Validators.required,
        ],
        managerId: [{ value: this.u.manager?._id ?? "", disabled: !this.canEditEmployment }],
        departmentId: [{ value: (this.u.department as IDepartment)?._id ?? "", disabled: !this.canEditEmployment }],
        levelId: [{ value: this.u.level?._id ?? "", disabled: !this.canEditEmployment }],
        officeId: [{ value: this.u.office?._id ?? "", disabled: !this.canEditEmployment }],
        hrRepresentativeId: [{ value: this.u.hrRepresentative?._id ?? "", disabled: !this.canEditEmployment }],
        isActive: [this.u.isActive ?? true],
        isOutsourced: [{ value: this.u.isOutsourced ?? false, disabled: !this.canEditEmployment }],
        // Identity
        firstName: [{ value: this.u.firstName ?? "", disabled: !this.canEditIdentity }],
        lastName: [{ value: this.u.lastName ?? "", disabled: !this.canEditIdentity }],
        legalName: [{ value: this.u.legalName ?? "", disabled: !this.canEditIdentity }],
        personalEmail: [{ value: this.u.personalEmail ?? "", disabled: !this.canEditIdentity }, Validators.email],
        gender: [{ value: this.u.gender ?? "", disabled: !this.canEditIdentity }],
        birthday: [
            { value: this.u.birthday ? new Date(this.u.birthday) : (null as Date | null), disabled: !this.canEditIdentity },
        ],
        maritalStatus: [{ value: this.u.maritalStatus ?? "", disabled: !this.canEditIdentity }],
        nationalities: this.fb.array((this.u.nationalities ?? []).map(n => this.fb.control(n) as FormControl<string>)),
        religion: [{ value: this.u.religion ?? "", disabled: !this.canEditIdentity }],
        // Contact
        workPhone: [{ value: this.u.workPhone ?? "", disabled: !this.canEditContact }],
        personalPhone: [{ value: this.u.personalPhone ?? "", disabled: !this.canEditContact }],
        homeCountryPhone: [{ value: this.u.homeCountryPhone ?? "", disabled: !this.canEditContact }],
        // Employment
        employmentDate: [
            { value: this.u.employmentDate ? new Date(this.u.employmentDate) : (null as Date | null), disabled: !this.canEditEmployment },
        ],
        employmentType: [{ value: this.u.employmentType ?? "", disabled: !this.canEditEmployment }],
        payrollId: [{ value: this.u.payrollId ?? "", disabled: !this.canEditEmployment }],
        // Compensation
        salary: [{ value: this.u.salary ?? "", disabled: !this.canEditCompensation }],
    });

    get nationalitiesArray(): FormArray<FormControl<string>> {
        return this.userForm.get("nationalities") as FormArray<FormControl<string>>;
    }

    addNationality(): void {
        const val = this.nationalityInput.trim();
        if (!val) return;
        this.nationalitiesArray.push(this.fb.control(val) as FormControl<string>);
        this.nationalityInput = "";
    }

    removeNationality(index: number): void {
        this.nationalitiesArray.removeAt(index);
    }

    ngOnInit(): void {
        this.countriesLoading = true;
        this.rolesLoading = true;
        this.employmentTitlesLoading = true;
        this.departmentsLoading = true;
        this.levelsLoading = true;
        this.officesLoading = true;

        if (this.canViewCrossCompany) {
            this.companiesLoading = true;
            this.companyService.getCompanies().subscribe({
                next: res => {
                    this.companies = res.data ?? [];
                    this.companiesLoading = false;
                },
                error: () => {
                    this.companiesLoading = false;
                },
            });
        }

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

        this.departmentService.getDepartments().subscribe({
            next: res => {
                this.departments = res.data ?? [];
                this.departmentsLoading = false;
            },
            error: () => {
                this.departmentsLoading = false;
            },
        });

        this.levelService.getLevels().subscribe({
            next: res => {
                this.levels = res.data ?? [];
                this.levelsLoading = false;
            },
            error: () => {
                this.levelsLoading = false;
            },
        });

        this.officeService.getOffices().subscribe({
            next: res => {
                this.offices = res.data ?? [];
                this.officesLoading = false;
            },
            error: () => {
                this.officesLoading = false;
            },
        });

        this.loadCurrentProfileImage();
    }

    ngOnDestroy(): void {
        if (this.selectedProfileImagePreviewUrl) {
            URL.revokeObjectURL(this.selectedProfileImagePreviewUrl);
        }
    }

    async onSubmit(): Promise<void> {
        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            return;
        }

        const fv = this.userForm.getRawValue() as {
            name: string;
            email: string;
            role: string;
            companyId: string;
            countryId: string;
            employmentTitleId: string;
            managerId: string;
            departmentId: string;
            levelId: string;
            officeId: string;
            hrRepresentativeId: string;
            isActive: boolean;
            isOutsourced: boolean;
            firstName: string;
            lastName: string;
            legalName: string;
            personalEmail: string;
            gender: string;
            birthday: Date | null;
            maritalStatus: string;
            nationalities: string[];
            religion: string;
            workPhone: string;
            personalPhone: string;
            homeCountryPhone: string;
            employmentDate: Date | null;
            employmentType: string;
            payrollId: string;
            salary: string;
        };

        const payload: IUpdateUserRequest = {
            name: fv.name.trim(),
            email: fv.email.trim(),
            role: fv.role || undefined,
            companyId: fv.companyId || undefined,
            countryId: fv.countryId || undefined,
            employmentTitleId: fv.employmentTitleId || undefined,
            managerId: fv.managerId || undefined,
            departmentId: fv.departmentId || undefined,
            levelId: fv.levelId || undefined,
            officeId: fv.officeId || undefined,
            hrRepresentativeId: fv.hrRepresentativeId || undefined,
            isActive: fv.isActive,
            isOutsourced: fv.isOutsourced,
            firstName: fv.firstName || undefined,
            lastName: fv.lastName || undefined,
            legalName: fv.legalName || undefined,
            personalEmail: fv.personalEmail || undefined,
            gender: fv.gender || undefined,
            birthday: fv.birthday ? (fv.birthday as Date).toISOString() : undefined,
            maritalStatus: fv.maritalStatus || undefined,
            nationalities: fv.nationalities.length > 0 ? fv.nationalities : undefined,
            religion: fv.religion || undefined,
            workPhone: fv.workPhone || undefined,
            personalPhone: fv.personalPhone || undefined,
            homeCountryPhone: fv.homeCountryPhone || undefined,
            employmentDate: fv.employmentDate ? (fv.employmentDate as Date).toISOString() : undefined,
            employmentType: fv.employmentType || undefined,
            payrollId: fv.payrollId || undefined,
            ...(this.canEditCompensation && fv.salary ? { salary: fv.salary } : {}),
        };

        const hasImageChanges = !!this.selectedProfileImage || this.removeProfileImageRequested;

        if (Object.keys(payload).length === 0 && !hasImageChanges) {
            this.toast.info("No changes to save");
            return;
        }

        this.loading = true;
        this.dialogRef.disableClose = true;

        try {
            const userId = this.data.user._id as string;

            const updateResponse = await firstValueFrom(this.usersService.updateUser(userId, payload));
            if (!updateResponse.success) {
                this.toast.error(updateResponse.message || "Failed to update user");
                this.loading = false;
                this.dialogRef.disableClose = false;
                return;
            }

            const updatedUser: IUser = {
                ...this.data.user,
                name: payload.name ?? this.data.user.name,
                email: payload.email ?? this.data.user.email,
                isActive: payload.isActive ?? this.data.user.isActive,
                isOutsourced: payload.isOutsourced,
                role: this.roles.find(r => r._id === fv.role) ?? this.data.user.role,
                company: this.companies.find(c => c._id === fv.companyId) ?? this.data.user.company,
                country: this.countries.find(c => c._id === fv.countryId) ?? this.data.user.country,
                employmentTitle:
                    this.employmentTitles.find(t => t._id === fv.employmentTitleId) ?? this.data.user.employmentTitle,
                manager: this.users.find(u => u._id === fv.managerId) ?? this.data.user.manager,
                department: this.departments.find(d => d._id === fv.departmentId) ?? this.data.user.department,
                level: this.levels.find(l => l._id === fv.levelId) ?? this.data.user.level,
                office: this.offices.find(o => o._id === fv.officeId) ?? this.data.user.office,
                hrRepresentative:
                    this.users.find(u => u._id === fv.hrRepresentativeId) ?? this.data.user.hrRepresentative,
                firstName: payload.firstName,
                lastName: payload.lastName,
                legalName: payload.legalName,
                personalEmail: payload.personalEmail,
                gender: payload.gender,
                birthday: payload.birthday,
                maritalStatus: payload.maritalStatus,
                nationalities: payload.nationalities,
                religion: payload.religion,
                workPhone: payload.workPhone,
                personalPhone: payload.personalPhone,
                homeCountryPhone: payload.homeCountryPhone,
                employmentDate: payload.employmentDate,
                employmentType: payload.employmentType,
                payrollId: payload.payrollId,
            };

            if (this.selectedProfileImage) {
                const uploadResponse = await firstValueFrom(
                    this.usersService.uploadProfileImage(userId, this.selectedProfileImage),
                );
                if (!uploadResponse.success) {
                    this.toast.error(uploadResponse.message || "Failed to upload profile image");
                    this.loading = false;
                    this.dialogRef.disableClose = false;
                    return;
                }

                if (uploadResponse.data?.user?.profileImage) {
                    updatedUser.profileImage = uploadResponse.data.user.profileImage;
                }

                this.currentProfileImageUrl = this.selectedProfileImagePreviewUrl;
                this.selectedProfileImagePreviewUrl = null;
                this.selectedProfileImage = null;
            }

            if (this.removeProfileImageRequested) {
                const deleteResponse = await firstValueFrom(this.usersService.deleteProfileImage(userId));
                if (!deleteResponse.success) {
                    this.toast.error(deleteResponse.message || "Failed to remove profile image");
                    this.loading = false;
                    this.dialogRef.disableClose = false;
                    return;
                }

                updatedUser.profileImage = undefined;
                this.currentProfileImageUrl = null;
            }

            this.dialogRef.close(updatedUser);
        } catch (err: unknown) {
            const error = err as { error?: { error?: string; message?: string } };
            this.toast.error(error?.error?.error || error?.error?.message || "Failed to update user");
            this.loading = false;
            this.dialogRef.disableClose = false;
        }
    }

    onProfileImageSelected(file: File): void {
        if (this.selectedProfileImagePreviewUrl) {
            URL.revokeObjectURL(this.selectedProfileImagePreviewUrl);
        }

        this.selectedProfileImage = file;
        this.selectedProfileImagePreviewUrl = URL.createObjectURL(file);
        this.removeProfileImageRequested = false;
    }

    clearSelectedProfileImage(): void {
        this.selectedProfileImage = null;
        if (this.selectedProfileImagePreviewUrl) {
            URL.revokeObjectURL(this.selectedProfileImagePreviewUrl);
        }
        this.selectedProfileImagePreviewUrl = null;
        this.removeProfileImageRequested = false;
    }

    requestProfileImageRemoval(): void {
        this.selectedProfileImage = null;
        if (this.selectedProfileImagePreviewUrl) {
            URL.revokeObjectURL(this.selectedProfileImagePreviewUrl);
        }
        this.selectedProfileImagePreviewUrl = null;
        this.removeProfileImageRequested = true;
    }

    getDisplayedProfileImageUrl(): string | null {
        if (this.removeProfileImageRequested) {
            return null;
        }

        return this.selectedProfileImagePreviewUrl || this.currentProfileImageUrl;
    }

    onProfileImageValidationError(message: string): void {
        this.selectedProfileImage = null;
        if (this.selectedProfileImagePreviewUrl) {
            URL.revokeObjectURL(this.selectedProfileImagePreviewUrl);
        }
        this.selectedProfileImagePreviewUrl = null;
        this.toast.warning(message);
    }

    private loadCurrentProfileImage(): void {
        if (!this.data.user._id || !this.data.user.profileImage) {
            return;
        }

        this.profileImageLoading = true;
        this.usersService.getProfileImageUrl(this.data.user._id).subscribe({
            next: response => {
                if (!response.success || !response.data?.url) {
                    this.currentProfileImageUrl = null;
                    this.profileImageLoading = false;
                    return;
                }

                this.currentProfileImageUrl = response.data.url;
                this.profileImageLoading = false;
            },
            error: () => {
                this.currentProfileImageUrl = null;
                this.profileImageLoading = false;
            },
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
