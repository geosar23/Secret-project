import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { provideNativeDateAdapter } from "@angular/material/core";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { first } from "rxjs";
import { UsersService } from "../../../core/services/users.service";
import { PasswordInputComponent } from "../../../shared/components/password-input/password-input.component";
import { CountryService } from "../../../core/services/country.service";
import { EmploymentTitleService } from "../../../core/services/employment-title.service";
import { RoleService } from "../../../core/services/role.service";
import { DepartmentService } from "../../../core/services/department.service";
import { LevelService } from "../../../core/services/level.service";
import { OfficeService } from "../../../core/services/office.service";
import { ToastService } from "../../../core/services/toast.service";
import { AuthService } from "../../../core/services/auth.service";
import { PermissionService } from "../../../core/services/permission.service";
import { ICountry } from "../../../core/interfaces/country.interface";
import { IEmploymentTitle } from "../../../core/interfaces/employment-title.interface";
import { IRole } from "../../../core/interfaces/role.interface";
import { IDepartment } from "../../../core/interfaces/department.interface";
import {
    IUser,
    ILevel,
    IOffice,
    IAddress,
    IEmergencyContact,
    IEducationEntry,
} from "../../../core/interfaces/user.interface";
import { ProfileImageUploadComponent } from "../../../shared/components/profile-image-upload/profile-image-upload.component";
import {
    GENDER_OPTIONS,
    MARITAL_STATUS_OPTIONS,
    EMPLOYMENT_TYPE_OPTIONS,
    DEGREE_LEVEL_OPTIONS,
} from "../../../core/enums/profile.enum";

@Component({
    selector: "app-create-user",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatDatepickerModule,
        MatSlideToggleModule,
        MatChipsModule,
        MatIconModule,
        PasswordInputComponent,
        ProfileImageUploadComponent,
    ],
    templateUrl: "./create-user.component.html",
    styleUrls: ["./create-user.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideNativeDateAdapter()],
})
export class CreateUserPageComponent implements OnInit {
    private fb = inject(FormBuilder);
    private usersService = inject(UsersService);
    private countryService = inject(CountryService);
    private employmentTitleService = inject(EmploymentTitleService);
    private roleService = inject(RoleService);
    private departmentService = inject(DepartmentService);
    private levelService = inject(LevelService);
    private officeService = inject(OfficeService);
    private router = inject(Router);
    private toast = inject(ToastService);
    private authService = inject(AuthService);
    private permissionService = inject(PermissionService);

    private localUser = this.authService.getLocalUser();

    readonly genderOptions = GENDER_OPTIONS;
    readonly maritalStatusOptions = MARITAL_STATUS_OPTIONS;
    readonly employmentTypeOptions = EMPLOYMENT_TYPE_OPTIONS;
    readonly degreeLevelOptions = DEGREE_LEVEL_OPTIONS;

    loading = signal(false);
    countriesLoading = signal(false);
    rolesLoading = signal(false);
    employmentTitlesLoading = signal(false);
    usersLoading = signal(false);
    departmentsLoading = signal(false);
    levelsLoading = signal(false);
    officesLoading = signal(false);

    countries = signal<ICountry[]>([]);
    roles = signal<IRole[]>([]);
    employmentTitles = signal<IEmploymentTitle[]>([]);
    users = signal<IUser[]>([]);
    departments = signal<IDepartment[]>([]);
    levels = signal<ILevel[]>([]);
    offices = signal<IOffice[]>([]);

    selectedProfileImage = signal<File | null>(null);
    selectedProfileImagePreviewUrl = signal<string | null>(null);

    nationalityInput = signal("");
    additionalPhoneInput = signal("");

    canEditCompensation = false;

    userForm: FormGroup = this.fb.group({
        // Core
        name: ["", [Validators.required, Validators.minLength(2)]],
        email: ["", [Validators.required, Validators.email]],
        password: ["", [Validators.required, Validators.minLength(6)]],
        role: ["", Validators.required],
        countryId: ["", Validators.required],
        employmentTitleId: ["", Validators.required],
        managerId: [""],
        departmentId: [""],
        levelId: [""],
        officeId: [""],
        hrRepresentativeId: [""],
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
        additionalPhones: this.fb.array<string>([]),
        currentAddress: this.fb.group({
            line1: [""],
            line2: [""],
            city: [""],
            state: [""],
            postalCode: [""],
            country: [""],
        }),
        homeCountryAddress: this.fb.group({
            line1: [""],
            line2: [""],
            city: [""],
            state: [""],
            postalCode: [""],
            country: [""],
        }),
        emergencyContact: this.fb.group({
            name: [""],
            relationship: [""],
            phone: [""],
        }),
        // Employment
        employmentDate: [null as Date | null],
        employmentType: [""],
        payrollId: [""],
        // Education
        education: this.fb.array([]),
        // Compensation
        salary: [""],
    });

    get nationalitiesArray(): FormArray<FormControl<string>> {
        return this.userForm.get("nationalities") as FormArray<FormControl<string>>;
    }

    get additionalPhonesArray(): FormArray<FormControl<string>> {
        return this.userForm.get("additionalPhones") as FormArray<FormControl<string>>;
    }

    get educationArray(): FormArray {
        return this.userForm.get("education") as FormArray;
    }

    ngOnInit(): void {
        this.canEditCompensation = this.permissionService.canEditCompensation();
        this.loadInitialData();
    }

    private loadInitialData(): void {
        this.countriesLoading.set(true);
        this.rolesLoading.set(true);
        this.employmentTitlesLoading.set(true);
        this.usersLoading.set(true);
        this.departmentsLoading.set(true);
        this.levelsLoading.set(true);
        this.officesLoading.set(true);

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

        this.departmentService
            .getDepartments()
            .pipe(first())
            .subscribe({
                next: res => {
                    this.departments.set(res.data ?? []);
                    this.departmentsLoading.set(false);
                },
                error: () => {
                    this.departmentsLoading.set(false);
                },
            });

        this.levelService
            .getLevels()
            .pipe(first())
            .subscribe({
                next: res => {
                    this.levels.set(res.data ?? []);
                    this.levelsLoading.set(false);
                },
                error: () => {
                    this.levelsLoading.set(false);
                },
            });

        this.officeService
            .getOffices()
            .pipe(first())
            .subscribe({
                next: res => {
                    this.offices.set(res.data ?? []);
                    this.officesLoading.set(false);
                },
                error: () => {
                    this.officesLoading.set(false);
                },
            });
    }

    private toObjectIdOrUndefined(value: unknown): string | undefined {
        if (typeof value !== "string") {
            return undefined;
        }
        const trimmed = value.trim();
        return /^[a-fA-F0-9]{24}$/.test(trimmed) ? trimmed : undefined;
    }

    private hasAnyValue(obj: Record<string, unknown>): boolean {
        return Object.values(obj).some(v => typeof v === "string" && v.trim().length > 0);
    }

    addNationality(): void {
        const val = this.nationalityInput().trim();
        if (!val) {
            return;
        }
        this.nationalitiesArray.push(this.fb.control(val) as FormControl<string>);
        this.nationalityInput.set("");
    }

    removeNationality(index: number): void {
        this.nationalitiesArray.removeAt(index);
    }

    addAdditionalPhone(): void {
        const val = this.additionalPhoneInput().trim();
        if (!val) {
            return;
        }
        this.additionalPhonesArray.push(this.fb.control(val) as FormControl<string>);
        this.additionalPhoneInput.set("");
    }

    removeAdditionalPhone(index: number): void {
        this.additionalPhonesArray.removeAt(index);
    }

    addEducationEntry(): void {
        this.educationArray.push(
            this.fb.group({
                institution: [""],
                degreeLevel: [""],
                degreeTitle: [""],
                yearAchieved: [null as number | null],
            }),
        );
    }

    removeEducationEntry(index: number): void {
        this.educationArray.removeAt(index);
    }

    onSubmit(): void {
        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            const firstInvalid = document.querySelector(".ng-invalid[formControlName], .ng-invalid[formGroupName]");
            firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        this.loading.set(true);

        const fv = this.userForm.getRawValue() as {
            name: string;
            email: string;
            password: string;
            role: string;
            countryId: string;
            employmentTitleId: string;
            managerId: string;
            departmentId: string;
            levelId: string;
            officeId: string;
            hrRepresentativeId: string;
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
            additionalPhones: string[];
            currentAddress: IAddress;
            homeCountryAddress: IAddress;
            emergencyContact: IEmergencyContact;
            employmentDate: Date | null;
            employmentType: string;
            payrollId: string;
            education: IEducationEntry[];
            salary: string;
        };

        const payload = {
            name: fv.name,
            email: fv.email,
            password: fv.password,
            role: this.toObjectIdOrUndefined(fv.role)!,
            countryId: this.toObjectIdOrUndefined(fv.countryId),
            employmentTitleId: this.toObjectIdOrUndefined(fv.employmentTitleId),
            managerId: this.toObjectIdOrUndefined(fv.managerId),
            departmentId: this.toObjectIdOrUndefined(fv.departmentId),
            levelId: this.toObjectIdOrUndefined(fv.levelId),
            officeId: this.toObjectIdOrUndefined(fv.officeId),
            hrRepresentativeId: this.toObjectIdOrUndefined(fv.hrRepresentativeId),
            isOutsourced: fv.isOutsourced || undefined,
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
            additionalPhones: fv.additionalPhones.length > 0 ? fv.additionalPhones : undefined,
            currentAddress: this.hasAnyValue(fv.currentAddress as Record<string, unknown>)
                ? fv.currentAddress
                : undefined,
            homeCountryAddress: this.hasAnyValue(fv.homeCountryAddress as Record<string, unknown>)
                ? fv.homeCountryAddress
                : undefined,
            emergencyContact: this.hasAnyValue(fv.emergencyContact as Record<string, unknown>)
                ? fv.emergencyContact
                : undefined,
            employmentDate: fv.employmentDate ? (fv.employmentDate as Date).toISOString() : undefined,
            employmentType: fv.employmentType || undefined,
            payrollId: fv.payrollId || undefined,
            education: fv.education.length > 0 ? fv.education : undefined,
            salary: this.canEditCompensation && fv.salary?.trim() ? fv.salary.trim() : undefined,
        };

        if (!payload.role) {
            this.toast.error("Please select a valid role");
            this.loading.set(false);
            return;
        }

        this.usersService
            .createUser(payload)
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
                        this.toast.success("User created successfully");
                        this.router.navigate(["/users"]);
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
                                } else {
                                    this.toast.success("User created successfully");
                                }
                                this.router.navigate(["/users"]);
                            },
                            error: () => {
                                this.toast.warning("User created but profile image upload failed");
                                this.router.navigate(["/users"]);
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
        this.router.navigate(["/users"]);
    }
}
