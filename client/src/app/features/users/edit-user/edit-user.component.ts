import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    OnDestroy,
    OnInit,
    signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from "@angular/forms";
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
import { catchError, firstValueFrom, forkJoin, map, Observable, of } from "rxjs";
import { UsersService } from "../../../core/services/users.service";
import { CountryService } from "../../../core/services/country.service";
import { EmploymentTitleService } from "../../../core/services/employment-title.service";
import { RoleService } from "../../../core/services/role.service";
import { DepartmentService } from "../../../core/services/department.service";
import { LevelService } from "../../../core/services/level.service";
import { OfficeService } from "../../../core/services/office.service";
import { ToastService } from "../../../core/services/toast.service";
import { PermissionService } from "../../../core/services/permission.service";
import { BreadcrumbService } from "../../../core/services/breadcrumb.service";
import { IUser, IUpdateUserRequest, ILevel, IOffice } from "../../../core/interfaces/user.interface";
import { ICountry } from "../../../core/interfaces/country.interface";
import { IEmploymentTitle } from "../../../core/interfaces/employment-title.interface";
import { IRole } from "../../../core/interfaces/role.interface";
import { IDepartment } from "../../../core/interfaces/department.interface";
import { LoadingButtonComponent } from "../../../shared/components/loading-button/loading-button.component";
import { ProfileImageUploadComponent } from "../../../shared/components/profile-image-upload/profile-image-upload.component";
import {
    GENDER_OPTIONS,
    MARITAL_STATUS_OPTIONS,
    EMPLOYMENT_TYPE_OPTIONS,
    DEGREE_LEVEL_OPTIONS,
} from "../../../core/enums/profile.enum";

@Component({
    selector: "app-edit-user",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideNativeDateAdapter()],
})
export class EditUserPageComponent implements OnInit, OnDestroy {
    // ── Services ──────────────────────────────────────────────────────────────
    private fb = inject(FormBuilder);
    private usersService = inject(UsersService);
    private countryService = inject(CountryService);
    private employmentTitleService = inject(EmploymentTitleService);
    private roleService = inject(RoleService);
    private departmentService = inject(DepartmentService);
    private levelService = inject(LevelService);
    private officeService = inject(OfficeService);
    private toast = inject(ToastService);
    private permissionService = inject(PermissionService);
    private breadcrumbService = inject(BreadcrumbService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);

    // ── Enum constants ────────────────────────────────────────────────────────
    readonly genderOptions = GENDER_OPTIONS;
    readonly maritalStatusOptions = MARITAL_STATUS_OPTIONS;
    readonly employmentTypeOptions = EMPLOYMENT_TYPE_OPTIONS;
    readonly degreeLevelOptions = DEGREE_LEVEL_OPTIONS;

    // ── State ─────────────────────────────────────────────────────────────────
    userLoading = signal(true);
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
    removeProfileImageRequested = signal(false);
    currentProfileImageUrl = signal<string | null>(null);
    selectedProfileImagePreviewUrl = signal<string | null>(null);
    profileImageLoading = signal(false);

    nationalityInput = signal("");
    additionalPhoneInput = signal("");
    readonly canEditCompensation = this.permissionService.canEditCompensation();

    private userId = "";
    private loadedUser: IUser | null = null;

    // ── Form ──────────────────────────────────────────────────────────────────
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

    // ── FormArray getters ─────────────────────────────────────────────────────
    get nationalitiesArray(): FormArray<FormControl<string>> {
        return this.userForm.get("nationalities") as FormArray<FormControl<string>>;
    }

    get additionalPhonesArray(): FormArray<FormControl<string>> {
        return this.userForm.get("additionalPhones") as FormArray<FormControl<string>>;
    }

    get educationArray(): FormArray {
        return this.userForm.get("education") as FormArray;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit(): void {
        this.userId = this.route.snapshot.paramMap.get("id") ?? "";
        if (!this.userId) {
            this.toast.error("User ID not found in route");
            this.router.navigate(["/users"]);
            return;
        }
        this.loadReferenceData();
    }

    ngOnDestroy(): void {
        this.revokePreviewUrl();
    }

    // ── Public event handlers ─────────────────────────────────────────────────
    async onSubmit(): Promise<void> {
        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            this.cdr.markForCheck();
            const firstInvalid = document.querySelector(".ng-invalid[formControlName], .ng-invalid[formGroupName]");
            firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        const fv = this.userForm.getRawValue();
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
            additionalPhones: fv.additionalPhones.length > 0 ? fv.additionalPhones : undefined,
            currentAddress: this.hasAnyValue(fv.currentAddress) ? fv.currentAddress : undefined,
            homeCountryAddress: this.hasAnyValue(fv.homeCountryAddress) ? fv.homeCountryAddress : undefined,
            emergencyContact: this.hasAnyValue(fv.emergencyContact) ? fv.emergencyContact : undefined,
            employmentDate: fv.employmentDate ? (fv.employmentDate as Date).toISOString() : undefined,
            employmentType: fv.employmentType || undefined,
            payrollId: fv.payrollId || undefined,
            education: fv.education.length > 0 ? fv.education : undefined,
            salary: this.canEditCompensation ? fv.salary || undefined : undefined,
        };

        this.loading.set(true);

        try {
            const updateResponse = await firstValueFrom(this.usersService.updateUser(this.userId, payload));
            if (!updateResponse.success) {
                this.toast.error(updateResponse.message || "Failed to update user");
                this.loading.set(false);
                return;
            }

            if (this.selectedProfileImage()) {
                const uploadResponse = await firstValueFrom(
                    this.usersService.uploadProfileImage(this.userId, this.selectedProfileImage()!),
                );
                if (!uploadResponse.success) {
                    this.toast.error(uploadResponse.message || "Failed to upload profile image");
                    this.loading.set(false);
                    return;
                }
            }

            if (this.removeProfileImageRequested()) {
                const deleteResponse = await firstValueFrom(this.usersService.deleteProfileImage(this.userId));
                if (!deleteResponse.success) {
                    this.toast.error(deleteResponse.message || "Failed to remove profile image");
                    this.loading.set(false);
                    return;
                }
            }

            this.toast.success("User updated successfully");
            this.router.navigate(["/users"]);
        } catch (err: unknown) {
            const error = err as { error?: { error?: string; message?: string } };
            this.toast.error(error?.error?.error || error?.error?.message || "Failed to update user");
            this.loading.set(false);
        }
    }

    onCancel(): void {
        this.router.navigate(["/users"]);
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

    onProfileImageSelected(file: File): void {
        this.revokePreviewUrl();
        this.selectedProfileImage.set(file);
        this.selectedProfileImagePreviewUrl.set(URL.createObjectURL(file));
        this.removeProfileImageRequested.set(false);
    }

    clearSelectedProfileImage(): void {
        this.selectedProfileImage.set(null);
        this.revokePreviewUrl();
        this.selectedProfileImagePreviewUrl.set(null);
        this.removeProfileImageRequested.set(false);
    }

    requestProfileImageRemoval(): void {
        this.selectedProfileImage.set(null);
        this.revokePreviewUrl();
        this.selectedProfileImagePreviewUrl.set(null);
        this.removeProfileImageRequested.set(true);
    }

    getDisplayedProfileImageUrl(): string | null {
        if (this.removeProfileImageRequested()) {
            return null;
        }
        return this.selectedProfileImagePreviewUrl() || this.currentProfileImageUrl();
    }

    onProfileImageValidationError(message: string): void {
        this.selectedProfileImage.set(null);
        this.revokePreviewUrl();
        this.selectedProfileImagePreviewUrl.set(null);
        this.toast.warning(message);
    }

    // ── Private helpers ───────────────────────────────────────────────────────
    private loadUser(): void {
        this.usersService.getUserById(this.userId).subscribe({
            next: res => {
                if (!res.success || !res.data) {
                    this.toast.error("Failed to load user");
                    this.router.navigate(["/users"]);
                    return;
                }
                this.loadedUser = res.data;
                this.patchForm(this.loadedUser);
                this.userLoading.set(false);
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
    }

    private loadReferenceData(): void {
        forkJoin([
            this.loadCountries(),
            this.loadRoles(),
            this.loadEmploymentTitles(),
            this.loadUsers(),
            this.loadDepartments(),
            this.loadLevels(),
            this.loadOffices(),
        ]).subscribe(() => this.loadUser());
    }

    private loadCountries(): Observable<void> {
        this.countriesLoading.set(true);
        return this.countryService.getCountries().pipe(
            map(res => {
                this.countries.set(res.data ?? []);
                this.countriesLoading.set(false);
            }),
            catchError(() => {
                this.countriesLoading.set(false);
                return of(undefined);
            }),
        );
    }

    private loadRoles(): Observable<void> {
        this.rolesLoading.set(true);
        return this.roleService.getAllRoles().pipe(
            map(res => {
                this.roles.set(res.data ?? []);
                this.rolesLoading.set(false);
            }),
            catchError(() => {
                this.rolesLoading.set(false);
                return of(undefined);
            }),
        );
    }

    private loadEmploymentTitles(): Observable<void> {
        this.employmentTitlesLoading.set(true);
        return this.employmentTitleService.getEmploymentTitles().pipe(
            map(res => {
                this.employmentTitles.set(res.data ?? []);
                this.employmentTitlesLoading.set(false);
            }),
            catchError(() => {
                this.employmentTitlesLoading.set(false);
                return of(undefined);
            }),
        );
    }

    private loadUsers(): Observable<void> {
        this.usersLoading.set(true);
        return this.usersService.getUsers({ limit: 200 }).pipe(
            map(res => {
                this.users.set((res.data?.users ?? []).filter(u => u._id !== this.userId));
                this.usersLoading.set(false);
            }),
            catchError(() => {
                this.usersLoading.set(false);
                return of(undefined);
            }),
        );
    }

    private loadDepartments(): Observable<void> {
        this.departmentsLoading.set(true);
        return this.departmentService.getDepartments().pipe(
            map(res => {
                this.departments.set(res.data ?? []);
                this.departmentsLoading.set(false);
            }),
            catchError(() => {
                this.departmentsLoading.set(false);
                return of(undefined);
            }),
        );
    }

    private loadLevels(): Observable<void> {
        this.levelsLoading.set(true);
        return this.levelService.getLevels().pipe(
            map(res => {
                this.levels.set(res.data ?? []);
                this.levelsLoading.set(false);
            }),
            catchError(() => {
                this.levelsLoading.set(false);
                return of(undefined);
            }),
        );
    }

    private loadOffices(): Observable<void> {
        this.officesLoading.set(true);
        return this.officeService.getOffices().pipe(
            map(res => {
                this.offices.set(res.data ?? []);
                this.officesLoading.set(false);
            }),
            catchError(() => {
                this.officesLoading.set(false);
                return of(undefined);
            }),
        );
    }

    private loadCurrentProfileImage(): void {
        if (!this.userId || !this.loadedUser?.profileImage) {
            return;
        }

        this.profileImageLoading.set(true);
        this.usersService.getProfileImageUrl(this.userId).subscribe({
            next: response => {
                this.currentProfileImageUrl.set(response.success ? (response.data?.url ?? null) : null);
                this.profileImageLoading.set(false);
            },
            error: () => {
                this.currentProfileImageUrl.set(null);
                this.profileImageLoading.set(false);
            },
        });
    }

    private patchForm(u: IUser): void {
        this.nationalitiesArray.clear();
        (u.nationalities ?? []).forEach(n => this.nationalitiesArray.push(this.fb.control(n) as FormControl<string>));

        this.additionalPhonesArray.clear();
        (u.additionalPhones ?? []).forEach(p =>
            this.additionalPhonesArray.push(this.fb.control(p) as FormControl<string>),
        );

        this.educationArray.clear();
        (u.education ?? []).forEach(e =>
            this.educationArray.push(
                this.fb.group({
                    institution: [e.institution ?? ""],
                    degreeLevel: [e.degreeLevel ?? ""],
                    degreeTitle: [e.degreeTitle ?? ""],
                    yearAchieved: [e.yearAchieved ?? null],
                }),
            ),
        );

        this.userForm.patchValue({
            name: u.name,
            email: u.email,
            role: u.role?._id ?? "",
            countryId: u.country?._id ?? "",
            employmentTitleId: u.employmentTitle?._id ?? "",
            managerId: u.manager?._id ?? "",
            departmentId: u.employmentTitle?.subDepartment?.department?._id ?? "",
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
            currentAddress: {
                line1: u.currentAddress?.line1 ?? "",
                line2: u.currentAddress?.line2 ?? "",
                city: u.currentAddress?.city ?? "",
                state: u.currentAddress?.state ?? "",
                postalCode: u.currentAddress?.postalCode ?? "",
                country: u.currentAddress?.country ?? "",
            },
            homeCountryAddress: {
                line1: u.homeCountryAddress?.line1 ?? "",
                line2: u.homeCountryAddress?.line2 ?? "",
                city: u.homeCountryAddress?.city ?? "",
                state: u.homeCountryAddress?.state ?? "",
                postalCode: u.homeCountryAddress?.postalCode ?? "",
                country: u.homeCountryAddress?.country ?? "",
            },
            emergencyContact: {
                name: u.emergencyContact?.name ?? "",
                relationship: u.emergencyContact?.relationship ?? "",
                phone: u.emergencyContact?.phone ?? "",
            },
            employmentDate: u.employmentDate ? new Date(u.employmentDate) : null,
            employmentType: u.employmentType ?? "",
            payrollId: u.payrollId ?? "",
            salary: u.salary ?? "",
        });
    }

    private hasAnyValue(obj: Record<string, unknown>): boolean {
        return Object.values(obj).some(v => v !== null && v !== undefined && v !== "");
    }

    private revokePreviewUrl(): void {
        const url = this.selectedProfileImagePreviewUrl();
        if (url) {
            URL.revokeObjectURL(url);
        }
    }
}
