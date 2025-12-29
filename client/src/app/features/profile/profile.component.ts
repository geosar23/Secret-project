import { Component, OnInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatDividerModule } from "@angular/material/divider";
import { ActivatedRoute } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { UserProfile } from "../../core/interfaces/profile.interface";
import { RoleUtils } from "../../core/utils/role.utils";
import { UsersService } from "../../core/services/users.service";
import { Subject } from "rxjs";
import { skipWhile, takeUntil } from "rxjs/operators";

@Component({
    selector: "app-profile",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatIconModule,
        MatChipsModule,
        MatDividerModule,
    ],
    templateUrl: "./profile.component.html",
    styleUrls: ["./profile.component.scss"],
})
export class ProfileComponent implements OnInit, OnDestroy {
    private fb = inject(FormBuilder);
    private usersService = inject(UsersService);
    private authService = inject(AuthService);
    private route = inject(ActivatedRoute);

    private destroy$ = new Subject<void>();

    profile: UserProfile | null = null;
    profileForm: FormGroup;
    passwordForm: FormGroup;
    loading = false;
    profileError = "";
    profileSuccess = "";
    passwordError = "";
    passwordSuccess = "";
    editMode = false;
    isOwnProfile = true;
    pageTitle = "My Profile";

    constructor() {
        this.profileForm = this.fb.group({
            name: ["", [Validators.required, Validators.minLength(2)]],
            email: ["", [Validators.required, Validators.email]],
        });

        this.passwordForm = this.fb.group({
            currentPassword: ["", [Validators.required]],
            newPassword: ["", [Validators.required, Validators.minLength(6)]],
            confirmPassword: ["", [Validators.required]],
        });
    }

    ngOnInit(): void {
        this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
            const userId = params["id"];

            if (userId === "me" || !userId) {
                // Load current user's profile
                this.isOwnProfile = true;
                this.pageTitle = "My Profile";
                this.loadOwnProfile();
            } else {
                // Load another user's profile
                this.isOwnProfile = false;
                this.pageTitle = "User Profile";
                this.loadUserProfile(userId);
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadOwnProfile(): void {
        this.loading = true;
        this.profileError = "";

        this.authService.localUser$
            .pipe(
                skipWhile(user => !user),
                takeUntil(this.destroy$),
            )
            .subscribe(user => {
                if (!user || !user._id) {
                    this.profileError = "Failed to load profile";
                    this.loading = false;
                    return;
                }

                this.profile = user;
                this.profileForm.patchValue({
                    name: this.profile.name,
                    email: this.profile.email,
                });

                this.loading = false;
            });
    }

    loadUserProfile(userId: string): void {
        this.loading = true;
        this.profileError = "";

        this.usersService.getUserById(userId).subscribe({
            next: response => {
                if (!response.success || !response.data) {
                    this.profileError = response.message || "User not found";
                    this.loading = false;
                    return;
                }
                this.profile = response.data;
                this.profileForm.patchValue({
                    name: this.profile.name,
                    email: this.profile.email,
                });
                this.loading = false;
            },
            error: error => {
                this.profileError = error.error?.error || "Failed to load user profile";
                this.loading = false;
            },
        });
    }

    toggleEditMode(): void {
        this.editMode = !this.editMode;
        if (!this.editMode) {
            // Reset form to original values
            this.profileForm.patchValue({
                name: this.profile?.name,
                email: this.profile?.email,
            });
        }
        this.profileSuccess = "";
        this.profileError = "";
    }

    onUpdateProfile(): void {
        if (this.profileForm.invalid || !this.profile) return;

        this.loading = true;
        this.profileError = "";
        this.profileSuccess = "";

        this.usersService.updateUser(this.profile._id as string, this.profileForm.value).subscribe({
            next: response => {
                if (!response.success || !response.data) {
                    this.profileError = response.message || "Failed to update profile";
                    this.loading = false;
                    return;
                }

                this.profile = response.data.user;
                this.profileSuccess = "Profile updated successfully";
                this.editMode = false;
                this.loading = false;
            },
            error: error => {
                this.profileError = error.error?.error || "Failed to update profile";
                this.loading = false;
            },
        });
    }

    onChangePassword(): void {
        console.log("Change password called");
        return;
        // if (this.passwordForm.invalid || !this.profile) return;

        // const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

        // if (newPassword !== confirmPassword) {
        //     this.passwordError = "New passwords do not match";
        //     return;
        // }

        // this.loading = true;
        // this.passwordError = "";
        // this.passwordSuccess = "";

        // this.profileService.changePassword(this.profile.id, { currentPassword, newPassword }).subscribe({
        //     next: () => {
        //         this.passwordSuccess = "Password changed successfully";
        //         this.passwordForm.reset();
        //         this.loading = false;
        //     },
        //     error: error => {
        //         this.passwordError = error.error?.error || "Failed to change password";
        //         this.loading = false;
        //     },
        // });
    }

    getRoleColor(role: string): string {
        return RoleUtils.getRoleColor(role);
    }
}
