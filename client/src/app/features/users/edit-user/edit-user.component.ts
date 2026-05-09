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
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { provideNativeDateAdapter } from "@angular/material/core";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ActivatedRoute, Router } from "@angular/router";
import { UsersService } from "../../../core/services/users.service";
import { CountryService } from "../../../core/services/country.service";
import { EmploymentTitleService } from "../../../core/services/employment-title.service";
import { RoleService } from "../../../core/services/role.service";
import { DepartmentService } from "../../../core/services/department.service";
import { LevelService } from "../../../core/services/level.service";
import { OfficeService } from "../../../core/services/office.service";
import { ToastService } from "../../../core/services/toast.service";
import { AuthService } from "../../../core/services/auth.service";
import { PermissionService } from "../../../core/services/permission.service";
import { BreadcrumbService } from "../../../core/services/breadcrumb.service";
import { IUser, IUpdateUserRequest, ILevel, IOffice } from "../../../core/interfaces/user.interface";
import { ICountry } from "../../../core/interfaces/country.interface";
import { IEmploymentTitle } from "../../../core/interfaces/employment-title.interface";
import { IRole } from "../../../core/interfaces/role.interface";
import { IDepartment } from "../../../core/interfaces/department.interface";
import { LoadingButtonComponent } from "../../../shared/components/loading-button/loading-button.component";
import { firstValueFrom } from "rxjs";
import { ProfileImageUploadComponent } from "../../../shared/components/profile-image-upload/profile-image-upload.component";
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, EMPLOYMENT_TYPE_OPTIONS } from "../../../core/enums/profile.enum";

@Component({
    selector: "app-edit-user",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatDatepickerModule,
        MatChipsModule,
        MatIconModule,
        MatProgressSpinnerModule,
        LoadingButtonComponent,
        ProfileImageUploadComponent,
    ],
    templateUrl: "./edit-user.component.html",
    styleUrls: ["./edit-user.component.scss"],
    providers: [provideNativeDateAdapter()],
})
export class EditUserPageComponent implements OnInit, OnDestroy {
    private fb = inject(FormBuilder);
    private usersService = inject(UsersService);
    private countryService = inject(CountryService);
    private employmentTitleService = inject(EmploymentTitleService);
    private roleService = inject(RoleService);
    private departmentService = inject(DepartmentService);
    private levelService = inject(LevelService);
    private officeService = inject(OfficeService);
    private toast = inject(ToastService);
    private authService = inject(AuthService);
    private permissionService = inject(PermissionService);
    private breadcrumbService = inject(BreadcrumbService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private localUser = this.authService.getLocalUser();

    readonly genderOptions = GENDER_OPTIONS;
    readonly maritalStatusOptions = MARITAL_STATUS_OPTIONS;
    readonly employmentTypeOptions = EMPLOYMENT_TYPE_OPTIONS;

    userLoading = true;
    loading = false;
    countriesLoading = false;
    rolesLoading = false;
    employmentTitlesLoading = false;
    usersLoading = false;
    departmentsLoading = false;
    levelsLoading = false;
    officesLoading = false;

    private userId = "";
    private loadedUser: IUser | null = null;

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

    userForm: FormGroup = this.fb.group({
        // Core
        name: ["", [Validators.required, Validators.minLength(2)]],
        email: ["", [Validators.required, Validators.email]],
        role: ["", Validators.required],
        countryId: ["", Validators.required],
        employmentTitleId: ["", Validators.required],
        managerId: [""],
        departmentId: [""],
        levelId: [""],
        officeId: [""],
        hrRepresentativeId: [""],
        isActive: [true],
        isOutsourced: [false],
        // Identity
        firstName: [""],
        lastName: [""],
        legalName: [""],
        personalEmail: ["", Validators.email],
        gender: [""],
        birthday: [null as Date | null],
        maritalStatus: [""],
        nationalities: this.fb.array<string>([]),
        religion: [""],
        // Contact
        workPhone: [""],
        personalPhone: [""],
        homeCountryPhone: [""],
        // Employment
        employmentDate: [null as Date | null],
        employmentType: [""],
        payrollId: [""],
    });

    get nationalitiesArray(): FormArray<FormControl<string>> {
        return this.userForm.get("nationalities") as FormArray<FormControl<string>>;
    }

    addNationality(): void {
        const val = this.nationalityInput.trim();
        if (!val) {
            return;
        }
        this.nationalitiesArray.push(this.fb.control(val) as FormControl<string>);
        this.nationalityInput = "";
    }

    removeNationality(index: number): void {
        this.nationalitiesArray.removeAt(index);
    }

    private patchForm(u: IUser): void {
        // Rebuild nationalities FormArray
        const nationalitiesArray = this.userForm.get("nationalities") as FormArray;
        nationalitiesArray.clear();
        (u.nationalities ?? []).forEach(n => nationalitiesArray.push(this.fb.control(n) as FormControl<string>));

        this.userForm.patchValue({
            name: u.name,
            email: u.email,
            role: u.role?._id ?? "",
            countryId: u.country?._id ?? "",
            employmentTitleId: u.employmentTitle?._id ?? "",
            managerId: u.manager?._id ?? "",
            departmentId: (u.department as IDepartment)?._id ?? "",
            levelId: u.level?._id ?? "",
            officeId: u.office?._id ?? "",
            hrRepresentativeId: u.hrRepresentative?._id ?? "",
            isActive: u.isActive ?? true,
            isOutsourced: u.isOutsourced ?? false,
            firstName: u.firstName ?? "",
            lastName: u.lastName ?? "",
            legalName: u.legalName ?? "",
            personalEmail: u.personalEmail ?? "",
            gender: u.gender ?? "",
            birthday: u.birthday ? new Date(u.birthday) : null,
            maritalStatus: u.maritalStatus ?? "",
            religion: u.religion ?? "",
            workPhone: u.workPhone ?? "",
            personalPhone: u.personalPhone ?? "",
            homeCountryPhone: u.homeCountryPhone ?? "",
            employmentDate: u.employmentDate ? new Date(u.employmentDate) : null,
            employmentType: u.employmentType ?? "",
            payrollId: u.payrollId ?? "",
        });
    }

    ngOnInit(): void {
        this.userId = this.route.snapshot.paramMap.get("id") ?? "";
        if (!this.userId) {
            this.toast.error("User ID not found in route");
            this.router.navigate(["/users"]);
            return;
        }

        this.countriesLoading = true;
        this.rolesLoading = true;
        this.employmentTitlesLoading = true;
        this.departmentsLoading = true;
        this.levelsLoading = true;
        this.officesLoading = true;

        // Load the user being edited
        this.usersService.getUserById(this.userId).subscribe({
            next: res => {
                if (!res.success || !res.data) {
                    this.toast.error("Failed to load user");
                    this.router.navigate(["/users"]);
                    return;
                }
                this.loadedUser = res.data;
                this.patchForm(this.loadedUser);
                this.userLoading = false;
                this.loadCurrentProfileImage();
                this.breadcrumbService.set([
                    { label: "Users", route: "/users" },
                    { label: res.data.name },
                    { label: "Edit" },
                ]);
            },
            error: () => {
                this.toast.error("Failed to load user");
                this.router.navigate(["/users"]);
            },
        });

        this.usersLoading = true;
        this.usersService.getUsers({ limit: 200 }).subscribe({
            next: res => {
                this.users = (res.data?.users ?? []).filter(u => u._id !== this.userId);
                this.usersLoading = false;
            },
            error: () => {
                this.usersLoading = false;
            },
        });

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
        };

        const payload: IUpdateUserRequest = {
            name: fv.name.trim(),
            email: fv.email.trim(),
            role: fv.role || undefined,
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
        };

        this.loading = true;

        try {
            const updateResponse = await firstValueFrom(this.usersService.updateUser(this.userId, payload));
            if (!updateResponse.success) {
                this.toast.error(updateResponse.message || "Failed to update user");
                this.loading = false;
                return;
            }

            if (this.selectedProfileImage) {
                const uploadResponse = await firstValueFrom(
                    this.usersService.uploadProfileImage(this.userId, this.selectedProfileImage),
                );
                if (!uploadResponse.success) {
                    this.toast.error(uploadResponse.message || "Failed to upload profile image");
                    this.loading = false;
                    return;
                }
            }

            if (this.removeProfileImageRequested) {
                const deleteResponse = await firstValueFrom(this.usersService.deleteProfileImage(this.userId));
                if (!deleteResponse.success) {
                    this.toast.error(deleteResponse.message || "Failed to remove profile image");
                    this.loading = false;
                    return;
                }
            }

            this.toast.success("User updated successfully");
            this.router.navigate(["/users"]);
        } catch (err: unknown) {
            const error = err as { error?: { error?: string; message?: string } };
            this.toast.error(error?.error?.error || error?.error?.message || "Failed to update user");
            this.loading = false;
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
        if (!this.userId || !this.loadedUser?.profileImage) {
            return;
        }

        this.profileImageLoading = true;
        this.usersService.getProfileImageUrl(this.userId).subscribe({
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
        this.router.navigate(["/users"]);
    }
}
